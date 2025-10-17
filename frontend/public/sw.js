/* AyurSutra basic PWA service worker (Vite + Vercel)
   - Caches app shell and static assets
   - Network-first for navigation/doc requests
   - Cache-first for static assets (CSS/JS/images)
*/

const SW_VERSION = 'v1.0.0';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/ayusutra.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SW_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== SW_VERSION ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

function isNavRequest(request) {
  return request.mode === 'navigate' || (request.destination === '' && request.method === 'GET');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass non-GET
  if (request.method !== 'GET') return;

  // Network-first for navigation requests (HTML)
  if (isNavRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SW_VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((res) => res || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(SW_VERSION).then((cache) => cache.put(request, copy));
        return res;
      });
    })
  );
});
