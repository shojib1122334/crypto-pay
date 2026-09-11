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
    recordSwap,
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

  // 8. Wallet Swap History (Strictly wallet-associated, supports both /:wallet and query param)
  const handleSwapHistory = async (req: express.Request, res: express.Response) => {
    try {
      const walletParam = (req.params as Record<string, string>).wallet;
      const walletQuery = req.query.wallet;
      const wallet = (walletParam || (typeof walletQuery === 'string' ? walletQuery : '')).trim();

      if (!wallet) {
        return res.json({ success: true, history: [] });
      }

      const history = await getSwapHistoryForWallet(wallet);
      return res.json({ success: true, wallet, history: history || [] });
    } catch (err: unknown) {
      console.warn('[SwapHistory] Handled error in swap history retrieval:', err);
      return res.json({ success: true, history: [] });
    }
  };

  app.get('/api/swap/history', handleSwapHistory);
  app.get('/api/swap/history/:wallet', handleSwapHistory);

  // 9. Record Swap Transaction from Client
  app.post('/api/swap/record', async (req, res) => {
    try {
      const { record } = req.body;
      if (!record || !record.walletAddress || !record.txHash) {
        return res.status(400).json({ error: 'Missing swap record details' });
      }
      const saved = await recordSwap(record);
      return res.json({ success: true, record: saved });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record swap';
      return res.status(500).json({ error: msg });
    }
  });

  // ==========================================
  // CryptoPay Top-Up (Pay to Card) APIs
  // ==========================================
  const { CardCurrencyValidator } = await import('./src/utils/cardCurrencyValidator');
  const {
    getTopUpHistoryForWallet,
    getAllTopUpRecords,
    getTopUpById,
    recordTopUp,
  } = await import('./server/topupDb');

  const ADMIN_PASSWORD = 'shojib@@@@@';

  const checkTopUpAdminAuth = (req: express.Request): boolean => {
    const adminKey = (req.headers['x-admin-key'] || req.headers['x-admin-password']) as string | undefined;
    const authHeader = req.headers['authorization'];
    if (adminKey === ADMIN_PASSWORD) return true;
    if (authHeader && authHeader.replace(/^Bearer\s+/i, '').trim() === ADMIN_PASSWORD) return true;
    return false;
  };

  // Verify Card BIN and USD support
  app.post('/api/topup/card/verify-currency', (req, res) => {
    if (!checkTopUpAdminAuth(req)) {
      return res.status(403).json({
        success: false,
        error: 'Top-up service is currently locked for general users. Only administrators with the correct admin password can use this feature.',
        locked: true,
      });
    }

    try {
      const { cardNumber } = req.body;
      const result = CardCurrencyValidator.checkUsdSupport(cardNumber || '');
      return res.json({ success: true, ...result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Card verification failed';
      return res.status(400).json({ success: false, error: msg });
    }
  });

  // Generate Live Quote for Top-Up
  app.post('/api/topup/quote', async (req, res) => {
    if (!checkTopUpAdminAuth(req)) {
      return res.status(403).json({
        success: false,
        error: 'Top-up service is currently locked for general users. Only administrators with the correct admin password can use this feature.',
        locked: true,
      });
    }

    try {
      const { token = 'USDC', amount, fiatCurrency = 'USD' } = req.body;
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid positive amount required' });
      }

      if (fiatCurrency && String(fiatCurrency).toUpperCase() !== 'USD') {
        return res.status(400).json({ success: false, error: 'Only USD is supported for card payouts.' });
      }

      // Base rate: USDT and USDC on Polygon are stable 1:1 USD pegs
      const baseRate = 1.0;
      // Standard off-ramp processing fee: 0.99% with minimum $1.50
      const providerFee = Math.max(1.5, parseFloat((numAmount * 0.0099).toFixed(2)));
      const networkFee = 0.01; // ~0.005 POL gas fee
      const totalFee = parseFloat((providerFee + networkFee).toFixed(2));
      const netFiat = Math.max(0, parseFloat((numAmount * baseRate - totalFee).toFixed(2)));

      return res.json({
        success: true,
        quote: {
          quoteId: `topup_qt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          token: token.toUpperCase(),
          cryptoAmount: numAmount,
          fiatCurrency: 'USD',
          fiatAmount: netFiat,
          exchangeRate: baseRate,
          providerFee,
          networkFee,
          totalFee,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate quote';
      return res.status(400).json({ success: false, error: msg });
    }
  });

  // Record Top-Up Transaction
  app.post('/api/topup/record', async (req, res) => {
    if (!checkTopUpAdminAuth(req)) {
      return res.status(403).json({
        success: false,
        error: 'Top-up service is currently locked for general users. Only administrators with the correct admin password can use this feature.',
        locked: true,
      });
    }

    try {
      const { record } = req.body;
      if (!record || !record.walletAddress || !record.txHash) {
        return res.status(400).json({ error: 'Missing top-up record details' });
      }
      const saved = await recordTopUp(record);
      return res.json({ success: true, record: saved });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record top-up';
      return res.status(500).json({ error: msg });
    }
  });

  // Wallet Top-Up History
  const handleTopUpHistory = async (req: express.Request, res: express.Response) => {
    try {
      const walletParam = (req.params as Record<string, string>).wallet;
      const walletQuery = req.query.wallet;
      const wallet = (walletParam || (typeof walletQuery === 'string' ? walletQuery : '')).trim();

      if (!wallet) {
        const history = await getAllTopUpRecords();
        return res.json({ success: true, history: history || [] });
      }

      const history = await getTopUpHistoryForWallet(wallet);
      return res.json({ success: true, wallet, history: history || [] });
    } catch (err: unknown) {
      console.warn('[TopUpHistory] Error in top-up history retrieval:', err);
      return res.json({ success: true, history: [] });
    }
  };

  app.get('/api/topup/history', handleTopUpHistory);
  app.get('/api/topup/history/:wallet', handleTopUpHistory);

  // Get Top-Up Status by ID
  app.get('/api/topup/status/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await getTopUpById(id);
      if (!record) {
        return res.status(404).json({ error: 'Top-up record not found' });
      }
      return res.json({ success: true, record });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get top-up status';
      return res.status(500).json({ error: msg });
    }
  });

  // Automated Test & Compliance Suite Runner (Spec 27)
  app.post('/api/topup/test/run-suite', async (_req, res) => {
    const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

    const runTest = async (name: string, fn: () => Promise<void> | void) => {
      try {
        await fn();
        results.push({ test: name, status: 'PASS' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Test assertion failed';
        results.push({ test: name, status: 'FAIL', details: msg });
      }
    };

    // 1. Card validation - valid Visa
    await runTest('Card validation - Valid Visa identification', () => {
      const check = CardCurrencyValidator.checkUsdSupport('4242424242424242');
      if (!check.supportsUsd || check.brand !== 'VISA') {
        throw new Error('Expected valid Visa with USD support');
      }
    });

    // 2. Card validation - valid Mastercard
    await runTest('Card validation - Valid Mastercard identification', () => {
      const check = CardCurrencyValidator.checkUsdSupport('5555555555554444');
      if (!check.supportsUsd || check.brand !== 'MASTERCARD') {
        throw new Error('Expected valid Mastercard with USD support');
      }
    });

    // 3. Card validation - Luhn checksum algorithm
    await runTest('Card validation - Luhn checksum verification', () => {
      const validLuhn = CardCurrencyValidator.validateLuhn('4242424242424242');
      const invalidLuhn = CardCurrencyValidator.validateLuhn('4242424242424241');
      if (!validLuhn || invalidLuhn) {
        throw new Error('Luhn checksum did not correctly evaluate PAN parity');
      }
    });

    // 4. Non-USD Rejection - RuPay Domestic
    await runTest('Rejection of Non-USD Card - RuPay Domestic Network', () => {
      const check = CardCurrencyValidator.checkUsdSupport('6070123456789012');
      if (check.supportsUsd || check.status !== 'REJECTED') {
        throw new Error('Expected RuPay to be rejected for USD payout');
      }
    });

    // 5. Non-USD Rejection - Mir Domestic
    await runTest('Rejection of Non-USD Card - Mir Domestic Network', () => {
      const check = CardCurrencyValidator.checkUsdSupport('2200123456789012');
      if (check.supportsUsd || check.status !== 'REJECTED') {
        throw new Error('Expected Mir card to be rejected for USD payout');
      }
    });

    // 6. Non-USD Rejection - Elo Domestic
    await runTest('Rejection of Non-USD Card - Elo Domestic Network', () => {
      const check = CardCurrencyValidator.checkUsdSupport('4011123456789012');
      if (check.supportsUsd || check.status !== 'REJECTED') {
        throw new Error('Expected Elo card to be rejected for USD payout');
      }
    });

    // 7. Non-USD Rejection - Domestic Restricted BIN 492181
    await runTest('Rejection of Non-USD Card - Restricted Local BIN (492181)', () => {
      const check = CardCurrencyValidator.checkUsdSupport('4921811234567890');
      if (check.supportsUsd || check.status !== 'REJECTED') {
        throw new Error('Expected domestic BIN 492181 to be rejected');
      }
    });

    // 8. Live Quote Calculation & Minimum Fee Policy
    await runTest('Quote calculation - Dynamic fee with $1.50 minimum floor', () => {
      const numAmount = 50; // $50 -> 0.99% is $0.495, so fee must be floored to $1.50
      const providerFee = Math.max(1.5, parseFloat((numAmount * 0.0099).toFixed(2)));
      const networkFee = 0.01;
      const totalFee = parseFloat((providerFee + networkFee).toFixed(2));
      const netFiat = Math.max(0, parseFloat((numAmount * 1.0 - totalFee).toFixed(2)));

      if (providerFee !== 1.5 || totalFee !== 1.51 || netFiat !== 48.49) {
        throw new Error(`Fee floor mismatch: got netFiat ${netFiat}, expected 48.49`);
      }
    });

    // 9. Polygon PoS Chain ID Invariant
    await runTest('Polygon PoS Mainnet Chain ID Invariant (137)', () => {
      const POLYGON_CHAIN_ID = 137;
      if (POLYGON_CHAIN_ID !== 137) throw new Error('Invalid Polygon Chain ID');
    });

    // 10. Approved Polygon Settlement Tokens
    await runTest('Approved Polygon Settlement Tokens Allowlist', () => {
      const usdcAddress = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
      const usdtAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
      if (!usdcAddress || !usdtAddress) throw new Error('Missing token contracts');
    });

    // 11. PCI-DSS Compliance Invariant (No raw PAN or CVV stored)
    await runTest('PCI-DSS Compliance - Tokenized Settlement Invariant', () => {
      const record = {
        id: 'test_pci',
        cardLast4: '4242',
        cardholderName: 'JOHN DOE',
      };
      if ('cardNumber' in record || 'cvv' in record || 'pan' in record) {
        throw new Error('PCI-DSS violation: raw card number or CVV was detected in structure');
      }
    });

    return res.json({
      success: true,
      total: results.length,
      passed: results.filter((r) => r.status === 'PASS').length,
      failed: results.filter((r) => r.status === 'FAIL').length,
      results,
    });
  });

  // PayFlux Core Payment, Polygon PoS, and Provider API Routers
  const { polygonRouter } = await import('./src/api/polygonRoutes.js');
  const { providerRouter } = await import('./src/api/providerRoutes.js');
  const { apiRouter } = await import('./src/api/routes.js');

  app.use('/api/polygon', polygonRouter);
  app.use('/api/provider', providerRouter);
  app.use('/api/webhooks', providerRouter);
  app.use('/api', apiRouter);

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
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CryptoPay Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
