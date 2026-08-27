import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, fallback } from 'wagmi';
import { sepolia, polygon } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '31fd3c9688d3fa1f2ada8d5419c90657';

export const config = getDefaultConfig({
  appName: 'CryptoPay',
  projectId,
  chains: [sepolia, polygon],
  transports: {
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia-rpc.publicnode.com'),
      http('https://sepolia.drpc.org'),
      http('https://rpc.sepolia.org'),
      http('https://eth-sepolia.g.alchemy.com/v2/demo'),
    ]),
    [polygon.id]: fallback([
      http('https://polygon-rpc.com'),
      http('https://rpc.ankr.com/polygon'),
      http('https://polygon-bor-rpc.publicnode.com'),
      http('https://1rpc.io/matic'),
    ]),
  },
  ssr: false,
});

export { sepolia, polygon };

