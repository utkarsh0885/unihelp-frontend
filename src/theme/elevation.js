/**
 * Design System Elevation & Shadows
 * ─────────────────────────────────
 * Reusable shadow presets tailored for light and dark modes.
 */

export const getElevation = (isDark) => ({
  xs: {
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.5 : 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDark ? 0.6 : 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  xl: {
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: isDark ? 0.7 : 0.22,
    shadowRadius: 36,
    elevation: 20,
  },
});

export const ELEVATION = getElevation(true); // Default to dark aesthetic presets
export default ELEVATION;
