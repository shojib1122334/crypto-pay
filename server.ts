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
