import { supabase } from './supabase';
import type { SubscriptionRecord } from './subscription';

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

/**
 * Normalizes an Ethereum/Polygon wallet address
 */
export function normalizeWalletAddress(addr?: string | null): string {
  if (!addr) return '';
  return addr.trim().toLowerCase();
}

/**
 * Fetch wallet subscription & free trial data from permanent database (API / Supabase).
 * Database is the single source of truth; local storage is NEVER used.
 */
export async function fetchWalletSubscriptionFromDb(
  rawAddress: string
): Promise<WalletSubscriptionData | null> {
  const address = normalizeWalletAddress(rawAddress);
  if (!address || !address.startsWith('0x')) return null;

  // 1. Try Supabase directly if client configured
  if (supabase) {
    try {
      const { data: subData, error: subErr } = await supabase
        .from('wallet_subscriptions')
        .select('*')
        .eq('wallet_address', address)
        .maybeSingle();

      if (!subErr && subData) {
        // Fetch history
        const { data: histData } = await supabase
          .from('wallet_subscription_history')
          .select('*')
          .eq('wallet_address', address)
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
            planName: subData.plan_name || 'Pro Plan',
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
      }
    } catch (err) {
      console.warn('[DB] Supabase query fallback to backend API:', err);
    }
  }

  // 2. Query permanent backend API
  try {
    const res = await fetch(`/api/subscription/wallet/${encodeURIComponent(address)}`);
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const json = await res.json();
    if (json.success && json.data) {
      return json.data as WalletSubscriptionData;
    }
  } catch (err) {
    console.error('[DB] Failed to fetch subscription from server API:', err);
  }

  return null;
}

/**
 * Permanently consume the 1-time Free Trial in the database for the connected wallet address.
 * Rejects if free_trial_used is already true.
 */
export async function consumeWalletFreeTrialInDb(
  rawAddress: string
): Promise<{ success: boolean; error?: string; record?: WalletSubscriptionData }> {
  const address = normalizeWalletAddress(rawAddress);
  if (!address || !address.startsWith('0x')) {
    return { success: false, error: 'No wallet connected' };
  }

  // 1. Direct Supabase update if configured
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('wallet_subscriptions')
        .select('free_trial_used, trial_runs_used')
        .eq('wallet_address', address)
        .maybeSingle();

      if (existing?.free_trial_used || (existing?.trial_runs_used && existing.trial_runs_used >= 1)) {
        return {
          success: false,
          error: 'Free trial has already been used by this wallet address. Upgrade required.',
        };
      }

      await supabase.from('wallet_subscriptions').upsert(
        {
          wallet_address: address,
          free_trial_granted: true,
          free_trial_used: true,
          free_trial_used_at: new Date().toISOString(),
          trial_runs_used: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );
    } catch (err) {
      console.warn('[DB] Supabase direct trial consume error, continuing via API:', err);
    }
  }

  // 2. Server API update
  try {
    const res = await fetch(`/api/subscription/wallet/${encodeURIComponent(address)}/use-trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || 'Failed to consume Free Trial on database',
      };
    }

    // Trigger reactive window event
    window.dispatchEvent(
      new CustomEvent('cryptopay_wallet_subscription_updated', {
        detail: { walletAddress: address, data: json.data },
      })
    );

    return {
      success: true,
      record: json.data,
    };
  } catch (err: unknown) {
    console.error('[DB] Error consuming Free Trial via API:', err);
    const msg = err instanceof Error ? err.message : 'Network error updating database';
    return { success: false, error: msg };
  }
}

/**
 * Permanently save upgraded subscription to database linked to the connected wallet address.
 */
export async function saveWalletSubscriptionToDb(
  rawAddress: string,
  sub: SubscriptionRecord
): Promise<{ success: boolean; error?: string; record?: WalletSubscriptionData }> {
  const address = normalizeWalletAddress(rawAddress);
  if (!address || !address.startsWith('0x')) {
    return { success: false, error: 'No wallet connected' };
  }

  // 1. Direct Supabase write if configured
  if (supabase) {
    try {
      await supabase.from('wallet_subscriptions').upsert(
        {
          wallet_address: address,
          status: 'Active',
          plan_id: sub.planId,
          plan_name: sub.planName,
          usd_amount: sub.usdAmount,
          payment_token: sub.token,
          token_amount: sub.tokenAmount,
          receiving_wallet: sub.receivingWallet,
          tx_hash: sub.txHash,
          start_date: sub.startDate,
          expiry_date: sub.expiryDate,
          start_timestamp: sub.startTimestamp,
          expiry_timestamp: sub.expiryTimestamp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );

      await supabase.from('wallet_subscription_history').insert({
        wallet_address: address,
        plan_id: sub.planId,
        plan_name: sub.planName,
        usd_amount: sub.usdAmount,
        payment_token: sub.token,
        token_amount: sub.tokenAmount,
        receiving_wallet: sub.receivingWallet,
        tx_hash: sub.txHash,
        start_date: sub.startDate,
        expiry_date: sub.expiryDate,
        start_timestamp: sub.startTimestamp,
        expiry_timestamp: sub.expiryTimestamp,
        status: sub.status,
        created_at: new Date(sub.createdAt || Date.now()).toISOString(),
      });
    } catch (err) {
      console.warn('[DB] Supabase direct subscription write failed, continuing via API:', err);
    }
  }

  // 2. Server API write
  try {
    const res = await fetch(`/api/subscription/wallet/${encodeURIComponent(address)}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub }),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || 'Failed to save subscription on database',
      };
    }

    // Trigger reactive window event
    window.dispatchEvent(
      new CustomEvent('cryptopay_wallet_subscription_updated', {
        detail: { walletAddress: address, data: json.data },
      })
    );

    return {
      success: true,
      record: json.data,
    };
  } catch (err: unknown) {
    console.error('[DB] Error saving subscription to API:', err);
    const msg = err instanceof Error ? err.message : 'Network error saving subscription';
    return { success: false, error: msg };
  }
}
