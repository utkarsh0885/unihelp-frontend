import axios from 'axios';
import { getStoredToken, logoutUser } from './authService';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[apiClient] Error getting token for request', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s and Refresh Tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 (Unauthorized) and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('[apiClient] 401 caught. Attempting token refresh...');
        
        let refreshToken;
        if (typeof window !== 'undefined' && window.localStorage) {
          refreshToken = localStorage.getItem('unihelp_refresh_token');
        } else {
          // Native fallback if implemented
          refreshToken = await SecureStore.getItemAsync('unihelp_refresh_token');
        }

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Make direct axios call to avoid interceptor loop
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Store new tokens
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('unihelp_access_token', accessToken);
          localStorage.setItem('unihelp_refresh_token', newRefreshToken);
        } else {
          await SecureStore.setItemAsync('unihelp_access_token', accessToken);
          await SecureStore.setItemAsync('unihelp_refresh_token', newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        console.warn('[apiClient] Token refresh failed. Forcing logout.', refreshError);
        // Dispatch custom event for global error handler/toast
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-expired'));
        }
        await logoutUser();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
