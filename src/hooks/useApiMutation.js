/**
 * useApiMutation – Mutation hook with optimistic updates
 * ─────────────────────────────────────────────────
 * Custom hook for create/update/delete operations with:
 *  - Loading state
 *  - Error handling
 *  - Optional onSuccess / onError callbacks
 *
 * Usage:
 *   const { mutate, isLoading, error } = useApiMutation(
 *     (data) => apiClient.post('/api/posts', data),
 *     { onSuccess: (result) => navigation.goBack() }
 *   );
 *
 *   mutate({ title: 'Hello', content: 'World' });
 */

import { useState, useCallback, useRef } from 'react';

export default function useApiMutation(mutationFn, options = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const mountedRef = useRef(true);

  const mutate = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(...args);
      if (!mountedRef.current) return;

      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      if (!mountedRef.current) return;

      const errorMsg = err?.response?.data?.error || err?.message || 'Operation failed';
      setError(errorMsg);
      options.onError?.(err);
      throw err; // Re-throw so caller can handle
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutationFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, isLoading, error, data, reset };
}
