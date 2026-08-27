/*
# Add token column to payment_sessions

1. Modified Tables
- `payment_sessions`
  - Add `token` (text, not null, default 'usdt') — the ERC-20 token used
    for the payment, either 'usdt' or 'usdc'. Existing rows default to
    'usdt' for backward compatibility.

2. Security
- No RLS policy changes — the existing anon+authenticated CRUD policies
  already cover the new column since they use USING (true) / WITH CHECK (true).
*/

DO $$ BEGIN
  ALTER TABLE payment_sessions
    ADD COLUMN IF NOT EXISTS token text NOT NULL DEFAULT 'usdt';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
