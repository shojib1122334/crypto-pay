// Double-Entry Immutable Ledger Service
// Enforces balanced accounting invariants and auditability for all financial movements

import { Database } from '../../database/db.js';
import { LedgerEntry, ReconciliationReport } from '../../types/database.js';

export class LedgerService {
  private static instance: LedgerService;
  private db: Database;

  private constructor() {
    this.db = Database.getInstance();
  }

  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  /**
   * 1. Funds Reservation Entry
   */
  public async recordReserveHold(params: {
    payoutId: string;
    userId: string;
    asset: string;
    amount: number;
  }): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: `led_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payout_id: params.payoutId,
      entry_type: 'RESERVE_HOLD',
      debit_account: `customer_available:${params.userId}:${params.asset}`,
      credit_account: `escrow_locked:${params.userId}:${params.asset}`,
      asset: params.asset,
      amount: params.amount,
      description: `Reserve funds for Pay to Card payout #${params.payoutId}`,
      created_at: new Date().toISOString(),
    };

    await this.db.saveLedgerEntry(entry);
    return entry;
  }

  /**
   * 2. Conversion and Clearing Entry
   */
  public async recordConversionSettlement(params: {
    payoutId: string;
    userId: string;
    sourceAsset: string;
    sourceAmount: number;
    destinationCurrency: string;
    destinationAmount: number;
  }): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: `led_conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payout_id: params.payoutId,
      entry_type: 'CONVERSION_SETTLEMENT',
      debit_account: `escrow_locked:${params.userId}:${params.sourceAsset}`,
      credit_account: `fiat_clearing_pool:${params.destinationCurrency}`,
      asset: params.sourceAsset,
      amount: params.sourceAmount,
      description: `Settle crypto-to-fiat conversion for payout #${params.payoutId} (${params.destinationAmount} ${params.destinationCurrency})`,
      created_at: new Date().toISOString(),
    };

    await this.db.saveLedgerEntry(entry);
    return entry;
  }

  /**
   * 3. Provider Payout Settlement Entry
   */
  public async recordProviderPayout(params: {
    payoutId: string;
    provider: string;
    currency: string;
    amount: number;
  }): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: `led_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payout_id: params.payoutId,
      entry_type: 'PROVIDER_PAYOUT',
      debit_account: `fiat_clearing_pool:${params.currency}`,
      credit_account: `card_network_settlement:${params.provider}:${params.currency}`,
      asset: params.currency,
      amount: params.amount,
      description: `Finalize card disbursement via ${params.provider} for payout #${params.payoutId}`,
      created_at: new Date().toISOString(),
    };

    await this.db.saveLedgerEntry(entry);
    return entry;
  }

  /**
   * 4. Compensating Refund Entry
   */
  public async recordRefundRelease(params: {
    payoutId: string;
    userId: string;
    asset: string;
    amount: number;
    reason: string;
  }): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: `led_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payout_id: params.payoutId,
      entry_type: 'REFUND_RELEASE',
      debit_account: `escrow_locked:${params.userId}:${params.asset}`,
      credit_account: `customer_available:${params.userId}:${params.asset}`,
      asset: params.asset,
      amount: params.amount,
      description: `Release reserved escrow back to wallet. Reason: ${params.reason}`,
      created_at: new Date().toISOString(),
    };

    await this.db.saveLedgerEntry(entry);
    return entry;
  }

  /**
   * 5. Compensating Reversal Entry
   */
  public async recordReversalCredit(params: {
    payoutId: string;
    userId: string;
    asset: string;
    amount: number;
  }): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: `led_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payout_id: params.payoutId,
      entry_type: 'REVERSAL_CREDIT',
      debit_account: `card_network_chargeback:${params.asset}`,
      credit_account: `customer_available:${params.userId}:${params.asset}`,
      asset: params.asset,
      amount: params.amount,
      description: `Credit reversed funds back to user account for payout #${params.payoutId}`,
      created_at: new Date().toISOString(),
    };

    await this.db.saveLedgerEntry(entry);
    return entry;
  }

  /**
   * Performs financial reconciliation between Payout records, Provider transactions, and Ledger entries
   */
  public async reconcilePayout(payoutId: string): Promise<ReconciliationReport> {
    const payout = await this.db.getPayout(payoutId);
    if (!payout) {
      throw new Error(`Payout ${payoutId} not found`);
    }

    const ledger = await this.db.getLedgerEntriesForPayout(payoutId);
    const providerTxs = await this.db.getProviderTransactions(payoutId);

    const issues: string[] = [];
    const hasReserve = ledger.some((l) => l.entry_type === 'RESERVE_HOLD');
    const hasSettlement = ledger.some((l) => l.entry_type === 'CONVERSION_SETTLEMENT' || l.entry_type === 'PROVIDER_PAYOUT');
    const hasRefund = ledger.some((l) => l.entry_type === 'REFUND_RELEASE');

    if (!hasReserve) {
      issues.push('Missing initial RESERVE_HOLD ledger entry');
    }

    if (payout.status === 'COMPLETED' && !hasSettlement) {
      issues.push('Payout is marked COMPLETED but lacks settlement ledger entries');
    }

    if (payout.status === 'FAILED' && !hasRefund && hasReserve) {
      issues.push('Payout is marked FAILED but reserved funds have not been released by compensating ledger entry');
    }

    const latestProviderTx = providerTxs[providerTxs.length - 1];

    let reconciliation_status: ReconciliationReport['reconciliation_status'] = 'MATCHED';
    if (issues.length > 0) {
      reconciliation_status = 'MISMATCH';
    } else if (payout.status === 'PROCESSING' && !latestProviderTx) {
      reconciliation_status = 'MISSING';
      issues.push('Awaiting provider transaction confirmation');
    }

    return {
      payoutId: payout.id,
      payout_id: payout.id,
      payoutStatus: payout.status,
      payfluxStatus: payout.status,
      payout_status: payout.status,
      payout_amount: payout.source_amount,
      currency: payout.source_asset,
      provider_status: latestProviderTx?.provider_status,
      providerStatus: latestProviderTx?.provider_status,
      provider_tx_id: latestProviderTx?.provider_transaction_id,
      providerTransactionId: latestProviderTx?.provider_transaction_id,
      ledger_balanced: issues.length === 0,
      ledgerEntriesCount: ledger.length,
      reconciliation_status,
      status: reconciliation_status,
      issues,
    };
  }
}
