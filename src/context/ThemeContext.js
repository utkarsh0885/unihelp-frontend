/**
 * ThemeContext – Global Theme State
 * ─────────────────────────────────────────────
 * Provides light/dark mode toggle with
 * AsyncStorage persistence. Light mode is default.
 * Exposes `colors` and `shadows` for theme-aware
 * components.
 *
 * Uses: Context API, AsyncStorage
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { storeData, getData, STORAGE_KEYS } from '../services/storageService';
import { getColors, getShadows } from '../constants/theme';

// ── Create the context ──
const ThemeContext = createContext(null);

/**
 * ThemeProvider – wraps the app to provide theme state.
 */
export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false); // Default: light mode

  // ── Load persisted theme on mount ──
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await getData(STORAGE_KEYS.THEME);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    };
    loadTheme();
  }, []);

  // ── Toggle theme and persist ──
  const toggleTheme = useCallback(async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    await storeData(STORAGE_KEYS.THEME, newTheme ? 'dark' : 'light');
  }, [isDark]);

  // ── Compute colors and shadows from theme ──
  const colors = useMemo(() => getColors(isDark), [isDark]);
  const shadows = useMemo(() => getShadows(isDark), [isDark]);

  // ── Memoize value ──
  const value = useMemo(() => ({
    isDark,
    toggleTheme,
    colors,
    shadows,
  }), [isDark, toggleTheme, colors, shadows]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme hook – access theme from any component.
 * @returns {{ isDark, toggleTheme, colors, shadows }}
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
