import {
  createPublicClient,
  http,
  fallback,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  parseAbi,
  getAddress,
  type Hash,
} from 'viem';
import { polygon } from 'viem/chains';
import {
  POLYGON_CHAIN_ID,
  WHITELISTED_TOKENS,
  WMATIC_ADDRESS,
  SWAP_ROUTERS,
  KYBERSWAP_CONFIG,
  SWAP_ENGINE_CONFIG,
  VALID_PAIRS,
  type TokenConfig,
} from './swapConfig';
import { recordSwap, type SwapDbRecord } from './swapDb';

// Reusable Viem Public Client with multiple Polygon RPCs for high resilience
const polygonTransports = SWAP_ENGINE_CONFIG.rpcEndpoints.map((url) =>
  http(url, { timeout: 8000, retryCount: 2 })
);

const polygonClient = createPublicClient({
  chain: polygon,
  transport: fallback(polygonTransports),
});

// ABIs
const quickswapV2RouterAbi = parseAbi([
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
]);

const uniswapV3QuoterAbi = parseAbi([
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
]);

const uniswapV3RouterAbi = parseAbi([
  'struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }',
  'function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut)',
]);

export interface SwapRouteHop {
  fromToken: string;
  toToken: string;
  pool: string;
  fee?: number;
  protocol: string;
}

export interface ExecutableQuote {
  quoteId: string;
  chainId: 137;
  walletAddress: string;
  inputToken: TokenConfig;
  outputToken: TokenConfig;
  inputAmount: string;
  inputAmountRaw: string;
  expectedOutput: string;
  expectedOutputRaw: string;
  minimumReceived: string;
  minimumReceivedRaw: string;
  exchangeRate: string;
  inverseExchangeRate: string;
  priceImpact: number;
  priceImpactSeverity: 'low' | 'medium' | 'high' | 'blocked';
  liquidityFeePercent: number;
  providerFeeAmount: string;
  estimatedGas: string;
  estimatedGasFeePol: string;
  estimatedGasFeeUsd: string;
  slippage: number;
  route: {
    protocol: string;
    description: string;
    path: `0x${string}`[];
    fee?: number;
    routerAddress: `0x${string}`;
    hops?: SwapRouteHop[];
  };
  kyberRouteSummary?: unknown;
  expiresAt: number;
  createdAt: number;
}

// In-memory cache for active non-expired quotes
const activeQuotes = new Map<string, ExecutableQuote>();

// Cleanup expired quotes periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, quote] of activeQuotes.entries()) {
    if (now > quote.expiresAt + 120000) {
      activeQuotes.delete(id);
    }
  }
}, 30000);
if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

interface KyberPoolStep {
  pool: string;
  tokenIn: string;
  tokenOut: string;
  swapAmount: string;
  amountOut: string;
  exchange: string;
  poolType: string;
}

interface KyberRouteSummary {
  tokenIn: string;
  amountIn: string;
  amountInUsd: string;
  tokenOut: string;
  amountOut: string;
  amountOutUsd: string;
  gas: string;
  gasPrice: string;
  gasUsd: string;
  route: KyberPoolStep[][];
  routeID?: string;
  checksum?: string;
  timestamp?: number;
}

