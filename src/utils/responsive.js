/**
 * Design System Responsive Utilities
 * ──────────────────────────────────
 * Helper methods for viewport detection, font scaling, and breakpoint calculations
 * without duplicated dimensions polling across components.
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints definition
export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

/**
 * Returns current device layout classification.
 */
export const getDeviceType = () => {
  const { width } = Dimensions.get('window');
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

/**
 * Dynamically scales a numeric pixel value based on device screen density.
 * @param {number} size - Standard layout size in pt
 */
export const scaleSize = (size) => {
  const scale = SCREEN_WIDTH / 375; // Based on standard iPhone 11/12/13 width
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

/**
 * Returns accessible font sizing respecting dynamic scaling limits.
 * @param {number} size - Base font size
 * @param {number} maxScale - Maximum permitted multiplier (default 1.3)
 */
export const accessibleFont = (size, maxScale = 1.3) => {
  const fontScale = PixelRatio.getFontScale();
  const limitedScale = Math.min(fontScale, maxScale);
  return Math.round(size * limitedScale);
};

export const isWeb = Platform.OS === 'web';

export default {
  BREAKPOINTS,
  getDeviceType,
  scaleSize,
  accessibleFont,
  isWeb,
};
