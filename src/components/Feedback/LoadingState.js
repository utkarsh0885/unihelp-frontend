import React, { memo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const LoadingState = memo(({
  message = 'Loading...',
  size = 'large',
  color = COLORS.primary,
  style = null,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} accessibilityLabel={message} />
      {message && (
        <Text style={styles.message} allowFontScaling={true}>
          {message}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  message: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
});

LoadingState.displayName = 'LoadingState';
export default LoadingState;
