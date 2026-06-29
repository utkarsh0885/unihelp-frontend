import React, { memo } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../theme';

const Chip = memo(({
  label,
  selected = false,
  onPress,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  style = null,
  textStyle = null,
  accessibilityLabel,
}) => {
  const isInteractive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      onPress={isInteractive ? onPress : null}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selectedChip : styles.unselectedChip,
        disabled && styles.disabledChip,
        pressed && isInteractive && styles.pressedChip,
        style,
      ]}
    >
      <View style={styles.content}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <Text
          style={[
            styles.text,
            selected ? styles.selectedText : styles.unselectedText,
            disabled && styles.disabledText,
            textStyle,
          ]}
          allowFontScaling={true}
          numberOfLines={1}
        >
          {label}
        </Text>
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  unselectedChip: {
    backgroundColor: COLORS.surfaceSubtle,
    borderColor: COLORS.border,
  },
  selectedChip: {
    backgroundColor: COLORS.primaryLight || COLORS.surfaceElevated,
    borderColor: COLORS.primary,
  },
  pressedChip: {
    opacity: 0.8,
  },
  disabledChip: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    ...TYPOGRAPHY.label,
  },
  unselectedText: {
    color: COLORS.textSecondary,
  },
  selectedText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  disabledText: {
    color: COLORS.textDisabled,
  },
  leftIcon: {
    marginRight: SPACING.xxs,
  },
  rightIcon: {
    marginLeft: SPACING.xxs,
  },
});

Chip.displayName = 'Chip';
export default Chip;
