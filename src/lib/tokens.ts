import type { Address } from 'viem';

export type TokenSymbol = 'usdt' | 'usdc' | 'verse';

export interface TokenConfig {
  symbol: TokenSymbol;
  label: string;
  address: Address;
  decimals: number;
  chainId: number;
  networkName: string;
  blockExplorerUrl: string;
}

export const TOKENS: Record<TokenSymbol, TokenConfig> = {
  usdt: {
    symbol: 'usdt',
    label: 'USDT',
    address: '0x7169D38820DfD117c3Fa1F22a697dBA58d90bA06',
    decimals: 6,
    chainId: 11155111,
    networkName: 'Sepolia',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
  },
  usdc: {
    symbol: 'usdc',
    label: 'USDC',
    address: '0xf08A50178dfcde18524640ea6618a1f965821715',
    decimals: 6,
    chainId: 11155111,
    networkName: 'Sepolia',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
  },
  verse: {
    symbol: 'verse',
    label: 'VERSE',
    address: '0xc708d6f2153933daa50b2d0758955be0a93a8fec',
    decimals: 18,
    chainId: 137,
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

// Minimal ERC-20 ABI — only what we need: transfer, balanceOf, decimals
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
] as const;

