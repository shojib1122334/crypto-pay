import {
  createPublicClient,
  http,
  fallback,
  parseUnits,
  formatUnits,
  parseAbi,
  encodeFunctionData,
  getAddress,
} from 'viem';
import { polygon } from 'viem/chains';
import { SwapQuote, WhitelistedToken, SwapRouteHop } from '../types/swap';
import { SWAP_TOKENS, POLYGON_CHAIN_ID } from '../components/exchange/tokenData';

export const WMATIC_ADDRESS: `0x${string}` = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
export const WETH_ADDRESS: `0x${string}` = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';

export const SWAP_ROUTERS = {
  kyberSwapRouter: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5' as `0x${string}`,
  quickswapV2Router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' as `0x${string}`,
  uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as `0x${string}`,
};

const quickswapV2RouterAbi = parseAbi([
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
]);

// Multi-RPC resilient client on Polygon Mainnet
export const clientPolygonClient = createPublicClient({
  chain: polygon,
  transport: fallback([
    http('https://polygon-bor-rpc.publicnode.com'),
    http('https://polygon.llamarpc.com'),
    http('https://rpc.ankr.com/polygon'),
    http('https://polygon-rpc.com'),
  ]),
});

interface KyberStepInfo {
  tokenIn: string;
  tokenOut: string;
  pool?: string;
  exchange?: string;
  poolExtra?: {
    fee?: number;
  };
}

interface KyberSummaryData {
  amountOut?: string;
  amountInUsd?: string;
  amountOutUsd?: string;
  gas?: string;
  gasPrice?: string;
  gasUsd?: string;
  route?: KyberStepInfo[][];
}

/**
 * Fetch live DEX quote directly from KyberSwap Aggregator or on-chain Polygon AMMs
 */
