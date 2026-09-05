import { createPublicClient, http, fallback, formatUnits, parseUnits, isAddress, type Address } from 'viem';
import { polygon, mainnet } from 'viem/chains';
import { ERC20_ABI, POLYGON_CHAIN_ID, ETHEREUM_CHAIN_ID } from './tokens';

// Dedicated resilient public clients with multiple verified fallback RPC providers
export const polygonPublicClient = createPublicClient({
  chain: polygon,
  transport: fallback([
    http('https://polygon-bor-rpc.publicnode.com', { retryCount: 3, timeout: 8000 }),
    http('https://1rpc.io/matic', { retryCount: 3, timeout: 8000 }),
    http('https://polygon.drpc.org', { retryCount: 3, timeout: 8000 }),
    http('https://polygon.gateway.tenderly.co', { retryCount: 3, timeout: 8000 }),
    http('https://polygon.api.onfinality.io/public', { retryCount: 2, timeout: 8000 }),
  ]),
});

export const ethereumPublicClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http('https://ethereum-rpc.publicnode.com', { retryCount: 3, timeout: 8000 }),
    http('https://1rpc.io/eth', { retryCount: 3, timeout: 8000 }),
    http('https://eth.drpc.org', { retryCount: 3, timeout: 8000 }),
    http('https://eth.llamarpc.com', { retryCount: 3, timeout: 8000 }),
  ]),
});

export interface TokenBalanceInfo {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  rawBalance: bigint;
  decimals: number;
  usdValue: string;
  chainId: number;
  networkName: string;
  contractAddress: Address;
  isNative?: boolean;
}

export interface GasFeeInfo {
  chainId: number;
  gasPriceGwei: string;
  nativeTokenSymbol: string;
  estimatedNativeTransferFee: string;
  estimatedErc20TransferFee: string;
  estimatedErc20TransferFeeUsd: string;
  isLowGas: boolean;
}

// Token price approximate fetcher / estimator for UI display with multi-source fallback
export async function fetchCryptoPrices(): Promise<Record<string, number>> {
  let versePrice = 0.0000212;
  let polPrice = 0.095;
  let ethPrice = 2450;
  const usdtPrice = 1.0;
  const usdcPrice = 1.0;

  // 1. Try GeckoTerminal (CoinGecko's official DEX on-chain API for Polygon VERSE)
  try {
    const gtRes = await fetch(
      'https://api.geckoterminal.com/api/v2/simple/networks/polygon_pos/token_price/0xc708d6f2153933daa50b2d0758955be0a93a8fec',
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) }
    );
    if (gtRes.ok) {
      const gtData = await gtRes.json();
      const raw = gtData?.data?.attributes?.token_prices?.['0xc708d6f2153933daa50b2d0758955be0a93a8fec'];
      if (raw) {
        const p = parseFloat(raw);
        if (!isNaN(p) && p > 0) {
          versePrice = p;
        }
      }
    }
  } catch {
    // Continue to next provider
  }

  // 2. Try DexScreener for Polygon VERSE
  try {
    const dexRes = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/0xc708D6F2153933DAA50B2D0758955Be0A93A8FEc',
      { signal: AbortSignal.timeout(3000) }
    );
    if (dexRes.ok) {
      const dexData = await dexRes.json();
      const pair = dexData.pairs?.[0];
      if (pair?.priceUsd) {
        const parsed = parseFloat(pair.priceUsd);
        if (!isNaN(parsed) && parsed > 0) {
          versePrice = parsed;
        }
      }
    }
  } catch {
    // Keep existing
  }

  // 3. Try Binance for POL and ETH live rates
  try {
    const [polRes, ethRes] = await Promise.allSettled([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=POLUSDT', { signal: AbortSignal.timeout(3000) }),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', { signal: AbortSignal.timeout(3000) }),
    ]);
    if (polRes.status === 'fulfilled' && polRes.value.ok) {
      const d = await polRes.value.json();
      const p = parseFloat(d?.price);
      if (!isNaN(p) && p > 0) polPrice = p;
    }
    if (ethRes.status === 'fulfilled' && ethRes.value.ok) {
      const d = await ethRes.value.json();
      const p = parseFloat(d?.price);
      if (!isNaN(p) && p > 0) ethPrice = p;
    }
  } catch {
    // Keep existing
  }

  // 4. Try DefiLlama for Polygon assets
  try {
    const llamaRes = await fetch(
      'https://coins.llama.fi/prices/current/polygon:0xc708d6f2153933daa50b2d0758955be0a93a8fec,polygon:0x0000000000000000000000000000000000000000',
      { signal: AbortSignal.timeout(3000) }
    );
    if (llamaRes.ok) {
      const llamaData = await llamaRes.json();
      const coins = llamaData?.coins || {};
      if (coins['polygon:0xc708d6f2153933daa50b2d0758955be0a93a8fec']?.price) {
        versePrice = coins['polygon:0xc708d6f2153933daa50b2d0758955be0a93a8fec'].price;
      }
      if (coins['polygon:0x0000000000000000000000000000000000000000']?.price) {
        polPrice = coins['polygon:0x0000000000000000000000000000000000000000'].price;
      }
    }
  } catch {
    // Continue to next provider
  }

  return {
    POL: polPrice,
    MATIC: polPrice,
    ETH: ethPrice,
    USDT: usdtPrice,
    USDC: usdcPrice,
    VERSE: versePrice,
  };
}

