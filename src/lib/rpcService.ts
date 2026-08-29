import { createPublicClient, http, formatUnits, parseUnits, isAddress, type Address } from 'viem';
import { polygon, mainnet } from 'viem/chains';
import { ERC20_ABI, POLYGON_CHAIN_ID, ETHEREUM_CHAIN_ID } from './tokens';

// Dedicated resilient public clients
export const polygonPublicClient = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-bor-rpc.publicnode.com'),
});

export const ethereumPublicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com'),
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

// Token price approximate fetcher / estimator for UI display
export async function fetchCryptoPrices(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=matic-network,ethereum,tether,usd-coin,verse&vs_currencies=usd',
    );
    if (!res.ok) throw new Error('Failed to fetch prices');
    const data = await res.json();
    return {
      POL: data['matic-network']?.usd || 0.45,
      MATIC: data['matic-network']?.usd || 0.45,
      ETH: data['ethereum']?.usd || 3200,
      USDT: data['tether']?.usd || 1.0,
      USDC: data['usd-coin']?.usd || 1.0,
      VERSE: data['verse']?.usd || 0.00035,
    };
  } catch {
    // Fallback benchmark prices
    return {
      POL: 0.45,
      MATIC: 0.45,
      ETH: 3200,
      USDT: 1.0,
      USDC: 1.0,
      VERSE: 0.00035,
    };
  }
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
