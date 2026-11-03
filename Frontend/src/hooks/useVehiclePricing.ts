/**
 * Finovo AI Car Rental — useVehiclePricing Hook
 * Isolates pricing tiers, rate adjustments, and pricing policy mutations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { vehiclePricingApi } from '../api/services/vehiclePricing.api';
import { queryCache } from '../api/cache';
import type { VehiclePricingTier } from '../features/fleet/types/fleet.types';
import type { ApiError } from '../api/errors';

export function useVehiclePricing(vehicleId: string | undefined) {
  const [pricingTiers, setPricingTiers] = useState<VehiclePricingTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const isMountedRef = useRef(true);

  const cacheKey = `pricing:${vehicleId}`;

  const fetchPricing = useCallback(async (bypassCache = false) => {
    if (!vehicleId) {
      setPricingTiers([]);
      setIsLoading(false);
      return;
    }

    if (!bypassCache) {
      const cached = queryCache.get<{ pricingTiers: VehiclePricingTier[] }>(cacheKey);
      if (cached && isMountedRef.current) {
        setPricingTiers(cached.pricingTiers);
        setIsLoading(false);
        return;
      }
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const res = await vehiclePricingApi.listPricingTiers(vehicleId);
      if (isMountedRef.current && res.success) {
        queryCache.set(cacheKey, res, 30000);
        setPricingTiers(res.pricingTiers);
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
  }, [vehicleId, cacheKey]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPricing();

    const unsubscribe = queryCache.subscribe((invalidatedKey) => {
      if (invalidatedKey === cacheKey || invalidatedKey === 'pricing' || invalidatedKey === 'vehicles') {
        fetchPricing(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchPricing, cacheKey]);

  // Pricing Mutations
  const createTier = async (tier: {
    name: string;
    tierType?: 'STANDARD' | 'WEEKEND' | 'HOLIDAY' | 'LONG_TERM' | 'CORPORATE';
    dailyRate: number;
    hourlyRate?: number;
    minDays?: number;
    maxDays?: number;
    startDate?: string;
    endDate?: string;
    isDefault?: boolean;
  }) => {
    if (!vehicleId) return;
    const res = await vehiclePricingApi.createPricingTier(vehicleId, tier);
    queryCache.invalidateQueries(cacheKey);
    queryCache.invalidateQueries(`vehicle:${vehicleId}`);
    return res;
  };

  const updateTier = async (
    tierId: string,
    tier: Partial<{
      name: string;
      tierType: 'STANDARD' | 'WEEKEND' | 'HOLIDAY' | 'LONG_TERM' | 'CORPORATE';
      dailyRate: number;
      hourlyRate?: number;
      minDays?: number;
      maxDays?: number;
      startDate?: string;
      endDate?: string;
      isDefault?: boolean;
    }>
  ) => {
    if (!vehicleId) return;
    const res = await vehiclePricingApi.updatePricingTier(vehicleId, tierId, tier);
    queryCache.invalidateQueries(cacheKey);
    queryCache.invalidateQueries(`vehicle:${vehicleId}`);
    return res;
  };

  const deleteTier = async (tierId: string) => {
    if (!vehicleId) return;
    const res = await vehiclePricingApi.deletePricingTier(vehicleId, tierId);
    queryCache.invalidateQueries(cacheKey);
    queryCache.invalidateQueries(`vehicle:${vehicleId}`);
    return res;
  };

  return {
    pricingTiers,
    isLoading,
    error,
    refetch: () => fetchPricing(true),
    createTier,
    updateTier,
    deleteTier,
  };
}
