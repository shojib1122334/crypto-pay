import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type PaymentStatus = 'pending' | 'confirming' | 'success' | 'failed';

export interface PaymentSession {
  id: string;
  merchant_address: string;
  amount_eth: number;
  token: string;
  status: PaymentStatus;
  tx_hash: string | null;
  customer_address: string | null;
  created_at: string;
  updated_at: string;
}

