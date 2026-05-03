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
  loginWithGoogle,
} from '../services/authService';
// ⚠️ updateUserPresence removed — presence tracking requires WebSocket (disabled).

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const googleLogin = useCallback(async (accessToken, refreshToken, user) => {
    const result = await loginWithGoogle(accessToken, refreshToken, user);
    setUser(result.user);
    return result;
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      console.log("[AuthContext] Logging out...");
      await logoutUser();
    } catch (err) {
      console.warn("[AuthContext] Logout error:", err);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    }
  }, []);

  // ── Auto-login from stored session (runs ONCE on mount) ──
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (mounted) {
          setUser(session || null);
        }
      } catch (e) {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkSession();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Periodic token expiry check (every 5 min) ──
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const expiryInterval = setInterval(async () => {
      const session = await getSession();
      if (!session && mounted) {
        logout();
      }
    }, 1000 * 60 * 5);
    return () => {
      mounted = false;
      clearInterval(expiryInterval);
    };
  }, [user, logout]);

  // ── Update User ──
  const updateUser = useCallback(async (data) => {
    if (!user) return;
    const updated = await updateProfile(user.id, data);
    if (updated) setUser(updated);
    return updated;
  }, [user]);

  // ── Update Presence (no-op stub — requires WebSocket) ─────────────────────────
  // Presence was updated via socket connect/disconnect events.
  // Without WebSocket, this is a safe no-op so call sites don’t crash.
  const updateUserPresence = useCallback(async (_isOnline) => {
    // no-op — re-enable when sockets are restored
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    updateUser,
    updateUserPresence,
    googleLogin,          // Exposed for GoogleAuthCallbackScreen
    isAuthenticated: !!user,
  }), [user, loading, login, signup, logout, updateUser, updateUserPresence, googleLogin]);

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
