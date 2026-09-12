// PayFlux Card Payout Core Orchestration Service
// Coordinates State Machine, Concurrency Locking, Ledger Posting, and Provider Dispatch

import { Database } from '../../database/db.js';
import { Beneficiary, Payout } from '../../types/database.js';
import { CardPayoutValidator, CardValidationInput } from './CardPayoutValidator.js';
import { PayFluxError } from './CardPayoutErrors.js';
import { WalletService } from '../wallet/WalletService.js';
import { ConversionService } from '../conversion/ConversionService.js';
import { LedgerService } from '../ledger/LedgerService.js';
import { RiskComplianceService } from '../risk/RiskComplianceService.js';
import { ProviderFactory } from '../../providers/card-payout/ProviderFactory.js';

export interface ExecutePayoutParams {
  userId: string;
  beneficiaryId?: string;
  newCard?: CardValidationInput;
  quoteId: string;
  idempotencyKey: string;
}

export class CardPayoutService {
  private static instance: CardPayoutService;
  private db: Database;
  private walletService: WalletService;
  private conversionService: ConversionService;
  private ledgerService: LedgerService;
  private riskService: RiskComplianceService;

  private constructor() {
    this.db = Database.getInstance();
    this.walletService = WalletService.getInstance();
    this.conversionService = ConversionService.getInstance();
    this.ledgerService = LedgerService.getInstance();
    this.riskService = RiskComplianceService.getInstance();
  }

  public static getInstance(): CardPayoutService {
    if (!CardPayoutService.instance) {
      CardPayoutService.instance = new CardPayoutService();
    }
    return CardPayoutService.instance;
  }

  /**
   * Registers a tokenized beneficiary card after strict validation
   */
  public async registerBeneficiary(userId: string, cardInput: CardValidationInput): Promise<Beneficiary> {
    const user = await this.db.getUser(userId);
    if (!user) throw new PayFluxError('UNAUTHORIZED', 'User not found.', 401);

    const validation = CardPayoutValidator.validateCardInput(cardInput);
    const provider = ProviderFactory.getProvider();

    // Verify recipient token with provider
    const recipientCheck = await provider.validateRecipient({
      token: validation.providerToken,
      cardholderName: validation.sanitizedHolderName,
      currency: 'USD',
    });

    if (!recipientCheck.eligible) {
      throw new PayFluxError('CARD_NOT_SUPPORTED', recipientCheck.message || 'Card is ineligible for instant card payouts.', 400);
    }

    const beneficiary: Beneficiary = {
      id: `ben_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      provider: provider.name,
      provider_token: validation.providerToken,
      card_brand: validation.brand,
      last4: validation.last4,
      cardholder_name: validation.sanitizedHolderName,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.db.saveBeneficiary(beneficiary);

    await this.db.saveAuditLog({
      id: `aud_${Date.now()}`,
      user_id: userId,
      action: 'REGISTER_BENEFICIARY_CARD',
      entity_type: 'BENEFICIARY',
      entity_id: beneficiary.id,
      metadata: { last4: beneficiary.last4, brand: beneficiary.card_brand },
      created_at: new Date().toISOString(),
    });

    return beneficiary;
  }

  /**
   * Orchestrates the complete Pay to Card state machine with full transactional guarantees
   */
  public async executePayout(params: ExecutePayoutParams): Promise<Payout> {
    const { userId, quoteId, idempotencyKey } = params;

    // Idempotency check to guarantee exactly-once processing
    const existingPayout = await this.db.getPayoutByIdempotencyKey(idempotencyKey);
    if (existingPayout) {
      return existingPayout;
    }

    const user = await this.db.getUser(userId);
    if (!user) throw new PayFluxError('UNAUTHORIZED', 'User not found.', 401);
    if (user.status !== 'ACTIVE') throw new PayFluxError('FORBIDDEN', `Account is currently ${user.status.toLowerCase()}.`, 403);

    // 1. Resolve Beneficiary Card
    let beneficiary: Beneficiary | null = null;
    if (params.beneficiaryId) {
      beneficiary = await this.db.getBeneficiary(params.beneficiaryId);
    } else if (params.newCard) {
      beneficiary = await this.registerBeneficiary(userId, params.newCard);
    }

    if (!beneficiary || beneficiary.user_id !== userId || beneficiary.status !== 'ACTIVE') {
      throw new PayFluxError('INVALID_CARD', 'Valid payout beneficiary card is required.', 400);
    }

    // 2. Validate Quote
    const quote = await this.conversionService.validateQuoteForExecution(quoteId, userId);

    // 3. Risk & Compliance Screening
    await this.riskService.evaluatePayout({
      user,
      sourceAsset: quote.source_asset,
      sourceAmount: quote.total_amount,
      destinationCurrency: quote.destination_currency,
      destinationAmount: quote.destination_amount,
    });

    // 4. Create Initial Payout Record (State: CREATED)
    const payoutId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const payout: Payout = {
      id: payoutId,
      user_id: userId,
      beneficiary_id: beneficiary.id,
      quote_id: quote.id,
      source_asset: quote.source_asset,
      source_amount: quote.total_amount,
      destination_currency: quote.destination_currency,
      destination_amount: quote.destination_amount,
      exchange_rate: quote.exchange_rate,
      network_fee: quote.network_fee,
      platform_fee: quote.platform_fee,
      conversion_fee: quote.conversion_fee,
      total_fee: Number((quote.network_fee + quote.platform_fee + quote.conversion_fee).toFixed(6)),
      provider: quote.provider,
      idempotency_key: idempotencyKey,
      status: 'CREATED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await this.db.savePayout(payout);

    // Mark quote as USED
    quote.status = 'USED';
    await this.db.saveQuote(quote);

    // 5. State: BALANCE_RESERVED (Atomically lock funds and record double-entry ledger)
    try {
      payout.status = 'BALANCE_RESERVED';
      await this.db.savePayout(payout);

      await this.walletService.reserveFunds(userId, quote.source_asset, quote.total_amount, payoutId);
      await this.ledgerService.recordReserveHold({
        payoutId,
        userId,
        asset: quote.source_asset,
        amount: quote.total_amount,
      });

      // 6. State: CONVERSION_COMPLETED
      payout.status = 'CONVERSION_COMPLETED';
      await this.db.savePayout(payout);

      await this.ledgerService.recordConversionSettlement({
        payoutId,
        userId,
        sourceAsset: quote.source_asset,
        sourceAmount: quote.source_amount,
        destinationCurrency: quote.destination_currency,
        destinationAmount: quote.destination_amount,
      });

      // 7. State: PAYOUT_SUBMITTED (Dispatch to Card Clearing Adapter)
      payout.status = 'PAYOUT_SUBMITTED';
      await this.db.savePayout(payout);

      const provider = ProviderFactory.getProvider(quote.provider);
      const providerResult = await provider.createPayout({
        payoutId: payout.id,
        beneficiaryToken: beneficiary.provider_token,
        amount: quote.destination_amount,
        currency: quote.destination_currency,
        idempotencyKey: `prov_${idempotencyKey}`,
        description: `PayFlux Instant Payout #${payout.id}`,
      });

