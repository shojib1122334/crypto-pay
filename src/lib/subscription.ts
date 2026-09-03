import { formatUnits, type TransactionReceipt } from 'viem';
import { polygonPublicClient, ethereumPublicClient } from './rpcService';

export const SUBSCRIPTION_RECEIVER_WALLET = '0x7282C4A9dB5f88B8165922D42363D9965CF410f6' as const;

export type SubscriptionPlanId = '1_month' | '3_months';
export type SubscriptionToken = 'USDT' | 'USDC';
export type BillingFrequency = 'Weekly' | 'Monthly' | 'Yearly';
export type RecurringStatus = 'Active' | 'Paused' | 'Cancelled' | 'Expired';

export interface SubscriptionPlanConfig {
  id: SubscriptionPlanId;
  name: string;
  durationDays: number;
  usdPrice: number;
  label: string;
  badge?: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanConfig> = {
  '1_month': {
    id: '1_month',
    name: '1 Month',
    durationDays: 30,
    usdPrice: 2,
    label: '1 Month — $2',
    badge: 'Standard',
  },
  '3_months': {
    id: '3_months',
    name: '3 Months',
    durationDays: 90,
    usdPrice: 5,
    label: '3 Months — $5',
    badge: 'Best Value',
  },
};

export interface SubscriptionRecord {
  id: string;
  planId: SubscriptionPlanId;
  planName: string;
  usdAmount: number;
  token: SubscriptionToken;
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

export interface RecurringInvoiceData {
  id: string;
  storeName: string;
  subscriberName: string;
  subscriberEmail?: string;
  serviceName: string;
  billingFrequency: BillingFrequency;
  amount: string;
  paymentToken: 'USDT' | 'USDC' | 'VERSE';
  network: 'Polygon';
  receiverAddress: string;
  status: RecurringStatus;
  startDate: string;
  nextPaymentDate: string;
  lastPaymentDate?: string;
  totalPaidCount: number;
  createdAt: number;
  notes?: string;
}

const SUBSCRIPTION_STORAGE_KEY = 'cryptopay_active_subscription';
const SUBSCRIPTION_HISTORY_KEY = 'cryptopay_subscription_history';
const USED_TX_HASHES_KEY = 'cryptopay_used_sub_tx_hashes';
const RECURRING_INVOICES_KEY = 'cryptopay_recurring_invoices';
const FREE_TRIAL_RUNS_KEY = 'cryptopay_free_trial_runs_used';
const ADMIN_STORAGE_KEY = 'cryptopay_admin_unlocked_session';

// Helper: Check if admin is currently authenticated
export function isAdminUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

// Helper: Unlock admin access with password
export function unlockAdminAccess(password: string): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Window not available' };
  if (password === 'shojib@@@@@') {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      window.dispatchEvent(new CustomEvent('cryptopay_admin_updated', { detail: { unlocked: true } }));
      window.dispatchEvent(new CustomEvent('cryptopay_subscription_updated'));
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save admin session' };
    }
  }
  return { success: false, error: 'Incorrect admin password. Access denied.' };
}

// Helper: Lock admin access
export function lockAdminAccess(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('cryptopay_admin_updated', { detail: { unlocked: false } }));
    window.dispatchEvent(new CustomEvent('cryptopay_subscription_updated'));
  } catch (err) {
    console.warn('Failed to lock admin access:', err);
  }
}

// Helper: Get number of free runs used
export function getFreeRunsUsed(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(FREE_TRIAL_RUNS_KEY);
    if (!val) return 0;
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  } catch {
    return 0;
  }
}

// Helper: Check if free first-time run is available
export function hasFreeRunAvailable(): boolean {
  return getFreeRunsUsed() < 1;
}

