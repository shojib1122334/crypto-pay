import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Set standard resource policy headers for web3 wallets & iframe compatibility
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // Custom MIME headers for PWA files
  app.get('/manifest.webmanifest', (_req, res, next) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    next();
  });

  app.get('/sw.js', (_req, res, next) => {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
  });

  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const assetlinksPath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(assetlinksPath);
  });

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      network: 'Polygon Mainnet (Chain ID 137)',
      timestamp: new Date().toISOString(),
    });
  });

  // Permanent Wallet-Linked Subscription & Free Trial APIs
  const {
    getWalletSubscription,
    useWalletFreeTrial,
    upgradeWalletSubscription,
  } = await import('./server/subscriptionDb');

  // Get or initialize wallet trial & subscription state
  app.get('/api/subscription/wallet/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: 'Missing walletAddress parameter' });
      }
      const record = await getWalletSubscription(walletAddress);
      return res.json({ success: true, data: record });
    } catch (err: unknown) {
      console.error('[API] /api/subscription/wallet error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to get wallet subscription';
      return res.status(500).json({ error: msg });
    }
  });

  // Consume 1-time Free Trial permanently for this wallet address
  app.post('/api/subscription/wallet/:walletAddress/use-trial', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: 'Missing walletAddress parameter' });
      }
      const result = await useWalletFreeTrial(walletAddress);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error, record: result.record });
      }
      return res.json({ success: true, data: result.record });
    } catch (err: unknown) {
      console.error('[API] /api/subscription/wallet/use-trial error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to consume free trial';
      return res.status(500).json({ error: msg });
    }
  });

  // Save upgraded subscription linked to this wallet address
  app.post('/api/subscription/wallet/:walletAddress/upgrade', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { subscription } = req.body;
      if (!walletAddress || !subscription) {
        return res.status(400).json({ error: 'Missing walletAddress or subscription payload' });
      }
      const result = await upgradeWalletSubscription(walletAddress, subscription);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      return res.json({ success: true, data: result.record });
    } catch (err: unknown) {
      console.error('[API] /api/subscription/wallet/upgrade error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upgrade subscription';
      return res.status(500).json({ error: msg });
    }
  });

  // Get payment history for this wallet address
  app.get('/api/subscription/wallet/:walletAddress/history', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: 'Missing walletAddress parameter' });
      }
      const record = await getWalletSubscription(walletAddress);
      return res.json({ success: true, history: record.history || [] });
    } catch (err: unknown) {
      console.error('[API] /api/subscription/wallet/history error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to get wallet history';
      return res.status(500).json({ error: msg });
    }
  });

  // ==========================================
  // CryptoPay Swap — Production Backend APIs
  // ==========================================
  const {
    WHITELISTED_TOKENS,
    SWAP_ENGINE_CONFIG,
    SWAP_ROUTERS,
    VALID_PAIRS,
  } = await import('./server/swapConfig');
  const {
    generateExecutableQuote,
    prepareSwapTransaction,
    simulateSwapTransaction,
    verifySwapTransaction,
  } = await import('./server/swapEngine');
  const {
    getSwapHistoryForWallet,
    getSwapByTxHash,
  } = await import('./server/swapDb');

  // 1. Whitelisted Polygon Tokens Source of Truth
  app.get('/api/swap/tokens', (_req, res) => {
    const tokens = Object.values(WHITELISTED_TOKENS).filter((t) => t.enabled);
    return res.json({
      success: true,
      chainId: SWAP_ENGINE_CONFIG.chainId,
      network: SWAP_ENGINE_CONFIG.networkName,
      tokens,
    });
  });

  // 2. Production Swap Engine Configuration
  app.get('/api/swap/config', (_req, res) => {
    return res.json({
      success: true,
      config: {
        ...SWAP_ENGINE_CONFIG,
        supportedPairs: Array.from(VALID_PAIRS),
        routers: SWAP_ROUTERS,
        whitelistedTokens: Object.values(WHITELISTED_TOKENS),
      },
    });
  });

  // 3. Real-Time Executable Quote Engine
  app.get('/api/swap/quote', async (req, res) => {
    try {
      const { chainId, walletAddress, inputToken, outputToken, inputAmount, slippage } = req.query;

      if (!chainId || !inputToken || !outputToken || !inputAmount) {
        return res.status(400).json({
          error: 'Missing required query parameters (chainId, inputToken, outputToken, inputAmount)',
        });
      }

      if (Number(chainId) !== SWAP_ENGINE_CONFIG.chainId) {
        return res.status(400).json({
          error: `Invalid chainId ${chainId}. CryptoPay Swap operates exclusively on Polygon Mainnet (${SWAP_ENGINE_CONFIG.chainId}).`,
        });
      }

      const quote = await generateExecutableQuote({
        chainId: Number(chainId),
        walletAddress: (walletAddress as string) || '0x0000000000000000000000000000000000000000',
        inputSymbol: (inputToken as string).toUpperCase() as 'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL',
        outputSymbol: (outputToken as string).toUpperCase() as 'USDT' | 'USDC' | 'VERSE' | 'MATIC' | 'POL',
        inputAmount: inputAmount as string,
        slippage: slippage ? Number(slippage) : undefined,
      });

      return res.json({ success: true, quote });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate executable quote';
      return res.status(400).json({ success: false, error: msg });
    }
  });

  // 4. Prepare Polygon Swap Transaction Calldata
  app.post('/api/swap/prepare', async (req, res) => {
    try {
      const { quoteId, walletAddress, chainId } = req.body;

      if (!quoteId || !walletAddress) {
        return res.status(400).json({ error: 'Missing quoteId or walletAddress in request body.' });
      }

      if (Number(chainId) !== SWAP_ENGINE_CONFIG.chainId) {
        return res.status(400).json({
          error: `Invalid chainId ${chainId}. Only Polygon Mainnet (${SWAP_ENGINE_CONFIG.chainId}) is supported.`,
        });
      }

      const preparedTx = await prepareSwapTransaction({
        quoteId,
        walletAddress,
        chainId: Number(chainId),
      });

      return res.json({ success: true, transaction: preparedTx });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to prepare transaction';
      return res.status(400).json({ error: msg });
    }
  });

  // 5. Transaction Simulation via eth_call
  app.post('/api/swap/simulate', async (req, res) => {
    try {
      const { quoteId, walletAddress, to, data, value } = req.body;
      if (!walletAddress || !to || !data) {
        return res.status(400).json({ error: 'Missing walletAddress, to, or data for simulation.' });
      }

      const simulation = await simulateSwapTransaction({
        quoteId: quoteId || '',
        walletAddress,
        to,
        data,
        value,
      });

      return res.json(simulation);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation error';
      return res.status(400).json({ success: false, error: msg });
    }
  });

  // 6. Verify Transaction Receipt on Polygon Blockchain
  app.post('/api/swap/verify', async (req, res) => {
    try {
      const { txHash, walletAddress, quoteId } = req.body;

      if (!txHash || !walletAddress) {
        return res.status(400).json({ error: 'Missing txHash or walletAddress' });
      }

      const verification = await verifySwapTransaction({
        txHash,
        walletAddress,
        quoteId,
      });

      return res.json({ success: true, ...verification });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      return res.status(500).json({ error: msg });
    }
  });

  // 7. Get Swap Status by Hash
  app.get('/api/swap/status/:txHash', async (req, res) => {
    try {
      const { txHash } = req.params;
      if (!txHash) {
        return res.status(400).json({ error: 'Missing txHash parameter' });
      }

      const record = await getSwapByTxHash(txHash);
      if (!record) {
        return res.status(404).json({ error: 'Swap record not found' });
      }

      return res.json({ success: true, record });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get swap status';
      return res.status(500).json({ error: msg });
    }
  });

  // 8. Wallet Swap History (Strictly wallet-associated)
  app.get('/api/swap/history/:wallet', async (req, res) => {
    try {
      const { wallet } = req.params;
      if (!wallet) {
        return res.status(400).json({ error: 'Missing wallet parameter' });
      }

      const history = await getSwapHistoryForWallet(wallet);
      return res.json({ success: true, wallet, history });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve swap history';
      return res.status(500).json({ error: msg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('{*all}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CryptoPay Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
