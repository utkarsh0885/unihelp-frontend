import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING, ELEVATION } from '../../theme';

const BottomActionBar = memo(({ children, style = null }) => {
  return (
    <View style={[styles.container, ELEVATION.lg, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    minHeight: 68,
  },
});

BottomActionBar.displayName = 'BottomActionBar';
export default BottomActionBar;
