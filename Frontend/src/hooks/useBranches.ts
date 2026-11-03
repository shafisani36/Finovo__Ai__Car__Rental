/**
 * Finovo AI Car Rental — useBranches Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { branchesApi } from '../api/services/branches.api';
import { queryCache } from '../api/cache';
import type { Branch } from '../features/branches/api/branchApi';
import type { ApiError } from '../api/errors';

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const isMountedRef = useRef(true);

  const cacheKey = 'branches:list';

  const fetchBranches = useCallback(async (bypassCache = false) => {
    if (!bypassCache) {
      const cached = queryCache.get<{ branches: Branch[] }>(cacheKey);
      if (cached && isMountedRef.current) {
        setBranches(cached.branches);
        setIsLoading(false);
        return;
      }
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const res = await branchesApi.list();
      if (isMountedRef.current && res.success) {
        queryCache.set(cacheKey, res, 60000); // 60s cache
        setBranches(res.branches);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as ApiError);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchBranches();

    const unsubscribe = queryCache.subscribe((invalidatedKey) => {
      if (invalidatedKey === 'branches') {
        fetchBranches(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchBranches]);

  return {
    branches,
    isLoading,
    error,
    refetch: () => fetchBranches(true),
  };
}
