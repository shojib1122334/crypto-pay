export interface SwapTokenInfo {
  symbol: 'USDT' | 'USDC' | 'VERSE' | 'MATIC';
  name: string;
  address: `0x${string}`;
  decimals: number;
  logo: string;
  color: string;
  minInputAmount?: number;
  minUsdValue?: number;
}

export const POLYGON_CHAIN_ID = 137;

export const SWAP_TOKENS: SwapTokenInfo[] = [
  {
    symbol: 'MATIC',
    name: 'Polygon (MATIC)',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    decimals: 18,
    logo: '/tokens/matic.png',
    color: '#8247E5',
    minInputAmount: 3,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    logo: '/tokens/usdt.png',
    color: '#26A17B',
    minUsdValue: 1.0,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    logo: '/tokens/usdc.png',
    color: '#2775CA',
    minUsdValue: 1.0,
  },
  {
    symbol: 'VERSE',
    name: 'Verse',
    address: '0xc708d6f2153933daa50b2d0758955be0a93a8fec',
    decimals: 18,
    logo: '/tokens/verse.png',
    color: '#0AC18E',
    minInputAmount: 10000,
  },
];

export const TOKEN_MAP = new Map<string, SwapTokenInfo>(
  SWAP_TOKENS.map((t) => [t.symbol, t])
);

export function getPolygonscanAddressUrl(address: string) {
  return `https://polygonscan.com/token/${address}`;
}

export function getPolygonscanTxUrl(txHash: string) {
  return `https://polygonscan.com/tx/${txHash}`;
}

/**
 * Formats displayed token amounts in the Exchange UI to a maximum of 2 decimal places.
 * Does not mutate internal values used for transactions or calculations.
 */
export function formatTokenAmount(
  amount: string | number | undefined | null,
  options?: { maxDecimals?: number; minDecimals?: number }
): string {
  if (amount === undefined || amount === null || amount === '') return '0.00';
  const cleanStr = typeof amount === 'string' ? amount.replace(/,/g, '').trim() : String(amount);
  const num = parseFloat(cleanStr);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';

  const maxDecimals = options?.maxDecimals ?? 2;
  const minDecimals = options?.minDecimals ?? 0;

  // Round mathematically to maxDecimals
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((num + Number.EPSILON) * factor) / factor;

  if (num > 0 && rounded === 0) {
    return '<0.01';
  }

  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

