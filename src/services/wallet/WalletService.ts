// Wallet Management Service
// Enforces atomic balance mutations, row locking, and prevents double-spending

import { Database } from '../../database/db.js';
import { Wallet, WalletTransaction } from '../../types/database.js';
import { PayFluxError } from '../card-payout/CardPayoutErrors.js';

export class WalletService {
  private static instance: WalletService;
  private db: Database;

  private constructor() {
    this.db = Database.getInstance();
  }

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  public async getBalances(userId: string): Promise<Wallet[]> {
    return this.db.getAllWallets(userId);
  }

  public async getWallet(userId: string, asset: string): Promise<Wallet> {
    const wallet = await this.db.getWallet(userId, asset);
    if (!wallet) {
      throw new PayFluxError('INVALID_CURRENCY', `Wallet for asset ${asset} does not exist for this user.`, 404);
    }
    return wallet;
  }

  /**
   * Atomically locks and reserves funds from available balance to locked balance
   */
  public async reserveFunds(userId: string, asset: string, amount: number, payoutId: string): Promise<Wallet> {
    const releaseLock = await this.db.acquireLock(`wallet:${userId}:${asset}`);
    try {
      const wallet = await this.db.getWallet(userId, asset);
      if (!wallet) {
        throw new PayFluxError('INSUFFICIENT_BALANCE', `No wallet found for asset ${asset}.`, 404);
      }

      if (wallet.available_balance < amount) {
        throw new PayFluxError(
          'INSUFFICIENT_BALANCE',
          `Insufficient available balance in ${asset}. Available: ${wallet.available_balance.toFixed(6)}, Required: ${amount.toFixed(6)}.`,
          400,
          { available: wallet.available_balance, required: amount, asset }
        );
      }

      wallet.available_balance = Number((wallet.available_balance - amount).toFixed(12));
      wallet.locked_balance = Number((wallet.locked_balance + amount).toFixed(12));

      await this.db.updateWallet(wallet);

      const tx: WalletTransaction = {
        id: `wtx_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        wallet_id: wallet.id,
        type: 'PAYOUT_RESERVE',
        amount: -amount,
        fee: 0,
        status: 'CONFIRMED',
        tx_hash: `escrow_${payoutId}`,
        created_at: new Date().toISOString(),
      };
      this.db.tables.wallet_transactions.set(tx.id, tx);

      return wallet;
    } finally {
      releaseLock();
    }
  }

  /**
   * Releases locked funds back to available balance when a payout fails or is cancelled
   */
  public async releaseReservedFunds(userId: string, asset: string, amount: number, payoutId: string): Promise<Wallet> {
    const releaseLock = await this.db.acquireLock(`wallet:${userId}:${asset}`);
    try {
      const wallet = await this.db.getWallet(userId, asset);
      if (!wallet) throw new Error(`Wallet ${asset} not found for user ${userId}`);

      const releaseAmount = Math.min(wallet.locked_balance, amount);
      wallet.locked_balance = Number((wallet.locked_balance - releaseAmount).toFixed(12));
      wallet.available_balance = Number((wallet.available_balance + releaseAmount).toFixed(12));

      await this.db.updateWallet(wallet);

      const tx: WalletTransaction = {
        id: `wtx_rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        wallet_id: wallet.id,
        type: 'PAYOUT_REFUND',
        amount: releaseAmount,
        fee: 0,
        status: 'CONFIRMED',
        tx_hash: `refund_${payoutId}`,
        created_at: new Date().toISOString(),
      };
      this.db.tables.wallet_transactions.set(tx.id, tx);

      return wallet;
    } finally {
      releaseLock();
    }
  }

  /**
   * Finalizes settlement: removes the amount from locked balance and total balance
   */
  public async finalizeSettlement(userId: string, asset: string, amount: number, payoutId: string): Promise<Wallet> {
    const releaseLock = await this.db.acquireLock(`wallet:${userId}:${asset}`);
    try {
      const wallet = await this.db.getWallet(userId, asset);
      if (!wallet) throw new Error(`Wallet ${asset} not found for user ${userId}`);

      const settleAmount = Math.min(wallet.locked_balance, amount);
      wallet.locked_balance = Number((wallet.locked_balance - settleAmount).toFixed(12));
      wallet.balance = Number((wallet.balance - settleAmount).toFixed(12));

      await this.db.updateWallet(wallet);

      const tx: WalletTransaction = {
        id: `wtx_set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        wallet_id: wallet.id,
        type: 'PAYOUT_SETTLED',
        amount: -settleAmount,
        fee: 0,
        status: 'CONFIRMED',
        tx_hash: `settled_${payoutId}`,
        created_at: new Date().toISOString(),
      };
      this.db.tables.wallet_transactions.set(tx.id, tx);

      return wallet;
    } finally {
      releaseLock();
    }
  }

  /**
   * Credit deposit
   */
  public async deposit(userId: string, asset: string, amount: number): Promise<Wallet> {
    if (amount <= 0) throw new PayFluxError('INVALID_AMOUNT', 'Deposit amount must be positive.', 400);

    const releaseLock = await this.db.acquireLock(`wallet:${userId}:${asset}`);
    try {
      let wallet = await this.db.getWallet(userId, asset);
      if (!wallet) {
        wallet = {
          id: `wal_${userId}_${asset.toLowerCase()}`,
          user_id: userId,
          asset: asset.toUpperCase(),
          balance: 0,
          available_balance: 0,
          locked_balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      wallet.balance = Number((wallet.balance + amount).toFixed(12));
      wallet.available_balance = Number((wallet.available_balance + amount).toFixed(12));

      await this.db.updateWallet(wallet);

      const tx: WalletTransaction = {
        id: `wtx_dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        wallet_id: wallet.id,
        type: 'DEPOSIT',
        amount: amount,
        fee: 0,
        status: 'CONFIRMED',
        tx_hash: `onchain_${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      this.db.tables.wallet_transactions.set(tx.id, tx);

      return wallet;
    } finally {
      releaseLock();
    }
  }
}
