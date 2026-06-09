/* Vibe — service worker (cache-first for offline) */
const CACHE = 'vibe-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './assets/styles.css',
  './assets/audio.js',
  './assets/pitch.js',
  './assets/icons.jsx',
  './assets/components.jsx',
  './assets/screens.jsx',
  './assets/piano-flute.jsx',
  './assets/other-instruments.jsx',
  './assets/band.jsx',
  './assets/app.jsx',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => null)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => null);
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
