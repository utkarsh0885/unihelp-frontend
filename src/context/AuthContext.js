/**
 * AuthContext – Global Authentication State
 * ─────────────────────────────────────────────
 * Self-contained auth using AsyncStorage.
 * No backend server required.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  loginUser,
  signupUser,
  logoutUser,
  getSession,
  updateProfile,
  loginWithGoogle,  // Google OAuth — stores JWT + user from callback
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Auto-login from stored session ──
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (mounted) setUser(session);
      } catch (e) {
        console.warn('[Auth] Session check failed:', e.message);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkSession();
    return () => { mounted = false; };
  }, []);

  // ── Login ──
  const login = useCallback(async (email, password) => {
    const result = await loginUser(email, password);
    setUser(result.user);
    return result;
  }, []);

  // ── Signup ──
  const signup = useCallback(async (name, email, password) => {
    const result = await signupUser(name, email, password);
    setUser(result.user);
    return result;
  }, []);

  // ── Google OAuth Login ──
  // Called by GoogleAuthCallbackScreen after the backend redirects with tokens.
  const googleLogin = useCallback(async (accessToken, refreshToken, user) => {
    const result = await loginWithGoogle(accessToken, refreshToken, user);
    setUser(result.user); // Updates app state → AuthContext → navigator shows Main
    return result;
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      console.log("[AuthContext] Logging out...");

      // 🔥 DO NOT PASS user.id
      await logoutUser();

      console.log("[AuthContext] Storage cleared");

    } catch (err) {
      console.warn("[AuthContext] Logout error:", err);
    } finally {
      // 🔥 Clear state AFTER storage
      setUser(null);

      // 🔥 HARD RESET
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    }
  }, []);

  // ── Update User ──
  const updateUser = useCallback(async (data) => {
    if (!user) return;
    const updated = await updateProfile(user.id, data);
    if (updated) setUser(updated);
    return updated;
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    updateUser,
    googleLogin,          // Exposed for GoogleAuthCallbackScreen
    isAuthenticated: !!user,
  }), [user, loading, login, signup, logout, updateUser, googleLogin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
