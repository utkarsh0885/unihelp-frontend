/**
 * Design System Typography – Precision Sizing & Weights
 * ─────────────────────────────────────────────────────
 * Curated scale defining font size, weight, line height, and letter spacing
 * for optimal readability and vertical rhythm.
 */

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};

export const TYPOGRAPHY = {
  display: {
    fontSize: 36,
    fontWeight: FONT_WEIGHTS.heavy,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 30,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 22,
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
};

export default TYPOGRAPHY;