// Helper: Consume the 1 free run
export function consumeFreeRun(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getFreeRunsUsed();
    const updated = current + 1;
    localStorage.setItem(FREE_TRIAL_RUNS_KEY, updated.toString());
    window.dispatchEvent(
      new CustomEvent('cryptopay_free_trial_updated', { detail: { runsUsed: updated } })
    );
  } catch (err) {
    console.warn('Failed to consume free run:', err);
  }
}

// Helper: Get active subscription
export function getActiveSubscription(): SubscriptionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    if (isAdminUnlocked()) {
      const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (raw) {
        try {
          const sub: SubscriptionRecord = JSON.parse(raw);
          return {
            ...sub,
            status: 'Active',
            expiryTimestamp: Date.now() + 365 * 24 * 60 * 60 * 1000,
          };
        } catch (err) {
          console.warn('Failed to parse existing subscription in admin mode:', err);
        }
      }
      return {
        id: 'ADMIN-MASTER-UNLIMITED',
        planId: '3_months',
        planName: 'Admin Master Pass',
        usdAmount: 0,
        token: 'USDT',
        tokenAmount: '0',
        receivingWallet: SUBSCRIPTION_RECEIVER_WALLET,
        txHash: '0xadmin_authorized_access',
        startDate: 'Permanent Admin',
        expiryDate: 'Lifetime Unlimited',
        startTimestamp: Date.now(),
        expiryTimestamp: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
        status: 'Active',
        createdAt: Date.now(),
      };
    }

    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    const sub: SubscriptionRecord = JSON.parse(raw);
    const now = Date.now();
    
    // Check if expired
    if (now > sub.expiryTimestamp) {
      sub.status = 'Expired';
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));
    }
    return sub;
  } catch (err) {
    console.warn('Failed to load subscription:', err);
    return null;
  }
}

// Check if user has active subscription
export function isSubscriptionActive(): boolean {
  if (isAdminUnlocked()) {
    return true;
  }
  const sub = getActiveSubscription();
  return Boolean(sub && sub.status === 'Active' && Date.now() < sub.expiryTimestamp);
}

// Comprehensive check: Can the user run/generate an invoice?
export function canUserExecuteRun(): {
  canRun: boolean;
  isFreeTrialRun: boolean;
  isSubscriptionActive: boolean;
  reason?: string;
} {
  if (isAdminUnlocked()) {
    return {
      canRun: true,
      isFreeTrialRun: false,
      isSubscriptionActive: true,
    };
  }

  const isSubActive = isSubscriptionActive();
  if (isSubActive) {
    return {
      canRun: true,
      isFreeTrialRun: false,
      isSubscriptionActive: true,
    };
  }

  const freeRunAvailable = hasFreeRunAvailable();
  if (freeRunAvailable) {
    return {
      canRun: true,
      isFreeTrialRun: true,
      isSubscriptionActive: false,
    };
  }

  return {
    canRun: false,
    isFreeTrialRun: false,
    isSubscriptionActive: false,
    reason: 'Free 1st run used. Please upgrade your subscription to continue running invoices.',
  };
}

// Get subscription history
export function getSubscriptionHistory(): SubscriptionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (err) {
    console.warn('Failed to load subscription history:', err);
    return [];
  }
}

// Check if tx hash is already used
export function isTxHashUsed(txHash: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(USED_TX_HASHES_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    return set.map((h) => h.toLowerCase()).includes(txHash.toLowerCase());
  } catch {
    return false;
  }
}

// Record used tx hash
export function markTxHashAsUsed(txHash: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(USED_TX_HASHES_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.map((h) => h.toLowerCase()).includes(txHash.toLowerCase())) {
      set.push(txHash.toLowerCase());
      localStorage.setItem(USED_TX_HASHES_KEY, JSON.stringify(set));
    }
  } catch (err) {
    console.warn('Failed to record tx hash:', err);
  }
}

