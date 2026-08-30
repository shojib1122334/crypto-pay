// Progressive Web App (PWA) utilities and registration

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Check if running in standalone PWA / TWA / Installed mode
export function isRunningInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreenMatch = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUIMatch = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isTwaReferrer = document.referrer.includes('android-app://');
  const isPwaQueryParam = new URLSearchParams(window.location.search).get('source') === 'pwa' || 
                          new URLSearchParams(window.location.search).get('source') === 'twa';

  return isStandaloneMatch || isFullscreenMatch || isMinimalUIMatch || isIOSStandalone || isTwaReferrer || isPwaQueryParam;
}

// Detect iOS platform for manual PWA installation instructions
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

// Register service worker
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[CryptoPay PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[CryptoPay PWA] New update available.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[CryptoPay PWA] Service Worker registration failed:', error);
      });
  });
}
