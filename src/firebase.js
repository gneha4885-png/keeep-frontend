import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

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