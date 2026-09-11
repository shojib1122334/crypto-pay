// Polygon PoS REST Endpoints (Specs 1, 2, 4, 18, 22)
// Handles On-Chain Balance Queries, Payment Record Creation, and Confirmation Tracking

import { Router } from 'express';
import { PolygonRpcService } from '../services/polygon/PolygonRpcService.js';
import { Database } from '../database/db.js';
import { PaymentRecord, POLYGON_CHAIN_ID, POLYGON_TOKENS, SupportedTokenSymbol } from '../types/polygon.js';

export const polygonRouter = Router();
const rpcService = PolygonRpcService.getInstance();
const db = Database.getInstance();

// 1. GET /api/polygon/balances/:address
// Fetches live real-time balances directly from Polygon PoS node
polygonRouter.get('/balances/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balances = await rpcService.getBalances(address);
    res.json(balances);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to fetch Polygon balances' });
  }
});

// 2. POST /api/polygon/payments/create
// Creates a new on-chain payment record before wallet submission
polygonRouter.post('/payments/create', async (req, res) => {
  try {
    const { walletAddress, token, amount, paymentType, recipientAddress, merchantAddress, fiatCurrency, payoutMethod } =
      req.body;

    if (!walletAddress || !token || !amount) {
      return res.status(400).json({ error: 'walletAddress, token, and amount are required' });
    }

    const tokenConfig = POLYGON_TOKENS[token as SupportedTokenSymbol];
    if (!tokenConfig) {
      return res.status(400).json({ error: `Unsupported token: ${token}. Must be USDC, USDT, or POL` });
    }

    const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const record: PaymentRecord = {
      id: paymentId,
      paymentId,
      walletAddress,
      token: token as SupportedTokenSymbol,
      tokenContract: tokenConfig.contractAddress,
      chainId: POLYGON_CHAIN_ID,
      amount: Number(amount),
      decimals: tokenConfig.decimals,
      paymentType: paymentType || 'CRYPTO_SEND',
      recipientAddress: recipientAddress || '0x881d40237659c251811cec9c364ef91dc08d300c',
      merchantAddress: merchantAddress || '0x881d40237659c251811cec9c364ef91dc08d300c',
      fiatCurrency,
      payoutMethod,
      status: 'WAITING_PAYMENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    await db.savePaymentRecord(record);
    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initialize payment record' });
  }
});

// 3. POST /api/polygon/payments/:paymentId/confirm
// Updates payment with transaction hash and initiates verification
polygonRouter.post('/payments/:paymentId/confirm', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { txHash } = req.body;

    const record = await db.getPaymentRecord(paymentId);
    if (!record) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    if (txHash) {
      record.txHash = txHash;
      record.status = 'CONFIRMING';
      await db.savePaymentRecord(record);

      // Trigger asynchronous verification with Polygon RPC node
      rpcService
        .verifyTransaction(txHash)
        .then(async (result) => {
          if (result.confirmed) {
            record.status = 'COMPLETED';
            record.blockNumber = result.blockNumber;
            await db.savePaymentRecord(record);
          }
        })
        .catch(() => {});
    }

    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/polygon/payments/history/:address
// Lists payment records by wallet address
polygonRouter.get('/payments/history/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const records = await db.getPaymentRecordsByWallet(address);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
