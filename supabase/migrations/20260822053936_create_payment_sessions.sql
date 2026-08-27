/*
# Create payment_sessions table

1. New Tables
- `payment_sessions`
  - `id` (uuid, primary key) — unique session id used in payment links/QR codes
  - `merchant_address` (text, not null) — the merchant's wallet address to receive payment
  - `amount_eth` (numeric, not null) — the payment amount in Sepolia ETH
  - `status` (text, not null, default 'pending') — one of: pending, confirming, success, failed
  - `tx_hash` (text, nullable) — the on-chain transaction hash once the customer pays
  - `customer_address` (text, nullable) — the wallet address that paid
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `payment_sessions`.
- This is a no-auth crypto payment app (no sign-in screen). The merchant and
  customer both interact via the anon key, so policies allow anon + authenticated
  CRUD. The data is intentionally shared/public: a session created by a merchant
  must be readable and updatable by the customer who opens the payment link.
*/

CREATE TABLE IF NOT EXISTS payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address text NOT NULL,
  amount_eth numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tx_hash text,
  customer_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payment_sessions" ON payment_sessions;
CREATE POLICY "anon_select_payment_sessions" ON payment_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payment_sessions" ON payment_sessions;
CREATE POLICY "anon_insert_payment_sessions" ON payment_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_payment_sessions" ON payment_sessions;
CREATE POLICY "anon_update_payment_sessions" ON payment_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_payment_sessions" ON payment_sessions;
CREATE POLICY "anon_delete_payment_sessions" ON payment_sessions FOR DELETE
  TO anon, authenticated USING (true);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_sessions_updated_at ON payment_sessions;
CREATE TRIGGER payment_sessions_updated_at
  BEFORE UPDATE ON payment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
