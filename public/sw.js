// CryptoPay PWA Service Worker v1.0.0
const CACHE_NAME = 'cryptopay-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/icon.svg',
  '/brand/cryptopay-logo.jpg',
  '/tokens/usdt.svg',
  '/tokens/usdc.svg',
  '/tokens/verse.svg'
];

// Domains/URLs that MUST NEVER be cached (Web3 RPC, blockchain queries, live database)
const NETWORK_ONLY_PATTERNS = [
  'polygon-rpc.com',
  'polygonscan.com',
  'infura.io',
  'alchemy.com',
  'ankr.com',
  'cloudflare-eth.com',
  'supabase.co',
  'walletconnect.com',
  'walletconnect.org',
  'api.web3modal.com',
  'pulse.walletconnect.org',
  'relay.walletconnect.com',
  '/api/'
];

// Service Worker Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache static assets gracefully without failing if an optional asset 404s
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[CryptoPay SW] Could not precache:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate (Clean up old cache versions)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('cryptopay-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[CryptoPay SW] Purging obsolete cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Service Worker Fetch Handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Bypass Web3 RPCs, live payment APIs, WebSocket connections
  const isNetworkOnly = NETWORK_ONLY_PATTERNS.some((pattern) => url.href.includes(pattern));
  if (isNetworkOnly) {
    return; // Standard network fetch
  }

  // 3. Navigation requests (HTML pages / App loading) -> Network First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          
          const indexCached = await caches.match('/index.html');
          if (indexCached) return indexCached;

          const offlineCached = await caches.match('/offline.html');
          if (offlineCached) return offlineCached;

          return new Response('Offline - CryptoPay', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 4. Static Assets (Scripts, Styles, Images, Fonts) -> Stale While Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && request.url.startsWith(self.location.origin)) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and static asset fails, cachedResponse will be returned
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Message listener (for skip waiting or manual cache refresh)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
