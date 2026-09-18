export type BlockchainNetworkId = 'bitcoin' | 'ethereum' | 'bsc' | 'polygon' | 'solana';

export interface BlockchainNetwork {
  id: BlockchainNetworkId;
  name: string;
  shortName: string;
  symbol: 'BTC' | 'ETH' | 'BNB' | 'POL' | 'SOL';
  chainId?: number; // 1 for Ethereum, 56 for BSC, 137 for Polygon
  isEvm: boolean;
  logo: string;
  color: string;
  badgeColor: string;
  explorerName: string;
  explorerTxUrl: (txHash: string) => string;
  explorerAddressUrl: (address: string) => string;
}

export interface SwapTokenInfo {
  symbol: 'BTC' | 'ETH' | 'BNB' | 'POL' | 'MATIC' | 'SOL' | 'USDT' | 'USDC' | 'VERSE' | string;
  name: string;
  address: string;
  networkId: BlockchainNetworkId;
  networkName: string;
  chainId?: number;
  decimals: number;
  logo: string;
  color: string;
  isNative?: boolean;
  minInputAmount?: number;
  minUsdValue?: number;
}

export const POLYGON_CHAIN_ID = 137;
export const ETHEREUM_CHAIN_ID = 1;
export const BSC_CHAIN_ID = 56;

export const SUPPORTED_NETWORKS: BlockchainNetwork[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'Ethereum',
    symbol: 'ETH',
    chainId: ETHEREUM_CHAIN_ID,
    isEvm: true,
    logo: '/tokens/eth.png',
    color: '#627EEA',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    explorerName: 'Etherscan',
    explorerTxUrl: (txHash: string) => `https://etherscan.io/tx/${txHash}`,
    explorerAddressUrl: (address: string) => `https://etherscan.io/address/${address}`,
  },
  {
    id: 'bsc',
    name: 'BNB Smart Chain',
    shortName: 'BNB Chain',
    symbol: 'BNB',
    chainId: BSC_CHAIN_ID,
    isEvm: true,
    logo: '/tokens/bnb.png',
    color: '#F3BA2F',
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    explorerName: 'BscScan',
    explorerTxUrl: (txHash: string) => `https://bscscan.com/tx/${txHash}`,
    explorerAddressUrl: (address: string) => `https://bscscan.com/address/${address}`,
  },
  {
    id: 'polygon',
    name: 'Polygon PoS',
    shortName: 'Polygon',
    symbol: 'POL',
    chainId: POLYGON_CHAIN_ID,
    isEvm: true,
    logo: '/tokens/matic.png',
    color: '#8247E5',
    badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    explorerName: 'Polygonscan',
    explorerTxUrl: (txHash: string) => `https://polygonscan.com/tx/${txHash}`,
    explorerAddressUrl: (address: string) => `https://polygonscan.com/token/${address}`,
  },
  {
    id: 'solana',
    name: 'Solana',
    shortName: 'Solana',
    symbol: 'SOL',
    isEvm: false,
    logo: '/tokens/sol.png',
    color: '#00FFA3',
    badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    explorerName: 'Solscan',
    explorerTxUrl: (txHash: string) => `https://solscan.io/tx/${txHash}`,
    explorerAddressUrl: (address: string) => `https://solscan.io/account/${address}`,
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    shortName: 'Bitcoin',
    symbol: 'BTC',
    isEvm: false,
    logo: '/tokens/btc.png',
    color: '#F7931A',
    badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    explorerName: 'Mempool.space',
    explorerTxUrl: (txHash: string) => `https://mempool.space/tx/${txHash}`,
    explorerAddressUrl: (address: string) => `https://mempool.space/address/${address}`,
  },
];

export const NETWORK_MAP = new Map<string, BlockchainNetwork>(
  SUPPORTED_NETWORKS.map((n) => [n.id, n])
);

export const NETWORK_SYMBOL_MAP: Record<BlockchainNetworkId, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  bsc: 'BNB',
  polygon: 'POL',
  solana: 'SOL',
};

export function getChainIdFromNetwork(networkId: BlockchainNetworkId | string): number | null {
  switch (networkId) {
    case 'ethereum':
      return ETHEREUM_CHAIN_ID;
    case 'bsc':
      return BSC_CHAIN_ID;
    case 'polygon':
      return POLYGON_CHAIN_ID;
    default:
      return null;
  }
}

