import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyABu48ksUkcYYopIJbJ5lCkBOU5vMbnPjE",
  authDomain: "item-tracker-71e9c.firebaseapp.com",
  projectId: "item-tracker-71e9c",
  storageBucket: "item-tracker-71e9c.firebasestorage.app",
  messagingSenderId: "411199733918",
  appId: "1:411199733918:web:25869dc708f0bea2007b8f"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
export const auth    = getAuth(app);

// ── Messaging (FCM) — only initialize if supported (not all browsers/contexts support it) ──
export let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {
  messaging = null;
});

export const VAPID_KEY = "BFQf_-OiWiySqrV1r4HyM5x8UcYg1M6oOh5QKDbFJRShZ_K_dJm2hB_zaTzEiR3bHHP4n3MfZMSW__FBQyHn-Sc";