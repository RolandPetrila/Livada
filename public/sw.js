// Service Worker — Livada Mea
// Strategie: Network-first pentru HTML (elimina definitiv problema versiunii vechi)
// HTML este INTOTDEAUNA preluat din retea cand exista conexiune.
// Cache STATIC_CACHE: doar icon + manifest (nu se schimba niciodata)
// Cache FONT_CACHE: Google Fonts (nu se schimba niciodata)
// Offline: HTML servit din cache dupa ultima vizita reusita

const STATIC_CACHE = 'livada-static-v1';
const FONT_CACHE   = 'livada-fonts-v1';

// === INSTALL: cache DOAR assets statice (NU HTML) ===
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(['/icon.svg', '/manifest.json']))
      .then(() => self.skipWaiting())
  );
});

// === ACTIVATE: sterge cache-urile vechi (inclusiv cele cu HTML) ===
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// === FETCH ===
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Google Fonts — cache-first (nu se schimba, economie de date)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(FONT_CACHE).then(c => c.put(event.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Icon + Manifest — cache-first (asset static, nu se schimba)
  if (url.endsWith('/icon.svg') || url.endsWith('/manifest.json')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // API calls — network only (nu are sens sa cachezi date live)
  if (url.includes('/api/') || url.includes('api.open-meteo.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML + tot restul: NETWORK-FIRST
  // Daca online → retea (intotdeauna versiunea cea mai noua)
  // Dupa fetch reusit → salveaza in cache pentru offline
  // Daca offline → serveste din cache (ultima versiune descarcata)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached => cached || caches.match('/') || caches.match('/index.html'))
      )
  );
});