// All supported multi-chain tokens
export const MULTI_CHAIN_TOKENS: SwapTokenInfo[] = [
  // 1. Bitcoin
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    address: 'bitcoin-native',
    networkId: 'bitcoin',
    networkName: 'Bitcoin Network',
    decimals: 8,
    logo: '/tokens/btc.png',
    color: '#F7931A',
    isNative: true,
    minInputAmount: 0.0005,
    minUsdValue: 10,
  },

  // 2. Ethereum (Mainnet)
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    networkId: 'ethereum',
    networkName: 'Ethereum',
    chainId: ETHEREUM_CHAIN_ID,
    decimals: 18,
    logo: '/tokens/eth.png',
    color: '#627EEA',
    isNative: true,
    minInputAmount: 0.005,
    minUsdValue: 5,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    networkId: 'ethereum',
    networkName: 'Ethereum',
    chainId: ETHEREUM_CHAIN_ID,
    decimals: 6,
    logo: '/tokens/usdt.png',
    color: '#26A17B',
    minInputAmount: 5,
    minUsdValue: 5,
  },
  {
    symbol: 'USDC',
    name: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    networkId: 'ethereum',
    networkName: 'Ethereum',
    chainId: ETHEREUM_CHAIN_ID,
    decimals: 6,
    logo: '/tokens/usdc.png',
    color: '#2775CA',
    minInputAmount: 5,
    minUsdValue: 5,
  },

  // 3. BNB Smart Chain
  {
    symbol: 'BNB',
    name: 'BNB',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    networkId: 'bsc',
    networkName: 'BNB Smart Chain',
    chainId: BSC_CHAIN_ID,
    decimals: 18,
    logo: '/tokens/bnb.png',
    color: '#F3BA2F',
    isNative: true,
    minInputAmount: 0.01,
    minUsdValue: 5,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    address: '0x55d398326f99059fF775485246999027B3197955',
    networkId: 'bsc',
    networkName: 'BNB Smart Chain',
    chainId: BSC_CHAIN_ID,
    decimals: 18,
    logo: '/tokens/usdt.png',
    color: '#26A17B',
    minInputAmount: 2,
    minUsdValue: 2,
  },
  {
    symbol: 'USDC',
    name: 'USDC',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    networkId: 'bsc',
    networkName: 'BNB Smart Chain',
    chainId: BSC_CHAIN_ID,
    decimals: 18,
    logo: '/tokens/usdc.png',
    color: '#2775CA',
    minInputAmount: 2,
    minUsdValue: 2,
  },

  // 4. Polygon PoS
  {
    symbol: 'POL',
    name: 'Polygon',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    networkId: 'polygon',
    networkName: 'Polygon',
    chainId: POLYGON_CHAIN_ID,
    decimals: 18,
    logo: '/tokens/matic.png',
    color: '#8247E5',
    isNative: true,
    minInputAmount: 2,
    minUsdValue: 1,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    networkId: 'polygon',
    networkName: 'Polygon',
    chainId: POLYGON_CHAIN_ID,
    decimals: 6,
    logo: '/tokens/usdt.png',
    color: '#26A17B',
    minInputAmount: 1,
    minUsdValue: 1,
  },
  {
    symbol: 'USDC',
    name: 'USDC',
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    networkId: 'polygon',
    networkName: 'Polygon',
    chainId: POLYGON_CHAIN_ID,
    decimals: 6,
    logo: '/tokens/usdc.png',
    color: '#2775CA',
    minInputAmount: 1,
    minUsdValue: 1,
  },
  {
    symbol: 'VERSE',
    name: 'Verse',
    address: '0xc708d6f2153933daa50b2d0758955be0a93a8fec',
    networkId: 'polygon',
    networkName: 'Polygon PoS',
    chainId: POLYGON_CHAIN_ID,
    decimals: 18,
    logo: '/tokens/verse.png',
    color: '#0AC18E',
    minInputAmount: 5000,
    minUsdValue: 0.1,
  },

  // 5. Solana
  {
    symbol: 'SOL',
    name: 'Solana',
    address: 'So11111111111111111111111111111111111111112',
    networkId: 'solana',
    networkName: 'Solana Network',
    decimals: 9,
    logo: '/tokens/sol.png',
    color: '#00FFA3',
    isNative: true,
    minInputAmount: 0.05,
    minUsdValue: 5,
  },
  {
    symbol: 'USDC',
    name: 'USDC',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    networkId: 'solana',
    networkName: 'Solana',
    decimals: 6,
    logo: '/tokens/usdc.png',
    color: '#2775CA',
    minInputAmount: 2,
    minUsdValue: 2,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    networkId: 'solana',
    networkName: 'Solana',
    decimals: 6,
    logo: '/tokens/usdt.png',
    color: '#26A17B',
    minInputAmount: 2,
    minUsdValue: 2,
  },
];

