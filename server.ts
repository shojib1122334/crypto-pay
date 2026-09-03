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
