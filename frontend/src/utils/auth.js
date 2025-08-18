/* eslint-disable no-unused-vars */
import {jwtDecode} from 'jwt-decode';

const TOKEN_KEY = 'token';

// Save token to localStorage
export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Remove token (logout)
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// Check if user is logged in
export const isLoggedIn = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 > Date.now(); // Not expired
  } catch (err) {
    return false;
  }
};

// Decode token to get user info (userId, role, etc.)
export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch (err) {
    return null;
  }
};

// Login: expects response from backend like { token, user }
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

// Logout user
// src/utils/auth.js (modified)

// ... (other functions are unchanged) ...

export const logoutUser = (navigate) => {
  clearToken();
  if (navigate) {
    navigate('/login');
  } else {
    // Fallback for non-React contexts or where navigate is not available
    window.location.href = '/login';
  }
};


export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};


export const getUserRole = () => {
  const user = getUserFromToken();
  return user?.role || null;
};


export const decodeToken = () => {
  const token = localStorage.getItem('token'); // your JWT from login
  if (!token) return null;

  try {
    return jwtDecode(token); // returns { id, role, exp, ... }
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};


// src/utils/auth.js

export const signupUser = async ({ name, phone, email, password, role }) => {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Signup failed');

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
