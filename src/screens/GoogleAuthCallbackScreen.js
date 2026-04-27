/**
 * GoogleAuthCallbackScreen.js
 *
 * Handles the final step of Google OAuth for BOTH platforms:
 *
 * iOS path (WebBrowser returns URL directly):
 *   LoginScreen navigates here with { resolvedUrl: 'unihelp://auth/callback?...' }
 *   We parse the params and complete login immediately.
 *
 * Android path (Linking event fires while app is open):
 *   The OS fires a Linking 'url' event when unihelp://auth/callback?... is opened.
 *   Our listener catches it and processes the tokens.
 *
 * Both paths call googleLogin(access, refresh, user) → AuthContext updates →
 * AppNavigator switches to Main automatically.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';

const GoogleAuthCallbackScreen = ({ navigation, route }) => {
  const { googleLogin } = useAuth();
  const [status, setStatus] = useState('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    // ── WEB path ──────────────────────────────────────────────────────────────
    // On Expo Web the browser lands on /auth/callback?access=...
    // Use a minimal, direct approach: read token → store → hard redirect.
    // Avoid async AuthContext calls here — they can fail silently on web.
    if (Platform.OS === 'web') {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access');

        console.log('[GoogleCallback][web] access token present:', !!accessToken);

        if (!accessToken) {
          throw new Error('No token found in URL');
        }

        // Store token in localStorage for app-wide access
        localStorage.setItem('token', accessToken);
        console.log('[GoogleCallback][web] Token stored. Redirecting to home...');

        // Hard redirect — bypasses any React Navigation state issues
        window.location.href = '/';
      } catch (err) {
        console.error('[GoogleCallback][web] Callback error:', err.message);
        window.location.href = '/login';
      }

      return () => { mounted = false; };
    }

    // ── NATIVE path (iOS / Android) ───────────────────────────────────────────
    // ── Timeout: show error if no URL arrives within 12 seconds ──────────────
    const timeout = setTimeout(() => {
      if (mounted && status === 'processing') {
        console.warn('[GoogleCallback] Timeout — no URL received after 12s');
        setStatus('error');
        setErrorMsg('Sign-in timed out. Please try again.');
      }
    }, 12000);

    const handleUrl = async (url) => {
      if (!mounted) return;
      clearTimeout(timeout);

      console.log('[GoogleCallback] Handling URL:', url?.substring(0, 80));

      try {
        if (!url) {
          setStatus('error');
          setErrorMsg('No callback URL received. Please try again.');
          return;
        }

        // Linking.parse() already URL-decodes query params — do NOT
        // call decodeURIComponent again or the JSON will be double-decoded.
        const parsed = Linking.parse(url);
        const { access, refresh, user: userStr, error } = parsed.queryParams || {};

        console.log('[GoogleCallback] Parsed params — access:', !!access, 'refresh:', !!refresh, 'user:', !!userStr, 'error:', error);

        if (error) {
          setStatus('error');
          setErrorMsg(
            error === 'auth_failed'
              ? 'Google sign-in was cancelled or failed.'
              : 'Something went wrong. Please try again.'
          );
          return;
        }

        if (!access || !refresh || !userStr) {
          setStatus('error');
          setErrorMsg('Sign-in failed: missing token data from server.');
          return;
        }

        let user;
        try {
          user = JSON.parse(userStr);
        } catch (parseErr) {
          console.error('[GoogleCallback] JSON parse failed:', parseErr.message, '| raw:', userStr?.substring(0, 100));
          setStatus('error');
          setErrorMsg('Failed to parse user data. Please try again.');
          return;
        }

        console.log('[GoogleCallback] Calling googleLogin for:', user?.email);
        
        // This will update AuthContext and AppNavigator will automatically unmount this screen
        // and mount MainStack. No manual navigation needed.
        await googleLogin(access, refresh, user);
        console.log('[GoogleCallback] googleLogin completed successfully. Auth state updated.');
        
        if (mounted) {
          setStatus('done');
        }

      } catch (err) {
        console.error('[GoogleCallback] Unexpected error:', err.message);
        if (mounted) {
          setStatus('error');
          setErrorMsg('Unexpected error during sign-in. Please try again.');
        }
      }
    };

    // ── iOS: LoginScreen passes the URL directly via navigation params ────────
    if (route?.params?.resolvedUrl) {
      console.log('[GoogleCallback] iOS path — using resolvedUrl from params');
      handleUrl(route.params.resolvedUrl);
      return () => { mounted = false; clearTimeout(timeout); };
    }

    // ── Android / Expo Go: Linking event fires when deep link opens the app ───
    console.log('[GoogleCallback] Android path — waiting for Linking event');
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[GoogleCallback] Got initial URL:', url.substring(0, 80));
        handleUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[GoogleCallback] Linking event fired:', event.url.substring(0, 80));
      handleUrl(event.url);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.remove();
    };
  }, [googleLogin, route?.params?.resolvedUrl]);


  // ── UI: Show spinner while processing, error message on failure ───────────
  return (
    <LinearGradient
      colors={['#1E3A8A', '#2563EB']}
      style={styles.container}
    >
      {status === 'processing' || status === 'done' ? (
        <View style={styles.center}>
          {/* Animated spinner while tokens are being stored */}
          <View style={[styles.iconWrap, status === 'done' && { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]}>
            <Ionicons name={status === 'done' ? "checkmark" : "logo-google"} size={36} color={status === 'done' ? "#4ade80" : "#fff"} />
          </View>
          {status === 'processing' ? (
            <ActivityIndicator size="large" color="#ffffff" style={styles.spinner} />
          ) : (
            <View style={{ height: 36 }} /> // Spacer to keep layout from jumping
          )}
          <Text style={styles.title}>{status === 'done' ? "Success!" : "Signing you in..."}</Text>
          <Text style={styles.subtitle}>{status === 'done' ? "Welcome back" : "Completing Google authentication"}</Text>
        </View>
      ) : (
        <View style={styles.center}>
          {/* Error state — lets user go back */}
          <View style={[styles.iconWrap, styles.errorIconWrap]}>
            <Ionicons name="alert-circle" size={36} color="#ff6b6b" />
          </View>
          <Text style={styles.title}>Sign-in Failed</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text
            style={styles.retryLink}
            onPress={() => navigation.navigate('Auth')}
          >
            ← Back to Login
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorIconWrap: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  spinner: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryLink: {
    fontSize: 15,
    color: '#60a5fa',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default GoogleAuthCallbackScreen;
