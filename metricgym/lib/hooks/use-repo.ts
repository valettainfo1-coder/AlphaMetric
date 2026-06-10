"use client";

import { useCallback, useEffect, useState } from "react";
import { getRepository } from "@/lib/data";
import type { DataRepository } from "@/lib/data/repository";

/**
 * Client-side data loader against the repository interface.
 * `deps` retriggers the load; `reload()` forces it.
 */
export function useRepoData<T>(
  loader: (repo: DataRepository) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): { data: T | null; loading: boolean; error: Error | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRepository()
      .then(loader)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((v) => v + 1), []);
  return { data, loading, error, reload };
}
