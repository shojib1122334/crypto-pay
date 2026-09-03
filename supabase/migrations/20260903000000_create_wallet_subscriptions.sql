/*
# Create permanent wallet_subscriptions and wallet_subscription_history tables

1. Tables
- `wallet_subscriptions`
  - `wallet_address` (text, primary key) — normalized lowercase 0x wallet address
  - `free_trial_granted` (boolean, default true)
  - `free_trial_used` (boolean, default false)
  - `free_trial_used_at` (timestamptz, nullable)
  - `trial_runs_used` (integer, default 0)
  - `status` (text, default 'None') — 'None', 'Trial', 'Active', 'Expired'
  - `plan_id` (text, nullable) — e.g. '1_month', '3_months'
  - `plan_name` (text, nullable)
  - `usd_amount` (numeric, nullable)
  - `payment_token` (text, nullable)
  - `token_amount` (text, nullable)
  - `receiving_wallet` (text, nullable)
  - `tx_hash` (text, nullable)
  - `start_date` (text, nullable)
  - `expiry_date` (text, nullable)
  - `start_timestamp` (bigint, nullable)
  - `expiry_timestamp` (bigint, nullable)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `wallet_subscription_history`
  - `id` (uuid, primary key)
  - `wallet_address` (text, not null)
  - `plan_id` (text, not null)
  - `plan_name` (text, not null)
  - `usd_amount` (numeric, not null)
  - `payment_token` (text, not null)
  - `token_amount` (text, not null)
  - `receiving_wallet` (text, not null)
  - `tx_hash` (text, not null)
  - `start_date` (text, not null)
  - `expiry_date` (text, not null)
  - `start_timestamp` (bigint, not null)
  - `expiry_timestamp` (bigint, not null)
  - `status` (text, default 'Active')
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- Public read and write for authenticated & anon wallets.
*/

CREATE TABLE IF NOT EXISTS wallet_subscriptions (
  wallet_address text PRIMARY KEY,
  free_trial_granted boolean NOT NULL DEFAULT true,
  free_trial_used boolean NOT NULL DEFAULT false,
  free_trial_used_at timestamptz,
  trial_runs_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'None',
  plan_id text,
  plan_name text,
  usd_amount numeric,
  payment_token text,
  token_amount text,
  receiving_wallet text,
  tx_hash text,
  start_date text,
  expiry_date text,
  start_timestamp bigint,
  expiry_timestamp bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  usd_amount numeric NOT NULL,
  payment_token text NOT NULL,
  token_amount text NOT NULL,
  receiving_wallet text NOT NULL,
  tx_hash text NOT NULL,
  start_date text NOT NULL,
  expiry_date text NOT NULL,
  start_timestamp bigint NOT NULL,
  expiry_timestamp bigint NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_history_wallet ON wallet_subscription_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sub_history_tx_hash ON wallet_subscription_history(tx_hash);

-- Enable RLS
ALTER TABLE wallet_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_subscription_history ENABLE ROW LEVEL SECURITY;

-- Anon policies for wallet_subscriptions
DROP POLICY IF EXISTS "anon_select_wallet_subscriptions" ON wallet_subscriptions;
CREATE POLICY "anon_select_wallet_subscriptions" ON wallet_subscriptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_wallet_subscriptions" ON wallet_subscriptions;
CREATE POLICY "anon_insert_wallet_subscriptions" ON wallet_subscriptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_wallet_subscriptions" ON wallet_subscriptions;
CREATE POLICY "anon_update_wallet_subscriptions" ON wallet_subscriptions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Anon policies for wallet_subscription_history
DROP POLICY IF EXISTS "anon_select_wallet_sub_history" ON wallet_subscription_history;
CREATE POLICY "anon_select_wallet_sub_history" ON wallet_subscription_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_wallet_sub_history" ON wallet_subscription_history;
CREATE POLICY "anon_insert_wallet_sub_history" ON wallet_subscription_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);
