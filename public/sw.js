self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Generic push handler (works if a push payload is sent)
self.addEventListener('push', (event) => {
  try {
    let data = {};
    if (event.data) {
      data = event.data.json();
    }
    const title = data.title || 'StitchWell Notification';
    const body = data.body || 'You have a new update';
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.url || '/',
      tag: data.tag || 'stitchwell'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // fallback
    event.waitUntil(self.registration.showNotification('StitchWell', { body: 'You have a new update' }));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

