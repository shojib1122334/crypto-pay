import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SubscriptionRecord {
  id: string;
  planId: '1_month' | '3_months';
  planName: string;
  usdAmount: number;
  token: 'USDT' | 'USDC';
  tokenAmount: string;
  receivingWallet: string;
  txHash: string;
  blockNumber?: number;
  startDate: string;
  expiryDate: string;
  startTimestamp: number;
  expiryTimestamp: number;
  status: 'Active' | 'Expired';
  createdAt: number;
}

export interface WalletSubscriptionData {
  wallet_address: string;
  free_trial_granted: boolean;
  free_trial_used: boolean;
  free_trial_used_at: string | null;
  trial_runs_used: number;
  status: 'None' | 'Trial' | 'Active' | 'Expired';
  subscription: SubscriptionRecord | null;
  history: SubscriptionRecord[];
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'wallet_subscriptions.json');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
      console.warn('Could not create data directory:', err);
    }
  }
}

// In-memory cache + file backing
let memoryStore: Record<string, WalletSubscriptionData> = {};

function loadStoreFromFile(): Record<string, WalletSubscriptionData> {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error('Error reading wallet_subscriptions.json:', err);
    return {};
  }
}

function persistStoreToFile(store: Record<string, WalletSubscriptionData>): void {
  ensureDataDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting wallet_subscriptions.json:', err);
  }
}

// Initialize memoryStore on load
memoryStore = loadStoreFromFile();

// Supabase client instance if environment credentials exist
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Connected to Supabase for permanent wallet subscriptions.');
  } catch (err) {
    console.warn('[Supabase] Initialization failed:', err);
  }
}

/**
 * Normalizes an Ethereum/Polygon wallet address to lowercase
 */
export function normalizeAddress(addr: string): string {
  return (addr || '').trim().toLowerCase();
}

/**
 * Sync wallet record to Supabase if connected
 */
async function syncToSupabase(record: WalletSubscriptionData): Promise<void> {
  if (!supabase) return;
  try {
    // 1. Upsert into wallet_subscriptions
    const { error: subErr } = await supabase.from('wallet_subscriptions').upsert(
      {
        wallet_address: record.wallet_address,
        free_trial_granted: record.free_trial_granted,
        free_trial_used: record.free_trial_used,
        free_trial_used_at: record.free_trial_used_at,
        trial_runs_used: record.trial_runs_used,
        status: record.status,
        plan_id: record.subscription?.planId || null,
        plan_name: record.subscription?.planName || null,
        usd_amount: record.subscription?.usdAmount || null,
        payment_token: record.subscription?.token || null,
        token_amount: record.subscription?.tokenAmount || null,
        receiving_wallet: record.subscription?.receivingWallet || null,
        tx_hash: record.subscription?.txHash || null,
        start_date: record.subscription?.startDate || null,
        expiry_date: record.subscription?.expiryDate || null,
        start_timestamp: record.subscription?.startTimestamp || null,
        expiry_timestamp: record.subscription?.expiryTimestamp || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wallet_address' }
    );

    if (subErr) {
      console.warn('[Supabase] Error upserting wallet_subscriptions:', subErr.message);
    }
  } catch (err) {
    console.warn('[Supabase] syncToSupabase failed:', err);
  }
}

/**
 * Sync a single payment history item to Supabase if connected
 */
async function syncHistoryToSupabase(walletAddress: string, item: SubscriptionRecord): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('wallet_subscription_history').insert({
      wallet_address: walletAddress,
      plan_id: item.planId,
      plan_name: item.planName,
      usd_amount: item.usdAmount,
      payment_token: item.token,
      token_amount: item.tokenAmount,
      receiving_wallet: item.receivingWallet,
      tx_hash: item.txHash,
      start_date: item.startDate,
      expiry_date: item.expiryDate,
      start_timestamp: item.startTimestamp,
      expiry_timestamp: item.expiryTimestamp,
      status: item.status,
      created_at: new Date(item.createdAt || Date.now()).toISOString(),
    });

    if (error) {
      console.warn('[Supabase] Error inserting history item:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] syncHistoryToSupabase failed:', err);
  }
}

/**
 * Fetch record from Supabase if connected
 */
