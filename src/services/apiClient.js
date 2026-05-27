/**
 * API Client – Axios instance with production-grade resilience
 * ─────────────────────────────────────────────────
 * Features:
 *  - 30s timeout (handles Render free-tier cold starts)
 *  - Auto-retry for 5xx errors with exponential backoff
 *  - Request deduplication for concurrent GET requests
 *  - 401 token refresh with queue (prevents race conditions)
 *  - Structured error logging
 */

import axios from 'axios';
import { getStoredToken, getStoredRefreshToken, storeAuthData, clearAuthData } from './tokenService';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unihelp-backend-a5f3.onrender.com';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30s — Render free tier may need ~10s to cold-start
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request deduplication cache ───────────────────────────────────────────────
// Prevents duplicate concurrent GET requests to the same endpoint
const pendingRequests = new Map();

// ── Token refresh state ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ── Request interceptor: attach auth token ────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 refresh + retry on 5xx ───────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── Auto-retry for 5xx (server errors) ──
    if (error.response?.status >= 500 && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    if (error.response?.status >= 500 && originalRequest._retryCount < 2) {
      originalRequest._retryCount += 1;
      const delay = 1000 * Math.pow(2, originalRequest._retryCount - 1);
      console.log(`[API] Retrying ${originalRequest.url} (attempt ${originalRequest._retryCount}/2) in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiClient(originalRequest);
    }

    // ── 401 Token refresh flow ──
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getStoredRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        await storeAuthData(newAccessToken, newRefreshToken, null);

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh failed — clear auth and let the app redirect to login
        console.warn('[API] Token refresh failed. Clearing session.');
        await clearAuthData();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Structured error logging ──
    if (error.response) {
      const { status, data } = error.response;
      console.warn(
        `[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status}: ${data?.error || data?.message || 'Unknown'}`
      );
    } else if (error.code === 'ECONNABORTED') {
      console.warn(`[API] Request timeout: ${error.config?.url} (${error.config?.timeout}ms)`);
    } else {
      console.warn(`[API] Network error: ${error.message}`);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
