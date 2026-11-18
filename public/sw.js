const CACHE_VERSION = 'pixel-quest-pwa-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-icon.png',
];

const BYPASS_HOST_PATTERNS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'accounts.google.com',
  'www.googleapis.com',
  'api.stripe.com',
  'checkout.stripe.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('pixel-quest-pwa') &&
                key !== APP_SHELL_CACHE &&
                key !== ASSET_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypassRequest(url, request) {
  if (request.method !== 'GET') return true;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  if (url.origin !== self.location.origin) {
    return BYPASS_HOST_PATTERNS.some((host) => url.hostname.includes(host));
  }
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname.startsWith('/auth/')) return true;
  if (url.pathname.includes('webpack-hmr')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (shouldBypassRequest(url, request)) {
    return;
  }

  // Navigation requests: network-first with cached app shell fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootFallback = await caches.match('/');
          return rootFallback || Response.error();
        }),
    );
    return;
  }

  // Static Next bundles, images, fonts, and sprites: stale-while-revalidate
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/images/') ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|css|js|webmanifest)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return response;
          })
          .catch(() => cached || Response.error());

        return cached || networkPromise;
      }),
    );
  }
});
