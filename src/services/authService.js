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
  TOKEN:   'unihelp_access_token',   // JWT access token (from backend, incl. Google OAuth)
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

// ── Internal helpers ──
const getUsers = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveUsers = async (users) => {
  await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

// Simple hash for demo (NOT production crypto - fine for a portfolio app)
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
};

/**
 * Sign up a new user.
 */
export const signupUser = async (name, email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  const users = await getUsers();

  // Check if email already exists
  const exists = users.find((u) => u.email === normalizedEmail);
  if (exists) {
    throw new Error('An account with this email already exists.');
  }

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  // Create session
  const safeUser = { id: newUser.id, name: newUser.name, email: newUser.email };
  await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(safeUser));

  // Sync Presence
  await updateUserPresence(newUser.id, true);

  return { success: true, user: safeUser };
};

/**
 * Log in an existing user.
 */
export const loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  const users = await getUsers();

  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  if (user.passwordHash !== simpleHash(password)) {
    throw new Error('Invalid email or password.');
  }

  // Create session
  const safeUser = { id: user.id, name: user.name, email: user.email };
  await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(safeUser));

  // Sync Presence
  await updateUserPresence(user.id, true);

  return { success: true, user: safeUser };
};

/**
 * Get current session (auto-login).
 */
export const getSession = async () => {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Log out – clear session.
 */
export const logoutUser = async (userId) => {
  if (userId) {
    await updateUserPresence(userId, false);
  }
  await SecureStore.deleteItemAsync(KEYS.SESSION);
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
  // Store the user profile in the same session key so AuthContext.getSession()
  // restores it on next app launch — no changes needed in AuthContext.
  const safeUser = {
    id:    user.id,
    name:  user.name,
    email: user.email,
    role:  user.role,
  };
  await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(safeUser));

  // Also store the raw JWT so API calls can attach it as a Bearer token.
  await SecureStore.setItemAsync(KEYS.TOKEN, accessToken);

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
    return await SecureStore.getItemAsync(KEYS.TOKEN);
  } catch {
    return null;
  }
};

