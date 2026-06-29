/**
 * SignupScreen – Premium Design System
 * ─────────────────────────────────────
 * Clean, minimal onboarding experience.
 * Uses Design System tokens exclusively.
 * All auth logic, validation, and navigation preserved verbatim.
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { isValidEmail, isValidPassword } from '../services/authService';

// Design System
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS, LIGHT_COLORS } from '../theme';
import { getElevation } from '../theme/elevation';

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

// ── Password Strength Indicator ────────────────────────────────────────────────
const PasswordStrength = ({ password }) => {
  if (!password) return null;

  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = [C.danger, '#D97706', '#D97706', C.accent, C.accent];
  const idx = Math.min(strength, 4);

  return (
    <View style={strengthStyles.wrap}>
      <View style={strengthStyles.barRow}>
        {[0, 1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[
              strengthStyles.bar,
              { backgroundColor: i <= idx ? colors[idx] : C.borderSubtle },
            ]}
          />
        ))}
      </View>
      <Text style={[strengthStyles.label, { color: colors[idx] }]}>
        {labels[idx]}
      </Text>
    </View>
  );
};

const strengthStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  barRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 3,
    marginRight: SPACING.xs,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: 11,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();

  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors]                 = useState({});
  const [loading, setLoading]               = useState(false);
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRef    = useRef(null);
  const pwdRef      = useRef(null);
  const confirmRef  = useRef(null);

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

  const handleSignup = async () => {
    const errs = {};
    if (!name.trim())                  errs.name    = 'Full name is required.';
    if (!email.trim())                 errs.email   = 'Email is required.';
    else if (!isValidEmail(email))     errs.email   = 'Enter a valid email address.';
    if (!password)                     errs.password = 'Password is required.';
    else if (!isValidPassword(password)) errs.password = 'Minimum 6 characters.';

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
    } catch (err) {
      setErrors({ global: err.message || 'Signup failed. Please try again.' });
    } finally {
      setLoading(false);
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
                <Ionicons name="people" size={26} color={C.textOnPrimary} />
              </View>
            </Animated.View>

            {/* Heading */}
            <Text style={s.heading}>Create Account</Text>
            <Text style={s.sub}>Join the UniHelp community</Text>

            {/* Global error */}
            {errors.global && (
              <View style={s.globalError}>
                <Ionicons name="alert-circle" size={15} color={C.danger} style={{ marginRight: SPACING.xs }} />
                <Text style={s.globalErrorText}>{errors.global}</Text>
              </View>
            )}

            {/* Inputs */}
            <AuthInput
              label="Full Name"
              icon="person-outline"
              placeholder="Your name"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              value={name}
              onChangeText={t => { setName(t); clearError('name'); }}
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.name}
            />

            <AuthInput
              label="Email address"
              icon="mail-outline"
              placeholder="you@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              inputRef={emailRef}
              value={email}
              onChangeText={t => { setEmail(t); clearError('email'); }}
              onSubmitEditing={() => pwdRef.current?.focus()}
              error={errors.email}
            />

            <AuthInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              inputRef={pwdRef}
              returnKeyType="next"
              value={password}
              onChangeText={t => { setPassword(t); clearError('password'); }}
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={errors.password}
              rightElement={
                <Pressable
                  onPress={() => setShowPassword(v => !v)}
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textDisabled} />
                </Pressable>
              }
            />

            {/* Password Strength */}
            <PasswordStrength password={password} />

            <AuthInput
              label="Confirm Password"
              icon="shield-checkmark-outline"
              placeholder="••••••••"
              secureTextEntry={!showConfirmPassword}
              inputRef={confirmRef}
              returnKeyType="done"
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); clearError('confirmPassword'); }}
              onSubmitEditing={handleSignup}
              error={errors.confirmPassword}
              rightElement={
                <Pressable
                  onPress={() => setShowConfirmPassword(v => !v)}
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textDisabled} />
                </Pressable>
              }
            />

            {/* CTA */}
            <Pressable
              onPress={handleSignup}
              disabled={loading}
              style={({ pressed }) => [
                s.ctaBtn,
                loading && s.ctaBtnDisabled,
                pressed && !loading && s.ctaBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
            >
              {loading
                ? <ActivityIndicator color={C.textOnPrimary} size="small" />
                : <Text style={s.ctaBtnText}>Create Account</Text>
              }
            </Pressable>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerTxt}>Already have an account? </Text>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Text style={s.footerLink}>Log in</Text>
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

  eyeBtn: { padding: SPACING.xxs },

  ctaBtn: {
    backgroundColor: C.primary,
    height: SIZES.layout.minTouchTarget + 6,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
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

export default SignupScreen;
