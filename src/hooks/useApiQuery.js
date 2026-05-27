/**
 * useApiQuery – Lightweight React Query replacement
 * ─────────────────────────────────────────────────
 * Custom hook for data fetching with:
 *  - Auto-refetch on mount + interval
 *  - Stale-while-revalidate pattern
 *  - Exponential backoff retry on errors
 *  - Manual refetch trigger
 *
 * Usage:
 *   const { data, isLoading, error, refetch } = useApiQuery(
 *     'posts',
 *     () => apiClient.get('/api/posts').then(r => r.data),
 *     { refetchInterval: 15000, retries: 3 }
 *   );
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_OPTIONS = {
  refetchInterval: 0,      // 0 = no auto-refetch
  retries: 3,              // Number of retry attempts on error
  retryDelay: 1000,        // Base delay in ms (doubles each retry)
  staleTime: 30000,        // Data considered fresh for 30s
  enabled: true,           // Set false to disable auto-fetch
};

export default function useApiQuery(key, fetcher, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const lastFetchRef = useRef(0);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!opts.enabled) return;

    // Skip if data is still fresh (stale-while-revalidate)
    const now = Date.now();
    if (isBackground && data && (now - lastFetchRef.current) < opts.staleTime) {
      return; // Data is still fresh, skip
    }

    if (!isBackground) setIsLoading(true);
    setIsFetching(true);

    try {
      const result = await fetcher();
      if (!mountedRef.current) return;

      setData(result);
      setError(null);
      retryCountRef.current = 0;
      lastFetchRef.current = Date.now();
    } catch (err) {
      if (!mountedRef.current) return;

      // Retry with exponential backoff
      if (retryCountRef.current < opts.retries) {
        retryCountRef.current += 1;
        const delay = opts.retryDelay * Math.pow(2, retryCountRef.current - 1);
        console.log(`[useApiQuery:${key}] Retry ${retryCountRef.current}/${opts.retries} in ${delay}ms`);
        setTimeout(() => fetchData(isBackground), delay);
        return;
      }

      setError(err?.message || 'Unknown error');
      console.warn(`[useApiQuery:${key}] Failed after ${opts.retries} retries:`, err?.message);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.enabled, opts.staleTime, opts.retries, opts.retryDelay]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData(false);
    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.enabled]);

  // Auto-refetch interval
  useEffect(() => {
    if (opts.refetchInterval > 0 && opts.enabled) {
      intervalRef.current = setInterval(() => fetchData(true), opts.refetchInterval);
      return () => clearInterval(intervalRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.refetchInterval, opts.enabled]);

  const refetch = useCallback(() => {
    retryCountRef.current = 0;
    lastFetchRef.current = 0;
    return fetchData(false);
  }, [fetchData]);

  return { data, error, isLoading, isFetching, refetch };
}
