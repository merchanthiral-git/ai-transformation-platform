"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useApiData — eliminates the fetch-loading-error boilerplate repeated 14+ times across modules.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApiData(
 *     () => api.getOverview(modelId, f),
 *     { kpis: {}, ... },  // fallback
 *     [modelId, f.func, f.jf, f.sf, f.cl]
 *   );
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  deps: unknown[],
  opts?: { skip?: boolean }
): {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const doFetch = useCallback(() => {
    if (opts?.skip) return;
    setLoading(true);
    setError(null);
    fetcherRef.current()
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error("[useApiData]", e);
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : "Request failed");
          setLoading(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    return () => { mountedRef.current = false; };
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
