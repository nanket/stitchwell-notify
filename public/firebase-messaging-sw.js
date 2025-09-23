/* eslint-disable no-undef */
// Unified PWA + FCM service worker
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const CACHE_NAME = 'stitchwell-cache-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/vite.svg'
  // Note: Vite emits hashed assets; runtime caching below will handle them.
];

// Read messagingSenderId from the registration URL query (?msid=...)
let senderId = '';
try {
  const url = new URL(self.location);
  senderId = url.searchParams.get('msid') || '';
} catch (e) {}

try { if (senderId) { firebase.initializeApp({ messagingSenderId: senderId }); } } catch (e) {}
let messaging; try { messaging = firebase.messaging(); } catch (e) {}

// Install/activate: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

// Runtime caching: stale-while-revalidate for same-origin GET
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, resClone));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Handle background messages from FCM
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'StitchWell';
    const body = payload.notification?.body || payload.data?.body || 'You have a new task update';
    const url = payload.data?.url || payload.fcmOptions?.link || '/';
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: url,
      tag: 'stitchwell',
      requireInteraction: false
    };
    self.registration.showNotification(title, options);
  });
}

// Fallback web push handler (in case a raw Push API payload is sent)
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.notification?.title || data.title || 'StitchWell';
    const body = data.notification?.body || data.body || 'You have a new task update';
    const url = (data.data && (data.data.url || data.data.link)) || data.url || (data.fcmOptions && data.fcmOptions.link) || '/';
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: url,
      tag: data.tag || 'stitchwell'
    };
    console.log('[FCM] Received push payload:', data);
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    event.waitUntil(self.registration.showNotification('StitchWell', { body: 'You have a new update' }));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) { if ('focus' in client) return client.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

