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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isValidEmail, isValidPassword } from '../services/authService';
import { SIZES, GRADIENTS } from '../constants/theme';
import ResponsiveContainer from '../components/ResponsiveContainer';

const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSignup = async () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required.';
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!isValidEmail(email)) newErrors.email = 'Please enter a valid email.';
    
    if (!password) newErrors.password = 'Password is required.';
    else if (!isValidPassword(password)) newErrors.password = 'Password must be at least 6 characters.';

    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err) {
      setErrors({ global: err.message || 'Signup failed. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, icon, value, setValue, errorKey, options = {}) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, errors[errorKey] && styles.inputError]}>
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={options.placeholder || ''}
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={value}
          onChangeText={(txt) => { setValue(txt); setErrors({...errors, [errorKey]: null, global: null}); }}
          secureTextEntry={options.secure && !(options.showState)}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'sentences'}
        />
        {options.secure && (
          <TouchableOpacity onPress={options.toggleShow} style={styles.eyeBtn}>
            <Ionicons name={options.showState ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>
      {errors[errorKey] && <Text style={styles.fieldError}>{errors[errorKey]}</Text>}
    </View>
  );

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

          <ResponsiveContainer maxWidth={480} withCardStyle={true}>
          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={32} color="#fff" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the UNIHELP community</Text>
          </Animated.View>

          {/* Error Block */}
          {errors.global && (
            <View style={styles.errorBlock}>
              <Ionicons name="alert-circle" size={16} color="#ff6b6b" style={{ marginRight: 8 }} />
              <Text style={styles.errorBlockText}>{errors.global}</Text>
            </View>
          )}

          {/* Fields */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {renderField('Full Name', 'person-outline', name, setName, 'name', { placeholder: 'John Doe' })}
            {renderField('Email', 'mail-outline', email, setEmail, 'email', { placeholder: 'you@university.edu', keyboardType: 'email-address', autoCapitalize: 'none' })}
            {renderField('Password', 'lock-closed-outline', password, setPassword, 'password', { placeholder: '••••••••', secure: true, showState: showPassword, toggleShow: () => setShowPassword(!showPassword) })}
            {renderField('Confirm Password', 'shield-checkmark-outline', confirmPassword, setConfirmPassword, 'confirmPassword', { placeholder: '••••••••', secure: true, showState: showConfirmPassword, toggleShow: () => setShowConfirmPassword(!showConfirmPassword) })}
          </Animated.View>

          {/* Create Account Button */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSignup}
              disabled={loading}
              style={{ borderRadius: SIZES.radiusMd, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.signUpText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </View>
          </ResponsiveContainer>
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
    paddingVertical: 50,
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 210, 255, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 60,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: SIZES.lg,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: SIZES.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 30,
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
    marginBottom: SIZES.xl,
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
    marginBottom: SIZES.md + 2,
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
    height: 54,
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
  signUpBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.sm,
  },
  signUpText: {
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
});

export default SignupScreen;
