/**
 * Design System Colors – Academic & Elegant Aesthetic
 * ───────────────────────────────────────────────────
 * Handcrafted palette inspired by premier modern product systems
 * (Apple Human Interface, Linear, Notion). Designed to feel prestigious,
 * clean, and highly readable in both light and dark modes.
 */

export const LIGHT_COLORS = {
  // Base Core
  primary: '#2563EB',         // Bright Premium Blue
  primaryHover: '#1D4ED8',
  primaryPressed: '#1E40AF',
  primaryLight: '#60A5FA',    // Primary Light
  primaryGlow: 'rgba(37, 99, 235, 0.15)',

  secondary: '#3B82F6',       // Accent Blue
  secondaryHover: '#2563EB',
  secondaryLight: 'rgba(59, 130, 246, 0.1)',

  accent: '#3B82F6',          // Accent
  accentHover: '#2563EB',
  accentLight: 'rgba(59, 130, 246, 0.12)',

  warning: '#F59E0B',         // Warning
  warningLight: 'rgba(245, 158, 11, 0.12)',

  danger: '#EF4444',          // Danger
  dangerHover: '#DC2626',
  dangerLight: 'rgba(239, 68, 68, 0.12)',

  success: '#10B981',         // Success
  successLight: 'rgba(16, 185, 129, 0.12)',

  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.12)',

  // Surfaces & Backgrounds
  background: '#F8FAFC',      // Background
  surface: '#FFFFFF',         // Cards
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceHover: '#EFF6FF',
  surfaceGlass: 'rgba(255, 255, 255, 0.9)',

  // Typography Hierarchy
  textPrimary: '#111827',     // Text
  textSecondary: '#6B7280',   // Secondary text
  textMuted: '#9CA3AF',
  textDisabled: '#D1D5DB',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // Borders & Dividers
  border: 'rgba(37, 99, 235, 0.12)',
  borderLight: 'rgba(107, 114, 128, 0.1)',
  borderSubtle: 'rgba(107, 114, 128, 0.06)',
  borderFocus: '#2563EB',

  // Overlays & Shadows
  overlay: 'rgba(17, 24, 39, 0.4)',
  shadow: '#2563EB',
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
