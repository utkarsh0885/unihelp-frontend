/**
 * SignupScreen – UniHelp 2.0 Auth Polish Pass
 * ─────────────────────────────────────────────
 * Pure UI Polish: Apple / Stripe cohesive inputs (Issue #1 fix) and laptop vertical fit (Issue #2 fix).
 * All auth logic, validation, Firebase, and navigation preserved verbatim.
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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isValidEmail, isValidPassword } from '../services/authService';

// ── Reusable Input (Issue #1 Polish: Single cohesive Apple/Stripe component) ──
const AuthInput = ({
  label,
  icon,
  error,
  inputRef,
  rightElement,
  isDark,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    props.onFocus?.();
  };

  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    props.onBlur?.();
  };

  const normalBorder = isDark ? '#374151' : '#E5E7EB';
  const focusBorder = '#1E6BFF';
  const errBorder = '#EF4444';

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? errBorder : normalBorder, error ? errBorder : focusBorder],
  });

  const bgColor = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const labelColor = isDark ? '#E5E7EB' : '#111827';
  const iconColor = focused ? '#1E6BFF' : (isDark ? '#6B7280' : '#9CA3AF');

  const webFocusStyle = Platform.OS === 'web' && focused
    ? { boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : '0 0 0 3px rgba(30, 107, 255, 0.2)' }
    : {};

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.inputLabel, { color: labelColor }]}>{label}</Text>
      <Animated.View
        style={[
          styles.inputBox,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth: focused ? 1.5 : 1,
          },
          webFocusStyle,
          error && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2' },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <TextInput
          ref={inputRef}
          style={[
            styles.inputField,
            { color: textColor },
            Platform.OS === 'web' ? { outlineStyle: 'none' } : {},
          ]}
          placeholderTextColor="#9CA3AF"
          onFocus={onFocus}
          onBlur={onBlur}
          allowFontScaling={true}
          {...props}
        />
        {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
      </Animated.View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

// ── Password Strength Indicator (Issue #2 Polish: Thinner & compact) ───────────
const PasswordStrength = ({ password, isDark }) => {
  if (!password) return null;

  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];
  const idx = Math.min(strength, 4);

  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthBars}>
        {[0, 1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              {
                backgroundColor: i <= idx ? colors[idx] : (isDark ? '#374151' : '#E5E7EB'),
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthText, { color: colors[idx] }]}>
        {labels[idx]}
      </Text>
    </View>
  );
};

// ── Reusable Primary Button ────────────────────────────────────────────────────
const PrimaryButton = ({ onPress, disabled, loading, title }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isHovered, setIsHovered] = useState(false);

  const handleHoverIn = () => {
    if (disabled || loading) return;
    setIsHovered(true);
    Animated.timing(scaleAnim, {
      toValue: 1.02,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = () => {
    if (disabled || loading) return;
    setIsHovered(false);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.timing(scaleAnim, {
      toValue: isHovered ? 1.02 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const webShadow = Platform.OS === 'web'
    ? { boxShadow: disabled || loading ? 'none' : (isHovered ? '0 10px 25px -5px rgba(30, 107, 255, 0.45)' : '0 4px 14px 0 rgba(30, 107, 255, 0.35)') }
    : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Animated.View
        style={[
          styles.primaryBtn,
          {
            backgroundColor: (disabled || loading) ? '#9CA3AF' : (isHovered ? '#0F5AE6' : '#1E6BFF'),
            transform: [{ scale: scaleAnim }],
          },
          webShadow,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

// ── Reusable Google Button ─────────────────────────────────────────────────────
const GoogleButton = ({ onPress, disabled, loading, title, isDark }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isHovered, setIsHovered] = useState(false);

  const handleHoverIn = () => {
    if (disabled || loading) return;
    setIsHovered(true);
    Animated.timing(scaleAnim, {
      toValue: 1.01,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = () => {
    if (disabled || loading) return;
    setIsHovered(false);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.timing(scaleAnim, {
      toValue: isHovered ? 1.01 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const bgColor = isDark ? (isHovered ? '#253347' : '#1E293B') : (isHovered ? '#F9FAFB' : '#FFFFFF');
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const textColor = isDark ? '#FFFFFF' : '#111827';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Animated.View
        style={[
          styles.googleBtn,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#1E6BFF" size="small" />
        ) : (
          <>
            <View style={styles.googleIconWrap}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
            </View>
            <Text style={[styles.googleLabel, { color: textColor }]}>{title}</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────
const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors]                 = useState({});
  const [loading, setLoading]               = useState(false);
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted]   = useState(true);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [googleError, setGoogleError]       = useState('');

  const emailRef    = useRef(null);
  const pwdRef      = useRef(null);
  const confirmRef  = useRef(null);

  // Entry animations
  const cardAnim  = useRef(new Animated.Value(25)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
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

  const handleGoogleSignup = async () => {
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

  const gradientColors = isDark ? ['#0B1220', '#070D18'] : ['#1E6BFF', '#0F56E8'];
  const cardBgColor = isDark ? '#111827' : '#FFFFFF';
  const cardBorderColor = isDark ? '#1F2937' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#111827';
  const textColorSub = isDark ? '#9CA3AF' : '#6B7280';
  const dividerColor = isDark ? '#374151' : '#E5E7EB';

  const webCardShadow = Platform.OS === 'web'
    ? { boxShadow: isDark
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
        : '0 25px 50px -12px rgba(15, 86, 232, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.4)' }
    : {};

  return (
    <View style={styles.root}>
      {/* Background Gradient */}
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Subtle Radial Ambient Lighting */}
      <View style={styles.ambientWrap} pointerEvents="none">
        <View
          style={[
            styles.ambientGlow,
            {
              backgroundColor: isDark ? '#1E6BFF' : '#FFFFFF',
              opacity: isDark ? 0.12 : 0.22,
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: cardBgColor,
                borderColor: cardBorderColor,
                opacity: fadeAnim,
                transform: [{ translateY: cardAnim }],
              },
              webCardShadow,
            ]}
          >
            {/* Absolute Theme Toggle inside card */}
            <Pressable
              testID="theme-toggle"
              onPress={toggleTheme}
              style={[
                styles.themeToggleBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F3F4F6' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Toggle color theme"
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={16}
                color={isDark ? '#FACC15' : '#4B5563'}
              />
            </Pressable>

            {/* Compact Logo */}
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
              <View style={styles.logo}>
                <Ionicons name="people" size={22} color="#FFFFFF" />
              </View>
            </Animated.View>

            {/* Compact Heading */}
            <Text style={[styles.heading, { color: textColorPrimary }]}>Create Account</Text>
            <Text style={[styles.sub, { color: textColorSub }]}>Join the UniHelp community</Text>

            {/* Global error */}
            {errors.global && (
              <View style={[styles.globalError, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.globalErrorText}>{errors.global}</Text>
              </View>
            )}

            {/* Compact Inputs */}
            <AuthInput
              label="Full Name"
              icon="person-outline"
              placeholder="Your full name"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              value={name}
              onChangeText={t => { setName(t); clearError('name'); }}
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.name}
              isDark={isDark}
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
              isDark={isDark}
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
              isDark={isDark}
              rightElement={
                <Pressable
                  onPress={() => setShowPassword(v => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                </Pressable>
              }
            />

            {/* Compact Password Strength */}
            <PasswordStrength password={password} isDark={isDark} />

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
              isDark={isDark}
              rightElement={
                <Pressable
                  onPress={() => setShowConfirmPassword(v => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                </Pressable>
              }
            />

            {/* Terms Checkbox */}
            <Pressable
              onPress={() => setTermsAccepted(!termsAccepted)}
              style={styles.termsRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: termsAccepted ? '#1E6BFF' : (isDark ? '#4B5563' : '#D1D5DB'),
                    backgroundColor: termsAccepted ? '#1E6BFF' : 'transparent',
                  },
                ]}
              >
                {termsAccepted ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : null}
              </View>
              <Text style={[styles.termsText, { color: textColorSub }]}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> & <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>

            {/* CTA Button */}
            <PrimaryButton
              title="Sign Up"
              onPress={handleSignup}
              disabled={loading || googleLoading}
              loading={loading}
            />

            {/* Compact Divider */}
            <View style={styles.divider}>
              <View style={[styles.divLine, { backgroundColor: dividerColor }]} />
              <Text style={[styles.divText, { color: textColorSub }]}>or continue with</Text>
              <View style={[styles.divLine, { backgroundColor: dividerColor }]} />
            </View>

            {/* Google error */}
            {googleError !== '' && (
              <View style={[styles.googleErr, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name="alert-circle-outline" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.googleErrText}>{googleError}</Text>
              </View>
            )}

            {/* Google button */}
            <GoogleButton
              title="Continue with Google"
              onPress={handleGoogleSignup}
              disabled={loading || googleLoading}
              loading={googleLoading}
              isDark={isDark}
            />

            {/* Compact Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerTxt, { color: textColorSub }]}>Already have an account? </Text>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Text style={styles.footerLink}>Log in</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ── Styles (Issue #1 & #2 Polish) ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1E6BFF',
  },
  ambientWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ambientGlow: {
    width: 600,
    height: 600,
    borderRadius: 300,
    top: -200,
    ...(Platform.OS === 'web' ? { filter: 'blur(80px)' } : {}),
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 22,
    borderWidth: 1,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 16,
  },
  themeToggleBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1E6BFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E6BFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  globalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 14,
  },
  globalErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  fieldWrap: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  iconContainer: {
    marginRight: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
  },
  rightContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtn: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
  strengthWrap: {
    marginTop: -4,
    marginBottom: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 3,
  },
  strengthBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  strengthText: {
    fontSize: 10,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  termsLink: {
    color: '#1E6BFF',
    fontWeight: '600',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  divLine: {
    flex: 1,
    height: 1,
  },
  divText: {
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 12,
  },
  googleErr: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 10,
  },
  googleErrText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    flex: 1,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  googleIconWrap: {
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  googleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  footerTxt: {
    fontSize: 13,
  },
  footerLink: {
    fontSize: 13,
    color: '#1E6BFF',
    fontWeight: '700',
  },
});

export default SignupScreen;
