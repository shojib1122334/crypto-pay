import type { Address } from 'viem';

export type TokenSymbol = 'usdt' | 'usdc' | 'verse' | 'pol' | 'eth';

export interface TokenConfig {
  symbol: TokenSymbol;
  label: string;
  name: string;
  address: Address;
  decimals: number;
  chainId: number;
  networkName: string;
  blockExplorerUrl: string;
  isNative?: boolean;
  iconColor?: string;
}

export const POLYGON_CHAIN_ID = 137;
export const ETHEREUM_CHAIN_ID = 1;

export const TOKENS: Record<string, TokenConfig> = {
  // Polygon Tokens
  usdt: {
    symbol: 'usdt',
    label: 'USDT',
    name: 'Tether USD',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    chainId: POLYGON_CHAIN_ID,
    networkName: 'Polygon',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  usdc: {
    symbol: 'usdc',
    label: 'USDC',
    name: 'USD Coin (Native)',
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    chainId: POLYGON_CHAIN_ID,
    networkName: 'Polygon',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  'usdc.e': {
    symbol: 'usdc',
    label: 'USDC.e',
    name: 'Bridged USD Coin (USDC.e)',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
    chainId: POLYGON_CHAIN_ID,
    networkName: 'Polygon',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  verse: {
    symbol: 'verse',
    label: 'VERSE',
    name: 'Verse Token',
    address: '0xc708D6F2153933DAA50B2D0758955Be0A93A8FEc',
    decimals: 18,
    chainId: POLYGON_CHAIN_ID,
    networkName: 'Polygon',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  pol: {
    symbol: 'pol',
    label: 'POL',
    name: 'Polygon Ecosystem Token (Native)',
    address: '0x0000000000000000000000000000000000000000' as Address,
    decimals: 18,
    chainId: POLYGON_CHAIN_ID,
    networkName: 'Polygon',
    blockExplorerUrl: 'https://polygonscan.com',
    isNative: true,
  },
  // Ethereum Tokens
  'usdt-eth': {
    symbol: 'usdt',
    label: 'USDT',
    name: 'Tether USD (Ethereum)',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    chainId: ETHEREUM_CHAIN_ID,
    networkName: 'Ethereum',
    blockExplorerUrl: 'https://etherscan.io',
  },
  'usdc-eth': {
    symbol: 'usdc',
    label: 'USDC',
    name: 'USD Coin (Ethereum)',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chainId: ETHEREUM_CHAIN_ID,
    networkName: 'Ethereum',
    blockExplorerUrl: 'https://etherscan.io',
  },
  'verse-eth': {
    symbol: 'verse',
    label: 'VERSE',
    name: 'Verse Token (Ethereum)',
    address: '0x249cA82617eC3DfB2589c4c17ab7EC9765350a18',
    decimals: 18,
    chainId: ETHEREUM_CHAIN_ID,
    networkName: 'Ethereum',
    blockExplorerUrl: 'https://etherscan.io',
  },
  eth: {
    symbol: 'eth',
    label: 'ETH',
    name: 'Ethereum (Native)',
    address: '0x0000000000000000000000000000000000000000' as Address,
    decimals: 18,
    chainId: ETHEREUM_CHAIN_ID,
    networkName: 'Ethereum',
    blockExplorerUrl: 'https://etherscan.io',
    isNative: true,
  },
};

export interface MultiChainToken {
  id: string;
  symbol: string;
  name: string;
  networks: {
    chainId: number;
    networkName: string;
    address: Address;
    decimals: number;
    isNative?: boolean;
    blockExplorerUrl: string;
  }[];
}

export const SUPPORTED_PAY_TOKENS: MultiChainToken[] = [
  {
    id: 'verse',
    symbol: 'VERSE',
    name: 'Verse Token',
    networks: [
      {
        chainId: POLYGON_CHAIN_ID,
        networkName: 'Polygon',
        address: '0xc708D6F2153933DAA50B2D0758955Be0A93A8FEc',
        decimals: 18,
        blockExplorerUrl: 'https://polygonscan.com',
      },
      {
        chainId: ETHEREUM_CHAIN_ID,
        networkName: 'Ethereum',
        address: '0x249cA82617eC3DfB2589c4c17ab7EC9765350a18',
        decimals: 18,
        blockExplorerUrl: 'https://etherscan.io',
      },
    ],
  },
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether USD',
    networks: [
      {
        chainId: POLYGON_CHAIN_ID,
        networkName: 'Polygon',
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6,
        blockExplorerUrl: 'https://polygonscan.com',
      },
      {
        chainId: ETHEREUM_CHAIN_ID,
        networkName: 'Ethereum',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        blockExplorerUrl: 'https://etherscan.io',
      },
    ],
  },
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    networks: [
      {
        chainId: POLYGON_CHAIN_ID,
        networkName: 'Polygon',
        address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        decimals: 6,
        blockExplorerUrl: 'https://polygonscan.com',
      },
      {
        chainId: ETHEREUM_CHAIN_ID,
        networkName: 'Ethereum',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        blockExplorerUrl: 'https://etherscan.io',
      },
    ],
  },
  {
    id: 'pol',
    symbol: 'POL',
    name: 'Polygon Ecosystem Token',
    networks: [
      {
        chainId: POLYGON_CHAIN_ID,
        networkName: 'Polygon',
        address: '0x0000000000000000000000000000000000000000' as Address,
        decimals: 18,
        isNative: true,
        blockExplorerUrl: 'https://polygonscan.com',
      },
    ],
  },
];

export const TOKEN_LIST: TokenConfig[] = [
  TOKENS.usdt,
  TOKENS.usdc,
  TOKENS.verse,
];

export function getToken(symbol: string): TokenConfig | null {
  const s = symbol.toLowerCase().trim();
  if (s === 'usdce' || s === 'usdc.e') {
    return TOKENS['usdc.e'] ?? null;
  }
  return TOKENS[s as TokenSymbol] ?? null;
}


// Full standard ERC-20 ABI — transfer, balanceOf, decimals, symbol, name, Transfer event
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
] as const;
