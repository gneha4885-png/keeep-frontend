// firebase-messaging-sw.js
// This file MUST be in the public/ folder (served from root) for FCM to work.
// It runs in the background, even when the app/tab is closed, and handles
// incoming push notifications.

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyABu48ksUkcYYopIJbJ5lCkBOU5vMbnPjE",
  authDomain: "item-tracker-71e9c.firebaseapp.com",
  projectId: "item-tracker-71e9c",
  storageBucket: "item-tracker-71e9c.firebasestorage.app",
  messagingSenderId: "411199733918",
  appId: "1:411199733918:web:25869dc708f0bea2007b8f"
});

const messaging = firebase.messaging();

// Handle background messages (app closed or tab not focused)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Keeep Reminder';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.tag || 'keeep-reminder',
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/log');
      }
    })
  );
});