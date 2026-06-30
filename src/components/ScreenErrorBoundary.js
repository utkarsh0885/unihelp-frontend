/**
 * ScreenErrorBoundary – Per-Screen Crash Isolation
 * ─────────────────────────────────────────────────
 * Wraps individual screens so a crash in one doesn't
 * kill the entire app. Provides a retry button.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ScreenErrorContent = ({ error, onRetry }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceLight, borderColor: colors.warning + '40' }]}>
        <Ionicons name="warning-outline" size={36} color={colors.warning} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Something went wrong</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        This screen encountered an error. Your data is safe.
      </Text>
      <Text style={[styles.errorText, { color: colors.textMuted, backgroundColor: colors.surfaceSubtle }]} numberOfLines={3}>
        {error?.message || 'Unknown error'}
      </Text>
      <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry} activeOpacity={0.8}>
        <Ionicons name="refresh" size={16} color={colors.textOnPrimary} style={{ marginRight: 6 }} />
        <Text style={[styles.retryText, { color: colors.textOnPrimary }]}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ScreenErrorBoundary] Screen crashed:', error?.message, errorInfo?.componentStack?.split('\n')?.[1]);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ScreenErrorContent error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    minHeight: 300,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
    overflow: 'hidden',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ScreenErrorBoundary;
