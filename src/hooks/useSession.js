// useSession.js — put this in src/hooks/useSession.js
// Handles: session check, auto logout on expiry, token helpers

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useSession() {
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();

    // re-check every 60 seconds while app is open
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);

    function checkSession() {
      const token      = localStorage.getItem('token');
      const loginTime  = localStorage.getItem('login_time');

      // no token → go to login
      if (!token) {
        navigate('/');
        return;
      }

      // session expired → clear + go to login
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed > SESSION_DURATION_MS) {
          clearSession();
          navigate('/?session=expired');
        }
      }
    }
  }, [navigate]);

  return {
    token:   localStorage.getItem('token'),
    userId:  localStorage.getItem('user_id'),
    email:   localStorage.getItem('email'),
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
