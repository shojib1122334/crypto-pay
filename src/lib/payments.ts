import { supabase, type PaymentSession, type PaymentStatus } from './supabase';
import type { TokenSymbol } from './tokens';

export interface PaymentLinkParams {
  sessionId: string;
  merchantAddress: string;
  amount: string;
  token: string;
}

// In-memory / localStorage fallback store
const LOCAL_STORAGE_KEY = 'cryptopay_payment_sessions';
const localSessions = new Map<string, PaymentSession>();

// Initialize from localStorage if in browser
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed: PaymentSession[] = JSON.parse(stored);
      parsed.forEach((s) => localSessions.set(s.id, s));
    }
  } catch (e) {
    console.warn('Could not read local payment sessions:', e);
  }
}

function saveLocalSession(session: PaymentSession) {
  localSessions.set(session.id, session);
  if (typeof window !== 'undefined') {
    try {
      const all = Array.from(localSessions.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(
        new CustomEvent('cryptopay_session_update', { detail: session }),
      );
    } catch (e) {
      console.warn('Could not save payment session to localStorage:', e);
    }
  }
}

export function parsePaymentLink(url: string): PaymentLinkParams | null {
  try {
    const parsed = new URL(url);
    const sessionId = parsed.searchParams.get('session');
    const merchantAddress = parsed.searchParams.get('merchant');
    const amount = parsed.searchParams.get('amount');
    const token = parsed.searchParams.get('token');
    if (!sessionId || !merchantAddress || !amount || !token) return null;
    return { sessionId, merchantAddress, amount, token };
  } catch {
    return null;
  }
}

export function buildPaymentLink(
  baseUrl: string,
  sessionId: string,
  merchantAddress: string,
  amount: string,
  token: string,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('session', sessionId);
  url.searchParams.set('merchant', merchantAddress);
  url.searchParams.set('amount', amount);
  url.searchParams.set('token', token);
  return url.toString();
}

export function getCurrentPaymentParams(): PaymentLinkParams | null {
  return parsePaymentLink(window.location.href);
}

export async function createPaymentSession(
  merchantAddress: string,
  amount: number,
  token: TokenSymbol,
): Promise<PaymentSession | null> {
  const fallbackSession: PaymentSession = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    merchant_address: merchantAddress,
    amount_eth: amount,
    token,
    status: 'pending',
    tx_hash: null,
    customer_address: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .insert({
          merchant_address: merchantAddress,
          amount_eth: amount,
          token,
          status: 'pending',
        })
        .select()
        .single();

      if (!error && data) {
        const session = data as PaymentSession;
        saveLocalSession(session);
        return session;
      }
      console.warn('Supabase insert failed, using local session fallback:', error);
    } catch (err) {
      console.warn('Supabase request failed, falling back to local:', err);
    }
  }

  saveLocalSession(fallbackSession);
  return fallbackSession;
}

export async function getPaymentSession(
  sessionId: string,
): Promise<PaymentSession | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (!error && data) {
        return data as PaymentSession;
      }
    } catch (err) {
      console.warn('Supabase fetch failed, checking local:', err);
    }
  }

  return localSessions.get(sessionId) ?? null;
}

export async function updatePaymentSession(
  sessionId: string,
  updates: Partial<Pick<PaymentSession, 'status' | 'tx_hash' | 'customer_address'>>,
): Promise<boolean> {
  let localUpdated = false;
  const existing = localSessions.get(sessionId);
  if (existing) {
    const updated: PaymentSession = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveLocalSession(updated);
    localUpdated = true;
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from('payment_sessions')
        .update(updates)
        .eq('id', sessionId);
      if (!error) {
        return true;
      }
      console.warn('Supabase update failed:', error);
    } catch (err) {
      console.warn('Supabase update exception:', err);
    }
  }

  return localUpdated;
}

export function subscribeToPaymentSession(
  sessionId: string,
  callback: (session: PaymentSession) => void,
): () => void {
  let supabaseUnsub: (() => void) | null = null;

  if (supabase) {
    try {
      const channel = supabase
        .channel(`payment_session:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payment_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            if (payload.new) {
              const updated = payload.new as PaymentSession;
              saveLocalSession(updated);
              callback(updated);
            }
          },
        )
        .subscribe();

      supabaseUnsub = () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Supabase realtime subscribe error:', err);
    }
  }

  // Local window event listener for in-tab / cross-tab synchronization
  const handleLocalUpdate = (e: Event) => {
    const customEvt = e as CustomEvent<PaymentSession>;
    if (customEvt.detail && customEvt.detail.id === sessionId) {
      callback(customEvt.detail);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        const parsed: PaymentSession[] = JSON.parse(e.newValue);
        const match = parsed.find((s) => s.id === sessionId);
        if (match) {
          localSessions.set(match.id, match);
          callback(match);
        }
      } catch (err) {
        console.warn('Storage event parsing error:', err);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('cryptopay_session_update', handleLocalUpdate);
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    if (supabaseUnsub) supabaseUnsub();
    if (typeof window !== 'undefined') {
      window.removeEventListener('cryptopay_session_update', handleLocalUpdate);
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  confirming: 'Confirming',
  success: 'Success',
  failed: 'Failed',
};

export const STATUS_ORDER: PaymentStatus[] = [
  'pending',
  'confirming',
  'success',
];

