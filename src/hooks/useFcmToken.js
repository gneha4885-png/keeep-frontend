/**
 * useFcmToken.js
 * Registers FCM service worker, gets token, saves to backend.
 */

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { VAPID_KEY } from '../firebase';
import { initializeApp, getApps } from 'firebase/app';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const firebaseConfig = {
  apiKey: "AIzaSyABu48ksUkcYYopIJbJ5lCkBOU5vMbnPjE",
  authDomain: "item-tracker-71e9c.firebaseapp.com",
  projectId: "item-tracker-71e9c",
  storageBucket: "item-tracker-71e9c.firebasestorage.app",
  messagingSenderId: "411199733918",
  appId: "1:411199733918:web:25869dc708f0bea2007b8f"
};

export default function useFcmToken() {
  useEffect(() => {
    const setup = async () => {
      try {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        if (!('serviceWorker' in navigator)) return;
        if (!('Notification' in window)) return;

        // Check if FCM is supported
        const supported = await isSupported();
        if (!supported) {
          console.warn('useFcmToken: FCM not supported in this browser');
          return;
        }

        // Get or reuse Firebase app instance
        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        const messagingInstance = getMessaging(app);

        // Register the FCM service worker
        const registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/' }
        );
        console.log('FCM SW registered:', registration.scope);

        // Request notification permission
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') {
          console.warn('useFcmToken: notification permission not granted');
          return;
        }

        // Get FCM token
        const token = await getToken(messagingInstance, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (!token) {
          console.warn('useFcmToken: no token received');
          return;
        }

        console.log('FCM token generated:', token.substring(0, 20) + '...');

        // Save token to backend
        const res = await fetch(`${API}/save-fcm-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, fcm_token: token }),
        });
        if (res.ok) {
          console.log('FCM token saved to backend ✅');
        }

        // Handle foreground messages
        onMessage(messagingInstance, (payload) => {
          console.log('FCM foreground message:', payload);
          const title = payload.notification?.title || 'Keeep Reminder';
          const body  = payload.notification?.body  || '';
          if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/logo192.png' });
          }
        });

      } catch (err) {
        console.warn('useFcmToken: setup failed', err);
      }
    };

    setup();
  }, []);
}