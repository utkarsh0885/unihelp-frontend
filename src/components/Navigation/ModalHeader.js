import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SIZES } from '../../theme';

const ModalHeader = memo(({
  title,
  onClose,
  leftAction = null,
  rightAction = null,
  style = null,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {leftAction || (
          onClose && (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          )
        )}
      </View>

      <Text style={styles.title} allowFontScaling={true} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>{rightAction}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: SIZES.layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceElevated,
  },
  left: {
    width: 60,
    alignItems: 'flex-start',
  },
  right: {
    width: 60,
    alignItems: 'flex-end',
  },
  title: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
  },
  pressed: {
    opacity: 0.7,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
});

ModalHeader.displayName = 'ModalHeader';
export default ModalHeader;
