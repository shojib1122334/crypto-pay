// PayFlux In-Memory and JSON Data Store
// Provides reliable ACID-like record integrity, concurrency locks, and seeding

import {
  User,
  Wallet,
  WalletTransaction,
  Beneficiary,
  Quote,
  Payout,
  LedgerEntry,
  PayoutAttempt,
  ProviderTransaction,
  WebhookEvent,
  RiskCheck,
  AuditLog,
  Notification,
} from '../types/database.js';
import { PaymentRecord } from '../types/polygon.js';

export class Database {
  private static instance: Database;

  // Locks map for mutual exclusion during balance reservations
  private locks: Map<string, Promise<void>> = new Map();

  public tables = {
    users: new Map<string, User>(),
    wallets: new Map<string, Wallet>(),
    wallet_transactions: new Map<string, WalletTransaction>(),
    beneficiaries: new Map<string, Beneficiary>(),
    quotes: new Map<string, Quote>(),
    payouts: new Map<string, Payout>(),
    ledger_entries: new Map<string, LedgerEntry>(),
    payout_attempts: new Map<string, PayoutAttempt>(),
    provider_transactions: new Map<string, ProviderTransaction>(),
    webhook_events: new Map<string, WebhookEvent>(),
    risk_checks: new Map<string, RiskCheck>(),
    audit_logs: new Map<string, AuditLog>(),
    notifications: new Map<string, Notification>(),
    payment_records: new Map<string, PaymentRecord>(),
  };