function parseKyberRoute(
  tokenInSymbol: string,
  tokenOutSymbol: string,
  summary: KyberRouteSummary
): { description: string; path: `0x${string}`[]; hops: SwapRouteHop[] } {
  const knownSymbols: Record<string, string> = {
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT',
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 'USDC',
    '0xc708d6f2153933daa50b2d0758955be0a93a8fec': 'VERSE',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'MATIC',
    '0x0000000000000000000000000000000000001010': 'MATIC',
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 'WMATIC',
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'WETH',
    '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': 'WBTC',
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC.e',
  };

  const getSymbol = (addr: string) =>
    knownSymbols[addr.toLowerCase()] || `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  const exchangeNames: Record<string, string> = {
    uniswap: 'Uniswap V2',
    uniswapv3: 'Uniswap V3',
    polydex: 'QuickSwap V2',
    quickswap: 'QuickSwap',
    quickswapv3: 'QuickSwap V3',
    mmf: 'MM Finance',
    sushiswap: 'SushiSwap',
    dodo: 'DODO',
    curve: 'Curve',
    balancer: 'Balancer',
  };

  const getExName = (ex: string) => exchangeNames[ex.toLowerCase()] || ex;

  const hops: SwapRouteHop[] = [];
  const path: `0x${string}`[] = [];

  if (summary.route && Array.isArray(summary.route)) {
    for (const leg of summary.route) {
      for (const step of leg) {
        const fromSym = getSymbol(step.tokenIn);
        const toSym = getSymbol(step.tokenOut);
        const protocolName = getExName(step.exchange);

        hops.push({
          fromToken: fromSym,
          toToken: toSym,
          pool: step.pool,
          protocol: protocolName,
        });

        const inAddr = step.tokenIn.toLowerCase() as `0x${string}`;
        const outAddr = step.tokenOut.toLowerCase() as `0x${string}`;
        if (!path.includes(inAddr)) path.push(inAddr);
        if (!path.includes(outAddr)) path.push(outAddr);
      }
    }
  }

  let description = '';
  if (hops.length > 0) {
    description = `KyberSwap: ${hops.map((h) => `${h.fromToken} via ${h.protocol}`).join(' → ')} → ${tokenOutSymbol}`;
  } else {
    description = `KyberSwap Aggregator: ${tokenInSymbol} → ${tokenOutSymbol}`;
  }

  return { description, path, hops };
}

/**
 * Fetch real-time gas price and POL/USD price for accurate network fee estimation
 */
async function getNetworkFeeDetails(estimatedGasUnits: bigint): Promise<{
  gasLimit: string;
  feePol: string;
  feeUsd: string;
}> {
  try {
    const gasPrice = await polygonClient.getGasPrice();
    const feeInWei = gasPrice * estimatedGasUnits;
    const feePol = formatUnits(feeInWei, 18);

    // Get POL price in USDC from Quickswap V2
    let polPriceUsd = 0.10; // Fallback estimate
    try {
      const polUsdRes = await polygonClient.readContract({
        address: SWAP_ROUTERS.quickswapV2Router,
        abi: quickswapV2RouterAbi,
        functionName: 'getAmountsOut',
        args: [parseUnits('1', 18), [WMATIC_ADDRESS, WHITELISTED_TOKENS.USDC.address]],
      });
      polPriceUsd = parseFloat(formatUnits(polUsdRes[1], 6));
    } catch {
      // Keep fallback
    }

    const feeUsd = (parseFloat(feePol) * polPriceUsd).toFixed(5);
    return {
      gasLimit: estimatedGasUnits.toString(),
      feePol: parseFloat(feePol).toFixed(5),
      feeUsd: `$${feeUsd}`,
    };
  } catch {
    return {
      gasLimit: estimatedGasUnits.toString(),
      feePol: '0.00500',
      feeUsd: '$0.0005',
    };
  }
}

/**
 * Validates request parameters and queries on-chain Polygon DEX liquidity
 */
export async function generateExecutableQuote(params: {
  chainId: number;
  walletAddress: string;
  inputSymbol: 'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL' | string;
  outputSymbol: 'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL' | string;
  inputAmount: string;
  slippage?: number;
}): Promise<ExecutableQuote> {
  const { chainId, walletAddress, inputAmount } = params;

  // 1. Strict Chain ID Validation
  if (Number(chainId) !== POLYGON_CHAIN_ID) {
    throw new Error(`Unsupported network. CryptoPay Swap operates exclusively on Polygon Mainnet (Chain ID ${POLYGON_CHAIN_ID}).`);
  }

  // 2. Token Whitelist Validation
  const inSym = (params.inputSymbol || '').toUpperCase() as 'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL';
  const outSym = (params.outputSymbol || '').toUpperCase() as 'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL';

  const tokenIn = WHITELISTED_TOKENS[inSym];
  const tokenOut = WHITELISTED_TOKENS[outSym];
  if (!tokenIn || !tokenOut) {
    throw new Error('One or both selected tokens are not supported. Supported tokens are MATIC, POL, USDT, USDC, and VERSE on Polygon.');
  }

  const isNativeIn = tokenIn.symbol === 'MATIC' || tokenIn.symbol === 'POL';
  const isNativeOut = tokenOut.symbol === 'MATIC' || tokenOut.symbol === 'POL';

  if (tokenIn.symbol === tokenOut.symbol || (isNativeIn && isNativeOut)) {
    throw new Error('Same-token swaps are not permitted.');
  }

  // 3. Supported Pairs Validation
  const pairKey = `${tokenIn.symbol}-${tokenOut.symbol}`;
  if (!VALID_PAIRS.has(pairKey)) {
    throw new Error(`Swap pair ${pairKey} is not supported.`);
  }

  // 4. Amount parsing and minimum rules validation
  const numAmount = parseFloat(inputAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Please enter a valid swap amount greater than zero.');
  }

  // Rule: MATIC/POL input minimum is 3 MATIC
  if (isNativeIn && numAmount < 3) {
    throw new Error('Minimum Swap amount for Polygon (POL/MATIC) is 3 MATIC.');
  }

  // Rule: VERSE input minimum is 10,000 VERSE
  if (tokenIn.symbol === 'VERSE' && numAmount < 10000) {
    throw new Error('Minimum Swap amount for VERSE is 10,000 VERSE.');
  }

  // Rule: USDT / USDC minimum is $1 USD equivalent
  if ((tokenIn.symbol === 'USDT' || tokenIn.symbol === 'USDC') && numAmount < 1.0) {
    throw new Error(`Minimum Swap amount for ${tokenIn.symbol} is $1.00.`);
  }

  // Slippage validation
  const slippage = params.slippage !== undefined ? Number(params.slippage) : SWAP_ENGINE_CONFIG.defaultSlippage;
  if (isNaN(slippage) || slippage <= 0 || slippage > SWAP_ENGINE_CONFIG.maxSlippage) {
    throw new Error(`Slippage must be between 0.01% and ${SWAP_ENGINE_CONFIG.maxSlippage}%.`);
  }

  const amountInRaw = parseUnits(inputAmount, tokenIn.decimals);

  // 5. Query KyberSwap Aggregator API on Polygon Mainnet for best route & live quote
  let kyberRouteSummary: KyberRouteSummary | undefined = undefined;
  let routerAddress: `0x${string}` = KYBERSWAP_CONFIG.routerAddress;
  let bestExpectedRaw = 0n;
  let selectedProtocol = 'KyberSwap Aggregator';
  let routeDescription = '';
  let routePath: `0x${string}`[] = [tokenIn.address, tokenOut.address];
  let poolFee: number | undefined = undefined;
  let hops: SwapRouteHop[] = [];
  let liquidityFeePercent = 0.30;
  let estimatedGasUnits = 380000n;
  let estimatedGasFeePol = '0.01000';
  let estimatedGasFeeUsd = '$0.0100';
  let priceImpact = 0.05;

  try {
    const kyberUrl = `${KYBERSWAP_CONFIG.baseUrl}/routes?tokenIn=${tokenIn.address}&tokenOut=${tokenOut.address}&amountIn=${amountInRaw.toString()}`;
    const kyberRes = await fetch(kyberUrl, {
      headers: {
        'x-client-id': KYBERSWAP_CONFIG.clientId,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (kyberRes.ok) {
      const kyberJson = await kyberRes.json();
      if (kyberJson.code === 0 && kyberJson.data?.routeSummary) {
        const summary = kyberJson.data.routeSummary as KyberRouteSummary;
        if (summary.amountOut && BigInt(summary.amountOut) > 0n) {
          kyberRouteSummary = summary;
          bestExpectedRaw = BigInt(summary.amountOut);
          routerAddress = (kyberJson.data.routerAddress || KYBERSWAP_CONFIG.routerAddress) as `0x${string}`;

          const parsed = parseKyberRoute(tokenIn.symbol, tokenOut.symbol, summary);
          routeDescription = parsed.description;
          routePath = parsed.path.length > 0 ? parsed.path : [tokenIn.address, tokenOut.address];
          hops = parsed.hops;

          // Exact live price impact from KyberSwap Aggregator USD values
          const inUsd = parseFloat(summary.amountInUsd || '0');
          const outUsd = parseFloat(summary.amountOutUsd || '0');
          if (inUsd > 0 && outUsd > 0) {
            const diff = ((inUsd - outUsd) / inUsd) * 100;
            priceImpact = Math.max(0.01, parseFloat(diff.toFixed(2)));
          }

          // Live gas estimate from KyberSwap
          if (summary.gas) {
            estimatedGasUnits = BigInt(summary.gas);
          }
          if (summary.gasPrice && summary.gas) {
            const gasWei = BigInt(summary.gas) * BigInt(summary.gasPrice);
            estimatedGasFeePol = parseFloat(formatUnits(gasWei, 18)).toFixed(5);
          }
          if (summary.gasUsd) {
            estimatedGasFeeUsd = `$${parseFloat(summary.gasUsd).toFixed(4)}`;
          }
        }
      } else {
        console.warn(`[KyberSwap] Aggregator non-zero response (${kyberJson.code}): ${kyberJson.message || 'No route found'}`);
      }
    } else {
      console.warn(`[KyberSwap] Aggregator HTTP status: ${kyberRes.status} ${kyberRes.statusText}`);
    }
  } catch (err) {
    console.warn('KyberSwap Aggregator API query error, checking on-chain fallback:', err);
  }

  // Fallback to on-chain Uniswap/Quickswap if KyberSwap Aggregator is temporarily unreachable
  if (bestExpectedRaw <= 0n) {
    const inAddr = isNativeIn ? WMATIC_ADDRESS : tokenIn.address;
    const outAddr = isNativeOut ? WMATIC_ADDRESS : tokenOut.address;

    if (
      (tokenIn.symbol === 'USDT' && tokenOut.symbol === 'USDC') ||
      (tokenIn.symbol === 'USDC' && tokenOut.symbol === 'USDT')
    ) {
      let uniBestRaw = 0n;
      let uniBestFee = 100;
      for (const fee of [100, 500]) {
        try {
          const out = await polygonClient.readContract({
            address: SWAP_ROUTERS.uniswapV3Quoter,
            abi: uniswapV3QuoterAbi,
            functionName: 'quoteExactInputSingle',
            args: [tokenIn.address, tokenOut.address, fee, amountInRaw, 0n],
          });
          if (out > uniBestRaw) {
            uniBestRaw = out;
            uniBestFee = fee;
          }
        } catch {
          // Pool fee tier might not have enough liquidity
        }
      }

      let quickV2Raw = 0n;
      try {
        const qRes = await polygonClient.readContract({
          address: SWAP_ROUTERS.quickswapV2Router,
          abi: quickswapV2RouterAbi,
          functionName: 'getAmountsOut',
          args: [amountInRaw, [tokenIn.address, tokenOut.address]],
        });
        quickV2Raw = qRes[1];
      } catch {
        // Ignore
      }

      if (uniBestRaw >= quickV2Raw && uniBestRaw > 0n) {
        bestExpectedRaw = uniBestRaw;
        selectedProtocol = 'Uniswap V3';
        poolFee = uniBestFee;
        liquidityFeePercent = uniBestFee === 100 ? 0.01 : 0.05;
        routerAddress = SWAP_ROUTERS.uniswapV3Router;
        routePath = [tokenIn.address, tokenOut.address];
        routeDescription = `${tokenIn.symbol} → Uniswap V3 (${(uniBestFee / 10000).toFixed(2)}%) → ${tokenOut.symbol}`;
        estimatedGasUnits = 145000n;
      } else if (quickV2Raw > 0n) {
        bestExpectedRaw = quickV2Raw;
        selectedProtocol = 'QuickSwap V2';
        liquidityFeePercent = 0.30;
        routerAddress = SWAP_ROUTERS.quickswapV2Router;
        routePath = [tokenIn.address, tokenOut.address];
        routeDescription = `${tokenIn.symbol} → QuickSwap V2 (Direct) → ${tokenOut.symbol}`;
        estimatedGasUnits = 160000n;
      }
    } else {
      if (inAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase()) {
        routePath = [WMATIC_ADDRESS, outAddr];
      } else if (outAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase()) {
        routePath = [inAddr, WMATIC_ADDRESS];
      } else {
        routePath = [inAddr, WMATIC_ADDRESS, outAddr];
      }

      try {
        const qRes = await polygonClient.readContract({
          address: SWAP_ROUTERS.quickswapV2Router,
          abi: quickswapV2RouterAbi,
          functionName: 'getAmountsOut',
          args: [amountInRaw, routePath],
        });
        bestExpectedRaw = qRes[qRes.length - 1];
        selectedProtocol = 'QuickSwap V2';
        liquidityFeePercent = 0.30;
        routerAddress = SWAP_ROUTERS.quickswapV2Router;
        routeDescription = `${tokenIn.symbol} → QuickSwap V2 (${routePath.length > 2 ? 'via WMATIC' : 'Direct'}) → ${tokenOut.symbol}`;
        estimatedGasUnits = 195000n;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Insufficient liquidity';
        throw new Error(`Insufficient Polygon liquidity for pair ${pairKey}: ${msg}`);
      }
    }

    // Spot rate for fallback
    let spotOutputRaw = 0n;
    const spotInputRaw = parseUnits(tokenIn.symbol === 'VERSE' ? '100' : '1', tokenIn.decimals);
    try {
      if (selectedProtocol === 'Uniswap V3' && poolFee) {
        spotOutputRaw = await polygonClient.readContract({
          address: SWAP_ROUTERS.uniswapV3Quoter,
          abi: uniswapV3QuoterAbi,
          functionName: 'quoteExactInputSingle',
          args: [tokenIn.address, tokenOut.address, poolFee, spotInputRaw, 0n],
        });
      } else {
        const spotRes = await polygonClient.readContract({
          address: SWAP_ROUTERS.quickswapV2Router,
          abi: quickswapV2RouterAbi,
          functionName: 'getAmountsOut',
          args: [spotInputRaw, routePath],
        });
        spotOutputRaw = spotRes[spotRes.length - 1];
      }
    } catch {
      // Ignore
    }

    if (spotOutputRaw > 0n) {
      const spotRate = parseFloat(formatUnits(spotOutputRaw, tokenOut.decimals)) / (tokenIn.symbol === 'VERSE' ? 100 : 1);
      const execRate = parseFloat(formatUnits(bestExpectedRaw, tokenOut.decimals)) / numAmount;
      if (spotRate > 0) {
        const diff = ((spotRate - execRate) / spotRate) * 100;
        priceImpact = Math.max(0.01, parseFloat(diff.toFixed(2)));
      }
    }
  }

  if (bestExpectedRaw <= 0n) {
    throw new Error(`No executable liquidity found on Polygon for ${inputAmount} ${tokenIn.symbol} to ${tokenOut.symbol}.`);
  }

  const expectedOutput = formatUnits(bestExpectedRaw, tokenOut.decimals);

  let priceImpactSeverity: 'low' | 'medium' | 'high' | 'blocked' = 'low';
  if (priceImpact > SWAP_ENGINE_CONFIG.maxPriceImpact) {
    priceImpactSeverity = 'blocked';
  } else if (priceImpact > 2.0) {
    priceImpactSeverity = 'high';
  } else if (priceImpact > 0.5) {
    priceImpactSeverity = 'medium';
  }

  if (priceImpactSeverity === 'blocked') {
    throw new Error(`Price impact (${priceImpact}%) exceeds maximum allowable threshold (${SWAP_ENGINE_CONFIG.maxPriceImpact}%). Please reduce swap amount.`);
  }

  // 7. Minimum Received Calculation with Slippage
  // minimumReceivedRaw = expectedRaw * (10000 - slippageBps) / 10000
  const slippageBps = BigInt(Math.floor(slippage * 100));
  const minimumReceivedRaw = (bestExpectedRaw * (10000n - slippageBps)) / 10000n;
  const minimumReceived = formatUnits(minimumReceivedRaw, tokenOut.decimals);

  // 8. Exchange Rates
  const rate = (parseFloat(expectedOutput) / numAmount).toFixed(6);
  const invRate = (numAmount / parseFloat(expectedOutput)).toFixed(8);
  const exchangeRate = `1 ${tokenIn.symbol} ≈ ${rate} ${tokenOut.symbol}`;
  const inverseExchangeRate = `1 ${tokenOut.symbol} ≈ ${invRate} ${tokenIn.symbol}`;

  // 9. Provider & Network Fee Calculation
  const providerFeeAmount = ((numAmount * liquidityFeePercent) / 100).toFixed(6) + ` ${tokenIn.symbol}`;

  // If Kyber did not provide gas, fallback to RPC estimation
  if (estimatedGasFeePol === '0.01000' && !kyberRouteSummary) {
    const networkFees = await getNetworkFeeDetails(estimatedGasUnits);
    estimatedGasFeePol = networkFees.feePol;
    estimatedGasFeeUsd = networkFees.feeUsd;
    estimatedGasUnits = BigInt(networkFees.gasLimit);
  }

  // 10. Quote Expiration Timestamp (45 seconds)
  const createdAt = Date.now();
  const expiresAt = createdAt + SWAP_ENGINE_CONFIG.quoteExpirationSeconds * 1000;
  const quoteId = `quote_${createdAt}_${Math.random().toString(36).substring(2, 9)}`;

  const quote: ExecutableQuote = {
    quoteId,
    chainId: POLYGON_CHAIN_ID,
    walletAddress: walletAddress.toLowerCase(),
    inputToken: tokenIn,
    outputToken: tokenOut,
    inputAmount,
    inputAmountRaw: amountInRaw.toString(),
    expectedOutput,
    expectedOutputRaw: bestExpectedRaw.toString(),
    minimumReceived,
    minimumReceivedRaw: minimumReceivedRaw.toString(),
    exchangeRate,
    inverseExchangeRate,
    priceImpact,
    priceImpactSeverity,
    liquidityFeePercent,
    providerFeeAmount,
    estimatedGas: estimatedGasUnits.toString(),
    estimatedGasFeePol,
    estimatedGasFeeUsd,
    slippage,
    route: {
      protocol: selectedProtocol,
      description: routeDescription,
      path: routePath,
      fee: poolFee,
      routerAddress,
      hops,
    },
    kyberRouteSummary,
    expiresAt,
    createdAt,
  };

  activeQuotes.set(quoteId, quote);
  return quote;
}

/**
 * Prepares actual transaction calldata for an active, valid, non-expired quote
 */
export async function prepareSwapTransaction(params: {
  quoteId: string;
  walletAddress: string;
  chainId: number;
}): Promise<{
  quoteId: string;
  chainId: 137;
  to: `0x${string}`;
  data: `0x${string}`;
  value: `0x${string}`;
  gasLimit: string;
  deadline: number;
  minimumOutputAmountRaw: string;
}> {
  const { quoteId, walletAddress, chainId } = params;

  if (Number(chainId) !== POLYGON_CHAIN_ID) {
    throw new Error(`Chain ID mismatch. Must be Polygon Mainnet (${POLYGON_CHAIN_ID}).`);
  }

  const quote = activeQuotes.get(quoteId);
  if (!quote) {
    throw new Error('Quote not found or expired. Please refresh to get a new executable quote.');
  }

  if (Date.now() > quote.expiresAt) {
    activeQuotes.delete(quoteId);
    throw new Error('Quote has expired. Real-time Polygon liquidity must be re-quoted.');
  }

  const normalizedWallet = getAddress(walletAddress);
  const deadline = Math.floor(Date.now() / 1000) + SWAP_ENGINE_CONFIG.defaultDeadlineMinutes * 60;

  // If KyberSwap Aggregator was used, call KyberSwap /route/build to obtain exact executable calldata
  if (quote.kyberRouteSummary) {
    try {
      const buildRes = await fetch(`${KYBERSWAP_CONFIG.baseUrl}/route/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': KYBERSWAP_CONFIG.clientId,
        },
        body: JSON.stringify({
          routeSummary: quote.kyberRouteSummary,
          sender: normalizedWallet,
          recipient: normalizedWallet,
          slippageTolerance: Math.round(quote.slippage * 100),
          deadline,
        }),
      });

      if (buildRes.ok) {
        const buildJson = await buildRes.json();
        if (buildJson.code === 0 && buildJson.data?.data) {
          const txValue = (buildJson.data.transactionValue && buildJson.data.transactionValue !== '0')
            ? (`0x${BigInt(buildJson.data.transactionValue).toString(16)}` as `0x${string}`)
            : (quote.inputToken.symbol === 'MATIC' || quote.inputToken.symbol === 'POL')
            ? (`0x${BigInt(quote.inputAmountRaw).toString(16)}` as `0x${string}`)
            : '0x0';

          return {
            quoteId,
            chainId: POLYGON_CHAIN_ID,
            to: (buildJson.data.routerAddress || quote.route.routerAddress) as `0x${string}`,
            data: buildJson.data.data as `0x${string}`,
            value: txValue,
            gasLimit: (BigInt(buildJson.data.gas || quote.estimatedGas) + 50000n).toString(),
            deadline,
            minimumOutputAmountRaw: quote.minimumReceivedRaw,
          };
        }
      }
    } catch (buildErr) {
      console.warn('KyberSwap route/build failed, attempting fallback calldata:', buildErr);
    }
  }

  let calldata: `0x${string}` = '0x';

  if (quote.route.protocol === 'Uniswap V3' && quote.route.fee) {
    calldata = encodeFunctionData({
      abi: uniswapV3RouterAbi,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: quote.inputToken.address,
          tokenOut: quote.outputToken.address,
          fee: quote.route.fee,
          recipient: normalizedWallet,
          amountIn: BigInt(quote.inputAmountRaw),
          amountOutMinimum: BigInt(quote.minimumReceivedRaw),
          sqrtPriceLimitX96: 0n,
        },
      ],
    });
  } else {
    // QuickSwap V2
    calldata = encodeFunctionData({
      abi: quickswapV2RouterAbi,
      functionName: 'swapExactTokensForTokens',
      args: [
        BigInt(quote.inputAmountRaw),
        BigInt(quote.minimumReceivedRaw),
        quote.route.path,
        normalizedWallet,
        BigInt(deadline),
      ],
    });
  }

  const fallbackValue = (quote.inputToken.symbol === 'MATIC' || quote.inputToken.symbol === 'POL')
    ? (`0x${BigInt(quote.inputAmountRaw).toString(16)}` as `0x${string}`)
    : '0x0';

  return {
    quoteId,
    chainId: POLYGON_CHAIN_ID,
    to: quote.route.routerAddress,
    data: calldata,
    value: fallbackValue,
    gasLimit: (BigInt(quote.estimatedGas) + 50000n).toString(),
    deadline,
    minimumOutputAmountRaw: quote.minimumReceivedRaw,
  };
}

