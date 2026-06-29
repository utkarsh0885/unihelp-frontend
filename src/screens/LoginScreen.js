/**
 * LoginScreen – Premium Design System
 * ─────────────────────────────────────
 * Clean, minimal, and professional authentication.
 * Uses Design System tokens exclusively.
 * All auth logic, validation, and navigation preserved verbatim.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isValidEmail, isValidPassword } from '../services/authService';

// Design System
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS, LIGHT_COLORS, DARK_COLORS } from '../theme';
import { getElevation } from '../theme/elevation';

// Auth screens always use light theme for brand consistency
const C = LIGHT_COLORS;
const elevation = getElevation(false);

// ── Reusable Input ─────────────────────────────────────────────────────────────
const AuthInput = ({ label, icon, error, inputRef, rightElement, ...props }) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    props.onFocus?.();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    props.onBlur?.();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? C.danger : C.border : C.border, error ? C.danger : C.borderFocus],
  });

  return (
    <View style={inputStyles.fieldWrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <Animated.View style={[
        inputStyles.inputBox,
        { borderColor },
        error && inputStyles.inputBoxError,
      ]}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? C.primary : C.textDisabled}
          style={inputStyles.icon}
        />
        <TextInput
          ref={inputRef}
          style={inputStyles.input}
          placeholderTextColor={C.textDisabled}
          onFocus={onFocus}
          onBlur={onBlur}
          allowFontScaling={true}
          {...props}
        />
        {rightElement}
      </Animated.View>
      {error ? (
        <View style={inputStyles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={C.danger} style={{ marginRight: 4 }} />
          <Text style={inputStyles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const inputStyles = StyleSheet.create({
  fieldWrap: { marginBottom: SPACING.md },
  label: {
    ...TYPOGRAPHY.label,
    color: C.textSecondary,
    marginBottom: SPACING.xxs + 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceSubtle,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    minHeight: SIZES.layout.minTouchTarget + 6,
  },
  inputBoxError: {
    backgroundColor: C.dangerLight,
  },
  icon: { marginRight: SPACING.xs },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: C.textPrimary,
    fontWeight: FONT_WEIGHTS.regular,
    paddingVertical: SPACING.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xxs,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: C.danger,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError]     = useState('');

  const pwdRef = useRef(null);

  // Entry animations
  const cardAnim  = useRef(new Animated.Value(30)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(cardAnim,  { toValue: 0, friction: 8,   useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const clearError = (field) => setErrors(e => ({ ...e, [field]: null, global: null }));

  const handleLogin = async () => {
    const errs = {};
    if (!email.trim())         errs.email    = 'Email is required.';
    else if (!isValidEmail(email)) errs.email = 'Enter a valid email address.';
    if (!password)             errs.password = 'Password is required.';
    else if (!isValidPassword(password)) errs.password = 'Minimum 6 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setErrors({ global: err.message || 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      const redirectUri = Platform.OS === 'web'
        ? (window.location.hostname === 'localhost'
            ? 'http://localhost:8081/auth/callback'
            : 'https://unihelp-frontend-iota.vercel.app/auth/callback')
        : Linking.createURL('auth/callback');
      const backendUrl  = `https://unihelp-backend-a5f3.onrender.com/auth/google?redirectUri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(backendUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const { access, refresh, user: userStr } = parsed.queryParams || {};
        if (access && refresh && userStr) {
          navigation.navigate('GoogleAuthCallback', { resolvedUrl: result.url });
        } else {
          setGoogleError('Sign-in failed. Invalid response from server.');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setGoogleError('Google sign-in was cancelled.');
      }
    } catch (err) {
      setGoogleError('Could not connect to Google sign-in. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: cardAnim }] }]}>

            {/* Logo */}
            <Animated.View style={[s.logoWrap, { transform: [{ scale: logoScale }] }]}>
              <View style={s.logo}>
                <Ionicons name="school" size={26} color={C.textOnPrimary} />
              </View>
            </Animated.View>

            {/* Heading */}
            <Text style={s.heading}>Welcome back</Text>
            <Text style={s.sub}>Sign in to your UniHelp account</Text>

            {/* Global error */}
            {errors.global && (
              <View style={s.globalError}>
                <Ionicons name="alert-circle" size={15} color={C.danger} style={{ marginRight: SPACING.xs }} />
                <Text style={s.globalErrorText}>{errors.global}</Text>
              </View>
            )}

            {/* Inputs */}
            <AuthInput
              label="Email address"
              icon="mail-outline"
              placeholder="you@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              value={email}
              onChangeText={t => { setEmail(t); clearError('email'); }}
              onSubmitEditing={() => pwdRef.current?.focus()}
              error={errors.email}
            />

            <AuthInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry={!showPwd}
              inputRef={pwdRef}
              returnKeyType="done"
              value={password}
              onChangeText={t => { setPassword(t); clearError('password'); }}
              onSubmitEditing={handleLogin}
              error={errors.password}
              rightElement={
                <Pressable
                  onPress={() => setShowPwd(v => !v)}
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textDisabled} />
                </Pressable>
              }
            />

            {/* Forgot password */}
            <View style={s.optRow}>
              <View />
              <Pressable
                onPress={() => showToast('Forgot password feature is coming soon!', 'info')}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Text style={s.forgot}>Forgot password?</Text>
              </Pressable>
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleLogin}
              disabled={loading || googleLoading}
              style={({ pressed }) => [
                s.ctaBtn,
                (loading || googleLoading) && s.ctaBtnDisabled,
                pressed && !loading && s.ctaBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {loading
                ? <ActivityIndicator color={C.textOnPrimary} size="small" />
                : <Text style={s.ctaBtnText}>Sign In</Text>
              }
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or continue with</Text>
              <View style={s.divLine} />
            </View>

            {/* Google error */}
            {googleError !== '' && (
              <View style={s.googleErr}>
                <Ionicons name="alert-circle-outline" size={13} color={C.danger} style={{ marginRight: SPACING.xxs }} />
                <Text style={s.googleErrText}>{googleError}</Text>
              </View>
            )}

            {/* Google button */}
            <Pressable
              style={({ pressed }) => [
                s.googleBtn,
                (loading || googleLoading) && { opacity: 0.55 },
                pressed && !googleLoading && s.googleBtnPressed,
              ]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              {googleLoading
                ? <ActivityIndicator color={C.primary} size="small" />
                : (
                  <>
                    <View style={s.googleIconWrap}>
                      <Ionicons name="logo-google" size={18} color="#EA4335" />
                    </View>
                    <Text style={s.googleLabel}>Continue with Google</Text>
                  </>
                )}
            </Pressable>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerTxt}>Don't have an account? </Text>
              <Pressable
                onPress={() => navigation.navigate('Signup')}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Text style={s.footerLink}>Sign up</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_MAX = 420;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },

  // ── Card ──
  card: {
    width: '100%',
    maxWidth: CARD_MAX,
    backgroundColor: C.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl + SPACING.xs,
    borderWidth: 1,
    borderColor: C.border,
    ...elevation.md,
  },

  // ── Logo ──
  logoWrap: { alignSelf: 'center', marginBottom: SPACING.xl },
  logo: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.large,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },

  // ── Headings ──
  heading: {
    ...TYPOGRAPHY.h1,
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xxs,
  },
  sub: {
    ...TYPOGRAPHY.bodySmall,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  // ── Global error ──
  globalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerLight,
    borderRadius: RADIUS.medium,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: C.danger + '30',
    marginBottom: SPACING.md,
  },
  globalErrorText: {
    flex: 1,
    ...TYPOGRAPHY.caption,
    color: C.danger,
    fontWeight: FONT_WEIGHTS.medium,
  },

  // ── Options row ──
  optRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  forgot: {
    ...TYPOGRAPHY.label,
    color: C.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  eyeBtn: { padding: SPACING.xxs },

  // ── CTA Button ──
  ctaBtn: {
    backgroundColor: C.primary,
    height: SIZES.layout.minTouchTarget + 6,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  ctaBtnPressed: {
    backgroundColor: C.primaryPressed,
  },
  ctaBtnDisabled: {
    backgroundColor: C.textDisabled,
  },
  ctaBtnText: {
    ...TYPOGRAPHY.button,
    color: C.textOnPrimary,
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  divText: {
    ...TYPOGRAPHY.caption,
    color: C.textDisabled,
    fontWeight: FONT_WEIGHTS.medium,
    marginHorizontal: SPACING.md,
  },

  // ── Google error ──
  googleErr: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: C.danger + '25',
    marginBottom: SPACING.sm,
  },
  googleErrText: {
    ...TYPOGRAPHY.caption,
    color: C.danger,
    fontWeight: FONT_WEIGHTS.medium,
    flex: 1,
  },

  // ── Google button ──
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: SIZES.layout.minTouchTarget + 6,
    borderRadius: RADIUS.medium,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    ...elevation.xs,
  },
  googleBtnPressed: {
    backgroundColor: C.surfaceSubtle,
  },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  googleLabel: {
    ...TYPOGRAPHY.body,
    color: C.textPrimary,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerTxt: {
    ...TYPOGRAPHY.bodySmall,
    color: C.textMuted,
  },
  footerLink: {
    ...TYPOGRAPHY.bodySmall,
    color: C.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

export default LoginScreen;
