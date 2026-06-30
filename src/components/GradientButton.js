/**
 * GradientButton – True LinearGradient CTA
 * ─────────────────────────────────────────────
 * Full-width primary CTA with actual gradient
 * background, glow shadow, and loading spinner.
 */

import React, { memo, useMemo, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const GradientButton = ({ title, onPress, loading = false, disabled = false, style, gradientColors }) => {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (loading || disabled) return;
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const onPressOut = () => {
    if (loading || disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={loading || disabled}
        activeOpacity={1}
        style={[styles.wrapper, style]}
      >
        <LinearGradient
          colors={disabled ? [colors.textDisabled || '#9CA3AF', colors.textDisabled || '#9CA3AF'] : [colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.inner, (loading || disabled) && { opacity: 0.6 }]}
          pointerEvents="none"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.label}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  wrapper: {
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
    ...shadows.glow,
  },
  inner: {
    paddingVertical: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default memo(GradientButton);
