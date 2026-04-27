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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isValidEmail, isValidPassword } from '../services/authService';
import { SIZES, GRADIENTS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false); // Separate loading for Google btn
  const [googleError, setGoogleError] = useState('');        // Google-specific error message

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!isValidEmail(email)) newErrors.email = 'Please enter a valid email.';

    if (!password) newErrors.password = 'Password is required.';
    else if (!isValidPassword(password)) newErrors.password = 'Password must be at least 6 characters.';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrors({ global: err.message || 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleGoogleLogin
   *
   * Production flow:
   *   1. Build the Expo deep-link redirect URI: unihelp://auth/callback
   *      This is the URL the backend will redirect to after OAuth succeeds.
   *   2. Open the Render backend URL in an in-app browser:
   *      https://unihelp-backend-a5f3.onrender.com/auth/google?redirectUri=<encodedExpoUri>
   *   3. Passport handles Google consent → backend mints JWT
   *   4. Backend redirects to: unihelp://auth/callback?access=TOKEN&refresh=TOKEN&user=JSON
   *   5. Expo intercepts the unihelp:// scheme → GoogleAuthCallbackScreen parses tokens
   */
  const handleGoogleLogin = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      // Explicitly define the Expo deep link with /--/ to ensure Expo Go intercepts it properly
      const redirectUri = 'exp://10.12.24.23:8081/--/auth/callback';

      // Build the backend OAuth initiation URL, passing the redirect URI
      // so the backend knows where to send the token redirect.
      const backendUrl = `https://unihelp-backend-a5f3.onrender.com/auth/google?redirectUri=${encodeURIComponent(redirectUri)}`;

      // Open the in-app browser.
      const result = await WebBrowser.openAuthSessionAsync(
        backendUrl,
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        // iOS: WebBrowser.openAuthSessionAsync returns the redirect URL directly.
        // Android: the Linking event fires in GoogleAuthCallbackScreen instead.
        // We navigate to GoogleAuthCallbackScreen with the resolved URL so both
        // platforms share the same token-parsing logic.
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
      console.error('[LoginScreen] Google OAuth error:', err.message);
      setGoogleError('Could not connect to Google sign-in. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1E3A8A', '#2563EB']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="school" size={32} color="#fff" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to UNIHELP</Text>
          </Animated.View>

          {/* Error Block */}
          {errors.global && (
            <View style={styles.errorBlock}>
              <Ionicons name="alert-circle" size={16} color="#ff6b6b" style={{ marginRight: 8 }} />
              <Text style={styles.errorBlockText}>{errors.global}</Text>
            </View>
          )}

          {/* Email Field */}
          <Animated.View style={[styles.fieldWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(txt) => { setEmail(txt); setErrors({ ...errors, email: null, global: null }); }}
              />
            </View>
            {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
          </Animated.View>

          {/* Password Field */}
          <Animated.View style={[styles.fieldWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(txt) => { setPassword(txt); setErrors({ ...errors, password: null, global: null }); }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
          </Animated.View>

          {/* Remember + Forgot */}
          <Animated.View style={[styles.optionsRow, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign In Button */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading || googleLoading}
              style={{ borderRadius: SIZES.radiusMd, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.signInBtn, loading && { opacity: 0.7 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.signInText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* ── OR Divider ───────────────────────────────────────── */}
          <Animated.View style={[styles.dividerRow, { opacity: fadeAnim }]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* ── Google Error ─────────────────────────────────────── */}
          {googleError !== '' && (
            <View style={styles.googleErrorBlock}>
              <Ionicons name="alert-circle-outline" size={15} color="#ff6b6b" style={{ marginRight: 6 }} />
              <Text style={styles.googleErrorText}>{googleError}</Text>
            </View>
          )}

          {/* ── Continue with Google Button ─────────────────────────── */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
              style={[
                styles.googleBtn,
                (loading || googleLoading) && { opacity: 0.6 },
              ]}
            >
              {googleLoading ? (
                // Loading spinner while browser is opening
                <ActivityIndicator color="#4A90D9" size="small" />
              ) : (
                <>
                  {/* Google 'G' icon */}
                  <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.googleIcon} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 40,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: SIZES.xl,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: SIZES.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: SIZES.xl + SIZES.sm,
    fontWeight: '500',
  },
  errorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    marginBottom: SIZES.lg,
  },
  errorBlockText: {
    color: '#ff6b6b',
    fontSize: SIZES.fontSm,
    fontWeight: '500',
    flex: 1,
  },
  fieldWrap: {
    marginBottom: SIZES.lg,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: SIZES.sm,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SIZES.md,
    height: 56,
  },
  inputError: {
    borderColor: 'rgba(255, 107, 107, 0.5)',
  },
  inputIcon: {
    marginRight: SIZES.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: '#FFFFFF',
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fieldError: {
    color: '#ff6b6b',
    fontSize: SIZES.fontXs,
    marginTop: SIZES.xs + 2,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginRight: SIZES.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: SIZES.fontSm,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  forgotText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: SIZES.fontSm,
  },
  signInBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.xl,
  },
  footerText: {
    fontSize: SIZES.fontSm,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  footerLink: {
    color: '#3B82F6',
    fontWeight: '800',
    fontSize: SIZES.fontSm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── OR Divider ───────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: SIZES.fontXs,
    fontWeight: '700',
    letterSpacing: 2,
    marginHorizontal: SIZES.md,
  },

  // ── Google Button ────────────────────────────────────────────
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',       // White card matches Google's brand guidelines
    borderRadius: SIZES.radiusMd,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: '#1a1a2e',                  // Dark text on white background
    letterSpacing: 0.2,
  },

  // ── Google Error ──────────────────────────────────────────────
  googleErrorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: SIZES.sm + 2,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    marginBottom: SIZES.sm,
  },
  googleErrorText: {
    color: '#ff6b6b',
    fontSize: SIZES.fontXs,
    fontWeight: '500',
    flex: 1,
  },
});

export default LoginScreen;
