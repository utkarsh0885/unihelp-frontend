/**
 * UniHelp Design System Theme
 * ───────────────────────────
 * Central exported architecture uniting color palettes, spacing, typography,
 * radius, elevation, opacity, animations, and component dimensions.
 */

import { getColors, DARK_COLORS, LIGHT_COLORS } from './colors';
import SPACING from './spacing';
import TYPOGRAPHY, { FONT_WEIGHTS } from './typography';
import RADIUS from './radius';
import { getElevation, ELEVATION } from './elevation';
import OPACITY from './opacity';
import ANIMATIONS from './animations';
import SIZES from './sizes';

export {
  getColors,
  DARK_COLORS as COLORS,
  DARK_COLORS,
  LIGHT_COLORS,
  SPACING,
  TYPOGRAPHY,
  FONT_WEIGHTS,
  RADIUS,
  getElevation,
  ELEVATION,
  OPACITY,
  ANIMATIONS,
  SIZES,
};

const defaultTheme = {
  colors: DARK_COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  fontWeights: FONT_WEIGHTS,
  radius: RADIUS,
  elevation: ELEVATION,
  opacity: OPACITY,
  animations: ANIMATIONS,
  sizes: SIZES,
};

export default defaultTheme;
