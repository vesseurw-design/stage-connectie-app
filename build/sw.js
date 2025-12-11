const CACHE_NAME = 'stage-connect-v3';

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install v3');
  self.skipWaiting(); // Force new SW to activate immediately
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activate v3');
  e.waitUntil(clients.claim()); // Take control of all clients immediately
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});