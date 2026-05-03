/**
 * LoginScreen — FAANG-grade redesign
 * ─────────────────────────────────────────────
 * • Animated mesh-gradient background (3 decorative blobs)
 * • Glass card with white surface + strong shadow
 * • Focus-ring inputs (border pulses on focus)
 * • Blue → Indigo gradient CTA with spring press feedback
 * • Clean Google button (white, bordered, centered icon)
 * • Inline validation with smooth error reveal
 * • Fully responsive (compact on phone, card-centered on tablet/web)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { isValidEmail, isValidPassword } from '../services/authService';
import { SIZES } from '../constants/theme';

const { width: SW } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// ── Palette ────────────────────────────────────────────────────────────────────
const P = {
  bg:          '#0A0F1E',   // near-black navy
  card:        '#FFFFFF',
  primary:     '#2563EB',
  primaryDark: '#1D4ED8',
  indigo:      '#4F46E5',
  surface:     '#F8FAFF',
  border:      '#E2E8F0',
  focusBorder: '#2563EB',
  text:        '#0F172A',
  textMid:     '#475569',
  textLight:   '#94A3B8',
  placeholder: '#94A3B8',
  error:       '#EF4444',
  errorBg:     '#FEF2F2',
  errorBorder: '#FECACA',
  white:       '#FFFFFF',
};

// ── Reusable animated input ────────────────────────────────────────────────────
const PremiumInput = ({ label, icon, error, inputRef, rightElement, ...props }) => {
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
    outputRange: [error ? P.errorBorder : P.border, error ? P.error : P.focusBorder],
  });

  return (
    <View style={iStyles.fieldWrap}>
      <Text style={iStyles.label}>{label}</Text>
      <Animated.View style={[iStyles.inputBox, { borderColor }, error && iStyles.inputBoxError]}>
        <Ionicons name={icon} size={18} color={focused ? P.primary : P.textLight} style={iStyles.icon} />
        <TextInput
          ref={inputRef}
          style={iStyles.input}
          placeholderTextColor={P.placeholder}
          onFocus={onFocus}
          onBlur={onBlur}
          {...props}
        />
        {rightElement}
      </Animated.View>
      {error ? (
        <View style={iStyles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={P.error} style={{ marginRight: 4 }} />
          <Text style={iStyles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const iStyles = StyleSheet.create({
  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: P.textMid, marginBottom: 7, letterSpacing: 0.1 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, height: 54,
  },
  inputBoxError: { backgroundColor: P.errorBg },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: P.text, fontWeight: '500' },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  errorText: { fontSize: 12, color: P.error, fontWeight: '500' },
});

// ── Animated button ────────────────────────────────────────────────────────────
const GradientButton = ({ onPress, disabled, loading, label }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], borderRadius: 14, overflow: 'hidden', marginTop: 4 }}>
      <Pressable
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        disabled={disabled}
        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      >
        <LinearGradient
          colors={disabled ? ['#94A3B8', '#94A3B8'] : [P.primary, P.indigo]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={bStyles.btn}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={bStyles.label}>{label}</Text>}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const bStyles = StyleSheet.create({
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Decorative blob ────────────────────────────────────────────────────────────
const Blob = ({ style, colors }) => (
  <LinearGradient colors={colors} style={[{ position: 'absolute', borderRadius: 999 }, style]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
);

// ── Main Screen ────────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();

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
  const cardAnim  = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardAnim,  { toValue: 0, friction: 7,   useNativeDriver: true }),
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
      const redirectUri = 'exp://10.12.24.23:8081/--/auth/callback';
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
      {/* ── Animated background blobs ── */}
      <Blob colors={['#1E3A8A', '#2563EB']} style={{ width: 340, height: 340, top: -100, right: -80, opacity: 0.9 }} />
      <Blob colors={['#4F46E5', '#7C3AED']} style={{ width: 260, height: 260, bottom: -60, left: -80, opacity: 0.7 }} />
      <Blob colors={['#0369A1', '#0EA5E9']} style={{ width: 180, height: 180, top: '40%', right: -60, opacity: 0.5 }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Card ── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: cardAnim }] }]}>

            {/* Logo */}
            <Animated.View style={[s.logoWrap, { transform: [{ scale: logoScale }] }]}>
              <LinearGradient colors={[P.primary, P.indigo]} style={s.logo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="school" size={28} color="#fff" />
              </LinearGradient>
            </Animated.View>

            {/* Heading */}
            <Text style={s.heading}>Welcome back</Text>
            <Text style={s.sub}>Sign in to your UniHelp account</Text>

            {/* Global error */}
            {errors.global && (
              <View style={s.globalError}>
                <Ionicons name="alert-circle" size={15} color={P.error} style={{ marginRight: 7 }} />
                <Text style={s.globalErrorText}>{errors.global}</Text>
              </View>
            )}

            {/* Inputs */}
            <PremiumInput
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

            <PremiumInput
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
                <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={P.textLight} />
                </TouchableOpacity>
              }
            />

            {/* Remember + Forgot */}
            <View style={s.optRow}>
              <TouchableOpacity style={s.checkRow} onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, rememberMe && s.checkboxOn]}>
                  {rememberMe && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={s.checkLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={s.forgot}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* CTA */}
            <GradientButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || googleLoading}
            />

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or continue with</Text>
              <View style={s.divLine} />
            </View>

            {/* Google error */}
            {googleError !== '' && (
              <View style={s.googleErr}>
                <Ionicons name="alert-circle-outline" size={13} color={P.error} style={{ marginRight: 5 }} />
                <Text style={s.googleErrText}>{googleError}</Text>
              </View>
            )}

            {/* Google button */}
            <TouchableOpacity
              style={[s.googleBtn, (loading || googleLoading) && { opacity: 0.55 }]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading
                ? <ActivityIndicator color={P.primary} size="small" />
                : (
                  <>
                    <View style={s.googleIconWrap}>
                      {/* Coloured G built from Ionicons */}
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                    </View>
                    <Text style={s.googleLabel}>Continue with Google</Text>
                  </>
                )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerTxt}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')} activeOpacity={0.7}>
                <Text style={s.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_MAX = 440;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },

  // ── Card ──
  card: {
    width: '100%',
    maxWidth: CARD_MAX,
    backgroundColor: P.card,
    borderRadius: 28,
    padding: 32,
    // Shadow (iOS + Android)
    shadowColor: '#0A0F1E',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 16,
    // Subtle top border for glass feel
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // ── Logo ──
  logoWrap: { alignSelf: 'center', marginBottom: 24 },
  logo: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },

  // ── Headings ──
  heading: {
    fontSize: 26, fontWeight: '800', color: P.text,
    textAlign: 'center', letterSpacing: -0.5, marginBottom: 6,
  },
  sub: {
    fontSize: 14, color: P.textMid, textAlign: 'center',
    fontWeight: '500', marginBottom: 28,
  },

  // ── Global error ──
  globalError: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.errorBg,
    borderRadius: 12, padding: 13,
    borderWidth: 1, borderColor: P.errorBorder,
    marginBottom: 20,
  },
  globalErrorText: { flex: 1, color: P.error, fontSize: 13, fontWeight: '500' },

  // ── Remember / Forgot ──
  optRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 22,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18, height: 18, borderRadius: 5,
    borderWidth: 1.5, borderColor: P.border,
    marginRight: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: P.surface,
  },
  checkboxOn: { backgroundColor: P.primary, borderColor: P.primary },
  checkLabel: { fontSize: 13, color: P.textMid, fontWeight: '500' },
  forgot: { fontSize: 13, color: P.primary, fontWeight: '700' },
  eyeBtn: { padding: 4 },

  // ── Divider ──
  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 24,
  },
  divLine: { flex: 1, height: 1, backgroundColor: P.border },
  divText: {
    color: P.textLight, fontSize: 12, fontWeight: '600',
    marginHorizontal: 14, letterSpacing: 0.4,
  },

  // ── Google error ──
  googleErr: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.errorBg,
    padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: P.errorBorder,
    marginBottom: 10,
  },
  googleErrText: { color: P.error, fontSize: 12, fontWeight: '500', flex: 1 },

  // ── Google button ──
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, borderRadius: 14,
    backgroundColor: P.white,
    borderWidth: 1.5, borderColor: P.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  googleIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FFF7F6',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  googleLabel: { fontSize: 15, fontWeight: '700', color: P.text, letterSpacing: 0.1 },

  // ── Footer ──
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footerTxt: { fontSize: 14, color: P.textLight, fontWeight: '500' },
  footerLink: { fontSize: 14, color: P.primary, fontWeight: '800' },
});

export default LoginScreen;
