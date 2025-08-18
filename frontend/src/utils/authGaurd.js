import { useEffect } from 'react';
import { getToken, getUserFromToken, logoutUser } from '../utils/auth';

export function useAuthGuard() {
  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = getUserFromToken();
      if (payload?.exp * 1000 < Date.now()) {
        logoutUser();
      }
    }
  }, []);
}
