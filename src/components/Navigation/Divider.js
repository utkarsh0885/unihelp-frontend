import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../theme';

const Divider = memo(({ spacing = 'md', orientation = 'horizontal', style = null }) => {
  const getMarginStyle = () => {
    switch (spacing) {
      case 'none': return null;
      case 'sm': return orientation === 'horizontal' ? { marginVertical: SPACING.xs } : { marginHorizontal: SPACING.xs };
      case 'lg': return orientation === 'horizontal' ? { marginVertical: SPACING.xl } : { marginHorizontal: SPACING.xl };
      default: return orientation === 'horizontal' ? { marginVertical: SPACING.md } : { marginHorizontal: SPACING.md };
    }
  };

  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        getMarginStyle(),
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
    backgroundColor: COLORS.borderSubtle,
  },
  vertical: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.borderSubtle,
  },
});

Divider.displayName = 'Divider';
export default Divider;
