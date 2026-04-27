/**
 * Auth Service – Centralized Authentication
 * ─────────────────────────────────────────────
 * Handles login, signup, logout, and session management.
 */

import { Platform } from 'react-native';
import apiClient from './apiClient';
import { 
  storeAuthData, 
  getStoredToken, 
  getStoredRefreshToken, 
  getStoredSession, 
  clearAuthData 
} from './tokenService';
import { updateUserPresence } from './dataService';

// ── Validation helpers ──
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Sign up a new user via Backend.
 */
export const signupUser = async (name, email, password) => {
  try {
    const response = await apiClient.post('/api/auth/signup', { name, email, password });
    const { token, user, refreshToken } = response.data;
    
    await storeAuthData(token, refreshToken, user);

    // Sync Presence
    try {
      await updateUserPresence(user.id, true);
    } catch (e) {
      console.warn('[signupUser] Presence sync failed:', e);
    }

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

    await storeAuthData(token, refreshToken, user);

    // Sync Presence
    try {
      await updateUserPresence(user.id, true);
    } catch (e) {
      console.warn('[loginUser] Presence sync failed:', e);
    }

    return { success: true, user };
  } catch (error) {
    const message = error.response?.data?.error || 'Invalid email or password';
    throw new Error(message);
  }
};

/**
 * Decode JWT without atob (Native safe)
 */
const decodeJWT = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    let jsonPayload;
    if (Platform.OS === 'web') {
      jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } else {
      // On Native, we can use a simpler approach or just use the base64 string
      // For basic decoding in RN without extra libs:
      const buffer = require('buffer').Buffer;
      jsonPayload = buffer.from(base64, 'base64').toString('utf8');
    }
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('[decodeJWT] Error:', e.message);
    return null;
  }
};

/**
 * Check if a JWT token is expired.
 */
export const isTokenExpired = (token) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Get current session (auto-login).
 */
export const getSession = async () => {
  try {
    const token = await getStoredToken();
    const session = await getStoredSession();

    if (token) {
      if (isTokenExpired(token)) {
        console.warn('[getSession] Token expired, clearing data');
        await clearAuthData();
        return null;
      }

      // If we have a token but no session object, reconstruct from JWT
      if (!session) {
        const payload = decodeJWT(token);
        if (payload) {
          return {
            id: payload.id || payload.sub,
            name: payload.name || payload.email || 'User',
            email: payload.email,
            role: payload.role,
          };
        }
      }
    }

    return session;
  } catch (err) {
    console.warn('[getSession] Error:', err.message);
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
  
  try {
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      // Fire and forget
      apiClient.post('/api/auth/logout', { refreshToken }).catch(() => {});
    }
  } catch (e) {
    // Ignore
  }

  await clearAuthData();
};

/**
 * Google OAuth Login callback
 */
export const loginWithGoogle = async (accessToken, refreshToken, user) => {
  await storeAuthData(accessToken, refreshToken, user);
  return { success: true, user };
};

/**
 * Update user profile. (Dummy for now as it needs backend endpoint)
 */
export const updateProfile = async (id, data) => {
  // This would ideally call apiClient.put('/api/users/profile', data)
  return null;
};
