import { useState, useEffect, useCallback, useRef } from 'react';

const cache = new Map<string, { data: unknown; ts: number }>();
const STALE_MS = 30_000;

interface Options {
  refreshInterval?: number;
  keepPreviousData?: boolean;
}

export function useFetch<T>(url: string | null, opts?: Options) {
  const keepPrevious = opts?.keepPreviousData ?? false;

  const [data, setData] = useState<T | null>(() => {
    if (!url) return null;
    return (cache.get(url)?.data as T) ?? null;
  });
  const [loading, setLoading] = useState(() => !!url && !cache.has(url));
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(
    async (showLoader: boolean) => {
      if (!url) return;
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      if (showLoader) setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = await res.json();
        cache.set(url, { data: json, ts: Date.now() });
        if (!ctrl.signal.aborted) {
          setData(json);
          setLoading(false);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setLoading(false);
        }
      }
    },
    [url],
  );

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const hit = cache.get(url);
    if (hit) {
      setData(hit.data as T);
      if (Date.now() - hit.ts < STALE_MS) {
        setLoading(false);
        return;
      }
      doFetch(false);
    } else {
      if (!keepPrevious) setData(null);
      setError(null);
      doFetch(true);
    }
    return () => ctrlRef.current?.abort();
  }, [url, doFetch, keepPrevious]);

  useEffect(() => {
    if (!opts?.refreshInterval || !url) return;
    const id = setInterval(() => doFetch(false), opts.refreshInterval);
    return () => clearInterval(id);
  }, [opts?.refreshInterval, url, doFetch]);

  const retry = useCallback(() => {
    if (url) cache.delete(url);
    doFetch(true);
  }, [url, doFetch]);

  return { data, loading, error, retry };
}
