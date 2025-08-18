// src/utils/useInactivityLogout.js (modified)
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { logoutUser } from './auth';

const INACTIVITY_TIMEOUT = 2.5 * 60 * 60 * 1000;

const useInactivityLogout = () => {
  const timerRef = useRef(null);
  const navigate = useNavigate(); // Get the navigate function from React Router

  const resetTimer = useCallback(() => {
    // ... (rest of the resetTimer logic is unchanged) ...

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[No Token] Logging out...');
      logoutUser(navigate); // Pass navigate to the logout function
      return;
    }

    // ... (token decoding and expiration check logic is unchanged) ...

    timerRef.current = setTimeout(() => {
      console.warn('[AFK Logout] User inactive. Logging out...');
      logoutUser(navigate); // Pass navigate to the logout function
    }, INACTIVITY_TIMEOUT);
  }, [navigate]); // Add navigate to the dependency array.

  useEffect(() => {
    // ... (event listeners logic is unchanged) ...

    const handleActivity = () => resetTimer();
    const activityEvents = [
      'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange',
    ];

    activityEvents.forEach(event =>
      window.addEventListener(event, handleActivity)
    );

    resetTimer();

    return () => {
      activityEvents.forEach(event =>
        window.removeEventListener(event, handleActivity)
      );
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetTimer]);

  return resetTimer;
};

export default useInactivityLogout;