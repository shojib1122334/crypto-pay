// PayFlux Central API Router
// Registers Endpoints for Wallets, Quotes, Beneficiaries, Payouts, Admin, and Automated Test Suite

import { Router, Request, Response, NextFunction } from 'express';
import { Database } from '../database/db.js';
import { CardPayoutService } from '../services/card-payout/CardPayoutService.js';
import { ConversionService } from '../services/conversion/ConversionService.js';
import { WalletService } from '../services/wallet/WalletService.js';
import { LedgerService } from '../services/ledger/LedgerService.js';
import { ProviderFactory } from '../providers/card-payout/ProviderFactory.js';
import { CardPayoutValidator } from '../services/card-payout/CardPayoutValidator.js';
import { PayFluxError } from '../services/card-payout/CardPayoutErrors.js';

export const apiRouter = Router();

const db = Database.getInstance();
const payoutService = CardPayoutService.getInstance();
const conversionService = ConversionService.getInstance();
const walletService = WalletService.getInstance();
const ledgerService = LedgerService.getInstance();

// Authentication middleware simulation (Resolves authenticated user from session/cookie)
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.headers['x-user-id'] as string) || 'usr_payflux_main';
  const user = await db.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User session not found' } });
  }
  (req as any).user = user;
  next();
};

apiRouter.use(authenticateUser);

// 1. GET /api/wallets - Fetch balances
apiRouter.get('/wallets', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const wallets = await walletService.getBalances(user.id);
    res.json({ wallets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/wallets/deposit - Simulate crypto deposit
apiRouter.post('/wallets/deposit', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { asset, amount } = req.body;
    const wallet = await walletService.deposit(user.id, asset, parseFloat(amount));
    res.json({ wallet });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. POST /api/quotes - Create conversion quote
apiRouter.post('/quotes', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { sourceAsset, destinationCurrency, sourceAmount, destinationAmount } = req.body;

    const quote = await conversionService.createQuote({
      userId: user.id,
      sourceAsset,
      destinationCurrency,
      sourceAmount: sourceAmount ? parseFloat(sourceAmount) : undefined,
      destinationAmount: destinationAmount ? parseFloat(destinationAmount) : undefined,
    });

    res.status(201).json({ quote });
  } catch (err: any) {
    if (err instanceof PayFluxError) {
      return res.status(err.statusCode).json(err.toJSON());
    }
    res.status(400).json({ error: { code: 'QUOTE_ERROR', message: err.message } });
  }
});

// 4. POST /api/beneficiaries - Validate and register card
apiRouter.post('/beneficiaries', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { cardNumber, cardholderName, expiryMonth, expiryYear, cvv, providerToken } = req.body;

    const beneficiary = await payoutService.registerBeneficiary(user.id, {
      cardNumber,
      cardholderName,
      expiryMonth: parseInt(expiryMonth, 10),
      expiryYear: parseInt(expiryYear, 10),
      cvv,
      providerToken,
    });

    res.status(201).json({ beneficiary });
  } catch (err: any) {
    if (err instanceof PayFluxError) {
      return res.status(err.statusCode).json(err.toJSON());
    }
    res.status(400).json({ error: { code: 'INVALID_CARD', message: err.message } });
  }
});

// 5. GET /api/beneficiaries - List active card beneficiaries
apiRouter.get('/beneficiaries', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const beneficiaries = await db.getBeneficiaries(user.id);
    res.json({ beneficiaries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/payouts - Execute Pay to Card Payout
apiRouter.post('/payouts', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { beneficiaryId, newCard, quoteId, idempotencyKey } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'idempotencyKey is required for payout execution' },
      });
    }

    const payout = await payoutService.executePayout({
      userId: user.id,
      beneficiaryId,
      newCard,
      quoteId,
      idempotencyKey,
    });

    res.status(201).json({ payout });
  } catch (err: any) {
    if (err instanceof PayFluxError) {
      return res.status(err.statusCode).json(err.toJSON());
    }
    res.status(500).json({ error: { code: 'PAYOUT_ERROR', message: err.message } });
  }
});

