import React, { memo } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, ELEVATION } from '../../theme';

const FloatingActionButton = memo(({
  icon,
  label = null,
  onPress,
  disabled = false,
  position = 'bottomRight', // bottomRight | bottomLeft | bottomCenter
  style = null,
  accessibilityLabel,
}) => {
  const getPositionStyle = () => {
    switch (position) {
      case 'bottomLeft':
        return { bottom: SPACING.xl, left: SPACING.xl };
      case 'bottomCenter':
        return { bottom: SPACING.xl, alignSelf: 'center' };
      default:
        return { bottom: SPACING.xl, right: SPACING.xl };
    }
  };

  const isInteractive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      onPress={isInteractive ? onPress : null}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label || 'Floating Action Button'}
      style={({ pressed }) => [
        styles.fab,
        label ? styles.extendedFab : styles.circularFab,
        getPositionStyle(),
        ELEVATION.lg,
        disabled && styles.disabled,
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && <View style={label ? styles.iconWithLabel : null}>{icon}</View>}
        {label && (
          <Text style={styles.label} allowFontScaling={true} numberOfLines={1}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  circularFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  extendedFab: {
    height: 56,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithLabel: {
    marginRight: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.button,
    color: COLORS.textOnPrimary,
  },
  pressed: {
    backgroundColor: COLORS.primaryPressed,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

FloatingActionButton.displayName = 'FloatingActionButton';
export default FloatingActionButton;
