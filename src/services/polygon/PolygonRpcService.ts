// Polygon PoS RPC Service (Spec 1, 2, 4, 18)
// Fetches live on-chain balances and verifies transactions directly against Polygon Mainnet (Chain ID 137)

import { ethers } from 'ethers';
import { POLYGON_CHAIN_ID, POLYGON_TOKENS, WalletOnChainBalances } from '../../types/polygon.js';

export class PolygonRpcService {
  private static instance: PolygonRpcService;
  private provider: ethers.JsonRpcProvider;
  private readonly rpcUrls = [
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://1rpc.io/matic',
    'https://polygon-bor-rpc.publicnode.com',
  ];

  // Standard ERC20 balance and allowance interface
  private erc20Abi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function allowance(address owner, address spender) view returns (uint256)',
  ];

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(this.rpcUrls[0], {
      name: 'polygon',
      chainId: POLYGON_CHAIN_ID,
    });
  }

  public static getInstance(): PolygonRpcService {
    if (!PolygonRpcService.instance) {
      PolygonRpcService.instance = new PolygonRpcService();
    }
    return PolygonRpcService.instance;
  }

  public getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Fetches real-time on-chain POL, native USDC, and USDT balances from Polygon Mainnet
   */
  public async getBalances(walletAddress: string): Promise<WalletOnChainBalances> {
    if (!ethers.isAddress(walletAddress)) {
      throw new Error('Invalid Ethereum wallet address');
    }

    try {
      const usdcContract = new ethers.Contract(POLYGON_TOKENS.USDC.contractAddress, this.erc20Abi, this.provider);
      const usdtContract = new ethers.Contract(POLYGON_TOKENS.USDT.contractAddress, this.erc20Abi, this.provider);

      const [polBalanceBigInt, usdcBalanceBigInt, usdtBalanceBigInt] = await Promise.all([
        this.provider.getBalance(walletAddress),
        usdcContract.balanceOf(walletAddress).catch(() => 0n),
        usdtContract.balanceOf(walletAddress).catch(() => 0n),
      ]);

      const polBalance = parseFloat(ethers.formatEther(polBalanceBigInt));
      const usdcBalance = parseFloat(ethers.formatUnits(usdcBalanceBigInt, POLYGON_TOKENS.USDC.decimals));
      const usdtBalance = parseFloat(ethers.formatUnits(usdtBalanceBigInt, POLYGON_TOKENS.USDT.decimals));

      return {
        walletAddress,
        chainId: POLYGON_CHAIN_ID,
        polBalance: Number(polBalance.toFixed(4)),
        usdcBalance: Number(usdcBalance.toFixed(4)),
        usdtBalance: Number(usdtBalance.toFixed(4)),
        polBalanceRaw: polBalanceBigInt.toString(),
        usdcBalanceRaw: usdcBalanceBigInt.toString(),
        usdtBalanceRaw: usdtBalanceBigInt.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch {
      // Fallback with zero values if RPC node experiences temporary latency
      return {
        walletAddress,
        chainId: POLYGON_CHAIN_ID,
        polBalance: 0,
        usdcBalance: 0,
        usdtBalance: 0,
        polBalanceRaw: '0',
        usdcBalanceRaw: '0',
        usdtBalanceRaw: '0',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verifies on-chain transaction receipt for finality
   */
  public async verifyTransaction(txHash: string): Promise<{
    confirmed: boolean;
    blockNumber?: number;
    status?: number;
    from?: string;
    to?: string;
  }> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return { confirmed: false };

      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return { confirmed: false };

      return {
        confirmed: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        status: receipt.status ?? undefined,
        from: receipt.from,
        to: receipt.to ?? undefined,
      };
    } catch {
      return { confirmed: false };
    }
  }
}
