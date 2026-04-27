/**
 * Storage Service – AsyncStorage Wrapper
 * ─────────────────────────────────────────────
 * Provides simple get / set / remove helpers
 * around @react-native-async-storage for non-
 * sensitive data (theme pref, cached feed, etc.)
 *
 * Uses: @react-native-async-storage/async-storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Keys (centralise to avoid typos) ──
export const STORAGE_KEYS = {
  THEME: '@unihelp_theme',
  ONBOARDED: '@unihelp_onboarded',
  CACHED_FEED: '@unihelp_cached_feed',
  USER_PREFERENCES: '@unihelp_prefs',
};

/**
 * Store a value (string or JSON-serialisable).
 * @param {string} key
 * @param {*} value
 */
export const storeData = async (key, value) => {
  try {
    const json = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, json);
  } catch (e) {
    console.warn('[StorageService] storeData error:', e);
  }
};

/**
 * Retrieve a value by key.
 * Returns parsed JSON if possible, otherwise the raw string.
 * @param {string} key
 * @returns {Promise<*|null>}
 */
export const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;
    try { return JSON.parse(value); } catch { return value; }
  } catch (e) {
    console.warn('[StorageService] getData error:', e);
    return null;
  }
};

/**
 * Remove a single key.
 * @param {string} key
 */
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('[StorageService] removeData error:', e);
  }
};

/**
 * Clear all app storage.
 * Use with caution – wipes everything.
 */
export const clearAll = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.warn('[StorageService] clearAll error:', e);
  }
};
