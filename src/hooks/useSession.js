import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle

export function useSession() {
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);

    function checkSession() {
      const token     = localStorage.getItem('token');
      const loginTime = localStorage.getItem('login_time');

      if (!token) { navigate('/'); return; }

      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed > SESSION_DURATION_MS) {
          clearSession();
          navigate('/?session=expired');
        }
      }
    }
  }, [navigate]);

  // ── IDLE TIMEOUT ──────────────────────────────────────────
  useEffect(() => {
    let idleTimer;

    function resetTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        clearSession();
        navigate('/?session=idle');
      }, IDLE_TIMEOUT_MS);
    }

    // reset timer on any user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    resetTimer(); // start timer immediately

    return () => {
      clearTimeout(idleTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [navigate]);

  return {
    token:  localStorage.getItem('token'),
    userId: localStorage.getItem('user_id'),
    email:  localStorage.getItem('email'),
    logout,
  };
}

export function logout(navigate) {
  clearSession();
  navigate('/');
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('email');
  localStorage.removeItem('login_time');
}

export function getAuthHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}