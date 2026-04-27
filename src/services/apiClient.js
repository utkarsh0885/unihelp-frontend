import axios from 'axios';
import { Platform } from 'react-native';
import { getStoredToken, getStoredRefreshToken, storeAuthData, clearAuthData } from './tokenService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unihelp-backend-a5f3.onrender.com';

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
        
        const refreshToken = await getStoredRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Make direct axios call to avoid interceptor loop
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Store new tokens
        await storeAuthData(accessToken, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        console.warn('[apiClient] Token refresh failed. Forcing logout.', refreshError);
        
        await clearAuthData();

        // Redirect on web, or fire event
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.replace('/login');
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
