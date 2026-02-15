/*
    SINET Audio Lekar — Service Worker
    Offline Mode & PWA
    Author: miuchins & SINET AI
*/

const CACHE_NAME = 'sinet-audio-v15.4.8.1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './sinet-nutri-studio_v1.html',
  './sinet_inspector_v15.html',
  './sinet-catalog-converter.html',
  './sinet-deduplicator.html',
  './css/main.css',

  // JS (cache-bust matches index.html)
  './js/db/indexed-db.js?v=15.4',
  './js/app.js?v=15.4.8.0',
  './js/audio/audio-engine.js?v=15.4.8.0',
  './js/catalog/stl-adapter.js?v=15.4.8.0',

  // Module imports (may be requested without query)
  './js/app.js',
  './js/catalog/stl-adapter.js',
  './js/audio/audio-engine.js',
  './js/db/indexed-db.js',

  // Data
  './data/SINET_CATALOG.json',
  './data/SINET_STL.json',
  './data/presets/senior_presets.json',
  './data/media/acupressure/registry.json',

  './manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

// Network-first for critical (JS/CSS/JSON/HTML) to avoid being stuck on old versions.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const path = url.pathname || '';
  const isCritical =
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('.json') ||
    path.endsWith('index.html');

  if (isCritical) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || caches.match('./index.html');
      }
    })());
    return;
  }

  // Cache-first for non-critical
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});