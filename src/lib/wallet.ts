import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, fallback } from 'wagmi';
import { polygon, mainnet } from 'wagmi/chains';

const projectId =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID) ||
  '31fd3c9688d3fa1f2ada8d5419c90657';

const originUrl =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://cryptopay.network';

export const config = getDefaultConfig({
  appName: 'CryptoPay',
  projectId,
  chains: [polygon, mainnet],
  ssr: false,
  walletConnectParameters: {
    metadata: {
      name: 'CryptoPay',
      description: 'Institutional non-custodial crypto payments accepting USDT and USDC on Polygon',
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
  },
});

export { polygon, mainnet };

