import React, { memo } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../../theme';

const PrimaryButton = memo(({
  title,
  onPress,
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  style = null,
  textStyle = null,
  accessibilityLabel,
}) => {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      onPress={isInteractive ? onPress : null}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabledButton,
        pressed && isInteractive && styles.pressedButton,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.textOnPrimary} size="small" />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            style={[styles.text, disabled && styles.disabledText, textStyle]}
            allowFontScaling={true}
            numberOfLines={1}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    minHeight: SIZES.layout.minTouchTarget,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pressedButton: {
    backgroundColor: COLORS.primaryPressed,
    opacity: 0.95,
  },
  disabledButton: {
    backgroundColor: COLORS.surfaceSubtle,
    borderColor: COLORS.borderSubtle,
    borderWidth: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...TYPOGRAPHY.button,
    color: COLORS.textOnPrimary,
  },
  disabledText: {
    color: COLORS.textDisabled,
  },
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
});

PrimaryButton.displayName = 'PrimaryButton';
export default PrimaryButton;
