/**
 * ScreenErrorBoundary – Per-Screen Crash Isolation
 * ─────────────────────────────────────────────────
 * Wraps individual screens so a crash in one doesn't
 * kill the entire app. Provides a retry button.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={36} color="#F59E0B" />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            This screen encountered an error. Your data is safe.
          </Text>
          <Text style={styles.errorText} numberOfLines={3}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#9CA3AF',
    textAlign: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
    overflow: 'hidden',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ScreenErrorBoundary;
