import type { Address } from 'viem';

export type TokenSymbol = 'usdt' | 'usdc' | 'verse';

export interface TokenConfig {
  symbol: TokenSymbol;
  label: string;
  name: string;
  address: Address;
  decimals: number;
  chainId: number;
  networkName: string;
  blockExplorerUrl: string;
}

export const POLYGON_CHAIN_ID = 137;

export const TOKENS: Record<TokenSymbol, TokenConfig> = {
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
    // Native USDC on Polygon PoS (not bridged USDC.e)
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
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
};

export const TOKEN_LIST: TokenConfig[] = [
  TOKENS.usdt,
  TOKENS.usdc,
  TOKENS.verse,
];

export function getToken(symbol: string): TokenConfig | null {
  return TOKENS[symbol.toLowerCase() as TokenSymbol] ?? null;
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
