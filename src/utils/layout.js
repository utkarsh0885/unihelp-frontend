/**
 * Design System Layout & List Utilities
 * ─────────────────────────────────────
 * Standardized spacing rules and container sizing for lists, grids, and sections.
 */

import { SPACING } from '../theme/spacing';
import { getDeviceType } from './responsive';

export const LIST_SPACING = {
  cardGap: SPACING.md,
  sectionGap: SPACING.xl,
  listPaddingHorizontal: SPACING.md,
  listPaddingVertical: SPACING.lg,
  headerBottomMargin: SPACING.sm,
};

/**
 * Returns number of columns for a grid layout based on device viewport width.
 */
export const getGridColumns = () => {
  const device = getDeviceType();
  if (device === 'desktop') return 4;
  if (device === 'tablet') return 2;
  return 1;
};

/**
 * Standardized FlatList / SectionList contentContainerStyle props.
 */
export const getListContainerStyle = (extraBottomPadding = 80) => ({
  paddingHorizontal: LIST_SPACING.listPaddingHorizontal,
  paddingTop: LIST_SPACING.listPaddingVertical,
  paddingBottom: LIST_SPACING.listPaddingVertical + extraBottomPadding,
});

export default {
  LIST_SPACING,
  getGridColumns,
  getListContainerStyle,
};
