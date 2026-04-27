/**
 * AuthNavigator
 * ─────────────────────────────────────────────
 * Stack navigator for the authentication flow
 * (Login → Signup). Uses a shared headerless
 * configuration so screens render full-bleed.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import GoogleAuthCallbackScreen from '../screens/GoogleAuthCallbackScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="GoogleAuthCallback" component={GoogleAuthCallbackScreen} options={{ animation: 'fade' }} />
  </Stack.Navigator>
);

export default AuthNavigator;