// Helper to get tokens for a specific network
export function getTokensByNetwork(networkId: BlockchainNetworkId): SwapTokenInfo[] {
  return MULTI_CHAIN_TOKENS.filter((t) => t.networkId === networkId);
}

// Backward compatibility: default Polygon tokens
export const SWAP_TOKENS: SwapTokenInfo[] = getTokensByNetwork('polygon');

export const TOKEN_MAP = new Map<string, SwapTokenInfo>(
  MULTI_CHAIN_TOKENS.map((t) => [`${t.networkId}:${t.symbol}`, t])
);

export function getPolygonscanAddressUrl(address: string) {
  return `https://polygonscan.com/token/${address}`;
}

export function getPolygonscanTxUrl(txHash: string) {
  return `https://polygonscan.com/tx/${txHash}`;
}

export function getExplorerTxUrl(txHash: string, networkId: BlockchainNetworkId | string = 'polygon'): string {
  const net = SUPPORTED_NETWORKS.find((n) => n.id === networkId);
  if (net) return net.explorerTxUrl(txHash);
  if (txHash.length === 64 && !txHash.startsWith('0x')) {
    return `https://mempool.space/tx/${txHash}`;
  }
  return `https://polygonscan.com/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, networkId: BlockchainNetworkId | string = 'polygon'): string {
  const net = SUPPORTED_NETWORKS.find((n) => n.id === networkId);
  if (net) return net.explorerAddressUrl(address);
  return `https://polygonscan.com/address/${address}`;
}

/**
 * Formats displayed token amounts in the Exchange UI to a maximum of 2 decimal places.
 * Does not mutate internal values used for transactions or calculations.
 */
export function formatTokenAmount(
  amount: string | number | undefined | null,
  options?: { maxDecimals?: number; minDecimals?: number }
): string {
  if (amount === undefined || amount === null || amount === '') return '0.00';
  const cleanStr = typeof amount === 'string' ? amount.replace(/,/g, '').trim() : String(amount);
  const num = parseFloat(cleanStr);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';

  const maxDecimals = options?.maxDecimals ?? 2;
  const minDecimals = options?.minDecimals ?? 0;

  // Round mathematically to maxDecimals
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((num + Number.EPSILON) * factor) / factor;

  if (num > 0 && rounded === 0) {
    return '<0.01';
  }

  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Formats the live executable quoted receive amount for display in "You Receive".
 * Shows the exact real quoted amount without aggressively rounding or truncating to <0.01.
 */
export function formatRealQuotedAmount(
  amount: string | number | undefined | null
): string {
  if (amount === undefined || amount === null || amount === '') return '0.00';
  const cleanStr = typeof amount === 'string' ? amount.replace(/,/g, '').trim() : String(amount);
  const num = parseFloat(cleanStr);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';

  const parts = cleanStr.split('.');
  const intPart = Number(parts[0]).toLocaleString('en-US');

  if (parts.length === 1) {
    return `${intPart}.00`;
  }

  let decPart = parts[1];

  // For large amounts >= 1,000 (e.g. 13,044.88 VERSE), show 2 decimals
  if (num >= 1000) {
    decPart = decPart.slice(0, 2);
    return `${intPart}.${decPart}`;
  }

  // For amounts >= 1 (e.g. 5.019644 USDC or 52.437178 MATIC), show up to 6 decimals
  if (num >= 1) {
    decPart = decPart.slice(0, 6).replace(/0+$/, '');
    if (decPart.length < 2) decPart = decPart.padEnd(2, '0');
    return `${intPart}.${decPart}`;
  }

  // For small amounts < 1 (e.g. 0.000452 BTC or 0.286668 USDT), show up to 6 significant decimals
  decPart = decPart.slice(0, 8).replace(/0+$/, '');
  if (decPart.length < 2) decPart = decPart.padEnd(2, '0');
  return `${intPart}.${decPart}`;
}
