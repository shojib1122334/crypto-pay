export interface WhitelistedToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logo: string;
  color: string;
  networkId?: string;
  networkName?: string;
  chainId?: number;
  enabled: boolean;
  minInputAmount?: number;
  minUsdValue?: number;
}

export type SwapRouteType =
  | 'KYBERSWAP_AGGREGATOR'
  | 'UNISWAP_V3'
  | 'QUICKSWAP_V2'
  | 'PANCAKESWAP'
  | 'LIFI_AGGREGATOR'
  | 'SIDESHIFT_CROSSCHAIN'
  | 'JUPITER_SOLANA';

export interface SwapRouteHop {
  fromToken: string;
  toToken: string;
  pool?: string;
  fee?: number;
  protocol: string;
}

export interface SwapQuote {
  quoteId: string;
  chainId?: number | string;
  fromNetwork: string;
  toNetwork: string;
  isCrossChain?: boolean;
  walletAddress: string;
  inputToken: WhitelistedToken;
  outputToken: WhitelistedToken;
  inputAmount: string;          // Human-readable string, e.g. "10.5"
  inputAmountRaw: string;       // Wei/units string
  expectedOutput: string;       // Human-readable output string
  expectedOutputRaw: string;    // Raw units
  minimumReceived: string;      // After slippage
  minimumReceivedRaw: string;
  exchangeRate: string;         // E.g. "1 ETH = 2450 USDC"
  inverseExchangeRate: string;  // E.g. "1 USDC = 0.000408 ETH"
  priceImpact: number;          // In percentage, e.g. 0.04 (%)
  priceImpactSeverity: 'low' | 'medium' | 'high' | 'blocked';
  liquidityFeePercent: number;  // In percentage, e.g. 0.01 or 0.30
  providerFeeAmount: string;    // Token amount fee
  estimatedGas: string;         // Gas units, e.g. "180000"
  estimatedGasFeePol?: string;  // Fee in Native token (POL, ETH, BNB, SOL, BTC)
  estimatedGasFeeUsd: string;   // Fee in USD
  slippage: number;             // E.g. 0.5 (%)
  providerType?: 'LIFI' | 'KYBERSWAP' | 'SIDESHIFT' | 'JUPITER' | 'ONCHAIN';
  spenderAddress?: string;      // Contract that needs token allowance approval
  depositAddress?: string;      // For cross-chain deposit shifts (e.g. Bitcoin / non-EVM)
  shiftId?: string;             // SideShift/cross-chain tracking id
  route: {
    protocol: string;
    description: string;
    hops: SwapRouteHop[];
    routerAddress?: string;
    path?: string[];
  };
  kyberRouteSummary?: unknown;
  lifiTransactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    gasPrice?: string;
  };
  transactionValue?: string;    // Raw wei transaction value
  expiresAt: number;            // Timestamp in ms
  createdAt: number;            // Timestamp in ms
}

export interface SwapPrepareResponse {
  quoteId: string;
  chainId?: number | string;
  to: `0x${string}`;
  data: `0x${string}`;
  value: `0x${string}`;
  transactionValue?: string;
  valueWei?: string;
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
  chainId?: number | string;
  network?: string;
  fromNetwork?: string;
  toNetwork?: string;
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
  explorerUrl?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  errorMessage?: string;
  createdAt: number;
  confirmedAt?: number;
}

export interface SwapConfig {
  enabled: boolean;
  supportedNetworks: string[];
  defaultSlippage: number;
  maxSlippage: number;
  maxPriceImpact: number;
  quoteExpirationSeconds: number;
}
