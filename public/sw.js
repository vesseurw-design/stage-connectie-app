self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activated');
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Basic pass-through fetch
  e.respondWith(fetch(e.request));
});

// Web Push Notificatie ontvangen
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event ontvangen');
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Herinnering stage-uren';
  const options = {
    body: data.body || 'Hoi! Wil je de stage-uren van vandaag invullen?',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'stageconnectie-attendance-reminder',
    renotify: true,
    data: {
      url: data.url || '/student-portal.html'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Klikken op de notificatie opent het student-portaal
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificatie aangeklikt');
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/student-portal.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && client.url.includes('student-portal') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});