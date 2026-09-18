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
import { SwapQuote, SwapRouteHop, SwapPrepareResponse } from '../types/swap';
import {
  POLYGON_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  BSC_CHAIN_ID,
  SwapTokenInfo,
  MULTI_CHAIN_TOKENS,
} from '../components/exchange/tokenData';

export const WMATIC_ADDRESS: `0x${string}` = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
export const WETH_ADDRESS: `0x${string}` = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';
export const NATIVE_TOKEN_ADDRESS: `0x${string}` = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const ZERO_ADDRESS: `0x${string}` = '0x0000000000000000000000000000000000000000';

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

export function getChainIdFromNetwork(networkId: string): number | null {
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

/**
 * Fetch a multi-chain live quote routing across EVM chains (Li.Fi, KyberSwap, QuickSwap)
 * or non-EVM chains (Bitcoin, Solana via SideShift protocol).
 */
export async function fetchDirectMultiChainQuote(params: {
  fromNetwork: string;
  toNetwork: string;
  inputToken: SwapTokenInfo;
  outputToken: SwapTokenInfo;
  inputAmount: string;
  slippage?: number;
  walletAddress?: string;
}): Promise<SwapQuote> {
  const { fromNetwork, toNetwork, inputToken, outputToken, inputAmount } = params;
  const slippage = params.slippage ?? 0.5;
  const walletAddress = params.walletAddress || '0x0000000000000000000000000000000000000000';

  const numAmount = parseFloat(inputAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Please enter a valid swap amount greater than zero.');
  }

  const isInputEvm = fromNetwork === 'ethereum' || fromNetwork === 'bsc' || fromNetwork === 'polygon';
  const isOutputEvm = toNetwork === 'ethereum' || toNetwork === 'bsc' || toNetwork === 'polygon';

  // Disallow swapping identical tokens on the same network
  if (
    fromNetwork === toNetwork &&
    (inputToken.symbol === outputToken.symbol ||
      (inputToken.address &&
        outputToken.address &&
        inputToken.address.toLowerCase() === outputToken.address.toLowerCase()))
  ) {
    throw new Error(`Cannot swap ${inputToken.symbol} to itself on ${fromNetwork}.`);
  }

  // 1. If BOTH are EVM, attempt Li.Fi DEX & Bridge Aggregator first
  if (isInputEvm && isOutputEvm) {
    const fromChainId = getChainIdFromNetwork(fromNetwork);
    const toChainId = getChainIdFromNetwork(toNetwork);

    if (fromChainId && toChainId) {
      // Check if this is Polygon VERSE (Li.Fi might not have high liquidity for VERSE, fallback to Kyber/QuickSwap)
      const isVerse = inputToken.symbol === 'VERSE' || outputToken.symbol === 'VERSE';

      if (!isVerse) {
        try {
          const fromTokenAddr = inputToken.isNative ? ZERO_ADDRESS : inputToken.address;
          const toTokenAddr = outputToken.isNative ? ZERO_ADDRESS : outputToken.address;
          const fromAmountRaw = parseUnits(inputAmount, inputToken.decimals).toString();

          const lifiUrl = new URL('https://li.quest/v1/quote');
          lifiUrl.searchParams.set('fromChain', fromChainId.toString());
          lifiUrl.searchParams.set('toChain', toChainId.toString());
          lifiUrl.searchParams.set('fromToken', fromTokenAddr);
          lifiUrl.searchParams.set('toToken', toTokenAddr);
          lifiUrl.searchParams.set('fromAmount', fromAmountRaw);
          lifiUrl.searchParams.set('fromAddress', walletAddress.startsWith('0x') ? walletAddress : ZERO_ADDRESS);
          lifiUrl.searchParams.set('slippage', (slippage / 100).toString());

          const lifiRes = await fetch(lifiUrl.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(9000),
          });

          if (lifiRes.ok) {
            const data = await lifiRes.json();
            if (data?.estimate?.toAmount) {
              const expectedOutRaw = data.estimate.toAmount;
              const expectedOutHuman = formatUnits(BigInt(expectedOutRaw), outputToken.decimals);
              const minReceivedRaw = data.estimate.toAmountMin || expectedOutRaw;
              const minReceivedHuman = formatUnits(BigInt(minReceivedRaw), outputToken.decimals);

              const rateNum = parseFloat(expectedOutHuman) / numAmount;
              const invRateNum = rateNum > 0 ? 1 / rateNum : 0;
              const rateStr = `1 ${inputToken.symbol} = ${rateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${outputToken.symbol}`;
              const invRateStr = `1 ${outputToken.symbol} = ${invRateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${inputToken.symbol}`;

              const toolName = data.toolDetails?.name || data.tool || 'Li.Fi Aggregator';
              const approvalAddress = data.estimate?.approvalAddress || data.transactionRequest?.to;

              const quoteId = `quote_lifi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
              const createdAt = Date.now();
              const expiresAt = createdAt + 45000;

              const hops: SwapRouteHop[] = (data.includedSteps || []).map((s: { toolDetails?: { name?: string }; tool?: string; action?: { fromToken?: { symbol?: string }; toToken?: { symbol?: string } } }) => ({
                fromToken: s.action?.fromToken?.symbol || inputToken.symbol,
                toToken: s.action?.toToken?.symbol || outputToken.symbol,
                protocol: s.toolDetails?.name || s.tool || toolName,
              }));

              if (hops.length === 0) {
                hops.push({
                  fromToken: inputToken.symbol,
                  toToken: outputToken.symbol,
                  protocol: toolName,
                });
              }

              return {
                quoteId,
                chainId: fromChainId,
                fromNetwork,
                toNetwork,
                isCrossChain: fromNetwork !== toNetwork,
                walletAddress,
                inputToken: {
                  ...inputToken,
                  enabled: true,
                },
                outputToken: {
                  ...outputToken,
                  enabled: true,
                },
                inputAmount,
                inputAmountRaw: fromAmountRaw,
                expectedOutput: expectedOutHuman,
                expectedOutputRaw: expectedOutRaw,
                minimumReceived: minReceivedHuman,
                minimumReceivedRaw: minReceivedRaw,
                exchangeRate: rateStr,
                inverseExchangeRate: invRateStr,
                priceImpact: Math.abs(parseFloat(data.estimate?.priceImpact || '0.02') * 100),
                priceImpactSeverity: 'low',
                liquidityFeePercent: 0.15,
                providerFeeAmount: '0',
                estimatedGas: data.transactionRequest?.gasLimit || '180000',
                estimatedGasFeePol: '0.005',
                estimatedGasFeeUsd: data.estimate?.gasCosts?.[0]?.amountUSD || '0.02',
                slippage,
                providerType: 'LIFI',
                spenderAddress: approvalAddress,
                route: {
                  protocol: toolName,
                  description: `${toolName} Multi-Chain Route`,
                  hops,
                  routerAddress: data.transactionRequest?.to,
                },
                lifiTransactionRequest: data.transactionRequest,
                transactionValue: data.transactionRequest?.value || (inputToken.isNative ? fromAmountRaw : '0'),
                expiresAt,
                createdAt,
              };
            }
          }
        } catch (lifiErr) {
          console.warn('Li.Fi quote attempt bypassed, evaluating fallback:', lifiErr);
        }
      }

      // If on Polygon, fallback to Polygon KyberSwap & QuickSwap router
      if (fromNetwork === 'polygon' && toNetwork === 'polygon') {
        return await fetchDirectDEXQuote({
          inputSymbol: inputToken.symbol,
          outputSymbol: outputToken.symbol,
          inputAmount,
          slippage,
          walletAddress,
        });
      }
    }
  }

  // 2. Bitcoin (BTC), Solana (SOL), or Cross-Chain to/from BTC or SOL via SideShift
  try {
    const depositCoin = inputToken.symbol.toUpperCase();
    const depositNetwork = fromNetwork === 'bsc' ? 'bsc' : fromNetwork;
    const settleCoin = outputToken.symbol.toUpperCase();
    const settleNetwork = toNetwork === 'bsc' ? 'bsc' : toNetwork;

    // Check pair min / max limits first
    const pairUrl = `https://sideshift.ai/api/v2/pair/${depositCoin.toLowerCase()}-${depositNetwork}/${settleCoin.toLowerCase()}-${settleNetwork}`;
    let pairMin = inputToken.minInputAmount || 0;
    let pairMax: number | null = null;

    try {
      const pairRes = await fetch(pairUrl, { signal: AbortSignal.timeout(5000) });
      if (pairRes.ok) {
        const pairData = await pairRes.json();
        if (pairData?.min) {
          pairMin = parseFloat(pairData.min);
        }
        if (pairData?.max) {
          pairMax = parseFloat(pairData.max);
        }
      }
    } catch {
      // Continue with quote request
    }

    if (pairMin > 0 && numAmount < pairMin) {
      throw new Error(`Minimum swap amount for ${inputToken.symbol} on ${fromNetwork} is ${pairMin} ${inputToken.symbol}.`);
    }
    if (pairMax && numAmount > pairMax) {
      throw new Error(`Maximum swap amount for ${inputToken.symbol} on ${fromNetwork} is ${pairMax} ${inputToken.symbol}.`);
    }

    const sideshiftQuoteRes = await fetch('https://sideshift.ai/api/v2/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        depositCoin,
        depositNetwork,
        settleCoin,
        settleNetwork,
        depositAmount: inputAmount,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (sideshiftQuoteRes.ok) {
      const shiftData = await sideshiftQuoteRes.json();
      if (shiftData?.settleAmount) {
        const expectedOutHuman = shiftData.settleAmount;
        const rateNum = parseFloat(shiftData.rate || (parseFloat(expectedOutHuman) / numAmount).toString());
        const invRateNum = rateNum > 0 ? 1 / rateNum : 0;
        const rateStr = `1 ${inputToken.symbol} = ${rateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${outputToken.symbol}`;
        const invRateStr = `1 ${outputToken.symbol} = ${invRateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${inputToken.symbol}`;

        const minRecNum = parseFloat(expectedOutHuman) * (1 - slippage / 100);
        const minRecStr = minRecNum.toFixed(outputToken.decimals > 6 ? 6 : outputToken.decimals);

        const quoteId = `quote_shift_${shiftData.id || Date.now()}`;
        const createdAt = Date.now();
        const expiresAt = shiftData.expiresAt ? new Date(shiftData.expiresAt).getTime() : createdAt + 60000;

        return {
          quoteId,
          chainId: fromNetwork === 'polygon' ? 137 : fromNetwork === 'ethereum' ? 1 : fromNetwork === 'bsc' ? 56 : 'cross-chain',
          fromNetwork,
          toNetwork,
          isCrossChain: true,
          walletAddress,
          inputToken: {
            ...inputToken,
            enabled: true,
          },
          outputToken: {
            ...outputToken,
            enabled: true,
          },
          inputAmount,
          inputAmountRaw: parseUnits(inputAmount, Math.min(inputToken.decimals, 8)).toString(),
          expectedOutput: expectedOutHuman,
          expectedOutputRaw: parseUnits(expectedOutHuman, Math.min(outputToken.decimals, 8)).toString(),
          minimumReceived: minRecStr,
          minimumReceivedRaw: parseUnits(minRecStr, Math.min(outputToken.decimals, 8)).toString(),
          exchangeRate: rateStr,
          inverseExchangeRate: invRateStr,
          priceImpact: 0.05,
          priceImpactSeverity: 'low',
          liquidityFeePercent: 0.25,
          providerFeeAmount: '0',
          estimatedGas: '0',
          estimatedGasFeePol: '0',
          estimatedGasFeeUsd: '0.50',
          slippage,
          providerType: 'SIDESHIFT',
          shiftId: shiftData.id,
          route: {
            protocol: 'SideShift Cross-Chain',
            description: `${inputToken.symbol} (${fromNetwork}) → ${outputToken.symbol} (${toNetwork}) Bridge`,
            hops: [
              {
                fromToken: `${inputToken.symbol} (${fromNetwork})`,
                toToken: `${outputToken.symbol} (${toNetwork})`,
                protocol: 'SideShift Native Liquidity',
              },
            ],
          },
          expiresAt,
          createdAt,
        };
      }
    } else {
      const errJson = await sideshiftQuoteRes.json().catch(() => null);
      if (errJson?.error?.message) {
        throw new Error(errJson.error.message);
      }
    }
  } catch (crossErr: unknown) {
    if (crossErr instanceof Error && crossErr.message) {
      throw crossErr;
    }
  }

  throw new Error(`Unable to find a live swap route between ${inputToken.symbol} (${fromNetwork}) and ${outputToken.symbol} (${toNetwork}). Please try an alternative network or amount.`);
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

  const tokenIn = MULTI_CHAIN_TOKENS.find((t) => t.networkId === 'polygon' && (t.symbol === inputSymbol || (inputSymbol === 'MATIC' && t.symbol === 'POL')));
  const tokenOut = MULTI_CHAIN_TOKENS.find((t) => t.networkId === 'polygon' && (t.symbol === outputSymbol || (outputSymbol === 'MATIC' && t.symbol === 'POL')));

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unsupported token pair ${inputSymbol} -> ${outputSymbol} on Polygon`);
  }

  const isNativeIn = tokenIn.symbol === 'MATIC' || tokenIn.symbol === 'POL';
  const isNativeOut = tokenOut.symbol === 'MATIC' || tokenOut.symbol === 'POL';
  const kyberInAddr = isNativeIn ? NATIVE_TOKEN_ADDRESS : tokenIn.address;
  const kyberOutAddr = isNativeOut ? NATIVE_TOKEN_ADDRESS : tokenOut.address;
  const inAddr = isNativeIn ? WMATIC_ADDRESS : (tokenIn.address as `0x${string}`);
  const outAddr = isNativeOut ? WMATIC_ADDRESS : (tokenOut.address as `0x${string}`);

  if (inAddr.toLowerCase() === outAddr.toLowerCase()) {
    throw new Error(`Cannot swap ${inputSymbol} to itself on Polygon.`);
  }

  const amountInRaw = parseUnits(inputAmount, tokenIn.decimals);
  const quoteId = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = Date.now();
  const expiresAt = createdAt + 45000;

  // 1. Try KyberSwap Aggregator API on Polygon
  try {
    const kyberUrl = new URL('https://aggregator-api.kyberswap.com/polygon/api/v1/routes');
    kyberUrl.searchParams.set('tokenIn', kyberInAddr);
    kyberUrl.searchParams.set('tokenOut', kyberOutAddr);
    kyberUrl.searchParams.set('amountIn', amountInRaw.toString());
    kyberUrl.searchParams.set('saveGas', '0');
    kyberUrl.searchParams.set('gasInclude', '1');

    const res = await fetch(kyberUrl.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.code === 0 && json.data?.routeSummary) {
        const summary: KyberSummaryData = json.data.routeSummary;
        const amountOutRaw = summary.amountOut || '0';
        const expectedOut = formatUnits(BigInt(amountOutRaw), tokenOut.decimals);

        const slippageMultiplier = 1 - slippage / 100;
        const minReceivedFloat = parseFloat(expectedOut) * slippageMultiplier;
        const minReceivedRaw = parseUnits(
          minReceivedFloat.toFixed(tokenOut.decimals > 8 ? 8 : tokenOut.decimals),
          tokenOut.decimals
        ).toString();
        const minReceived = minReceivedFloat.toString();

        const rateNum = parseFloat(expectedOut) / numAmount;
        const invRateNum = rateNum > 0 ? 1 / rateNum : 0;
        const exchangeRate = `1 ${inputSymbol} = ${rateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${outputSymbol}`;
        const inverseExchangeRate = `1 ${outputSymbol} = ${invRateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${inputSymbol}`;

        let priceImpact = 0.05;
        if (summary.amountInUsd && summary.amountOutUsd) {
          const inUsd = parseFloat(summary.amountInUsd);
          const outUsd = parseFloat(summary.amountOutUsd);
          if (inUsd > 0) {
            priceImpact = Math.max(0, Math.min(99.9, ((inUsd - outUsd) / inUsd) * 100));
          }
        }

        const hops: SwapRouteHop[] = [];
        if (summary.route && Array.isArray(summary.route)) {
          for (const stepList of summary.route) {
            if (Array.isArray(stepList)) {
              for (const step of stepList) {
                hops.push({
                  fromToken: step.tokenIn || inputSymbol,
                  toToken: step.tokenOut || outputSymbol,
                  pool: step.pool || '',
                  protocol: step.exchange || 'DEX Pool',
                  fee: step.poolExtra?.fee,
                });
              }
            }
          }
        }

        if (hops.length === 0) {
          hops.push({
            fromToken: inputSymbol,
            toToken: outputSymbol,
            protocol: 'KyberSwap Aggregator',
          });
        }

        const estGas = summary.gas || '220000';
        const gasUsd = summary.gasUsd || '0.008';

        return {
          quoteId,
          chainId: POLYGON_CHAIN_ID,
          fromNetwork: 'polygon',
          toNetwork: 'polygon',
          isCrossChain: false,
          walletAddress,
          inputToken: {
            ...tokenIn,
            enabled: true,
          },
          outputToken: {
            ...tokenOut,
            enabled: true,
          },
          inputAmount,
          inputAmountRaw: amountInRaw.toString(),
          expectedOutput: expectedOut,
          expectedOutputRaw: amountOutRaw,
          minimumReceived: minReceived,
          minimumReceivedRaw: minReceivedRaw,
          exchangeRate,
          inverseExchangeRate,
          priceImpact,
          priceImpactSeverity: priceImpact > 5 ? 'high' : priceImpact > 1 ? 'medium' : 'low',
          liquidityFeePercent: 0.15,
          providerFeeAmount: '0',
          estimatedGas: estGas,
          estimatedGasFeePol: (parseInt(estGas, 10) * 0.00000003).toFixed(4),
          estimatedGasFeeUsd: gasUsd,
          slippage,
          providerType: 'KYBERSWAP',
          spenderAddress: SWAP_ROUTERS.kyberSwapRouter,
          route: {
            protocol: 'KyberSwap Aggregator',
            description: `Optimal Polygon Route via ${hops.length} pool${hops.length > 1 ? 's' : ''}`,
            hops,
            routerAddress: SWAP_ROUTERS.kyberSwapRouter,
          },
          kyberRouteSummary: summary,
          transactionValue: isNativeIn ? amountInRaw.toString() : '0',
          expiresAt,
          createdAt,
        };
      }
    }
  } catch (kyberErr) {
    console.warn('KyberSwap API call failed, falling back to QuickSwap V2 on-chain AMM:', kyberErr);
  }

  // 2. Direct on-chain router fallback: QuickSwap V2 on Polygon
  if (inAddr.toLowerCase() === outAddr.toLowerCase()) {
    throw new Error(`Cannot swap identical tokens on Polygon.`);
  }

  const path: `0x${string}`[] =
    inAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase() || outAddr.toLowerCase() === WMATIC_ADDRESS.toLowerCase()
      ? [inAddr, outAddr]
      : [inAddr, WMATIC_ADDRESS, outAddr];

  try {
    const amountsOut = (await clientPolygonClient.readContract({
      address: SWAP_ROUTERS.quickswapV2Router,
      abi: quickswapV2RouterAbi,
      functionName: 'getAmountsOut',
      args: [amountInRaw, path],
    })) as bigint[];

    const finalAmountOutRaw = amountsOut[amountsOut.length - 1];
    const expectedOut = formatUnits(finalAmountOutRaw, tokenOut.decimals);

    const slippageMultiplier = 1 - slippage / 100;
    const minReceivedFloat = parseFloat(expectedOut) * slippageMultiplier;
    const minReceivedRaw = parseUnits(
      minReceivedFloat.toFixed(tokenOut.decimals > 8 ? 8 : tokenOut.decimals),
      tokenOut.decimals
    ).toString();
    const minReceived = minReceivedFloat.toString();

    const rateNum = parseFloat(expectedOut) / numAmount;
    const invRateNum = rateNum > 0 ? 1 / rateNum : 0;
    const exchangeRate = `1 ${inputSymbol} = ${rateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${outputSymbol}`;
    const inverseExchangeRate = `1 ${outputSymbol} = ${invRateNum.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${inputSymbol}`;

    return {
      quoteId,
      chainId: POLYGON_CHAIN_ID,
      fromNetwork: 'polygon',
      toNetwork: 'polygon',
      isCrossChain: false,
      walletAddress,
      inputToken: {
        ...tokenIn,
        enabled: true,
      },
      outputToken: {
        ...tokenOut,
        enabled: true,
      },
      inputAmount,
      inputAmountRaw: amountInRaw.toString(),
      expectedOutput: expectedOut,
      expectedOutputRaw: finalAmountOutRaw.toString(),
      minimumReceived: minReceived,
      minimumReceivedRaw: minReceivedRaw,
      exchangeRate,
      inverseExchangeRate,
      priceImpact: 0.15,
      priceImpactSeverity: 'low',
      liquidityFeePercent: 0.3,
      providerFeeAmount: '0',
      estimatedGas: '160000',
      estimatedGasFeePol: '0.005',
      estimatedGasFeeUsd: '0.005',
      slippage,
      providerType: 'ONCHAIN',
      spenderAddress: SWAP_ROUTERS.quickswapV2Router,
      route: {
        protocol: 'QuickSwap V2 Router',
        description: `Direct Polygon On-Chain Pool (${path.length - 1} hop)`,
        hops: [
          {
            fromToken: inputSymbol,
            toToken: outputSymbol,
            protocol: 'QuickSwap V2 Pool',
            fee: 3000,
          },
        ],
        routerAddress: SWAP_ROUTERS.quickswapV2Router,
        path,
      },
      transactionValue: isNativeIn ? amountInRaw.toString() : '0',
      expiresAt,
      createdAt,
    };
  } catch (quickErr) {
    console.error('QuickSwap on-chain quote failed:', quickErr);
    throw new Error(`Unable to fetch an executable on-chain swap quote for ${inputSymbol} -> ${outputSymbol}. Please try a different amount or token.`);
  }
}

/**
 * Prepares the executable transaction calldata for the given SwapQuote.
 */
export async function prepareDirectSwapTransaction(
  quote: SwapQuote,
  walletAddress: string
): Promise<SwapPrepareResponse> {
  const normalizedWallet = getAddress(walletAddress);
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

  // 1. Check if Quote was generated via Li.Fi with pre-built transactionRequest
  if (quote.lifiTransactionRequest) {
    const lifiReq = quote.lifiTransactionRequest;
    return {
      quoteId: quote.quoteId,
      chainId: (quote.chainId as number) || POLYGON_CHAIN_ID,
      to: getAddress(lifiReq.to) as `0x${string}`,
      data: lifiReq.data as `0x${string}`,
      value: (lifiReq.value ? `0x${BigInt(lifiReq.value).toString(16)}` : '0x0') as `0x${string}`,
      transactionValue: lifiReq.value || '0',
      valueWei: lifiReq.value || '0',
      gasLimit: lifiReq.gasLimit ? (BigInt(lifiReq.gasLimit) + 30000n).toString() : '280000',
      deadline,
      minimumOutputAmountRaw: quote.minimumReceivedRaw,
    };
  }

  // 2. If quote has KyberSwap route summary, request KyberSwap route build
  if (quote.kyberRouteSummary && quote.providerType === 'KYBERSWAP') {
    try {
      const buildRes = await fetch('https://aggregator-api.kyberswap.com/polygon/api/v1/route/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
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
          const isNativeIn =
            quote.inputToken.symbol === 'MATIC' ||
            quote.inputToken.symbol === 'POL' ||
            quote.inputToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

          let txValueHex: `0x${string}`;
          let txValueWei: string;

          if (isNativeIn) {
            const apiTxVal =
              buildJson.data.transactionValue !== undefined && buildJson.data.transactionValue !== null && buildJson.data.transactionValue !== ''
                ? buildJson.data.transactionValue
                : (quote.kyberRouteSummary as { amountIn?: string })?.amountIn ?? quote.transactionValue ?? buildJson.data.amountIn;

            txValueWei = apiTxVal ? apiTxVal.toString() : quote.inputAmountRaw;
            txValueHex = `0x${BigInt(txValueWei).toString(16)}` as `0x${string}`;
          } else {
            txValueWei = '0';
            txValueHex = '0x0';
          }

          return {
            quoteId: quote.quoteId,
            chainId: POLYGON_CHAIN_ID,
            to: (buildJson.data.routerAddress || quote.route.routerAddress) as `0x${string}`,
            data: buildJson.data.data as `0x${string}`,
            value: txValueHex,
            transactionValue: txValueWei,
            valueWei: txValueWei,
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

  // 3. Direct on-chain router calldata fallback (QuickSwap V2 Router on Polygon)
  const isNativeIn =
    quote.inputToken.symbol === 'MATIC' ||
    quote.inputToken.symbol === 'POL' ||
    quote.inputToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  const isNativeOut =
    quote.outputToken.symbol === 'MATIC' ||
    quote.outputToken.symbol === 'POL' ||
    quote.outputToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  const inAddr = isNativeIn ? WMATIC_ADDRESS : (quote.inputToken.address as `0x${string}`);
  const outAddr = isNativeOut ? WMATIC_ADDRESS : (quote.outputToken.address as `0x${string}`);

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
    transactionValue: isNativeIn ? quote.inputAmountRaw : '0',
    valueWei: isNativeIn ? quote.inputAmountRaw : '0',
    gasLimit: (BigInt(quote.estimatedGas) + 50000n).toString(),
    deadline,
    minimumOutputAmountRaw: quote.minimumReceivedRaw,
  };
}

/**
 * On-chain transaction status verification
 */
export async function verifySwapTransaction(
  txHash: string,
  client = clientPolygonClient
): Promise<{ success: boolean; status: 'success' | 'reverted' | 'pending'; gasUsed?: string }> {
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt) {
      return { success: false, status: 'pending' };
    }
    return {
      success: receipt.status === 'success',
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch {
    return { success: false, status: 'pending' };
  }
}
