/**
 * useReminders.js
 * Loads pending reminders from Firestore and schedules browser notifications.
 * Uses localStorage for userId (matches your useSession auth pattern).
 */

import { useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// ── Schedule a single browser notification ────────────────────────────────
function scheduleOne(itemName, location, reminderISOUtc) {
  const fireAt = new Date(reminderISOUtc).getTime();
  const now = Date.now();
  const delayMs = fireAt - now;

  // Skip if more than 1 minute in the past
  if (delayMs < -60_000) return;

  setTimeout(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notif = new Notification('⏰ Keeep Reminder', {
      body: `"${itemName}" is in ${location}. Time to use it!`,
      icon: '/logo192.png',
      tag: `keeep-${itemName}-${fireAt}`,  // deduplication key
    });

    setTimeout(() => notif.close(), 10_000);
  }, Math.max(0, delayMs));
}

// ── Hook ──────────────────────────────────────────────────────────────────
export default function useReminders() {
  useEffect(() => {
    const userId = localStorage.getItem('user_id');

    // Only run if logged in and notifications are granted
    if (!userId) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const loadAndSchedule = async () => {
      try {
        const now = new Date().toISOString();

        const q = query(
          collection(db, 'items'),
          where('user_id', '==', userId)
        );

        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.reminder_time) return;
          if (data.reminder_time > now) {
            scheduleOne(
              data.item_name || 'Your item',
              data.location  || 'its location',
              data.reminder_time
            );
          }
        });
      } catch (err) {
        console.warn('useReminders: failed to load reminders', err);
      }
    };

    loadAndSchedule();
  }, []); // runs once on mount — user is already logged in by the time AppRoutes renders
}