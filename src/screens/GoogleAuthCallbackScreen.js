/**
 * GoogleAuthCallbackScreen.js
 * ─────────────────────────────────────────────
 * Premium Design System redesign.
 * Clean, modern processing & error states.
 * All OAuth logic, URL parsing, and deep link handlers preserved verbatim.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { storeAuthData } from '../services/tokenService';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS, LIGHT_COLORS } from '../theme';
import { getElevation } from '../theme/elevation';

const C = LIGHT_COLORS;
const elevation = getElevation(false);

const GoogleAuthCallbackScreen = ({ navigation, route = {} }) => {
  console.log('[GoogleAuthCallbackScreen] Render — route:', route, 'navigation:', !!navigation);
  const { googleLogin } = useAuth();
  const [status, setStatus] = useState('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    // ── WEB path ──────────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      const processWebCallback = async () => {
        try {
          const params = new URLSearchParams(window.location.search);
          const accessToken = params.get('access');
          const refreshToken = params.get('refresh');
          const userStr = params.get('user');

          console.log('[GoogleCallback][web] access token present:', !!accessToken);

          if (!accessToken) {
            throw new Error('No token found in URL');
          }

          // Store tokens
          await storeAuthData(accessToken, refreshToken, null);

          let userObj;
          if (userStr) {
            try {
              userObj = JSON.parse(userStr);
            } catch (e) {
              console.warn('[GoogleCallback][web] Failed to parse user JSON from URL, falling back to decoding token');
            }
          }

          if (!userObj) {
            // Decode JWT robustly as fallback
            const base64Url = accessToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            userObj = {
              id: payload.id || payload.sub,
              name: payload.name,
              email: payload.email,
              role: payload.role || 'student'
            };
          }

          console.log('[GoogleCallback][web] Calling googleLogin...');

          // Pass the user to AuthContext
          await googleLogin(accessToken, refreshToken || '', userObj);

          console.log('[GoogleCallback][web] Login successful. Redirecting to /...');

          // Redirect
          window.location.replace('/');
        } catch (err) {
          console.error('[GoogleCallback][web] Callback error:', err);
          window.location.replace('/login');
        }
      };

      processWebCallback();
      return () => { mounted = false; };
    }

    // ── NATIVE path (iOS / Android) ───────────────────────────────────────────
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

    if (route?.params?.resolvedUrl) {
      console.log('[GoogleCallback] iOS path — using resolvedUrl from params');
      handleUrl(route?.params?.resolvedUrl);
      return () => { mounted = false; clearTimeout(timeout); };
    }

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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'processing' || status === 'done' ? (
          <View style={styles.center}>
            <View style={[styles.iconWrap, status === 'done' && styles.iconWrapSuccess]}>
              <Ionicons
                name={status === 'done' ? 'checkmark' : 'logo-google'}
                size={32}
                color={status === 'done' ? C.accent : C.primary}
              />
            </View>
            {status === 'processing' ? (
              <ActivityIndicator size="medium" color={C.primary} style={styles.spinner} />
            ) : (
              <View style={{ height: 24 }} />
            )}
            <Text style={styles.title}>{status === 'done' ? 'Success!' : 'Signing you in...'}</Text>
            <Text style={styles.subtitle}>{status === 'done' ? 'Welcome back to UniHelp' : 'Completing Google authentication'}</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <View style={[styles.iconWrap, styles.errorIconWrap]}>
              <Ionicons name="alert-circle" size={32} color={C.danger} />
            </View>
            <Text style={styles.title}>Sign-in Failed</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Pressable
              onPress={() => navigation.navigate('Auth')}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.backBtnText}>← Back to Login</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.background,
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: C.border,
    ...elevation.md,
  },
  center: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  iconWrapSuccess: {
    backgroundColor: C.accentLight,
  },
  errorIconWrap: {
    backgroundColor: C.dangerLight,
  },
  spinner: {
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: C.textPrimary,
    marginBottom: SPACING.xxs,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: C.textMuted,
    textAlign: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: C.danger,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  backBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.medium,
    backgroundColor: C.surfaceSubtle,
    borderWidth: 1,
    borderColor: C.border,
  },
  backBtnText: {
    ...TYPOGRAPHY.label,
    color: C.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default GoogleAuthCallbackScreen;
