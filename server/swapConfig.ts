export interface TokenConfig {
  symbol: 'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL';
  name: string;
  address: `0x${string}`;
  decimals: number;
  logo: string;
  color: string;
  enabled: boolean;
  minInputAmount?: number;
  minUsdValue?: number;
}

export const POLYGON_CHAIN_ID = 137;

export const WHITELISTED_TOKENS: Record<'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL', TokenConfig> = {
  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon (POL/MATIC)',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    decimals: 18,
    logo: '/tokens/matic.png',
    color: '#8247E5',
    enabled: true,
    minInputAmount: 3,
  },
  POL: {
    symbol: 'POL',
    name: 'Polygon Ecosystem Token (POL)',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    decimals: 18,
    logo: '/tokens/matic.png',
    color: '#8247E5',
    enabled: true,
    minInputAmount: 3,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    logo: '/tokens/usdt.png',
    color: '#26A17B',
    enabled: true,
    minUsdValue: 1.0,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    logo: '/tokens/usdc.png',
    color: '#2775CA',
    enabled: true,
    minUsdValue: 1.0,
  },
  VERSE: {
    symbol: 'VERSE',
    name: 'Verse',
    address: '0xc708d6f2153933daa50b2d0758955be0a93a8fec',
    decimals: 18,
    logo: '/tokens/verse.png',
    color: '#0AC18E',
    enabled: true,
    minInputAmount: 10000,
  },
};

export const WMATIC_ADDRESS = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as const;

export const SWAP_ROUTERS = {
  kyberswapRouter: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5' as const,
  uniswapV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as const,
  uniswapV3Quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as const,
  quickswapV2Router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' as const,
  quickswapV2Factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32' as const,
};

export const KYBERSWAP_CONFIG = {
  baseUrl: 'https://aggregator-api.kyberswap.com/polygon/api/v1',
  routerAddress: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5' as const,
  clientId: 'cryptopay-exchange',
};

export const SWAP_ENGINE_CONFIG = {
  enabled: true,
  chainId: POLYGON_CHAIN_ID,
  networkName: 'Polygon Mainnet',
  minUsdValue: 1.0,
  minVerseInput: 10000,
  minMaticInput: 3,
  defaultSlippage: 0.5,
  maxSlippage: 5.0,
  maxPriceImpact: 5.0,
  quoteExpirationSeconds: 45,
  defaultDeadlineMinutes: 20,
  rpcEndpoints: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://1rpc.io/matic',
    'https://polygon.llamarpc.com',
    'https://rpc.ankr.com/polygon',
  ],
};

export const VALID_PAIRS = new Set([
  'USDT-USDC',
  'USDC-USDT',
  'USDT-VERSE',
  'VERSE-USDT',
  'USDC-VERSE',
  'VERSE-USDC',
  'MATIC-USDT',
  'USDT-MATIC',
  'MATIC-USDC',
  'USDC-MATIC',
  'MATIC-VERSE',
  'VERSE-MATIC',
  'POL-USDT',
  'USDT-POL',
  'POL-USDC',
  'USDC-POL',
  'POL-VERSE',
  'VERSE-POL',
]);
