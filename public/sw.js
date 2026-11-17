const CACHE_NAME = 'pixel-quest-pwa-v2'
const CORE_ASSETS = [
  '/',
  '/models',
  '/class-selector',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-icon.png',
  '/icon.svg',
]

function isDevHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('ais-dev-')
  )
}

self.addEventListener('install', (event) => {
  if (isDevHost(self.location.hostname)) {
    event.waitUntil(self.skipWaiting())
    return
  }
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => isDevHost(self.location.hostname) || key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function shouldBypassCache(url) {
  if (isDevHost(url.hostname)) return true
  if (url.origin !== self.location.origin) return true
  if (url.pathname.startsWith('/api/')) return true
  if (url.pathname.startsWith('/auth/')) return true
  if (url.pathname.startsWith('/_next/')) return true
  return false
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (shouldBypassCache(url)) return

  // Network-first for HTML page navigations so latest builds always load when online
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined)
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    )
    return
  }

  // Network-first for static assets & images to prevent stale chunk hydration errors
  const isStaticAsset =
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2')

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined)
          }
          return response
        })
        .catch(() => caches.match(request)),
    )
  }
})
