// Service Worker — Livada Mea
// Strategie: Network-first pentru HTML (elimina definitiv problema versiunii vechi)
// HTML este INTOTDEAUNA preluat din retea cand exista conexiune.
// Cache STATIC_CACHE: doar icon + manifest (nu se schimba niciodata)
// Cache FONT_CACHE: Google Fonts (nu se schimba niciodata)
// Offline: HTML servit din cache dupa ultima vizita reusita

// T11: BUILD_DATE actualizat la fiecare deploy — forteaza refresh cache dupa update
const BUILD_DATE = "20260423";
const STATIC_CACHE = "livada-static-" + BUILD_DATE;
const FONT_CACHE = "livada-fonts-v1";

// === INSTALL: cache DOAR assets statice (NU HTML) ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([
          "/icon.svg",
          "/icon-192.png",
          "/icon-512.png",
          "/manifest.json",
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

// === ACTIVATE: sterge cache-urile vechi + forteaza reload pe toate tab-urile ===
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== FONT_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window", includeUncontrolled: true }),
      )
      .then((clients) =>
        Promise.all(
          // Notifica tab-urile ca exista o versiune noua (toast in app, fara reload fortat)
          clients.map((client) => client.postMessage({ type: "SW_UPDATED" })),
        ),
      ),
  );
});

// === FETCH ===
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Ignora scheme ne-http(s): chrome-extension://, data:, blob: etc.
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;

  // Google Fonts — cache-first (nu se schimba, economie de date)
  if (
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            caches
              .open(FONT_CACHE)
              .then((c) => c.put(event.request, response.clone()));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Icon + Manifest — cache-first (asset static, nu se schimba)
  if (
    url.endsWith("/icon.svg") ||
    url.endsWith("/icon-192.png") ||
    url.endsWith("/icon-512.png") ||
    url.endsWith("/manifest.json")
  ) {
    event.respondWith(
      caches
        .match(event.request)
        .then((cached) => cached || fetch(event.request)),
    );
    return;
  }

  // API calls — network only (nu are sens sa cachezi date live)
  if (url.includes("/api/") || url.includes("api.open-meteo.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML + tot restul: NETWORK-FIRST (bypass HTTP cache)
  // cache:'no-cache' forteaza browserul sa revalideze cu serverul
  // Daca online → retea (intotdeauna versiunea cea mai noua)
  // Dupa fetch reusit → salveaza in cache pentru offline
  // Daca offline → serveste din cache (ultima versiune descarcata)
  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((response) => {
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
        }
        return response;
      })
      // M5: Promise chaining corect — || nu functioneaza cu Promise-uri
      .catch(() =>
        caches
          .match(event.request)
          .then((r) => r || caches.match("/"))
          .then((r) => r || caches.match("/index.html"))
          .then(
            (r) =>
              r ||
              new Response(
                "<h1>Offline</h1><p>Reincarca cand ai conexiune.</p>",
                {
                  headers: { "Content-Type": "text/html" },
                },
              ),
          ),
      ),
  );
});

// ====== N7: PUSH NOTIFICATIONS (VAPID end-to-end — Audit #1) ======
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // payload non-JSON — fallback text
    try {
      data = { body: event.data ? event.data.text() : "Alerta noua" };
    } catch {}
  }
  const severity = data.severity || "info";
  const vibrate =
    severity === "critical" ? [300, 100, 300, 100, 300] : [200, 100, 200];
  event.waitUntil(
    self.registration.showNotification(data.title || "Livada Mea", {
      body: data.body || "Notificare noua",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "livada-alert",
      renotify: true,
      requireInteraction: severity === "critical",
      vibrate,
      data: { url: data.url || "/", severity },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});

// ====== Audit #5 — Periodic Background Sync (6h) ======
// Ruleaza chiar cu app inchisa (daca user a acordat permisiunea).
// Actualizeaza cache-ul de alerte astfel incat la urmatoarea deschidere
// user vede imediat date recente, iar push-urile ramase sunt afisate.
self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "livada-alerts") return;
  event.waitUntil(
    fetch("/api/frost-alert")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        // Best-effort: daca exista frost/disease activ, emite local notification
        // fara a dubla cele deja trimise server-side (server face dedup 24h).
        const active = [
          data.frost,
          data.disease,
          data.hail,
          data.wind,
          data.heat,
          data.rain,
          data.drought,
        ].filter((a) => a && a.active);
        return Promise.all(
          active.slice(0, 2).map((a) =>
            self.registration.showNotification(
              "Livada Mea — " + (a.type || "alerta"),
              {
                body: a.shortMessage || a.message,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                tag: "livada-psync-" + (a.type || "x") + "-" + (a.date || ""),
                renotify: false,
              },
            ),
          ),
        );
      })
      .catch(() => {}),
  );
});

// ====== Audit #5 — Background Sync (fallback pt one-shot) ======
// Pentru retry la eventuri gen "dismiss" cand offline
self.addEventListener("sync", (event) => {
  if (event.tag === "livada-alerts-retry") {
    event.waitUntil(fetch("/api/frost-alert").catch(() => {}));
  }
});
