const CACHE_NAME = 'stage-connect-v11-NUCLEAR';

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install v12 - FORCE UPDATE');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activate v12 - CLAIMING CLIENTS');
  ])
);
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});