export async function fetchVersePriceFromCoinGecko(): Promise<{ price: number; source: string; timestamp: number }> {
  // Source 1: CoinGecko GeckoTerminal (official CoinGecko on-chain API)
  try {
    const gtRes = await fetch(
      'https://api.geckoterminal.com/api/v2/simple/networks/polygon_pos/token_price/0xc708d6f2153933daa50b2d0758955be0a93a8fec',
      { headers: { Accept: 'application/json' } }
    );
    if (gtRes.ok) {
      const gtData = await gtRes.json();
      const raw = gtData?.data?.attributes?.token_prices?.['0xc708d6f2153933daa50b2d0758955be0a93a8fec'];
      if (raw) {
        const p = parseFloat(raw);
        if (!isNaN(p) && p > 0) {
          return {
            price: p,
            source: 'CoinGecko (GeckoTerminal)',
            timestamp: Date.now(),
          };
        }
      }
    }
  } catch {
    // Continue
  }

  // Source 2: DefiLlama
  try {
    const llamaRes = await fetch(
      'https://coins.llama.fi/prices/current/polygon:0xc708d6f2153933daa50b2d0758955be0a93a8fec'
    );
    if (llamaRes.ok) {
      const llamaData = await llamaRes.json();
      const p = llamaData?.coins?.['polygon:0xc708d6f2153933daa50b2d0758955be0a93a8fec']?.price;
      if (p && typeof p === 'number' && p > 0) {
        return {
          price: p,
          source: 'DefiLlama Aggregator',
          timestamp: Date.now(),
        };
      }
    }
  } catch {
    // Continue
  }

  // Source 3: DexScreener
  try {
    const dexRes = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/0xc708D6F2153933DAA50B2D0758955Be0A93A8FEc'
    );
    if (dexRes.ok) {
      const dexData = await dexRes.json();
      const pair = dexData.pairs?.[0];
      if (pair?.priceUsd) {
        const p = parseFloat(pair.priceUsd);
        if (!isNaN(p) && p > 0) {
          return {
            price: p,
            source: 'DexScreener Polygon',
            timestamp: Date.now(),
          };
        }
      }
    }
  } catch {
    // Continue
  }

  // Source 4: CoinGecko Direct
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=verse&vs_currencies=usd'
    );
    if (res.ok) {
      const data = await res.json();
      if (data.verse?.usd && data.verse.usd > 0) {
        return {
          price: data.verse.usd,
          source: 'CoinGecko Direct',
          timestamp: Date.now(),
        };
      }
    }
  } catch {
    // Fallback
  }

  return {
    price: 0.00035,
    source: 'Benchmark Base',
    timestamp: Date.now(),
  };
}

/**
 * Fetches real-time multi-chain balances for an EVM address across Polygon & Ethereum
 */
