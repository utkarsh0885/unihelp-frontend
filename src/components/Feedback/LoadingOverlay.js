import React, { memo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../theme';

const LoadingOverlay = memo(({ visible = false, message = 'Processing...' }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay} accessibilityRole="progressbar" accessibilityLabel={message}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        {message && (
          <Text style={styles.message} allowFontScaling={true}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  box: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xl,
    borderRadius: RADIUS.large,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  message: {
    ...TYPOGRAPHY.label,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
});

LoadingOverlay.displayName = 'LoadingOverlay';
export default LoadingOverlay;
