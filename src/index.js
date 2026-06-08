import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.log('SW error:', err));
  });
}
// ── REMINDER CHECKER ─────────────────────────────────────
async function checkReminders() {
  const userId = localStorage.getItem('user_id');
  if (!userId) return;

  try {
    const res = await fetch(`https://keeep-backend.onrender.com/my-items?user_id=${userId}`);
    const data = await res.json();
    const items = data.items || [];
    const now = new Date();

    items.forEach(item => {
      if (!item.reminder_time || item.reminder_sent) return;

      const reminderTime = new Date(item.reminder_time);
      const diff = now - reminderTime;

      // fire if reminder time has passed within last 2 minutes
      if (diff >= 0 && diff <= 2 * 60 * 1000) {
        if (Notification.permission === 'granted') {
          new Notification(`🔔 Keeep Reminder!`, {
            body: `${item.item_name} is at: ${item.location}`,
            icon: '/logo192.png'
          });
        }
      }
    });
  } catch (_) {}
}

// Request notification permission
if ('Notification' in window) {
  Notification.requestPermission();
}

// Check reminders every minute
setInterval(checkReminders, 60 * 1000);