export async function fetchDirectDEXQuote(params: {
  inputSymbol: string;
  outputSymbol: string;
  inputAmount: string;
  slippage?: number;
  walletAddress?: string;
}): Promise<SwapQuote> {
  const { inputSymbol, outputSymbol, inputAmount } = params;
  const slippage = params.slippage ?? 0.5;
  const walletAddress = params.walletAddress || '0x0000000000000000000000000000000000000000';

  const numAmount = parseFloat(inputAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Please enter a valid swap amount greater than zero.');
  }

  const tokenIn = SWAP_TOKENS.find((t) => t.symbol === inputSymbol);
  const tokenOut = SWAP_TOKENS.find((t) => t.symbol === outputSymbol);

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unsupported token pair ${inputSymbol} -> ${outputSymbol}`);
  }

  const isNativeIn = tokenIn.symbol === 'MATIC' || tokenIn.symbol === 'POL';
  const isNativeOut = tokenOut.symbol === 'MATIC' || tokenOut.symbol === 'POL';
  const inAddr = isNativeIn ? WMATIC_ADDRESS : tokenIn.address;
  const outAddr = isNativeOut ? WMATIC_ADDRESS : tokenOut.address;

  const amountInRaw = parseUnits(inputAmount, tokenIn.decimals);
  const quoteId = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = Date.now();
  const expiresAt = createdAt + 45000;

  let bestExpectedRaw = 0n;
  let selectedProtocol = 'KyberSwap Aggregator';
  let routeDescription = `${tokenIn.symbol} → ${tokenOut.symbol}`;
  let routePath: `0x${string}`[] = [inAddr, outAddr];
  let hops: SwapRouteHop[] = [];
  let routerAddress = SWAP_ROUTERS.kyberSwapRouter;
  let kyberRouteSummary: unknown = null;
  let priceImpact = 0.01;
  let estimatedGasUnits = 250000n;
  let estimatedGasFeePol = '0.01200';
  let estimatedGasFeeUsd = '$0.0050';
  let liquidityFeePercent = 0.30;

  // 1. Query KyberSwap Aggregator directly (supports open browser CORS)
  try {
    const kyberUrl = `https://aggregator-api.kyberswap.com/polygon/api/v1/routes?tokenIn=${inAddr}&tokenOut=${outAddr}&amountIn=${amountInRaw.toString()}`;
    const kyberRes = await fetch(kyberUrl, {
      headers: {
        'x-client-id': 'cryptopay-client',
        'Accept': 'application/json',
      },
    });

    if (kyberRes.ok) {
      const kyberJson = await kyberRes.json();
      if (kyberJson.code === 0 && kyberJson.data?.routeSummary) {
        const summary = kyberJson.data.routeSummary as KyberSummaryData;
        if (summary.amountOut && BigInt(summary.amountOut) > 0n) {
          kyberRouteSummary = summary;
          bestExpectedRaw = BigInt(summary.amountOut);
          routerAddress = (kyberJson.data.routerAddress || SWAP_ROUTERS.kyberSwapRouter) as `0x${string}`;

          // Format readable hops
          if (Array.isArray(summary.route) && summary.route.length > 0) {
            const firstSubRoute = summary.route[0];
            const parsedHops: SwapRouteHop[] = [];
            const hopNames: string[] = [];

            firstSubRoute.forEach((step: KyberStepInfo) => {
              const exchangeName = step.exchange || 'DEX';
              hopNames.push(exchangeName);
              parsedHops.push({
                fromToken: step.tokenIn,
                toToken: step.tokenOut,
                pool: step.pool || '',
                protocol: exchangeName,
                fee: step.poolExtra?.fee ? step.poolExtra.fee / 1000 : 0.3,
              });
            });

            hops = parsedHops;
            routeDescription = `KyberSwap: ${tokenIn.symbol} via ${hopNames.join(' → ')} → ${tokenOut.symbol}`;
          }

          // Price impact from USD values
          const inUsd = parseFloat(summary.amountInUsd || '0');
          const outUsd = parseFloat(summary.amountOutUsd || '0');
          if (inUsd > 0 && outUsd > 0) {
            const diff = ((inUsd - outUsd) / inUsd) * 100;
            priceImpact = Math.max(0.01, parseFloat(diff.toFixed(2)));
          }

          // Gas estimation
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
      }
    }
  } catch (kyberErr) {
    console.warn('KyberSwap client query failed, falling back to on-chain Polygon reading:', kyberErr);
  }

  // 2. On-Chain fallback via QuickSwap V2 if KyberSwap fails
  if (bestExpectedRaw <= 0n) {
    if (tokenIn.symbol === 'VERSE' || tokenOut.symbol === 'VERSE') {
      // Direct QuickSwap V2 via native VERSE/WMATIC pool
      const quickVersePath: `0x${string}`[] =
        tokenIn.symbol === 'VERSE'
          ? (outAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase()
              ? [tokenIn.address, WMATIC_ADDRESS]
              : [tokenIn.address, WMATIC_ADDRESS, outAddr])
          : (inAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase()
              ? [WMATIC_ADDRESS, tokenOut.address]
              : [inAddr, WMATIC_ADDRESS, tokenOut.address]);

      let quickOutRaw = 0n;
      try {
        const qRes = await clientPolygonClient.readContract({
          address: SWAP_ROUTERS.quickswapV2Router,
          abi: quickswapV2RouterAbi,
          functionName: 'getAmountsOut',
          args: [amountInRaw, quickVersePath],
        });
        quickOutRaw = qRes[qRes.length - 1];
      } catch (qErr) {
        console.warn('QuickSwap direct query error:', qErr);
      }

      if (quickOutRaw > 0n) {
        bestExpectedRaw = quickOutRaw;
        selectedProtocol = 'QuickSwap V2';
        liquidityFeePercent = 0.30;
        routerAddress = SWAP_ROUTERS.quickswapV2Router;
        routePath = quickVersePath;
        routeDescription = `${tokenIn.symbol} → QuickSwap V2 (${quickVersePath.length > 2 ? 'via WMATIC' : 'Direct'}) → ${tokenOut.symbol}`;
        estimatedGasUnits = 185000n;
      }
    } else {
      // Direct QuickSwap for MATIC / USDT / USDC
      const path: `0x${string}`[] =
        inAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase()
          ? [WMATIC_ADDRESS, outAddr]
          : outAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase()
          ? [inAddr, WMATIC_ADDRESS]
          : [inAddr, WMATIC_ADDRESS, outAddr];

      try {
        const qRes = await clientPolygonClient.readContract({
          address: SWAP_ROUTERS.quickswapV2Router,
          abi: quickswapV2RouterAbi,
          functionName: 'getAmountsOut',
          args: [amountInRaw, path],
        });
        bestExpectedRaw = qRes[qRes.length - 1];
        selectedProtocol = 'QuickSwap V2';
        liquidityFeePercent = 0.30;
        routerAddress = SWAP_ROUTERS.quickswapV2Router;
        routePath = path;
        routeDescription = `${tokenIn.symbol} → QuickSwap V2 (${path.length > 2 ? 'via WMATIC' : 'Direct'}) → ${tokenOut.symbol}`;
        estimatedGasUnits = 180000n;
      } catch (qErr) {
        console.warn('On-chain QuickSwap query error:', qErr);
      }
    }
  }

  if (bestExpectedRaw <= 0n) {
    throw new Error(`No active Polygon liquidity route found for ${inputAmount} ${tokenIn.symbol} to ${tokenOut.symbol}.`);
  }

  const expectedOutput = formatUnits(bestExpectedRaw, tokenOut.decimals);

  // Calculate minimum received with slippage
  const slippageBps = BigInt(Math.floor(slippage * 100));
  const minimumReceivedRaw = (bestExpectedRaw * (10000n - slippageBps)) / 10000n;
  const minimumReceived = formatUnits(minimumReceivedRaw, tokenOut.decimals);

  // Exchange rates
  const rate = (parseFloat(expectedOutput) / numAmount).toFixed(6);
  const inverseRate = (numAmount / parseFloat(expectedOutput)).toFixed(8);
  const exchangeRate = `1 ${tokenIn.symbol} ≈ ${rate} ${tokenOut.symbol}`;
  const inverseExchangeRate = `1 ${tokenOut.symbol} ≈ ${inverseRate} ${tokenIn.symbol}`;

  const feeAmountNum = (numAmount * (liquidityFeePercent / 100)).toFixed(6);
  const providerFeeAmount = `${feeAmountNum} ${tokenIn.symbol}`;

  let priceImpactSeverity: 'low' | 'medium' | 'high' | 'blocked' = 'low';
  if (priceImpact > 5.0) priceImpactSeverity = 'blocked';
  else if (priceImpact > 2.0) priceImpactSeverity = 'high';
  else if (priceImpact > 0.5) priceImpactSeverity = 'medium';

  const whitelistedIn: WhitelistedToken = {
    symbol: tokenIn.symbol as WhitelistedToken['symbol'],
    name: tokenIn.name,
    address: tokenIn.address,
    decimals: tokenIn.decimals,
    logo: tokenIn.logo,
    color: tokenIn.color,
    enabled: true,
  };

  const whitelistedOut: WhitelistedToken = {
    symbol: tokenOut.symbol as WhitelistedToken['symbol'],
    name: tokenOut.name,
    address: tokenOut.address,
    decimals: tokenOut.decimals,
    logo: tokenOut.logo,
    color: tokenOut.color,
    enabled: true,
  };

  return {
    quoteId,
    chainId: POLYGON_CHAIN_ID,
    walletAddress,
    inputToken: whitelistedIn,
    outputToken: whitelistedOut,
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
      path: routePath as `0x${string}`[] as unknown as SwapRouteHop[],
      routerAddress,
      hops,
    },
    kyberRouteSummary,
    expiresAt,
    createdAt,
  };
}

