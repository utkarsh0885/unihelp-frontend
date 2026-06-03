import React, { useState, useEffect, useRef } from 'react';
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
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { isValidEmail, isValidPassword } from '../services/authService';

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
  input: {
    flex: 1,
    fontSize: 15,
    color: P.text,
    fontWeight: '500',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
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
                <Ionicons name="sparkles" size={28} color="#fff" />
              </LinearGradient>
            </Animated.View>

            {/* Heading */}
            <Text style={s.heading}>Create Account</Text>
            <Text style={s.sub}>Join the UNIHELP community</Text>

            {/* Global error */}
            {errors.global && (
              <View style={s.globalError}>
                <Ionicons name="alert-circle" size={15} color={P.error} style={{ marginRight: 7 }} />
                <Text style={s.globalErrorText}>{errors.global}</Text>
              </View>
            )}

            {/* Inputs */}
            <PremiumInput
              label="Full Name"
              icon="person-outline"
              placeholder="John Doe"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              value={name}
              onChangeText={t => { setName(t); clearError('name'); }}
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.name}
            />

            <PremiumInput
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

            <PremiumInput
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
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={P.textLight} />
                </TouchableOpacity>
              }
            />

            <PremiumInput
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
                <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={s.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={P.textLight} />
                </TouchableOpacity>
              }
            />

            {/* CTA */}
            <GradientButton
              label="Create Account"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
            />

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={s.footerLink}>Log in</Text>
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

  eyeBtn: { padding: 4 },

  // ── Footer ──
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footerTxt: { fontSize: 14, color: P.textLight, fontWeight: '500' },
  footerLink: { fontSize: 14, color: P.primary, fontWeight: '800' },
});

export default SignupScreen;
