-- PayFlux Production PostgreSQL Schema
-- Migration 001: Pay to Card Rail, Wallets, Double-Entry Ledger, Risk & Webhooks

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, FROZEN
    kyc_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED', -- PENDING, VERIFIED, REJECTED, REQUIRES_REVIEW
    two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    two_factor_secret VARCHAR(64),
    role VARCHAR(32) NOT NULL DEFAULT 'USER', -- USER, COMPLIANCE_OFFICER, ADMIN
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(16) NOT NULL, -- e.g. USDT, USDC, BTC, ETH
    balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    available_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wallet_balance_integrity CHECK (balance = available_balance + locked_balance),
    CONSTRAINT uq_user_asset UNIQUE (user_id, asset)
);

-- 3. WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(64) PRIMARY KEY,
    wallet_id VARCHAR(64) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- DEPOSIT, WITHDRAWAL, PAYOUT_RESERVE, PAYOUT_SETTLED, PAYOUT_REFUND
    amount NUMERIC(36, 18) NOT NULL,
    fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL, -- PENDING, CONFIRMED, FAILED
    tx_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. BENEFICIARIES (Tokenized Card Recipients)
-- Strictly stores ONLY secure provider tokens and PCI-DSS permitted display metadata.
-- NEVER raw PAN, CVV, PIN, or track data.
CREATE TABLE IF NOT EXISTS beneficiaries (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL, -- stripe, checkout, visa_direct, etc.
    provider_token VARCHAR(255) NOT NULL,
    card_brand VARCHAR(32) NOT NULL, -- VISA, MASTERCARD, etc.
    last4 VARCHAR(4) NOT NULL,
    cardholder_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED, EXPIRED
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. QUOTES
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_asset VARCHAR(16) NOT NULL,
    source_amount NUMERIC(36, 18) NOT NULL CHECK (source_amount > 0),
    destination_currency VARCHAR(8) NOT NULL,
    destination_amount NUMERIC(18, 2) NOT NULL CHECK (destination_amount > 0),
    exchange_rate NUMERIC(36, 18) NOT NULL CHECK (exchange_rate > 0),
    network_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    platform_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    conversion_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    total_amount NUMERIC(36, 18) NOT NULL CHECK (total_amount > 0),
    provider VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, USED, EXPIRED
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. PAYOUTS
CREATE TABLE IF NOT EXISTS payouts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    beneficiary_id VARCHAR(64) NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
    quote_id VARCHAR(64) NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
    source_asset VARCHAR(16) NOT NULL,
    source_amount NUMERIC(36, 18) NOT NULL,
    destination_currency VARCHAR(8) NOT NULL,
    destination_amount NUMERIC(18, 2) NOT NULL,
    exchange_rate NUMERIC(36, 18) NOT NULL,
    network_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    platform_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    conversion_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    total_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    provider VARCHAR(64) NOT NULL,
    provider_transaction_id VARCHAR(128),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED', 
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. DOUBLE-ENTRY LEDGER ENTRIES
CREATE TABLE IF NOT EXISTS ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    payout_id VARCHAR(64) REFERENCES payouts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(64) NOT NULL,
    debit_account VARCHAR(128) NOT NULL,
    credit_account VARCHAR(128) NOT NULL,
    asset VARCHAR(16) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. PAYOUT ATTEMPTS
CREATE TABLE IF NOT EXISTS payout_attempts (
    id VARCHAR(64) PRIMARY KEY,
    payout_id VARCHAR(64) NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    provider VARCHAR(64) NOT NULL,
    request_reference VARCHAR(128) NOT NULL,
    provider_transaction_id VARCHAR(128),
    status VARCHAR(32) NOT NULL,
    error_code VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. PROVIDER TRANSACTIONS
CREATE TABLE IF NOT EXISTS provider_transactions (
    id VARCHAR(64) PRIMARY KEY,
    payout_id VARCHAR(64) NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    provider_transaction_id VARCHAR(128) NOT NULL,
    provider_status VARCHAR(64) NOT NULL,
    provider_response_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR(64) PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_provider_event UNIQUE (provider, event_id)
);

-- 11. RISK CHECKS
CREATE TABLE IF NOT EXISTS risk_checks (
    id VARCHAR(64) PRIMARY KEY,
    payout_id VARCHAR(64) REFERENCES payouts(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_score INT NOT NULL,
    risk_level VARCHAR(32) NOT NULL,
    kyc_result VARCHAR(32) NOT NULL,
    aml_result VARCHAR(32) NOT NULL,
    sanctions_result VARCHAR(32) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_idempotency ON payouts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_payout ON ledger_entries(payout_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
