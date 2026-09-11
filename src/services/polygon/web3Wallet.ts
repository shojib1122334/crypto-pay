// Browser Web3 Wallet Integration Helper
// Handles MetaMask / EIP-1193 wallet connection and Polygon Chain (ID 137) switching

import { POLYGON_CHAIN_ID_HEX, POLYGON_NETWORK_NAME, POLYGON_GAS_TOKEN } from '../../types/polygon.js';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface ConnectedAccount {
  address: string;
  chainId: number;
}

export class Web3WalletHelper {
  public static isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  public static async connectWallet(): Promise<ConnectedAccount> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('No Ethereum wallet detected. Please install MetaMask, Coinbase Wallet, or Rabby.');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('Wallet connection rejected by user.');
    }

    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);

    return {
      address: accounts[0],
      chainId,
    };
  }

  public static async switchToPolygon(): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('Ethereum wallet not found');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      // 4902: Unrecognized chain, prompt to add Polygon PoS Mainnet
      if (switchError.code === 4902 || switchError?.message?.includes('wallet_addEthereumChain')) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: POLYGON_CHAIN_ID_HEX,
              chainName: POLYGON_NETWORK_NAME,
              nativeCurrency: {
                name: POLYGON_GAS_TOKEN,
                symbol: POLYGON_GAS_TOKEN,
                decimals: 18,
              },
              rpcUrls: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
              blockExplorerUrls: ['https://polygonscan.com/'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }
}
