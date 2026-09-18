import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, fallback } from 'wagmi';
import { polygon, mainnet, bsc } from 'wagmi/chains';

const projectId =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID) ||
  '31fd3c9688d3fa1f2ada8d5419c90657';

const originUrl =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://cryptopay.network';

// Safely clean up orphaned WalletConnect v2 relayer subscriptions if no session is active
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    let hasActiveSession = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('//session') || (key.includes('@walletconnect') && key.includes('session')))) {
        const val = localStorage.getItem(key);
        if (val && val !== '[]' && val !== '{}' && val !== '""') {
          hasActiveSession = true;
          break;
        }
      }
    }
    if (!hasActiveSession) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wc@2:') && (key.includes('//subscription') || key.includes('//messages'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });
    }
  } catch {
    // Ignore restricted localStorage contexts
  }
}

export const config = getDefaultConfig({
  appName: 'CryptoPay',
  projectId,
  chains: [polygon, mainnet, bsc],
  ssr: false,
  walletConnectParameters: {
    metadata: {
      name: 'CryptoPay',
      description: 'Institutional non-custodial crypto payments and multi-chain swap',
      url: originUrl,
      icons: [`${originUrl}/brand/app-logo.png`],
    },
  },
  transports: {
    [polygon.id]: fallback([
      http('https://polygon-bor-rpc.publicnode.com', { retryCount: 3, timeout: 8000 }),
      http('https://1rpc.io/matic', { retryCount: 3, timeout: 8000 }),
      http('https://polygon.drpc.org', { retryCount: 3, timeout: 8000 }),
      http('https://polygon.gateway.tenderly.co', { retryCount: 3, timeout: 8000 }),
      http('https://polygon.api.onfinality.io/public', { retryCount: 2, timeout: 8000 }),
    ]),
    [mainnet.id]: fallback([
      http('https://ethereum-rpc.publicnode.com', { retryCount: 3, timeout: 8000 }),
      http('https://1rpc.io/eth', { retryCount: 3, timeout: 8000 }),
      http('https://eth.drpc.org', { retryCount: 3, timeout: 8000 }),
      http('https://eth.llamarpc.com', { retryCount: 3, timeout: 8000 }),
    ]),
    [bsc.id]: fallback([
      http('https://bsc-dataseed.binance.org', { retryCount: 3, timeout: 8000 }),
      http('https://binance.llamarpc.com', { retryCount: 3, timeout: 8000 }),
      http('https://bsc-rpc.publicnode.com', { retryCount: 3, timeout: 8000 }),
      http('https://1rpc.io/bnb', { retryCount: 3, timeout: 8000 }),
    ]),
  },
});

export { polygon, mainnet, bsc };

