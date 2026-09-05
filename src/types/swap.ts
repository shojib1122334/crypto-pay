export interface WhitelistedToken {
  symbol: 'USDT' | 'USDC' | 'VERSE' | 'MATIC';
  name: string;
  address: `0x${string}`;
  decimals: number;
  logo: string;
  color: string;
  enabled: boolean;
  minInputAmount?: number; // E.g. 10000 for VERSE, 3 for MATIC
  minUsdValue?: number;    // E.g. 1.0 for USDT & USDC
}

export type SwapPairKey =
  | 'USDT-USDC'
  | 'USDC-USDT'
  | 'USDT-VERSE'
  | 'VERSE-USDT'
  | 'USDC-VERSE'
  | 'VERSE-USDC'
  | 'MATIC-USDT'
  | 'USDT-MATIC'
  | 'MATIC-USDC'
  | 'USDC-MATIC'
  | 'MATIC-VERSE'
  | 'VERSE-MATIC';

export type SwapRouteType = 'KYBERSWAP_AGGREGATOR' | 'UNISWAP_V3' | 'QUICKSWAP_V2';

export interface SwapRouteHop {
  fromToken: string;
  toToken: string;
  pool: string;
  fee?: number;
  protocol: string;
}

export interface SwapQuote {
  quoteId: string;
  chainId: 137;
  walletAddress: string;
  inputToken: WhitelistedToken;
  outputToken: WhitelistedToken;
  inputAmount: string;          // Human-readable string, e.g. "10.5"
  inputAmountRaw: string;       // Wei/units string
  expectedOutput: string;       // Human-readable output string
  expectedOutputRaw: string;    // Raw units
  minimumReceived: string;      // After slippage
  minimumReceivedRaw: string;
  exchangeRate: string;         // E.g. "1 USDT = 39410.5 VERSE"
  inverseExchangeRate: string;  // E.g. "1 VERSE = 0.00002537 USDT"
  priceImpact: number;          // In percentage, e.g. 0.04 (%)
  priceImpactSeverity: 'low' | 'medium' | 'high' | 'blocked';
  liquidityFeePercent: number;  // In percentage, e.g. 0.01 or 0.30
  providerFeeAmount: string;    // Token amount fee
  estimatedGas: string;         // Gas units, e.g. "180000"
  estimatedGasFeePol: string;   // Fee in POL/MATIC
  estimatedGasFeeUsd: string;   // Fee in USD
  slippage: number;             // E.g. 0.5 (%)
  route: {
    protocol: string;
    description: string;
    hops: SwapRouteHop[];
    routerAddress: `0x${string}`;
  };
  kyberRouteSummary?: unknown;
  expiresAt: number;            // Timestamp in ms
  createdAt: number;            // Timestamp in ms
}

export interface SwapPrepareResponse {
  quoteId: string;
  chainId: 137;
  to: `0x${string}`;
  data: `0x${string}`;
  value: `0x${string}`;
  gasLimit: string;
  deadline: number;
  minimumOutputAmountRaw: string;
}

export type SwapStatus =
  | 'QUOTE_CREATED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'SWAP_PENDING'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'QUOTE_EXPIRED'
  | 'REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_GAS'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'TRANSACTION_REVERTED'
  | 'TRANSACTION_FAILED';

export interface SwapHistoryRecord {
  id: string;
  walletAddress: string;
  chainId: 137;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  expectedOutputAmount: string;
  actualOutputAmount: string;
  minimumReceived: string;
  exchangeRate: string;
  priceImpact: number;
  slippage: number;
  providerFee: string;
  networkFee: string;
  gasUsed?: string;
  routerAddress: string;
  routerName: string;
  txHash: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  errorMessage?: string;
  createdAt: number;
  confirmedAt?: number;
}

export interface SwapConfig {
  enabled: boolean;
  chainId: 137;
  networkName: string;
  supportedTokens: WhitelistedToken[];
  minUsdValue: number;
  minVerseInput: number;
  defaultSlippage: number;
  maxSlippage: number;
  maxPriceImpact: number;
  quoteExpirationSeconds: number;
  routers: {
    uniswapV3: `0x${string}`;
    quickswapV2: `0x${string}`;
  };
}
