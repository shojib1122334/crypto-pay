// Database and Domain Types for PayFlux Pay to Card System

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'FROZEN';
export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_REVIEW';
export type UserRole = 'USER' | 'COMPLIANCE_OFFICER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  status: UserStatus;
  kyc_status: KycStatus;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  asset: string; // e.g., 'USDT', 'USDC', 'BTC', 'ETH'
  balance: number;
  available_balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

export type WalletTxType = 'DEPOSIT' | 'WITHDRAWAL' | 'PAYOUT_RESERVE' | 'PAYOUT_SETTLED' | 'PAYOUT_REFUND';
export type WalletTxStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTxType;
  amount: number;
  fee: number;
  status: WalletTxStatus;
  tx_hash?: string;
  created_at: string;
}

export interface Beneficiary {
  id: string;
  user_id: string;
  provider: string;
  provider_token: string;
  card_brand: string; // 'VISA' | 'MASTERCARD' | etc.
  last4: string;
  cardholder_name: string;
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED';
  created_at: string;
  updated_at: string;
}

export type QuoteStatus = 'ACTIVE' | 'USED' | 'EXPIRED';

export interface Quote {
  id: string;
  user_id: string;
  source_asset: string;
  source_amount: number;
  destination_currency: string;
  destination_amount: number;
  exchange_rate: number;
  network_fee: number;
  platform_fee: number;
  conversion_fee: number;
  total_amount: number;
  provider: string;
  expires_at: string;
  status: QuoteStatus;
  created_at: string;
}

export type PayoutStatus =
  | 'CREATED'
  | 'QUOTE_CREATED'
  | 'VALIDATING'
  | 'COMPLIANCE_CHECK'
  | 'BALANCE_RESERVED'
  | 'CONVERSION_PENDING'
  | 'CONVERSION_COMPLETED'
  | 'PAYOUT_SUBMITTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSAL_PENDING'
  | 'REVERSED'
  | 'CANCELLED';

export interface Payout {
  id: string;
  user_id: string;
  beneficiary_id: string;
  quote_id: string;
  source_asset: string;
  source_amount: number;
  destination_currency: string;
  destination_amount: number;
  exchange_rate: number;
  network_fee: number;
  platform_fee: number;
  conversion_fee: number;
  total_fee: number;
  provider: string;
  provider_transaction_id?: string;
  idempotency_key: string;
  status: PayoutStatus;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  payout_id?: string;
  entry_type: 'RESERVE_HOLD' | 'CONVERSION_SETTLEMENT' | 'PROVIDER_PAYOUT' | 'REFUND_RELEASE' | 'REVERSAL_CREDIT';
  debit_account: string;
  credit_account: string;
  asset: string;
  amount: number;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface PayoutAttempt {
  id: string;
  payout_id: string;
  attempt_number: number;
  provider: string;
  request_reference: string;
  provider_transaction_id?: string;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  error_code?: string;
  error_message?: string;
  created_at: string;
}

export interface ProviderTransaction {
  id: string;
  payout_id: string;
  provider: string;
  provider_transaction_id: string;
  provider_status: string;
  provider_response_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload_hash: string;
  processed: boolean;
  processed_at?: string;
  created_at: string;
}

export type RiskLevel = 'LOW_RISK' | 'REVIEW_REQUIRED' | 'REJECTED';
export type RiskDecision = 'APPROVED' | 'FLAGGED' | 'BLOCKED';

export interface RiskCheck {
  id: string;
  payout_id?: string;
  user_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  kyc_result: 'PASS' | 'FAIL' | 'REQUIRES_MANUAL_REVIEW';
  aml_result: 'CLEAR' | 'HIT_FLAGGED' | 'REVIEW';
  sanctions_result: 'CLEAR' | 'MATCH';
  decision: RiskDecision;
  flags?: string[];
  reason?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'RISK_ALERT';
  read: boolean;
  created_at: string;
}

export type ReconciliationStatus = 'MATCHED' | 'MISMATCH' | 'MISSING' | 'REVIEW_REQUIRED' | 'RESOLVED';

export interface ReconciliationReport {
  payoutId?: string;
  payout_id: string;
  payoutStatus?: string;
  payfluxStatus?: string;
  payout_status: PayoutStatus;
  payout_amount: number;
  currency: string;
  provider_status?: string;
  providerStatus?: string;
  provider_tx_id?: string;
  providerTransactionId?: string;
  ledger_balanced: boolean;
  ledgerEntriesCount?: number;
  reconciliation_status: ReconciliationStatus;
  status?: string;
  issues: string[];
}
