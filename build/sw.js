const CACHE_NAME = 'stage-connect-v4-NUCLEAR';

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install v4');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activate v4 - CLEARING OLD CACHES');
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => {
          console.log('[Service Worker] Deleting cache:', key);
          return caches.delete(key);
        }));
      })
    ])
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});