  private constructor() {
    this.seedDefaults();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private seedDefaults() {
    // Default primary user
    const defaultUser: User = {
      id: 'usr_payflux_main',
      email: 'merchant@payflux.network',
      status: 'ACTIVE',
      kyc_status: 'VERIFIED',
      two_factor_enabled: true,
      role: 'ADMIN',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.tables.users.set(defaultUser.id, defaultUser);

    // Initial Wallets with balances
    const initialWallets: Wallet[] = [
      {
        id: 'wal_usr_payflux_main_usdt',
        user_id: defaultUser.id,
        asset: 'USDT',
        balance: 14500.0,
        available_balance: 14500.0,
        locked_balance: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'wal_usr_payflux_main_usdc',
        user_id: defaultUser.id,
        asset: 'USDC',
        balance: 12000.0,
        available_balance: 12000.0,
        locked_balance: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'wal_usr_payflux_main_btc',
        user_id: defaultUser.id,
        asset: 'BTC',
        balance: 0.854,
        available_balance: 0.854,
        locked_balance: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'wal_usr_payflux_main_eth',
        user_id: defaultUser.id,
        asset: 'ETH',
        balance: 4.25,
        available_balance: 4.25,
        locked_balance: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const w of initialWallets) {
      this.tables.wallets.set(w.id, w);
    }
  }

  // Mutex lock for atomic wallet adjustments
  public async acquireLock(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let release: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      release = () => {
        this.locks.delete(key);
        resolve();
      };
    });

    this.locks.set(key, lockPromise);
    return release!;
  }

  // User methods
  public async getUser(id: string): Promise<User | null> {
    return this.tables.users.get(id) || null;
  }

  // Wallet methods
  public async getWallet(userId: string, asset: string): Promise<Wallet | null> {
    for (const wallet of this.tables.wallets.values()) {
      if (wallet.user_id === userId && wallet.asset.toUpperCase() === asset.toUpperCase()) {
        return { ...wallet };
      }
    }
    return null;
  }

  public async getAllWallets(userId: string): Promise<Wallet[]> {
    return Array.from(this.tables.wallets.values())
      .filter((w) => w.user_id === userId)
      .map((w) => ({ ...w }));
  }

  public async updateWallet(wallet: Wallet): Promise<void> {
    wallet.updated_at = new Date().toISOString();
    this.tables.wallets.set(wallet.id, { ...wallet });
  }

  // Beneficiary methods
  public async saveBeneficiary(b: Beneficiary): Promise<void> {
    this.tables.beneficiaries.set(b.id, { ...b });
  }

  public async getBeneficiary(id: string): Promise<Beneficiary | null> {
    return this.tables.beneficiaries.get(id) ? { ...this.tables.beneficiaries.get(id)! } : null;
  }

  public async getBeneficiaries(userId: string): Promise<Beneficiary[]> {
    return Array.from(this.tables.beneficiaries.values())
      .filter((b) => b.user_id === userId && b.status === 'ACTIVE')
      .map((b) => ({ ...b }));
  }

  // Quotes methods
  public async saveQuote(q: Quote): Promise<void> {
    this.tables.quotes.set(q.id, { ...q });
  }

  public async getQuote(id: string): Promise<Quote | null> {
    return this.tables.quotes.get(id) ? { ...this.tables.quotes.get(id)! } : null;
  }

  // Payout methods
  public async savePayout(p: Payout): Promise<void> {
    p.updated_at = new Date().toISOString();
    this.tables.payouts.set(p.id, { ...p });
  }

  public async getPayout(id: string): Promise<Payout | null> {
    return this.tables.payouts.get(id) ? { ...this.tables.payouts.get(id)! } : null;
  }

  public async getPayoutByIdempotencyKey(key: string): Promise<Payout | null> {
    for (const p of this.tables.payouts.values()) {
      if (p.idempotency_key === key) return { ...p };
    }
    return null;
  }

  public async getAllPayouts(userId?: string): Promise<Payout[]> {
    let list = Array.from(this.tables.payouts.values());
    if (userId) list = list.filter((p) => p.user_id === userId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((p) => ({ ...p }));
  }

  // Ledger entries
  public async saveLedgerEntry(entry: LedgerEntry): Promise<void> {
    this.tables.ledger_entries.set(entry.id, { ...entry });
  }

  public async getLedgerEntriesForPayout(payoutId: string): Promise<LedgerEntry[]> {
    return Array.from(this.tables.ledger_entries.values())
      .filter((l) => l.payout_id === payoutId)
      .map((l) => ({ ...l }));
  }

  public async getAllLedgerEntries(): Promise<LedgerEntry[]> {
    return Array.from(this.tables.ledger_entries.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((l) => ({ ...l }));
  }

  // Provider transactions
  public async saveProviderTransaction(tx: ProviderTransaction): Promise<void> {
    this.tables.provider_transactions.set(tx.id, { ...tx });
  }

  public async getProviderTransactions(payoutId: string): Promise<ProviderTransaction[]> {
    return Array.from(this.tables.provider_transactions.values())
      .filter((pt) => pt.payout_id === payoutId)
      .map((pt) => ({ ...pt }));
  }

  // Risk checks
  public async saveRiskCheck(rc: RiskCheck): Promise<void> {
    this.tables.risk_checks.set(rc.id, { ...rc });
  }

  // Audit logs
  public async saveAuditLog(al: AuditLog): Promise<void> {
    this.tables.audit_logs.set(al.id, { ...al });
  }

  public async getAllAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.tables.audit_logs.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((a) => ({ ...a }));
  }

  // Polygon Payment Records (Spec 22)
  public async savePaymentRecord(rec: PaymentRecord): Promise<void> {
    rec.updatedAt = new Date().toISOString();
    this.tables.payment_records.set(rec.paymentId, { ...rec });
  }

  public async getPaymentRecord(paymentId: string): Promise<PaymentRecord | null> {
    return this.tables.payment_records.get(paymentId) ? { ...this.tables.payment_records.get(paymentId)! } : null;
  }

  public async getPaymentRecordsByWallet(walletAddress: string): Promise<PaymentRecord[]> {
    return Array.from(this.tables.payment_records.values())
      .filter((r) => r.walletAddress.toLowerCase() === walletAddress.toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({ ...r }));
  }
}