async function fetchFromSupabase(normalizedAddr: string): Promise<WalletSubscriptionData | null> {
  if (!supabase) return null;
  try {
    const { data: subData, error: subError } = await supabase
      .from('wallet_subscriptions')
      .select('*')
      .eq('wallet_address', normalizedAddr)
      .maybeSingle();

    if (subError || !subData) {
      return null;
    }

    // Fetch history
    const { data: histData } = await supabase
      .from('wallet_subscription_history')
      .select('*')
      .eq('wallet_address', normalizedAddr)
      .order('created_at', { ascending: false });

    const history: SubscriptionRecord[] = (histData || []).map((h) => ({
      id: h.id,
      planId: h.plan_id,
      planName: h.plan_name,
      usdAmount: Number(h.usd_amount),
      token: h.payment_token,
      tokenAmount: h.token_amount,
      receivingWallet: h.receiving_wallet,
      txHash: h.tx_hash,
      startDate: h.start_date,
      expiryDate: h.expiry_date,
      startTimestamp: Number(h.start_timestamp),
      expiryTimestamp: Number(h.expiry_timestamp),
      status: h.status,
      createdAt: new Date(h.created_at).getTime(),
    }));

    let activeSub: SubscriptionRecord | null = null;
    if (subData.plan_id && subData.tx_hash) {
      activeSub = {
        id: `SUB-${subData.tx_hash.slice(-6)}`,
        planId: subData.plan_id,
        planName: subData.plan_name || 'Pro Subscription',
        usdAmount: Number(subData.usd_amount || 0),
        token: subData.payment_token || 'USDT',
        tokenAmount: subData.token_amount || '0',
        receivingWallet: subData.receiving_wallet || '',
        txHash: subData.tx_hash,
        startDate: subData.start_date || '',
        expiryDate: subData.expiry_date || '',
        startTimestamp: Number(subData.start_timestamp || 0),
        expiryTimestamp: Number(subData.expiry_timestamp || 0),
        status: subData.status === 'Active' ? 'Active' : 'Expired',
        createdAt: new Date(subData.created_at || Date.now()).getTime(),
      };
    }

    return {
      wallet_address: subData.wallet_address,
      free_trial_granted: subData.free_trial_granted ?? true,
      free_trial_used: subData.free_trial_used ?? false,
      free_trial_used_at: subData.free_trial_used_at || null,
      trial_runs_used: subData.trial_runs_used ?? (subData.free_trial_used ? 1 : 0),
      status: subData.status || 'None',
      subscription: activeSub,
      history,
      created_at: subData.created_at || new Date().toISOString(),
      updated_at: subData.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Supabase] fetchFromSupabase error:', err);
    return null;
  }
}

/**
 * Get or initialize wallet subscription record
 */
export async function getWalletSubscription(rawAddress: string): Promise<WalletSubscriptionData> {
  const address = normalizeAddress(rawAddress);
  if (!address || !address.startsWith('0x')) {
    throw new Error('Invalid Ethereum/Polygon wallet address');
  }

  // 1. Check in-memory store
  let record = memoryStore[address];

  // 2. If not found in local store, try Supabase
  if (!record) {
    const supabaseRecord = await fetchFromSupabase(address);
    if (supabaseRecord) {
      record = supabaseRecord;
      memoryStore[address] = record;
      persistStoreToFile(memoryStore);
    }
  }

  // 3. If still not found, this is a brand new wallet connecting for the first time
  if (!record) {
    record = {
      wallet_address: address,
      free_trial_granted: true,
      free_trial_used: false,
      free_trial_used_at: null,
      trial_runs_used: 0,
      status: 'None',
      subscription: null,
      history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore[address] = record;
    persistStoreToFile(memoryStore);
    // Background sync to Supabase
    syncToSupabase(record).catch(() => {});
    return record;
  }

  // 4. If record exists, check if active subscription has expired
  if (record.subscription) {
    const now = Date.now();
    if (now > record.subscription.expiryTimestamp && record.subscription.status === 'Active') {
      record.subscription.status = 'Expired';
      record.status = 'Expired';
      record.updated_at = new Date().toISOString();
      memoryStore[address] = record;
      persistStoreToFile(memoryStore);
      syncToSupabase(record).catch(() => {});
    }
  }

  return record;
}

/**
 * Consume Free Trial for wallet address (Permanent - Once Only)
 */
export async function useWalletFreeTrial(rawAddress: string): Promise<{
  success: boolean;
  error?: string;
  record?: WalletSubscriptionData;
}> {
  const address = normalizeAddress(rawAddress);
  if (!address || !address.startsWith('0x')) {
    return { success: false, error: 'Invalid wallet address' };
  }

  const record = await getWalletSubscription(address);

  // Strict check: if free trial was already used, reject permanently
  if (record.free_trial_used || record.trial_runs_used >= 1) {
    return {
      success: false,
      error: 'Free Trial has already been used permanently by this wallet address. Please upgrade your subscription.',
      record,
    };
  }

  // Mark trial as used permanently
  record.free_trial_used = true;
  record.trial_runs_used = 1;
  record.free_trial_used_at = new Date().toISOString();
  record.updated_at = new Date().toISOString();

  memoryStore[address] = record;
  persistStoreToFile(memoryStore);

  // Sync to Supabase
  await syncToSupabase(record);

  return {
    success: true,
    record,
  };
}

/**
 * Upgrade Subscription for wallet address
 */
export async function upgradeWalletSubscription(
  rawAddress: string,
  subRecord: SubscriptionRecord
): Promise<{
  success: boolean;
  error?: string;
  record?: WalletSubscriptionData;
}> {
  const address = normalizeAddress(rawAddress);
  if (!address || !address.startsWith('0x')) {
    return { success: false, error: 'Invalid wallet address' };
  }

  const record = await getWalletSubscription(address);

  // Update subscription
  record.status = 'Active';
  record.subscription = subRecord;
  record.updated_at = new Date().toISOString();

  // Deduplicate and prepend to history
  const filteredHistory = record.history.filter(
    (h) => h.txHash.toLowerCase() !== subRecord.txHash.toLowerCase()
  );
  record.history = [subRecord, ...filteredHistory];

  memoryStore[address] = record;
  persistStoreToFile(memoryStore);

  // Sync to Supabase
  await syncToSupabase(record);
  await syncHistoryToSupabase(address, subRecord);

  return {
    success: true,
    record,
  };
}
