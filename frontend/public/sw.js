/**
 * Smart Public Complaint - Progressive Web App Service Worker
 * Secure static asset caching with network-first navigation and strict API bypass.
 */

const CACHE_NAME = 'civicly-static-v1.0.1';

// Static application shell assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-512x512.png',
  '/apple-touch-icon.png'
];

// 1. INSTALL EVENT
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache core shell safely (fail silently if an asset fails to fetch during install)
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[PWA SW] Pre-cache skipped for', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT - Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Removing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // STRICT SECURITY RULE: NEVER cache API endpoints, auth routes, or POST/PUT/PATCH/DELETE mutations
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/complaints') ||
    url.pathname.includes('/transport') ||
    url.pathname.includes('/users') ||
    url.pathname.includes('/chat') ||
    url.pathname.includes('/admin') ||
    url.pathname.includes('/attachments')
  ) {
    // Direct network pass-through without touching cache
    return;
  }

  // Handle SPA navigation requests (HTML pages) - Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Offline - Smart Public Complaint</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f7f8f5; color: #17324d; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                .card { background: white; border-radius: 16px; padding: 32px 24px; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #dce3e7; }
                .icon { width: 56px; height: 56px; border-radius: 50%; background: #e8f3ef; color: #087f8c; display: inline-grid; place-items: center; margin-bottom: 16px; font-size: 26px; }
                h1 { font-size: 20px; margin: 0 0 10px; color: #17324d; }
                p { font-size: 13px; line-height: 1.5; color: #65727d; margin: 0 0 20px; }
                button { background: #087f8c; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">📶</div>
                <h1>You are currently offline</h1>
                <p>Internet connectivity is required to access your account, review disputes, or submit new public grievances safely to the civic portal.</p>
                <button onclick="window.location.reload()">Retry Connection</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, fonts, images) - Stale-While-Revalidate
  if (
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|webp|woff2?|ttf|eot)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
