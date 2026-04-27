/**
 * Auth Service – Self-Contained Local Auth
 * ─────────────────────────────────────────────
 * Uses AsyncStorage to store users and sessions.
 * No backend server required.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  USERS: '@unihelp_users',
  SESSION: 'unihelp_secure_session', // Key for SecureStore (email/password session)
  TOKEN: 'unihelp_access_token',   // JWT access token (from backend, incl. Google OAuth)
};

import { updateUserPresence } from './dataService';

// ── Validation helpers ──
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

import apiClient from './apiClient';

/**
 * Sign up a new user via Backend.
 */
export const signupUser = async (name, email, password) => {
  try {
    const response = await apiClient.post('/api/auth/signup', { name, email, password });
    const { token, user, refreshToken } = response.data;
    
    // Store tokens and session
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('unihelp_access_token', token);
      if (refreshToken) localStorage.setItem('unihelp_refresh_token', refreshToken);
      localStorage.setItem('unihelp_secure_session', JSON.stringify(user));
    } else {
      await SecureStore.setItemAsync(KEYS.TOKEN, token);
      if (refreshToken) await SecureStore.setItemAsync('unihelp_refresh_token', refreshToken);
      await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(user));
    }

    // Sync Presence (if still needed locally)
    await updateUserPresence(user.id, true);

    return { success: true, user };
  } catch (error) {
    const message = error.response?.data?.error || 'Signup failed';
    throw new Error(message);
  }
};

/**
 * Log in an existing user via Backend.
 */
export const loginUser = async (email, password) => {
  try {
    const response = await apiClient.post('/api/auth/login', { email, password });
    const { token, user, refreshToken } = response.data;

    // Store tokens and session
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('unihelp_access_token', token);
      if (refreshToken) localStorage.setItem('unihelp_refresh_token', refreshToken);
      localStorage.setItem('unihelp_secure_session', JSON.stringify(user));
    } else {
      await SecureStore.setItemAsync(KEYS.TOKEN, token);
      if (refreshToken) await SecureStore.setItemAsync('unihelp_refresh_token', refreshToken);
      await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(user));
    }

    // Sync Presence
    await updateUserPresence(user.id, true);

    return { success: true, user };
  } catch (error) {
    const message = error.response?.data?.error || 'Invalid email or password';
    throw new Error(message);
  }
};

/**
 * Get current session (auto-login).
 * On web, expo-secure-store is unavailable so we fall back to localStorage.
 * The Google OAuth callback stores the token under "token"; email/password
 * login stores the user profile under "unihelp_secure_session". We check both.
 */
/**
 * Check if a JWT token is expired.
 * @param {string} token 
 * @returns {boolean}
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    
    if (!payload.exp) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (e) {
    return true; 
  }
};

/**
 * Get current session (auto-login).
 * On web, expo-secure-store is unavailable so we fall back to localStorage.
 * The Google OAuth callback stores the token under "token"; email/password
 * login stores the user profile under "unihelp_secure_session". We check both.
 */
export const getSession = async () => {
  console.log('[getSession] Checking for existing session...');
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web: Google OAuth path — a raw JWT is stored under "token"
      const token = localStorage.getItem('token') || localStorage.getItem('unihelp_access_token');
      console.log('[getSession] Web - token from localStorage:', token ? 'exists' : 'null');
      
      if (token) {
        // CHECK EXPIRY
        if (isTokenExpired(token)) {
          console.warn('[getSession] Web - Token expired, clearing session');
          localStorage.clear();
          return null;
        }

        // Decode the JWT payload robustly
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          console.log('[getSession] Web - decoded token payload:', payload ? 'success' : 'failed');
          if (payload) {
            return {
              id: payload.id || payload.sub || null,
              name: payload.name || payload.email || 'User',
              email: payload.email || null,
              role: payload.role || null,
            };
          }
        } catch (e) {
          console.warn('[getSession] Web - failed to decode token:', e.message);
          // Malformed JWT — fall through to legacy session
        }
      }
      // Email/password login path — full user object stored in session key
      const raw = localStorage.getItem('unihelp_secure_session');
      console.log('[getSession] Web - unihelp_secure_session from localStorage:', raw ? 'exists' : 'null');
      return raw ? JSON.parse(raw) : null;
    }
    
    console.log('[getSession] Native - checking SecureStore');
    const raw = await SecureStore.getItemAsync(KEYS.SESSION);
    const token = await SecureStore.getItemAsync(KEYS.TOKEN);

    if (token && isTokenExpired(token)) {
      console.warn('[getSession] Native - Token expired, clearing session');
      await SecureStore.deleteItemAsync(KEYS.SESSION);
      await SecureStore.deleteItemAsync(KEYS.TOKEN);
      return null;
    }

    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[getSession] Error getting session:', err.message);
    return null;
  }
};

