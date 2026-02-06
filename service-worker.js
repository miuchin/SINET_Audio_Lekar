/*
    ====== SINET PROJECT INFO ======
    File: service-worker.js
    Description: Enables Offline Mode & PWA capabilities
    Author: miuchins & SINET AI
*/

const CACHE_NAME = 'sinet-audio-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/main.css',
    './js/app.js',
    './js/audio/audio-engine.js',
    './js/catalog/catalog-loader.js',
    './js/db/indexed-db.js',
    './data/SINET_CATALOG.json'
];

// 1. INSTALL: Keširanje fajlova
self.addEventListener('install', (event) => {
    console.log('[SINET PWA] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SINET PWA] Caching App Shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. ACTIVATE: Brisanje starog keša
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SINET PWA] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 3. FETCH: Serviranje iz keša (Offline First)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
