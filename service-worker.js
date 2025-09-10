const CACHE_NAME = 'pokekid-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/manifest.webmanifest',
  // Icons (ajoutez ces fichiers si vous les avez)
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  // Images usuelles (si présentes)
  '/assets/arenas/official.jpg',
  '/assets/sprites/ash.png',
  '/assets/sprites/first_aid.png',
  '/assets/sprites/bomb.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.filter(Boolean)).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME) return caches.delete(k);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Stratégie cache-first pour assets statiques, network-first pour autres
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isStatic = url.origin === location.origin && (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg')
  );

  if (isStatic) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, resClone));
        return res;
      }).catch(() => cached))
    );
  } else {
    e.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
