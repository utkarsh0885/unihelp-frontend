/**
 * AnimatedSplashScreen – Premium Design System
 * ─────────────────────────────────────────────
 * Clean, minimal, authoritative splash screen.
 * Uses Design System tokens exclusively.
 * All entry animations preserved verbatim.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS, LIGHT_COLORS } from '../theme';
import { getElevation } from '../theme/elevation';

const C = LIGHT_COLORS;
const elevation = getElevation(true);

const AnimatedSplashScreen = () => {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(16)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1, friction: 6, tension: 70, useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1, duration: 450, useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0, friction: 8, useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1, duration: 350, useNativeDriver: true,
      }),
      Animated.timing(loaderOpacity, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoOuter,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoInner}>
          <Ionicons name="school" size={44} color={C.textOnPrimary} />
        </View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        UniHelp
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Your campus, connected
      </Animated.Text>

      <Animated.View style={[styles.loader, { opacity: loaderOpacity }]}>
        <ActivityIndicator size="small" color={C.textOnPrimary} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary, // Deep Navy Blue (#0F172A)
  },
  logoOuter: {
    width: 104,
    height: 104,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...elevation.sm,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 34,
    color: C.textOnPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: SPACING.xxs,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
});

export default AnimatedSplashScreen;
