export type TopUpToken = 'USDT' | 'USDC';

export interface TopUpRecord {
  id: string;
  paymentId: string;
  walletAddress: string;
  token: TopUpToken;
  tokenContract: string;
  chainId: number;
  amount: number;
  fiatCurrency: string;
  fiatAmount: number;
  cardLast4: string;
  cardholderName: string;
  cardBrand: string;
  txHash: string;
  status: 'COMPLETED' | 'CONFIRMING' | 'FAILED';
  provider: string;
  createdAt: string;
  blockNumber?: number;
  errorMessage?: string;
}

export interface TopUpQuote {
  quoteId: string;
  token: TopUpToken;
  cryptoAmount: number;
  fiatCurrency: string;
  fiatAmount: number;
  exchangeRate: number;
  providerFee: number;
  networkFee: number;
  totalFee: number;
  expiresAt: string;
}
