// Polygon Mainnet & Payment System Types
// Complies strictly with Specifications 1-32

export const POLYGON_CHAIN_ID = 137;
export const POLYGON_CHAIN_ID_HEX = '0x89';
export const POLYGON_NETWORK_NAME = 'Polygon PoS';
export const POLYGON_GAS_TOKEN = 'POL';

// Official Native Polygon Token Contracts (Spec 4)
export const POLYGON_TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Native)',
    contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    contractAddress: '0xc2132D05D31c914a87C6611C10748AaB04B58e8F',
    decimals: 6,
  },
  POL: {
    symbol: 'POL',
    name: 'Polygon Native Gas Token',
    contractAddress: '0x0000000000000000000000000000000000001010',
    decimals: 18,
  },
} as const;

export type SupportedTokenSymbol = 'USDC' | 'USDT' | 'POL';

// Payment Types (Spec 5)
export type PaymentType = 'CRYPTO_SEND' | 'CARD_SETTLEMENT';

// Payment Statuses (Spec 23)
export type PaymentStatus =
  | 'CREATED'
  | 'QUOTE_CREATED'
  | 'WAITING_PAYMENT'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMING'
  | 'PROVIDER_PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

// Database Schema (Spec 22)
export interface PaymentRecord {
  id: string;
  paymentId: string;
  walletAddress: string;
  token: SupportedTokenSymbol;
  tokenContract: string;
  chainId: number;
  amount: number;
  decimals: number;
  merchantAddress?: string;
  recipientAddress?: string;
  paymentType: PaymentType;
  provider?: 'transak' | 'ramp' | null;
  providerOrderId?: string;
  providerPaymentId?: string;
  fiatCurrency?: string;
  payoutMethod?: string;
  txHash?: string;
  blockNumber?: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  errorMessage?: string;
}

// Live On-Chain Balances
export interface WalletOnChainBalances {
  walletAddress: string;
  chainId: number;
  polBalance: number;
  usdcBalance: number;
  usdtBalance: number;
  polBalanceRaw: string;
  usdcBalanceRaw: string;
  usdtBalanceRaw: string;
  timestamp: string;
}