// Save verified subscription
export function saveSubscriptionRecord(sub: SubscriptionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));

    // Append to history
    const history = getSubscriptionHistory();
    const filtered = history.filter((h) => h.txHash.toLowerCase() !== sub.txHash.toLowerCase());
    const updatedHistory = [sub, ...filtered];
    localStorage.setItem(SUBSCRIPTION_HISTORY_KEY, JSON.stringify(updatedHistory));

    // Mark hash as used
    markTxHashAsUsed(sub.txHash);

    // Trigger reactive event
    window.dispatchEvent(
      new CustomEvent('cryptopay_subscription_updated', { detail: sub })
    );
  } catch (err) {
    console.warn('Failed to save subscription:', err);
  }
}

// Calculate VERSE amount for USD price
export function calculateVerseAmount(usdPrice: number, versePriceUsd: number): string {
  if (!versePriceUsd || versePriceUsd <= 0) return (usdPrice / 0.00035).toFixed(2);
  const raw = usdPrice / versePriceUsd;
  // If large number of tokens (e.g. 5,000+), clean up to 2 decimal places or nearest whole number
  if (raw >= 100) {
    return raw.toFixed(2);
  }
  return raw.toFixed(4);
}

// Standard ERC20 Transfer event signature topic: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Known token addresses on Polygon and Ethereum
const KNOWN_TOKENS = {
  // Polygon
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT' as SubscriptionToken, decimals: 6, isUsd: true },
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC' as SubscriptionToken, decimals: 6, isUsd: true },
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { symbol: 'USDC' as SubscriptionToken, decimals: 6, isUsd: true }, // USDC.e
  // Ethereum
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT' as SubscriptionToken, decimals: 6, isUsd: true },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC' as SubscriptionToken, decimals: 6, isUsd: true },
};

export interface VerifySubscriptionResult {
  success: boolean;
  error?: string;
  record?: SubscriptionRecord;
}

/**
 * Verifies on Polygon or Ethereum blockchain that a transaction was sent to SUBSCRIPTION_RECEIVER_WALLET
 * with the correct USDT or USDC amount.
 */
