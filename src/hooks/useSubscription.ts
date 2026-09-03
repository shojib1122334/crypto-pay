import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { fetchCryptoPrices } from '@/lib/rpcService';
import {
  type SubscriptionRecord,
  type SubscriptionPlanId,
  type SubscriptionToken,
  SUBSCRIPTION_PLANS,
  isAdminUnlocked,
} from '@/lib/subscription';
import {
  fetchWalletSubscriptionFromDb,
  consumeWalletFreeTrialInDb,
  saveWalletSubscriptionToDb,
  normalizeWalletAddress,
  type WalletSubscriptionData,
} from '@/lib/subscriptionDatabase';

export function useSubscription() {
  const { address, isConnected } = useAccount();
  const normalizedWallet = normalizeWalletAddress(address);

  const [walletRecord, setWalletRecord] = useState<WalletSubscriptionData | null>(null);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(Boolean(normalizedWallet));
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [history, setHistory] = useState<SubscriptionRecord[]>([]);
  const [isActive, setIsActive] = useState<boolean>(() => isAdminUnlocked());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminUnlocked());
  const [freeTrialUsed, setFreeTrialUsed] = useState<boolean>(false);
  const [hasFreeRun, setHasFreeRun] = useState<boolean>(false);
  const [isConsumingTrial, setIsConsumingTrial] = useState(false);

  const [versePrice, setVersePrice] = useState<number>(0.00035);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('1_month');
  const [selectedToken, setSelectedToken] = useState<SubscriptionToken>('USDT');

  // Load wallet subscription & free trial data directly from the permanent database
  const loadWalletData = useCallback(async (walletAddr: string) => {
    const admin = isAdminUnlocked();
    setIsAdmin(admin);

    if (!walletAddr) {
      setWalletRecord(null);
      setSubscription(null);
      setHistory([]);
      setFreeTrialUsed(false);
      setHasFreeRun(false);
      setIsActive(admin);
      setIsDbLoading(false);
      return;
    }

    setIsDbLoading(true);
    try {
      const record = await fetchWalletSubscriptionFromDb(walletAddr);

      if (record) {
        setWalletRecord(record);
        setFreeTrialUsed(record.free_trial_used);
        // Free run is available ONLY if free trial has never been used by this wallet address
        const canTrial = !record.free_trial_used && record.trial_runs_used < 1;
        setHasFreeRun(canTrial);

        const sub = record.subscription;
        const isSubActive = Boolean(
          sub && sub.status === 'Active' && Date.now() < sub.expiryTimestamp
        );

        setIsActive(isSubActive || admin);
        setSubscription(sub);
        setHistory(record.history || []);
      } else {
        // Brand new wallet not yet recorded: granted 1 trial, used = false
        setFreeTrialUsed(false);
        setHasFreeRun(true);
        setIsActive(admin);
        setSubscription(null);
        setHistory([]);
      }
    } catch (err) {
      console.warn('[useSubscription] Error loading wallet record from database:', err);
      // Fail-safe: if admin unlocked, grant access
      if (admin) {
        setIsActive(true);
      }
    } finally {
      setIsDbLoading(false);
    }
  }, []);

  // Fetch data whenever connected wallet address changes
  useEffect(() => {
    loadWalletData(normalizedWallet);
  }, [normalizedWallet, loadWalletData]);

  // Real-time updates & external events listener
  useEffect(() => {
    // Fetch live VERSE price for calculations
    fetchCryptoPrices()
      .then((prices) => {
        if (prices?.VERSE && prices.VERSE > 0) {
          setVersePrice(prices.VERSE);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch real-time VERSE price, using fallback:', err);
      });

    const handleWalletUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ walletAddress: string; data: WalletSubscriptionData }>;
      if (
        customEvent.detail?.walletAddress &&
        customEvent.detail.walletAddress.toLowerCase() === normalizedWallet.toLowerCase()
      ) {
        const record = customEvent.detail.data;
        setWalletRecord(record);
        setFreeTrialUsed(record.free_trial_used);
        setHasFreeRun(!record.free_trial_used && record.trial_runs_used < 1);
        const sub = record.subscription;
        const isSubActive = Boolean(
          sub && sub.status === 'Active' && Date.now() < sub.expiryTimestamp
        );
        setIsActive(isSubActive || isAdminUnlocked());
        setSubscription(sub);
        setHistory(record.history || []);
      } else {
        loadWalletData(normalizedWallet);
      }
    };

    const handleSubscriptionUpdated = () => {
      loadWalletData(normalizedWallet);
    };

    const handleAdminUpdated = () => {
      const admin = isAdminUnlocked();
      setIsAdmin(admin);
      if (admin) {
        setIsActive(true);
      } else {
        loadWalletData(normalizedWallet);
      }
    };

    window.addEventListener('cryptopay_wallet_subscription_updated', handleWalletUpdated);
    window.addEventListener('cryptopay_subscription_updated', handleSubscriptionUpdated);
    window.addEventListener('cryptopay_admin_updated', handleAdminUpdated);

    return () => {
      window.removeEventListener('cryptopay_wallet_subscription_updated', handleWalletUpdated);
      window.removeEventListener('cryptopay_subscription_updated', handleSubscriptionUpdated);
      window.removeEventListener('cryptopay_admin_updated', handleAdminUpdated);
    };
  }, [normalizedWallet, loadWalletData]);

  const openUpgradeModal = (planId?: SubscriptionPlanId) => {
    if (planId) setSelectedPlanId(planId);
    setIsUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
  };

  // Consume Free Trial permanently in the database for this connected wallet
  const handleConsumeFreeRun = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
    record?: WalletSubscriptionData;
  }> => {
    if (isAdminUnlocked()) {
      return { success: true };
    }
    if (!normalizedWallet) {
      return {
        success: false,
        error: 'Please connect your Web3 wallet to verify your Free Trial eligibility.',
      };
    }

    setIsConsumingTrial(true);
    try {
      const res = await consumeWalletFreeTrialInDb(normalizedWallet);
      setIsConsumingTrial(false);

      if (res.success && res.record) {
        setWalletRecord(res.record);
        setFreeTrialUsed(true);
        setHasFreeRun(false);
        return { success: true, record: res.record };
      }

      return {
        success: false,
        error: res.error || 'This wallet has already used its permanent Free Trial.',
      };
    } catch (err: unknown) {
      setIsConsumingTrial(false);
      const msg = err instanceof Error ? err.message : 'Database error while consuming Free Trial';
      return { success: false, error: msg };
    }
  }, [normalizedWallet]);

  // Save verified upgraded subscription record to database for this connected wallet
  const handleSaveSubscription = useCallback(
    async (sub: SubscriptionRecord) => {
      if (!normalizedWallet) return;
      try {
        await saveWalletSubscriptionToDb(normalizedWallet, sub);
        await loadWalletData(normalizedWallet);
      } catch (err) {
        console.warn('Error saving subscription to DB:', err);
      }
    },
    [normalizedWallet, loadWalletData]
  );

  // Determine if user is permitted to execute run
  let canRun = false;
  let runReason = '';

  if (isAdmin) {
    canRun = true;
  } else if (!isConnected || !normalizedWallet) {
    canRun = false;
    runReason = 'Please connect your Web3 wallet to verify Free Trial eligibility and access tools.';
  } else if (isDbLoading) {
    canRun = false;
    runReason = 'Verifying wallet address in permanent database...';
  } else if (isActive) {
    canRun = true;
  } else if (hasFreeRun) {
    canRun = true;
  } else {
    canRun = false;
    runReason = 'Free 1-time Trial used for this wallet. Please upgrade your subscription to continue.';
  }

  // Calculate days remaining on active subscription
  let daysRemaining = 0;
  if (isActive && subscription?.expiryTimestamp) {
    const diff = subscription.expiryTimestamp - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const currentPlan = SUBSCRIPTION_PLANS[selectedPlanId];

  return {
    subscription,
    history,
    isActive,
    isAdmin,
    versePrice,
    freeRunsUsed: freeTrialUsed ? 1 : 0,
    freeTrialUsed,
    hasFreeRun,
    isConsumingTrial,
    isDbLoading,
    walletAddress: normalizedWallet,
    walletRecord,
    isWalletConnected: Boolean(isConnected && normalizedWallet),
    canRun,
    runReason,
    daysRemaining,
    isUpgradeModalOpen,
    selectedPlanId,
    selectedToken,
    currentPlan,
    consumeFreeRun: handleConsumeFreeRun,
    saveSubscription: handleSaveSubscription,
    setSelectedPlanId,
    setSelectedToken,
    openUpgradeModal,
    closeUpgradeModal,
    refresh: () => loadWalletData(normalizedWallet),
  };
}
