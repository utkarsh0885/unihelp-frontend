import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { View, Text, AppState, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { ToastProvider, useToast } from './src/context/ToastContext';
import ErrorBoundary from './src/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ── React Navigation URL linking config (web) ─────────────────────────────────
// Maps browser URLs to screens so that navigating to /auth/callback on Vercel
// correctly mounts GoogleAuthCallbackScreen instead of falling back to Login.
const linking = {
  prefixes: [
    'unihelp://',                         // native deep-link scheme
    'https://*.vercel.app',               // Vercel production/preview
    'http://localhost',                   // local web dev
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Signup: 'signup',
          GoogleAuthCallback: 'auth/callback',
        },
      },
      // Main screens are gated by auth — no public URLs needed
    },
  },
};

const AppContent = () => {
  const { isDark, colors } = useTheme();
  const { user, updateUserPresence } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleAuthExpired = () => {
        showToast('Your session has expired. Please log in again.', 'error');
      };
      window.addEventListener('auth-expired', handleAuthExpired);
      return () => {
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('auth-expired', handleAuthExpired);
        }
      };
    }
  }, [showToast]);

  useEffect(() => {
    if (!user?.id) return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      const isOnline = nextAppState === 'active';
      if (typeof updateUserPresence === 'function') {
        updateUserPresence(isOnline);
      }
    });

    if (typeof updateUserPresence === 'function') {
      updateUserPresence(true);
    }

    return () => {
      subscription.remove();
      if (typeof updateUserPresence === 'function') {
        updateUserPresence(false);
      }
    };
  }, [user?.id, updateUserPresence]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    dark: isDark,
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.backgroundAlt,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      <AppNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {}
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <DataProvider>
                <ToastProvider>
                  <StatusBar style="auto" />
                  <AppContent />
                </ToastProvider>
              </DataProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
