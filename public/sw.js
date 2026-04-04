const CACHE_NAME = 'livada-v4-20260404';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Google Fonts cache (IMP-1: offline fonts)
const FONT_CACHE = 'livada-fonts-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting()) // skipWaiting DUPA ce cache-ul e populat
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => {
        // Notifica toate paginile deschise sa se reIncarce cu versiunea noua
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      })
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Network-first pentru API calls
  if (url.includes('/api/') || url.includes('api.open-meteo.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first pentru Google Fonts (long-lived)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(FONT_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first pentru navigare HTML — versiune proaspata dupa fiecare deploy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first cu fallback network pentru alte assets statice
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