/**
 * Log out – clear session and notify backend.
 */
export const logoutUser = async (userId) => {
  if (userId) {
    try {
      await updateUserPresence(userId, false);
    } catch (e) {
      console.warn('[logoutUser] Failed to update presence:', e);
    }
  }
  
  // Call backend to invalidate refresh token
  try {
    let refreshToken;
    if (typeof window !== 'undefined' && window.localStorage) {
      refreshToken = localStorage.getItem('unihelp_refresh_token');
    } else {
      refreshToken = await SecureStore.getItemAsync('unihelp_refresh_token');
    }
    
    if (refreshToken) {
      // Don't await strictly, we just want to fire and forget the logout to backend
      apiClient.post('/api/auth/logout', { refreshToken }).catch(console.warn);
    }
  } catch (e) {
    console.warn('[logoutUser] Error notifying backend:', e);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    console.log('[logoutUser] Clearing web localStorage...');
    console.log('Before:', { ...window.localStorage });

    localStorage.removeItem('token');
    localStorage.removeItem('unihelp_secure_session');
    localStorage.removeItem('unihelp_access_token');
    localStorage.removeItem('unihelp_refresh_token');
    localStorage.clear();

    console.log('After:', { ...window.localStorage });
  }

  try {
    await SecureStore.deleteItemAsync(KEYS.SESSION);
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
    await SecureStore.deleteItemAsync('unihelp_refresh_token');
  } catch (e) {
    console.warn('[logoutUser] SecureStore delete failed or not available:', e);
  }
};

/**
 * Update user profile.
 */
export const updateProfile = async (id, data) => {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    throw new Error('User not found.');
  }

  const updatedUser = { ...users[index], ...data };
  users[index] = updatedUser;
  await saveUsers(users);

  // Update session if it's the current user
  const session = await getSession();
  if (session && session.id === id) {
    const safeUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      specialisation: updatedUser.specialisation,
      avatar: updatedUser.avatar,
    };
    await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(safeUser));
    return safeUser;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Google OAuth helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * loginWithGoogle
 *
 * Called by GoogleAuthCallbackScreen after the backend redirects back with
 * the JWT tokens and user data as URL query parameters.
 *
 * Stores the user session in SecureStore (same slot as email/password login)
 * so the rest of the app (AuthContext.getSession) picks it up automatically.
 *
 * @param {string} accessToken  - Short-lived JWT from backend
 * @param {string} refreshToken - Long-lived JWT from backend
 * @param {object} user         - { id, email, name, role }
 */
export const loginWithGoogle = async (accessToken, refreshToken, user) => {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    // Web: persist to localStorage
    localStorage.setItem('unihelp_secure_session', JSON.stringify(safeUser));
    localStorage.setItem('unihelp_access_token', accessToken);
    if (refreshToken) localStorage.setItem('unihelp_refresh_token', refreshToken);
  } else {
    // Native: use SecureStore
    await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(safeUser));
    await SecureStore.setItemAsync(KEYS.TOKEN, accessToken);
  }

  return { success: true, user: safeUser };
};

/**
 * getStoredToken
 *
 * Returns the stored JWT access token, useful for attaching to API requests:
 *   headers: { Authorization: `Bearer ${await getStoredToken()}` }
 */
export const getStoredToken = async () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('unihelp_access_token') || localStorage.getItem('token');
    }
    return await SecureStore.getItemAsync(KEYS.TOKEN);
  } catch {
    return null;
  }
};

