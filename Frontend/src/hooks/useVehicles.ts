/**
 * Finovo AI Car Rental — useVehicles Hook
 * Encapsulates fleet list querying, pagination, search filters, and query cache reactivity.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { vehiclesApi } from '../api/services/vehicles.api';
import { queryCache } from '../api/cache';
import type { Vehicle, VehicleListResponse, FleetMetrics, FleetDashboardStats } from '../features/fleet/types/fleet.types';
import type { ApiError } from '../api/errors';

export interface UseVehiclesOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  enabled?: boolean;
}

export function useVehicles(options: UseVehiclesOptions = {}) {
  const {
    page = 1,
    limit = 12,
    search = '',
    category = 'ALL',
    status = 'ALL',
    sortBy = 'createdAt',
    order = 'desc',
    enabled = true,
  } = options;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metrics, setMetrics] = useState<FleetMetrics | null>(null);
  const [dashboardStats, setDashboardStats] = useState<FleetDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const cacheKey = `vehicles:list:${page}:${limit}:${search}:${category}:${status}:${sortBy}:${order}`;
  const isMountedRef = useRef(true);

  const fetchVehicles = useCallback(async (bypassCache = false) => {
    if (!enabled) return;

    if (!bypassCache) {
      const cached = queryCache.get<VehicleListResponse>(cacheKey);
      if (cached && isMountedRef.current) {
        setVehicles(cached.vehicles);
        setTotal(cached.pagination.total);
        setTotalPages(cached.pagination.totalPages);
        setIsLoading(false);
        return;
      }
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const [listRes, metricsRes] = await Promise.all([
        vehiclesApi.list({
          page,
          limit,
          search: search.trim() || undefined,
          category: category !== 'ALL' ? category : undefined,
          status: status !== 'ALL' ? status : undefined,
          sortBy,
          order,
        }),
        vehiclesApi.getMetrics().catch(() => null),
      ]);

      if (isMountedRef.current) {
        queryCache.set(cacheKey, listRes, 30000); // 30s cache
        setVehicles(listRes.vehicles);
        setTotal(listRes.pagination.total);
        setTotalPages(listRes.pagination.totalPages);
        if (metricsRes?.metrics) {
          setMetrics(metricsRes.metrics);
        }
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
  }, [cacheKey, enabled, page, limit, search, category, status, sortBy, order]);

  // Fetch separate live fleet dashboard breakdown
  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await vehiclesApi.getDashboardStats();
      if (isMountedRef.current && res.success) {
        setDashboardStats(res);
      }
    } catch {
      // Non-blocking dashboard stats error
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchVehicles();
    fetchDashboardStats();

    // Subscribe to cache invalidation on vehicles
    const unsubscribe = queryCache.subscribe((invalidatedKey) => {
      if (invalidatedKey === 'vehicles' || invalidatedKey.startsWith('vehicles:')) {
        fetchVehicles(true);
        fetchDashboardStats();
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchVehicles, fetchDashboardStats]);

  return {
    vehicles,
    total,
    totalPages,
    metrics,
    dashboardStats,
    isLoading,
    error,
    refetch: () => fetchVehicles(true),
  };
}
