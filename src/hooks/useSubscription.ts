import { useState, useEffect, useCallback } from 'react';
import { fetchCryptoPrices } from '@/lib/rpcService';
import {
  getActiveSubscription,
  getSubscriptionHistory,
  isSubscriptionActive,
  getFreeRunsUsed,
  hasFreeRunAvailable,
  consumeFreeRun,
  canUserExecuteRun,
  isAdminUnlocked,
  type SubscriptionRecord,
  type SubscriptionPlanId,
  type SubscriptionToken,
  SUBSCRIPTION_PLANS,
} from '@/lib/subscription';

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(() =>
    getActiveSubscription()
  );
  const [history, setHistory] = useState<SubscriptionRecord[]>(() =>
    getSubscriptionHistory()
  );
  const [isActive, setIsActive] = useState<boolean>(() => isSubscriptionActive());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminUnlocked());
  const [versePrice, setVersePrice] = useState<number>(0.00035);
  const [freeRunsUsed, setFreeRunsUsed] = useState<number>(() => getFreeRunsUsed());
  const [hasFreeRun, setHasFreeRun] = useState<boolean>(() => hasFreeRunAvailable());
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('1_month');
  const [selectedToken, setSelectedToken] = useState<SubscriptionToken>('USDT');

  // Refresh free trial and subscription state in real-time
  const refresh = useCallback(() => {
    const admin = isAdminUnlocked();
    setIsAdmin(admin);
    const sub = getActiveSubscription();
    setSubscription(sub);
    const active = isSubscriptionActive();
    setIsActive(active);
    setHistory(getSubscriptionHistory());
    const used = getFreeRunsUsed();
    setFreeRunsUsed(used);
    setHasFreeRun(used < 1);
  }, []);

  useEffect(() => {
    refresh();

    // Fetch real-time VERSE price for calculations
    fetchCryptoPrices()
      .then((prices) => {
        if (prices?.VERSE && prices.VERSE > 0) {
          setVersePrice(prices.VERSE);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch real-time VERSE price, using default fallback:', err);
      });

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener('cryptopay_subscription_updated', handleUpdate);
    window.addEventListener('cryptopay_free_trial_updated', handleUpdate);
    window.addEventListener('cryptopay_admin_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('cryptopay_subscription_updated', handleUpdate);
      window.removeEventListener('cryptopay_free_trial_updated', handleUpdate);
      window.removeEventListener('cryptopay_admin_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const openUpgradeModal = (planId?: SubscriptionPlanId) => {
    if (planId) setSelectedPlanId(planId);
    setIsUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
  };

  // Consume free run wrapper
  const handleConsumeFreeRun = useCallback(() => {
    consumeFreeRun();
    refresh();
  }, [refresh]);

  // Overall check if user is permitted to run
  const runCheck = canUserExecuteRun();
  const canRun = runCheck.canRun;

  // Calculate days remaining on active subscription
  let daysRemaining = 0;
  if (isActive && subscription?.expiryTimestamp) {
    const diff = subscription.expiryTimestamp - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // Helper for current selected plan details
  const currentPlan = SUBSCRIPTION_PLANS[selectedPlanId];

  return {
    subscription,
    history,
    isActive,
    isAdmin,
    versePrice,
    freeRunsUsed,
    hasFreeRun,
    canRun,
    daysRemaining,
    isUpgradeModalOpen,
    selectedPlanId,
    selectedToken,
    currentPlan,
    consumeFreeRun: handleConsumeFreeRun,
    setSelectedPlanId,
    setSelectedToken,
    openUpgradeModal,
    closeUpgradeModal,
    refresh,
  };
}
