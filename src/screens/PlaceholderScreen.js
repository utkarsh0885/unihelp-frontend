/**
 * PlaceholderScreen – "Coming Soon" Placeholder
 * ─────────────────────────────────────────────
 * Reusable screen shown for features that are
 * under development. Displays an animated icon,
 * title, and description.
 *
 * Usage:
 *   <PlaceholderScreen title="AI Assistant" icon="sparkles" />
 *   Or via route.params in navigation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const PlaceholderScreen = ({ navigation, route }) => {
  const { colors, shadows } = useTheme();
  const title = route?.params?.title || 'Coming Soon';
  const icon = route?.params?.icon || 'construct-outline';
  const description = route?.params?.description || 'This feature is under development and will be available in the next update.';

  // ── Animations ──
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous gentle pulse on the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.surface }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.center}>
        {/* Animated icon */}
        <Animated.View
          style={[
            styles.iconOuter,
            {
              backgroundColor: colors.primaryGlow,
              opacity: iconOpacity,
              transform: [{ scale: Animated.multiply(iconScale, pulseAnim) }],
            },
          ]}
        >
          <View
            style={[
              styles.iconInner,
              { backgroundColor: colors.primary, ...shadows.glow },
            ]}
          >
            <Ionicons name={icon} size={40} color={colors.textOnPrimary} />
          </View>
        </Animated.View>

        {/* Title and description */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center',
          }}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>

          <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              Coming Soon
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SIZES.md,
    marginTop: SIZES.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.xl,
    marginTop: -SIZES.xxxl,
  },
  iconOuter: {
    width: 110,
    height: 110,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xl,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.fontXl,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: SIZES.fontMd,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.lg,
    maxWidth: 280,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: 6,
  },
  badgeText: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
  },
});

export default PlaceholderScreen;
