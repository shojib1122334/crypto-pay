import { useState, useEffect, useCallback } from 'react';
import {
  type BeforeInstallPromptEvent,
  isRunningInStandaloneMode,
  isIOSDevice,
} from '@/lib/pwa';

export interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isOnline: boolean;
  installApp: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
  dismissPrompt: () => void;
  showInstallBanner: boolean;
}

export function usePWA(): PWAState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isRunningInStandaloneMode());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cryptopay_pwa_prompt_dismissed') === 'true';
    }
    return false;
  });

  const isIOS = isIOSDevice();

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches || isRunningInStandaloneMode());
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[CryptoPay PWA] Application successfully installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPrompt) {
      return 'unsupported';
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return choice.outcome;
    } catch (err) {
      console.warn('[CryptoPay PWA] Error triggering install prompt:', err);
      return 'unsupported';
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cryptopay_pwa_prompt_dismissed', 'true');
    }
  }, []);

  const isInstallable = (!!deferredPrompt || isIOS) && !isInstalled;
  const showInstallBanner = isInstallable && !dismissed;

  return {
    isInstalled,
    isInstallable,
    isIOS,
    isOnline,
    installApp,
    dismissPrompt,
    showInstallBanner,
  };
}
