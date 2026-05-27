/**
 * RetryBanner – Inline retry prompt
 * ─────────────────────────────────────────────
 * A reusable "something went wrong" banner
 * with a retry button. Sits inline in the feed
 * instead of replacing the whole screen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const RetryBanner = ({
  message = 'Something went wrong',
  subtitle = 'Tap retry to try again',
  onRetry,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceLight, borderColor: colors.borderLight }, style]}>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.warning || '#F59E0B'} />
      <View style={styles.textContainer}>
        <Text style={[styles.message, { color: colors.textPrimary }]}>{message}</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color="#FFF" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  retryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default RetryBanner;
