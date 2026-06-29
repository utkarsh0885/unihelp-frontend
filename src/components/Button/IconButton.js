import React, { memo } from 'react';
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SIZES } from '../../theme';

const IconButton = memo(({
  icon,
  onPress,
  disabled = false,
  loading = false,
  size = SIZES.layout.minTouchTarget,
  variant = 'ghost', // ghost | surface | primary
  style = null,
  accessibilityLabel,
}) => {
  const isInteractive = !disabled && !loading;

  const getVariantStyle = (pressed) => {
    if (disabled) return styles.disabled;
    if (variant === 'primary') {
      return [styles.primary, pressed && styles.primaryPressed];
    }
    if (variant === 'surface') {
      return [styles.surface, pressed && styles.surfacePressed];
    }
    return [styles.ghost, pressed && styles.ghostPressed];
  };

  return (
    <Pressable
      onPress={isInteractive ? onPress : null}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      accessibilityLabel={accessibilityLabel || 'Icon Button'}
      style={({ pressed }) => [
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        getVariantStyle(pressed),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? COLORS.textOnPrimary : COLORS.textPrimary} size="small" />
      ) : (
        icon
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: COLORS.secondaryLight,
  },
  surface: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  surfacePressed: {
    backgroundColor: COLORS.surfaceHover,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  primaryPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  disabled: {
    backgroundColor: COLORS.surfaceSubtle,
    opacity: 0.5,
  },
});

IconButton.displayName = 'IconButton';
export default IconButton;
