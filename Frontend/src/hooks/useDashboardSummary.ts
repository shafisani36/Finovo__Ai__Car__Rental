/**
 * Finovo AI Car Rental — useDashboardSummary Hook
 * Requests authorized, aggregated platform metrics and subscribes to operational updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardApi } from '../api/services/dashboard.api';
import { queryCache } from '../api/cache';
import type { DashboardOverviewResponse } from '../features/dashboard/api/dashboardApi';
import type { ApiError } from '../api/errors';

export function useDashboardSummary() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const isMountedRef = useRef(true);

  const cacheKey = 'dashboard:overview';

  const fetchOverview = useCallback(async (bypassCache = false) => {
    if (!bypassCache) {
      const cached = queryCache.get<DashboardOverviewResponse>(cacheKey);
      if (cached && isMountedRef.current) {
        setData(cached);
        setIsLoading(false);
        return;
      }
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const res = await dashboardApi.getOverview();
      if (isMountedRef.current) {
        queryCache.set(cacheKey, res, 20000); // 20s cache
        setData(res);
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
    fetchOverview();

    const unsubscribe = queryCache.subscribe((invalidatedKey) => {
      if (
        invalidatedKey === 'dashboard' ||
        invalidatedKey === 'vehicles' ||
        invalidatedKey === 'bookings'
      ) {
        fetchOverview(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchOverview]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchOverview(true),
  };
}