export async function verifySubscriptionPaymentOnChain(
  txHashInput: string,
  planId: SubscriptionPlanId,
  selectedToken: SubscriptionToken = 'USDT'
): Promise<VerifySubscriptionResult> {
  const cleanHash = txHashInput.trim();

  // Basic format validation
  if (!cleanHash.startsWith('0x') || cleanHash.length !== 66) {
    return {
      success: false,
      error: 'Invalid transaction hash format. It must be 66 characters starting with 0x.',
    };
  }

  // Anti-replay check
  if (isTxHashUsed(cleanHash)) {
    return {
      success: false,
      error: 'This transaction has already been used to unlock a subscription. Duplicate verification is not permitted.',
    };
  }

  const plan = SUBSCRIPTION_PLANS[planId];
  const requiredUsd = plan.usdPrice;
  const expectedReceiver = SUBSCRIPTION_RECEIVER_WALLET.toLowerCase();

  try {
    // 1. First attempt to fetch receipt from Polygon
    let receipt: TransactionReceipt | null = null;

    try {
      receipt = await polygonPublicClient.getTransactionReceipt({
        hash: cleanHash as `0x${string}`,
      });
    } catch {
      // Try Ethereum if Polygon fails
    }

    if (!receipt) {
      try {
        receipt = await ethereumPublicClient.getTransactionReceipt({
          hash: cleanHash as `0x${string}`,
        });
      } catch {
        // Receipt not ready
      }
    }

    if (!receipt) {
      return {
        success: false,
        error: 'Transaction receipt not found on blockchain yet. If you just sent it, please wait 5-10 seconds for block confirmation and try again.',
      };
    }

    if (receipt.status !== 'success') {
      return {
        success: false,
        error: 'The transaction status is marked as failed or reverted on the blockchain network.',
      };
    }

    // 2. Scan transaction logs for transfer to SUBSCRIPTION_RECEIVER_WALLET
    let matchedTransfer = false;
    let detectedToken: SubscriptionToken = selectedToken;
    let detectedTokenFormatted = '0';

    for (const log of receipt.logs || []) {
      if (log.topics && log.topics[0]?.toLowerCase() === TRANSFER_EVENT_TOPIC.toLowerCase()) {
        if (log.topics[2]) {
          const toAddressHex = '0x' + log.topics[2].slice(-40).toLowerCase();
          if (toAddressHex === expectedReceiver) {
            const tokenAddr = log.address.toLowerCase();
            const tokenMeta = KNOWN_TOKENS[tokenAddr as keyof typeof KNOWN_TOKENS];
            const valBigInt = BigInt(log.data || '0');
            const decimals = tokenMeta?.decimals ?? 6;
            const tokenFormatted = formatUnits(valBigInt, decimals);
            const numAmount = parseFloat(tokenFormatted);

            // USD Token: require at least 80% of USD plan price to accommodate any rounding
            if (numAmount >= requiredUsd * 0.8) {
              matchedTransfer = true;
              detectedToken = tokenMeta?.symbol || selectedToken;
              detectedTokenFormatted = numAmount.toFixed(2);
              break;
            }
          }
        }
      }
    }

    // Also check direct transfer if no ERC20 log matched
    if (!matchedTransfer && receipt.to?.toLowerCase() === expectedReceiver) {
      matchedTransfer = true;
      detectedTokenFormatted = `${requiredUsd}`;
    }

    if (!matchedTransfer) {
      return {
        success: false,
        error: `Transaction confirmed in block #${receipt.blockNumber}, but no matching payment of ~$${requiredUsd} (USDT/USDC) was found sent to ${SUBSCRIPTION_RECEIVER_WALLET}. Please check the receiving address or amount.`,
      };
    }

    // 3. Build verified subscription record
    const now = Date.now();
    const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;
    const expiryTimestamp = now + durationMs;

    const startDateStr = new Date(now).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const expiryDateStr = new Date(expiryTimestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const newSubscription: SubscriptionRecord = {
      id: `SUB-${Date.now().toString().slice(-6)}`,
      planId,
      planName: plan.name,
      usdAmount: plan.usdPrice,
      token: detectedToken,
      tokenAmount: detectedTokenFormatted,
      receivingWallet: SUBSCRIPTION_RECEIVER_WALLET,
      txHash: cleanHash,
      blockNumber: Number(receipt.blockNumber),
      startDate: startDateStr,
      expiryDate: expiryDateStr,
      startTimestamp: now,
      expiryTimestamp,
      status: 'Active',
      createdAt: now,
    };

    saveSubscriptionRecord(newSubscription);

    return {
      success: true,
      record: newSubscription,
    };
  } catch (err: unknown) {
    console.error('Subscription on-chain verification error:', err);
    return {
      success: false,
      error:
        'Could not verify transaction on blockchain. Please make sure the transaction is confirmed on Polygon/Ethereum and sent to the Receiving Wallet.',
    };
  }
}

// -------------------------------------------------------------
// Recurring Invoices Store & Helpers
// -------------------------------------------------------------
export function getSavedRecurringInvoices(): RecurringInvoiceData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECURRING_INVOICES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

export function saveRecurringInvoice(inv: RecurringInvoiceData): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getSavedRecurringInvoices();
    const filtered = list.filter((i) => i.id !== inv.id);
    const updated = [inv, ...filtered];
    localStorage.setItem(RECURRING_INVOICES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cryptopay_recurring_updated'));
  } catch (err) {
    console.warn('Failed to save recurring invoice:', err);
  }
}

export function calculateNextBillingDate(startDate: string, frequency: BillingFrequency): string {
  const base = new Date(startDate || Date.now());
  if (isNaN(base.getTime())) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }
  const next = new Date(base);
  if (frequency === 'Weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'Monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === 'Yearly') {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next.toISOString().split('T')[0];
}
