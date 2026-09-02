import { useState, useEffect, useCallback } from 'react';
import {
  getActiveSubscription,
  getSubscriptionHistory,
  isSubscriptionActive,
  type SubscriptionRecord,
  type SubscriptionPlanId,
  type SubscriptionToken,
  SUBSCRIPTION_PLANS,
  calculateVerseAmount,
} from '@/lib/subscription';
import { fetchCryptoPrices } from '@/lib/rpcService';

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(() =>
    getActiveSubscription()
  );
  const [history, setHistory] = useState<SubscriptionRecord[]>(() =>
    getSubscriptionHistory()
  );
  const [isActive, setIsActive] = useState<boolean>(() => isSubscriptionActive());
  const [versePrice, setVersePrice] = useState<number>(0.00035);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('1_month');
  const [selectedToken, setSelectedToken] = useState<SubscriptionToken>('USDT');

  // Refresh prices and subscription state
  const refresh = useCallback(() => {
    const sub = getActiveSubscription();
    setSubscription(sub);
    setIsActive(isSubscriptionActive());
    setHistory(getSubscriptionHistory());
  }, []);

  useEffect(() => {
    refresh();

    // Fetch live VERSE token price
    fetchCryptoPrices()
      .then((prices) => {
        if (prices.VERSE && prices.VERSE > 0) {
          setVersePrice(prices.VERSE);
        }
      })
      .catch((err) => console.warn('Failed to load verse price:', err));

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener('cryptopay_subscription_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('cryptopay_subscription_updated', handleUpdate);
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

  // Helper for current selected plan details
  const currentPlan = SUBSCRIPTION_PLANS[selectedPlanId];
  const calculatedVerseAmount = calculateVerseAmount(currentPlan.usdPrice, versePrice);

  return {
    subscription,
    history,
    isActive,
    versePrice,
    isUpgradeModalOpen,
    selectedPlanId,
    selectedToken,
    currentPlan,
    calculatedVerseAmount,
    setSelectedPlanId,
    setSelectedToken,
    openUpgradeModal,
    closeUpgradeModal,
    refresh,
  };
}
