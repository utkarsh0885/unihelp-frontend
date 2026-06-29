import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, ELEVATION } from '../../theme';

const Card = memo(({
  children,
  onPress,
  elevation = 'sm', // xs | sm | md | lg | xl | none
  padding = 'md', // sm | md | lg | none
  style = null,
  disabled = false,
  accessibilityLabel,
}) => {
  const isInteractive = Boolean(onPress) && !disabled;

  const getPaddingStyle = () => {
    switch (padding) {
      case 'sm': return styles.paddingSm;
      case 'lg': return styles.paddingLg;
      case 'none': return null;
      default: return styles.paddingMd;
    }
  };

  const getElevationStyle = () => {
    if (elevation === 'none') return null;
    return ELEVATION[elevation] || ELEVATION.sm;
  };

  if (isInteractive) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.card,
          getPaddingStyle(),
          getElevationStyle(),
          pressed && styles.pressedCard,
          disabled && styles.disabledCard,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        getPaddingStyle(),
        getElevationStyle(),
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressedCard: {
    backgroundColor: COLORS.surfaceHover,
    opacity: 0.98,
  },
  disabledCard: {
    opacity: 0.6,
  },
  paddingSm: {
    padding: SPACING.sm,
  },
  paddingMd: {
    padding: SPACING.md,
  },
  paddingLg: {
    padding: SPACING.lg,
  },
});

Card.displayName = 'Card';
export default Card;
