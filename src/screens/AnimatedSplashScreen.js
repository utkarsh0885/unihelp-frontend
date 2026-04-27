/**
 * AnimatedSplashScreen – Gradient + Animated
 * ─────────────────────────────────────────────
 * Animated logo with spring scale, fade-in
 * tagline, and loading indicator on a
 * blue–purple gradient background.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, GRADIENTS } from '../constants/theme';

const AnimatedSplashScreen = () => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1, friction: 4, tension: 60, useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0, friction: 6, useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
      Animated.timing(loaderOpacity, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <Animated.View
        style={[
          styles.logoOuter,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <LinearGradient
          colors={GRADIENTS.primary}
          style={styles.logoInner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="school" size={48} color="#FFFFFF" />
        </LinearGradient>
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
        UNIHELP
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Your campus, connected
      </Animated.Text>

      <Animated.View style={[styles.loader, { opacity: loaderOpacity }]}>
        <ActivityIndicator size="small" color="#667eea" />
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    top: 60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 80,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(118, 75, 162, 0.08)',
  },
  logoOuter: {
    width: 120, height: 120, borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(102, 126, 234, 0.15)', alignItems: 'center',
    justifyContent: 'center', marginBottom: SIZES.lg,
  },
  logoInner: {
    width: 90, height: 90, borderRadius: SIZES.radiusFull,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 38, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3,
  },
  subtitle: {
    fontSize: SIZES.fontMd, color: 'rgba(255, 255, 255, 0.5)', marginTop: SIZES.sm,
  },
  loader: {
    marginTop: SIZES.xxl,
  },
});

export default AnimatedSplashScreen;
