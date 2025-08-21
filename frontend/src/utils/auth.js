/* eslint-disable no-unused-vars */
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'token';

/* ------------------ Token Storage ------------------ */
export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/* ------------------ Auth Checks ------------------ */
export const isLoggedIn = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 > Date.now(); // token not expired
  } catch {
    return false;
  }
};

export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;

  try {
    return jwtDecode(token); // { id, role, exp, ... }
  } catch {
    return null;
  }
};

export const getUserRole = () => {
  return getUserFromToken()?.role || null;
};

/* ------------------ Auth Actions ------------------ */
export const loginUser = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');

    saveToken(data.token);
    return { success: true, user: getUserFromToken() };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const signupUser = async ({ name, phone, email, password, role }) => {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password, role }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Signup failed');

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const logoutUser = (navigate) => {
  clearToken();
  if (navigate) {
    navigate('/login');
  } else {
    window.location.href = '/login'; // fallback
  }
};

/* ------------------ Helpers ------------------ */
export const getAuthHeader = () => {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};
