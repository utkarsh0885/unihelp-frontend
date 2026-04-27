/**
 * Theme Constants – Blue/Purple Gradient System
 * ─────────────────────────────────────────────
 * Modern gradient-based design system with
 * glassmorphism, curated palettes, and
 * consistent spacing/radius tokens.
 */

// ── Dark Mode Palette (Primary – blue/purple gradient aesthetic) ──
// ── Dark Mode Palette (Obsidian Aesthetic) ──
export const DARK_COLORS = {
  background: '#0D0D0D', 
  backgroundAlt: '#1A1A1A',
  surface: '#1A1A1A',
  surfaceElevated: '#2A2A2A',
  surfaceGlass: 'rgba(13, 13, 13, 0.85)',
  surfaceLight: 'rgba(79, 157, 255, 0.1)',

  // Primary palette (Obsidian Accent: #4F9DFF)
  primary: '#4F9DFF', 
  primaryDark: '#2563EB',
  primaryLight: 'rgba(79, 157, 255, 0.25)',
  primaryGlow: 'rgba(79, 157, 255, 0.4)',

  secondary: '#38BDF8',
  secondaryLight: 'rgba(56, 189, 248, 0.2)',

  accent: '#4F9DFF', // Main accent
  accentGreen: '#34D399',
  accentAmber: '#FBBF24',
  accentCyan: '#22D3EE',
  accentPurple: '#C084FC',

  textPrimary: '#FFFFFF', 
  textSecondary: '#A1A1AA', // Slate 400
  textTertiary: '#71717A', // Slate 500
  textOnPrimary: '#0D0D0D',

  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  gradientStart: '#4F9DFF',
  gradientEnd: '#2563EB',
  gradientAlt: ['#0D0D0D', '#1A1A1A', '#0D0D0D'],

  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',

  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.8)',
  tabBar: 'rgba(13, 13, 13, 0.98)',
  inputBg: '#1A1A1A',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
};

// ── Light Mode Palette (Clean High-Contrast) ──
export const LIGHT_COLORS = {
  background: '#F5F5F5', 
  backgroundAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  surfaceGlass: 'rgba(255, 255, 255, 0.85)',
  surfaceLight: 'rgba(30, 58, 138, 0.05)', 

  primary: '#1E3A8A', 
  primaryDark: '#0B1C45',
  primaryLight: 'rgba(30, 58, 138, 0.1)',
  primaryGlow: 'rgba(37, 99, 235, 0.15)',

  secondary: '#2563EB',
  secondaryLight: 'rgba(37, 99, 235, 0.1)',

  accent: '#D72638', 
  accentGreen: '#10B981',
  accentAmber: '#F59E0B',
  accentCyan: '#06B6D4',
  accentPurple: '#A61E2C',

  textPrimary: '#111111', 
  textSecondary: '#555555',
  textTertiary: '#888888',
  textOnPrimary: '#FFFFFF',

  border: 'rgba(17, 24, 39, 0.15)',
  borderLight: 'rgba(17, 24, 39, 0.08)',

  gradientStart: '#1E3A8A',
  gradientEnd: '#2563EB',
  gradientAlt: ['#1E3A8A', '#2563EB', '#1E3A8A'],

  success: '#10B981',
  error: '#D72638',
  warning: '#F59E0B',
  info: '#06B6D4',

  shadow: '#111827',
  overlay: 'rgba(0, 0, 0, 0.4)',
  tabBar: 'rgba(255, 255, 255, 0.98)',
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(30, 58, 138, 0.2)',
};

/**
 * Get the active color palette.
 * @param {boolean} isDark
 * @returns {object} color tokens
 */
export const getColors = (isDark) => isDark ? DARK_COLORS : LIGHT_COLORS;

// Default export
export const COLORS = DARK_COLORS;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SIZES = {
  // ── Spacing scale ──
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  // ── Typography ──
  fontXs: 12,
  fontSm: 14,
  fontMd: 16,
  fontLg: 20,
  fontXl: 24,
  fontXxl: 32,
  fontHero: 36,

  // ── Radii ──
  radiusSm: 8,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 24,
  radiusFull: 9999,

  // ── Avatars ──
  avatarSm: 36,
  avatarMd: 44,
  avatarLg: 72,
};

/**
 * Get shadows for the current theme.
 */
export const getShadows = (isDark) => ({
  small: {
    shadowColor: isDark ? '#000000' : '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: isDark ? '#000000' : '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  large: {
    shadowColor: isDark ? '#000000' : '#1E3A8A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: isDark ? 0.5 : 0.15,
    shadowRadius: 40,
    elevation: 16,
  },
});

export const SHADOWS = getShadows(true);

// ── Gradient presets ──
export const GRADIENTS = {
  primary: ['#1E3A8A', '#2563EB'], // Bennett Blues
  header: ['#1E3A8A', '#2563EB'],
  card: ['rgba(30, 58, 138, 0.15)', 'rgba(37, 99, 235, 0.15)'],
  dark: ['#111827', '#1F2937', '#111827'],
  accent: ['#D72638', '#A61E2C'], // Bennett Reds
  success: ['#10B981', '#059669'],
  cyan: ['#06B6D4', '#1E3A8A'],
};
