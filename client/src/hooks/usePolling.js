import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * usePolling - Reinforced live polling hook
 * @param {Function} fetchFn - Async function to fetch data
 * @param {number} interval - Polling interval in ms (default: 5000)
 * @param {boolean} enabled - Whether polling is active
 * @param {boolean} immediate - Fetch immediately on mount
 */
export function usePolling(fetchFn, interval = 5000, enabled = true, immediate = true) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  // Keep fetchFn ref current
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const executeFetch = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      setLoading(true);
      setError(null);
      await fetchFnRef.current();
      if (mountedRef.current) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Start/stop polling
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      if (immediate) {
        executeFetch();
      }
      intervalRef.current = setInterval(executeFetch, interval);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, executeFetch, immediate]);

  const refresh = useCallback(() => {
    executeFetch();
  }, [executeFetch]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const resume = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(executeFetch, interval);
  }, [executeFetch, interval]);

  return { loading, error, lastUpdated, refresh, pause, resume };
}

/**
 * usePollingEndpoint - Simple polling for an API endpoint
 * @param {string} url - API endpoint
 * @param {number} interval - Polling interval in ms
 * @param {boolean} enabled - Whether polling is active
 */
export function usePollingEndpoint(url, interval = 5000, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mountedRef.current) {
        setData(json);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetchData();
      intervalRef.current = setInterval(fetchData, interval);
    }
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, interval, fetchData]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}