/**
 * Simulates transaction on Polygon RPC via eth_call
 */
export async function simulateSwapTransaction(params: {
  quoteId: string;
  walletAddress: string;
  to: `0x${string}`;
  data: `0x${string}`;
  value?: `0x${string}` | string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { walletAddress, to, data, value } = params;
    const valueBigInt = value ? BigInt(value) : 0n;
    await polygonClient.call({
      account: getAddress(walletAddress),
      to: getAddress(to),
      data,
      value: valueBigInt,
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Simulation failed';
    return { success: false, error: msg };
  }
}

/**
 * Independently verifies transaction hash on Polygon blockchain
 */
export async function verifySwapTransaction(params: {
  txHash: string;
  walletAddress: string;
  quoteId?: string;
}): Promise<{
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  record: SwapDbRecord | null;
  receipt?: {
    blockNumber: string;
    gasUsed: string;
    status: string;
  };
}> {
  const { txHash, walletAddress, quoteId } = params;
  const hash = txHash as Hash;

  try {
    const receipt = await polygonClient.getTransactionReceipt({ hash });
    if (!receipt) {
      return { status: 'PENDING', record: null };
    }

    const isSuccess = receipt.status === 'success';
    const finalStatus: 'COMPLETED' | 'FAILED' = isSuccess ? 'COMPLETED' : 'FAILED';

    const quote = quoteId ? activeQuotes.get(quoteId) : undefined;

    const record: SwapDbRecord = {
      id: `swap_${Date.now()}_${txHash.substring(0, 8)}`,
      walletAddress: walletAddress.toLowerCase(),
      chainId: POLYGON_CHAIN_ID,
      inputToken: quote?.inputToken.symbol || 'USDT',
      outputToken: quote?.outputToken.symbol || 'USDC',
      inputAmount: quote?.inputAmount || '0',
      expectedOutputAmount: quote?.expectedOutput || '0',
      actualOutputAmount: isSuccess ? (quote?.expectedOutput || '0') : '0',
      minimumReceived: quote?.minimumReceived || '0',
      exchangeRate: quote?.exchangeRate || '',
      priceImpact: quote?.priceImpact || 0,
      slippage: quote?.slippage || SWAP_ENGINE_CONFIG.defaultSlippage,
      providerFee: quote?.providerFeeAmount || '0',
      networkFee: quote?.estimatedGasFeePol || '0',
      gasUsed: receipt.gasUsed.toString(),
      routerAddress: (receipt.to || quote?.route.routerAddress || SWAP_ROUTERS.quickswapV2Router).toLowerCase(),
      routerName: quote?.route.protocol || 'Polygon Router',
      txHash,
      status: finalStatus,
      errorMessage: isSuccess ? undefined : 'Transaction reverted on-chain',
      createdAt: quote?.createdAt || Date.now(),
      confirmedAt: isSuccess ? Date.now() : undefined,
    };

    await recordSwap(record);

    return {
      status: finalStatus,
      record,
      receipt: {
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      },
    };
  } catch {
    // If not found yet, transaction is still pending in mempool
    return { status: 'PENDING', record: null };
  }
}
