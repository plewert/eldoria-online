'use strict';
/* Service worker mínimo: hace el juego instalable. Siempre pide primero a la red (así las actualizaciones llegan al instante)
   y solo usa la copia guardada si no hay conexión. No toca el WebSocket ni las peticiones que no sean GET. */
const CACHE = 'eldoria-shell-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)).catch(() => {}); } return res; }).catch(() => caches.match(r).then((m) => m || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