export async function fetchAllUserBalances(
  userAddress: Address,
  prices: Record<string, number> = {},
): Promise<TokenBalanceInfo[]> {
  const results: TokenBalanceInfo[] = [];

  // 1. Polygon Native POL Balance
  try {
    const polBalance = await polygonPublicClient.getBalance({ address: userAddress });
    const formatted = formatUnits(polBalance, 18);
    const num = parseFloat(formatted);
    const usd = (num * (prices.POL || 0.45)).toFixed(2);
    results.push({
      id: 'pol-polygon',
      symbol: 'POL',
      name: 'Polygon Ecosystem Token (Native)',
      balance: num > 0.0001 ? num.toFixed(4) : num > 0 ? num.toFixed(6) : '0.00',
      rawBalance: polBalance,
      decimals: 18,
      usdValue: `$${usd}`,
      chainId: POLYGON_CHAIN_ID,
      networkName: 'Polygon',
      contractAddress: '0x0000000000000000000000000000000000000000',
      isNative: true,
    });
  } catch (err) {
    console.warn('Error fetching POL balance:', err);
  }

  // 2. Polygon USDT
  try {
    const usdtContract = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address;
    const balance = (await polygonPublicClient.readContract({
      address: usdtContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    const formatted = formatUnits(balance, 6);
    const num = parseFloat(formatted);
    results.push({
      id: 'usdt-polygon',
      symbol: 'USDT',
      name: 'Tether USD (Polygon)',
      balance: num.toFixed(2),
      rawBalance: balance,
      decimals: 6,
      usdValue: `$${num.toFixed(2)}`,
      chainId: POLYGON_CHAIN_ID,
      networkName: 'Polygon',
      contractAddress: usdtContract,
    });
  } catch (err) {
    console.warn('Error fetching Polygon USDT balance:', err);
  }

  // 3. Polygon USDC
  try {
    const usdcContract = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Address;
    const balance = (await polygonPublicClient.readContract({
      address: usdcContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    const formatted = formatUnits(balance, 6);
    const num = parseFloat(formatted);
    results.push({
      id: 'usdc-polygon',
      symbol: 'USDC',
      name: 'USD Coin (Polygon)',
      balance: num.toFixed(2),
      rawBalance: balance,
      decimals: 6,
      usdValue: `$${num.toFixed(2)}`,
      chainId: POLYGON_CHAIN_ID,
      networkName: 'Polygon',
      contractAddress: usdcContract,
    });
  } catch (err) {
    console.warn('Error fetching Polygon USDC balance:', err);
  }

  // 4. Polygon VERSE
  try {
    const verseContract = '0xc708D6F2153933DAA50B2D0758955Be0A93A8FEc' as Address;
    const balance = (await polygonPublicClient.readContract({
      address: verseContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    const formatted = formatUnits(balance, 18);
    const num = parseFloat(formatted);
    const usd = (num * (prices.VERSE || 0.00035)).toFixed(2);
    results.push({
      id: 'verse-polygon',
      symbol: 'VERSE',
      name: 'Verse Token (Polygon)',
      balance: num.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      rawBalance: balance,
      decimals: 18,
      usdValue: `$${usd}`,
      chainId: POLYGON_CHAIN_ID,
      networkName: 'Polygon',
      contractAddress: verseContract,
    });
  } catch (err) {
    console.warn('Error fetching Polygon VERSE balance:', err);
  }

  // 5. Ethereum Native ETH
  try {
    const ethBalance = await ethereumPublicClient.getBalance({ address: userAddress });
    const formatted = formatUnits(ethBalance, 18);
    const num = parseFloat(formatted);
    const usd = (num * (prices.ETH || 3200)).toFixed(2);
    results.push({
      id: 'eth-ethereum',
      symbol: 'ETH',
      name: 'Ethereum (Native)',
      balance: num > 0.0001 ? num.toFixed(4) : num > 0 ? num.toFixed(6) : '0.00',
      rawBalance: ethBalance,
      decimals: 18,
      usdValue: `$${usd}`,
      chainId: ETHEREUM_CHAIN_ID,
      networkName: 'Ethereum',
      contractAddress: '0x0000000000000000000000000000000000000000',
      isNative: true,
    });
  } catch (err) {
    console.warn('Error fetching ETH balance:', err);
  }

  // 6. Ethereum VERSE
  try {
    const ethVerseContract = '0x249cA82617eC3DfB2589c4c17ab7EC9765350a18' as Address;
    const balance = (await ethereumPublicClient.readContract({
      address: ethVerseContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    const formatted = formatUnits(balance, 18);
    const num = parseFloat(formatted);
    const usd = (num * (prices.VERSE || 0.00035)).toFixed(2);
    results.push({
      id: 'verse-ethereum',
      symbol: 'VERSE',
      name: 'Verse Token (Ethereum)',
      balance: num.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      rawBalance: balance,
      decimals: 18,
      usdValue: `$${usd}`,
      chainId: ETHEREUM_CHAIN_ID,
      networkName: 'Ethereum',
      contractAddress: ethVerseContract,
    });
  } catch (err) {
    console.warn('Error fetching Ethereum VERSE balance:', err);
  }

  // 7. Ethereum USDT
  try {
    const ethUsdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address;
    const balance = (await ethereumPublicClient.readContract({
      address: ethUsdtContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    const formatted = formatUnits(balance, 6);
    const num = parseFloat(formatted);
    results.push({
      id: 'usdt-ethereum',
      symbol: 'USDT',
      name: 'Tether USD (Ethereum)',
      balance: num.toFixed(2),
      rawBalance: balance,
      decimals: 6,
      usdValue: `$${num.toFixed(2)}`,
      chainId: ETHEREUM_CHAIN_ID,
      networkName: 'Ethereum',
      contractAddress: ethUsdtContract,
    });
  } catch (err) {
    console.warn('Error fetching Ethereum USDT balance:', err);
  }

  // 8. Ethereum USDC
  try {
    const ethUsdcContract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
    const balance = (await ethereumPublicClient.readContract({
      address: ethUsdcContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    const formatted = formatUnits(balance, 6);
    const num = parseFloat(formatted);
    results.push({
      id: 'usdc-ethereum',
      symbol: 'USDC',
      name: 'USD Coin (Ethereum)',
      balance: num.toFixed(2),
      rawBalance: balance,
      decimals: 6,
      usdValue: `$${num.toFixed(2)}`,
      chainId: ETHEREUM_CHAIN_ID,
      networkName: 'Ethereum',
      contractAddress: ethUsdcContract,
    });
  } catch (err) {
    console.warn('Error fetching Ethereum USDC balance:', err);
  }

  return results;
}

/**
 * Fetches live gas fee data for Polygon and Ethereum
 */
export async function fetchLiveGasFees(prices: Record<string, number> = {}): Promise<{
  polygon: GasFeeInfo;
  ethereum: GasFeeInfo;
}> {
  // Polygon gas
  let polygonGasGwei = '35';
  let polygonErc20FeeUsd = '$0.005';
  try {
    const gasPrice = await polygonPublicClient.getGasPrice();
    const gwei = formatUnits(gasPrice, 9);
    polygonGasGwei = parseFloat(gwei).toFixed(1);
    const nativeFee = (parseFloat(formatUnits(gasPrice * 65000n, 18)) * (prices.POL || 0.45)).toFixed(4);
    polygonErc20FeeUsd = `$${nativeFee}`;
  } catch {
    // fallback
  }

  // Ethereum gas
  let ethGasGwei = '15';
  let ethErc20FeeUsd = '$2.40';
  try {
    const gasPrice = await ethereumPublicClient.getGasPrice();
    const gwei = formatUnits(gasPrice, 9);
    ethGasGwei = parseFloat(gwei).toFixed(1);
    const nativeFee = (parseFloat(formatUnits(gasPrice * 65000n, 18)) * (prices.ETH || 3200)).toFixed(2);
    ethErc20FeeUsd = `$${nativeFee}`;
  } catch {
    // fallback
  }

  return {
    polygon: {
      chainId: POLYGON_CHAIN_ID,
      gasPriceGwei: polygonGasGwei,
      nativeTokenSymbol: 'POL',
      estimatedNativeTransferFee: '~0.0007 POL',
      estimatedErc20TransferFee: '~0.0022 POL',
      estimatedErc20TransferFeeUsd: polygonErc20FeeUsd,
      isLowGas: true,
    },
    ethereum: {
      chainId: ETHEREUM_CHAIN_ID,
      gasPriceGwei: ethGasGwei,
      nativeTokenSymbol: 'ETH',
      estimatedNativeTransferFee: '~0.0003 ETH',
      estimatedErc20TransferFee: '~0.0009 ETH',
      estimatedErc20TransferFeeUsd: ethErc20FeeUsd,
      isLowGas: false,
    },
  };
}

export { isAddress, parseUnits, formatUnits };
