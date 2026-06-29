/**
 * Design System Colors – Academic & Elegant Aesthetic
 * ───────────────────────────────────────────────────
 * Handcrafted palette inspired by premier modern product systems
 * (Apple Human Interface, Linear, Notion). Designed to feel prestigious,
 * clean, and highly readable in both light and dark modes.
 */

export const LIGHT_COLORS = {
  // Base Core
  primary: '#0F172A',         // Deep Navy Blue
  primaryHover: '#1E293B',
  primaryPressed: '#334155',
  primaryLight: 'rgba(15, 23, 42, 0.06)',

  secondary: '#475569',       // Slate Blue
  secondaryHover: '#334155',
  secondaryLight: 'rgba(71, 85, 105, 0.08)',

  accent: '#059669',          // Emerald Green
  accentHover: '#047857',
  accentLight: 'rgba(5, 150, 105, 0.1)',

  warning: '#D97706',         // Amber
  warningLight: 'rgba(217, 119, 6, 0.1)',

  danger: '#DC2626',          // Muted Red
  dangerHover: '#B91C1C',
  dangerLight: 'rgba(220, 38, 38, 0.08)',

  info: '#0284C7',            // Sky Blue
  infoLight: 'rgba(2, 132, 199, 0.1)',

  // Surfaces & Backgrounds
  background: '#F8FAFC',      // Warm White
  surface: '#FFFFFF',         // Pure White Card
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',   // Layered neutral surface
  surfaceHover: '#E2E8F0',
  surfaceGlass: 'rgba(255, 255, 255, 0.85)',

  // Typography Hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // Borders & Dividers
  border: 'rgba(15, 23, 42, 0.12)',
  borderSubtle: 'rgba(15, 23, 42, 0.06)',
  borderFocus: '#0F172A',

  // Overlays & Shadows
  overlay: 'rgba(15, 23, 42, 0.4)',
  shadow: '#0F172A',
  shimmerHighlight: '#F8FAFC',
};

export const DARK_COLORS = {
  // Base Core
  primary: '#38BDF8',         // Sky / Bright Slate Blue Accent for Dark
  primaryHover: '#0284C7',
  primaryPressed: '#0369A1',
  primaryLight: 'rgba(56, 189, 248, 0.15)',

  secondary: '#94A3B8',       // Slate 400
  secondaryHover: '#CBD5E1',
  secondaryLight: 'rgba(148, 163, 184, 0.12)',

  accent: '#10B981',          // Emerald Green
  accentHover: '#059669',
  accentLight: 'rgba(16, 185, 129, 0.15)',

  warning: '#F59E0B',         // Amber
  warningLight: 'rgba(245, 158, 11, 0.15)',

  danger: '#EF4444',          // Muted Red
  dangerHover: '#DC2626',
  dangerLight: 'rgba(239, 68, 68, 0.15)',

  info: '#38BDF8',            // Cyan
  infoLight: 'rgba(56, 189, 248, 0.15)',

  // Surfaces & Backgrounds
  background: '#0B0F19',      // Rich Graphite
  surface: '#111827',         // Layered Dark Neutral
  surfaceElevated: '#1E293B', // Elevated Card Surface
  surfaceSubtle: '#172033',   // Subtle secondary card surface
  surfaceHover: '#26334D',
  surfaceGlass: 'rgba(17, 24, 39, 0.85)',

  // Typography Hierarchy
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  textOnPrimary: '#0B0F19',
  textOnAccent: '#0B0F19',

  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderFocus: '#38BDF8',

  // Overlays & Shadows
  overlay: 'rgba(0, 0, 0, 0.75)',
  shadow: '#000000',
  shimmerHighlight: '#1E293B',
};

/**
 * Returns the active palette according to the color scheme.
 * @param {boolean} isDark 
 */
export const getColors = (isDark) => (isDark ? DARK_COLORS : LIGHT_COLORS);
export default DARK_COLORS; // Default export matches app-wide dark aesthetic preference
