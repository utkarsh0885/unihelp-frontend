import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  TOKEN: 'unihelp_access_token',
  REFRESH_TOKEN: 'unihelp_refresh_token',
  SESSION: 'unihelp_secure_session',
};

/**
 * Store tokens and session safely
 */
export const storeAuthData = async (accessToken, refreshToken, user) => {
  if (Platform.OS === 'web') {
    if (accessToken) localStorage.setItem(KEYS.TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
    if (user) localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
  } else {
    if (accessToken) await SecureStore.setItemAsync(KEYS.TOKEN, accessToken);
    if (refreshToken) await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
    if (user) await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(user));
  }
};

/**
 * Retrieve the access token
 */
export const getStoredToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(KEYS.TOKEN) || localStorage.getItem('token');
  }
  return await SecureStore.getItemAsync(KEYS.TOKEN);
};

/**
 * Retrieve the refresh token
 */
export const getStoredRefreshToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(KEYS.REFRESH_TOKEN);
  }
  return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
};

/**
 * Retrieve the session/user object
 */
export const getStoredSession = async () => {
  if (Platform.OS === 'web') {
    const raw = localStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  }
  const raw = await SecureStore.getItemAsync(KEYS.SESSION);
  return raw ? JSON.parse(raw) : null;
};

/**
 * Clear all auth data
 */
export const clearAuthData = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.SESSION);
    localStorage.removeItem('token');
    localStorage.clear();
  }
  
  try {
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.SESSION);
  } catch (e) {
    // Ignore if not available
  }
};