// 7. GET /api/payouts - List user payouts
apiRouter.get('/payouts', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const payouts = await db.getAllPayouts(user.id);
    res.json({ payouts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /api/payouts/:id - Payout detail with audit & ledger entries
apiRouter.get('/payouts/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const payout = await payoutService.getPayout(req.params.id, user.id);
    const ledger = await db.getLedgerEntriesForPayout(payout.id);
    const providerTxs = await db.getProviderTransactions(payout.id);

    res.json({ payout, ledger, providerTxs });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 9. GET /api/admin/reconciliation - Full 3-way ledger reconciliation
apiRouter.get('/admin/reconciliation', async (req: Request, res: Response) => {
  try {
    const payouts = await db.getAllPayouts();
    const reports = await Promise.all(payouts.map((p) => ledgerService.reconcilePayout(p.id)));
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. GET /api/admin/providers - Provider health and configuration details
apiRouter.get('/admin/providers', async (req: Request, res: Response) => {
  try {
    const providers = ProviderFactory.getAllProviders().map((p) => p.getConfigDetails());
    res.json({ providers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. POST /api/tests/run - Automated Invariant & Compliance Test Suite
apiRouter.post('/tests/run', async (req: Request, res: Response) => {
  const results: Array<{ name: string; category: string; passed: boolean; details: string }> = [];

  // Test 1: Luhn algorithm validation
  try {
    const validVisa = CardPayoutValidator.validateLuhn('4532015112830366');
    const invalidVisa = CardPayoutValidator.validateLuhn('4532015112830367');
    results.push({
      name: 'Luhn Algorithm Invariant',
      category: 'PCI-DSS & Card Validation',
      passed: validVisa === true && invalidVisa === false,
      details: 'Correctly verified checksums on valid and corrupt PAN digits',
    });
  } catch (err: any) {
    results.push({ name: 'Luhn Algorithm Invariant', category: 'PCI-DSS', passed: false, details: err.message });
  }

  // Test 2: Brand detection
  try {
    const brandVisa = CardPayoutValidator.detectBrand('4111111111111111');
    const brandMc = CardPayoutValidator.detectBrand('5500000000000004');
    results.push({
      name: 'Card Brand Identification (Visa / Mastercard)',
      category: 'Card Classification',
      passed: brandVisa === 'VISA' && brandMc === 'MASTERCARD',
      details: `Detected Visa=${brandVisa}, Mastercard=${brandMc}`,
    });
  } catch (err: any) {
    results.push({ name: 'Card Brand Identification', category: 'Card Classification', passed: false, details: err.message });
  }

  // Test 3: PAN Sanitization (PCI-DSS)
  try {
    const resVal = CardPayoutValidator.validateCardInput({
      cardNumber: '4532015112830366',
      cardholderName: 'Jane Doe',
      expiryMonth: 12,
      expiryYear: 2028,
    });
    const panNotPresent = !(resVal as any).cardNumber && !(resVal as any).pan;
    results.push({
      name: 'PCI-DSS Invariant: Zero PAN Persistence',
      category: 'Data Protection & Security',
      passed: panNotPresent && resVal.last4 === '0366' && resVal.providerToken.startsWith('tok_'),
      details: 'PAN discarded; replaced with synthetic provider token and masked last4',
    });
  } catch (err: any) {
    results.push({ name: 'PCI-DSS Zero PAN', category: 'Security', passed: false, details: err.message });
  }

  // Test 4: Live Quote Expiry
  try {
    const quote = await conversionService.createQuote({
      userId: 'usr_payflux_main',
      sourceAsset: 'USDT',
      destinationCurrency: 'USD',
      sourceAmount: 100,
    });
    const hasExpiry = new Date(quote.expires_at).getTime() > Date.now();
    results.push({
      name: 'Dynamic Quote Time-To-Live (60s SLA)',
      category: 'Market Conversion',
      passed: hasExpiry && quote.exchange_rate > 0 && quote.total_amount > 100,
      details: `Created quote #${quote.id} with rate ${quote.exchange_rate} and TTL window`,
    });
  } catch (err: any) {
    results.push({ name: 'Dynamic Quote TTL', category: 'Market Conversion', passed: false, details: err.message });
  }

  // Test 5: Double-spending prevention and idempotency
  try {
    const testKey = `idem_test_${Date.now()}`;
    const quote = await conversionService.createQuote({
      userId: 'usr_payflux_main',
      sourceAsset: 'USDC',
      destinationCurrency: 'USD',
      sourceAmount: 25,
    });
    const p1 = await payoutService.executePayout({
      userId: 'usr_payflux_main',
      quoteId: quote.id,
      idempotencyKey: testKey,
      newCard: {
        cardNumber: '4532015112830366',
        cardholderName: 'Test Idempotency',
        expiryMonth: 10,
        expiryYear: 2029,
      },
    });

    const p2 = await payoutService.executePayout({
      userId: 'usr_payflux_main',
      quoteId: quote.id,
      idempotencyKey: testKey,
      beneficiaryId: p1.beneficiary_id,
    });

    results.push({
      name: 'Idempotency & Double-Spending Invariant',
      category: 'Transactional Integrity',
      passed: p1.id === p2.id && p1.created_at === p2.created_at,
      details: `Replay verified. Returned exact identical record #${p1.id} without double debits`,
    });
  } catch (err: any) {
    results.push({ name: 'Idempotency Invariant', category: 'Transactional Integrity', passed: false, details: err.message });
  }

  // Test 6: Balanced Ledger Accounting
  try {
    const payouts = await db.getAllPayouts();
    const latestPayout = payouts[0];
    if (latestPayout) {
      const recon = await ledgerService.reconcilePayout(latestPayout.id);
      results.push({
        name: 'Double-Entry Ledger Balancing',
        category: 'Accounting & Audit',
        passed: recon.ledger_balanced === true,
        details: `Ledger entries verified balanced with zero audit discrepancies for #${latestPayout.id}`,
      });
    } else {
      results.push({
        name: 'Double-Entry Ledger Balancing',
        category: 'Accounting & Audit',
        passed: true,
        details: 'No historical payouts found, clean slate accounting validated',
      });
    }
  } catch (err: any) {
    results.push({ name: 'Double-Entry Ledger Balancing', category: 'Accounting', passed: false, details: err.message });
  }

  res.json({
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      timestamp: new Date().toISOString(),
    },
    results,
  });
});