      payout.provider_transaction_id = providerResult.providerTransactionId;
      payout.status = providerResult.status === 'SUCCESS' ? 'COMPLETED' : 'PROCESSING';
      await this.db.savePayout(payout);

      // Save provider transaction record
      await this.db.saveProviderTransaction({
        id: `ptx_${Date.now()}`,
        payout_id: payout.id,
        provider: provider.name,
        provider_transaction_id: providerResult.providerTransactionId,
        provider_status: providerResult.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (payout.status === 'COMPLETED') {
        await this.walletService.finalizeSettlement(userId, quote.source_asset, quote.total_amount, payoutId);
        await this.ledgerService.recordProviderPayout({
          payoutId,
          provider: provider.name,
          currency: quote.destination_currency,
          amount: quote.destination_amount,
        });
      }

      return payout;
    } catch (err: any) {
      // Compensating transaction rollback on failure
      payout.status = 'FAILED';
      payout.failure_reason = err.message || 'Payment execution failed';
      await this.db.savePayout(payout);

      try {
        await this.walletService.releaseReservedFunds(userId, quote.source_asset, quote.total_amount, payoutId);
        await this.ledgerService.recordRefundRelease({
          payoutId,
          userId,
          asset: quote.source_asset,
          amount: quote.total_amount,
          reason: payout.failure_reason || 'Payment execution failed',
        });
      } catch (rollbackErr: any) {
        console.error('Critical ledger rollback error:', rollbackErr);
      }

      throw err;
    }
  }

  public async getPayout(payoutId: string, userId: string): Promise<Payout> {
    const payout = await this.db.getPayout(payoutId);
    if (!payout || payout.user_id !== userId) {
      throw new PayFluxError('PAYOUT_FAILED', 'Payout record not found.', 404);
    }
    return payout;
  }
}
