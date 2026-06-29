/**
 * useDesignSystem Hook
 * ────────────────────
 * Unified React hook providing easy access to design system tokens,
 * responsive viewports, and accessibility font helpers.
 */

import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import theme, { getColors, getElevation } from '../../theme';
import responsive from '../responsive';
import layout from '../layout';

export const useDesignSystem = () => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark' || true; // UniHelp defaults to dark aesthetic

  const activeTheme = useMemo(() => ({
    ...theme,
    colors: getColors(isDark),
    elevation: getElevation(isDark),
    isDark,
    responsive,
    layout,
  }), [isDark]);

  return activeTheme;
};

export default useDesignSystem;
