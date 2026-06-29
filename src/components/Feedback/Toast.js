import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, ELEVATION } from '../../theme';

const Toast = memo(({
  message,
  type = 'info', // info | success | warning | danger
  onDismiss = null,
  style = null,
}) => {
  if (!message) return null;

  const getBorderColor = () => {
    switch (type) {
      case 'success': return COLORS.accent;
      case 'warning': return COLORS.warning;
      case 'danger': return COLORS.danger;
      default: return COLORS.info;
    }
  };

  return (
    <View
      style={[
        styles.toast,
        ELEVATION.md,
        { borderLeftColor: getBorderColor() },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Text style={styles.message} allowFontScaling={true}>
        {message}
      </Text>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.medium,
    borderLeftWidth: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
  },
  message: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    flex: 1,
  },
  dismissBtn: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  dismissText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});

Toast.displayName = 'Toast';
export default Toast;