/**
 * Prepares actual transaction calldata for an executable swap quote directly in the client
 */
export async function prepareDirectSwapTransaction(params: {
  quote: SwapQuote;
  walletAddress: string;
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
  const { quote, walletAddress } = params;
  const normalizedWallet = getAddress(walletAddress);
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60; // 20 mins

  // 1. If KyberSwap Aggregator route summary exists, build via KyberSwap API
  if (quote.kyberRouteSummary) {
    try {
      const buildRes = await fetch('https://aggregator-api.kyberswap.com/polygon/api/v1/route/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': 'cryptopay-client',
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
          const txValue =
            buildJson.data.transactionValue && buildJson.data.transactionValue !== '0'
              ? (`0x${BigInt(buildJson.data.transactionValue).toString(16)}` as `0x${string}`)
              : quote.inputToken.symbol === 'MATIC'
              ? (`0x${BigInt(quote.inputAmountRaw).toString(16)}` as `0x${string}`)
              : '0x0';

          return {
            quoteId: quote.quoteId,
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
      console.warn('KyberSwap client route/build failed, using on-chain router calldata fallback:', buildErr);
    }
  }

  // 2. Direct on-chain router calldata fallback (QuickSwap V2 Router)
  const isNativeIn = quote.inputToken.symbol === 'MATIC';
  const isNativeOut = quote.outputToken.symbol === 'MATIC';
  const inAddr = isNativeIn ? WMATIC_ADDRESS : quote.inputToken.address;
  const outAddr = isNativeOut ? WMATIC_ADDRESS : quote.outputToken.address;

  let path: `0x${string}`[] = [];
  if (Array.isArray(quote.route.path) && quote.route.path.length >= 2 && typeof quote.route.path[0] === 'string' && quote.route.path[0].startsWith('0x')) {
    path = quote.route.path as unknown as `0x${string}`[];
  } else if (isNativeIn) {
    path = [WMATIC_ADDRESS, outAddr];
  } else if (isNativeOut) {
    path = [inAddr, WMATIC_ADDRESS];
  } else {
    path = [inAddr, WMATIC_ADDRESS, outAddr];
  }

  const amountIn = BigInt(quote.inputAmountRaw);
  const amountOutMin = BigInt(quote.minimumReceivedRaw);

  let data: `0x${string}`;
  let value: `0x${string}` = '0x0';

  if (isNativeIn) {
    data = encodeFunctionData({
      abi: quickswapV2RouterAbi,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, path, normalizedWallet, BigInt(deadline)],
    });
    value = `0x${amountIn.toString(16)}` as `0x${string}`;
  } else if (isNativeOut) {
    data = encodeFunctionData({
      abi: quickswapV2RouterAbi,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, path, normalizedWallet, BigInt(deadline)],
    });
  } else {
    data = encodeFunctionData({
      abi: quickswapV2RouterAbi,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path, normalizedWallet, BigInt(deadline)],
    });
  }

  return {
    quoteId: quote.quoteId,
    chainId: POLYGON_CHAIN_ID,
    to: SWAP_ROUTERS.quickswapV2Router,
    data,
    value,
    gasLimit: (BigInt(quote.estimatedGas) + 50000n).toString(),
    deadline,
    minimumOutputAmountRaw: quote.minimumReceivedRaw,
  };
}
