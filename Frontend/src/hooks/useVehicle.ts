/**
 * Finovo AI Car Rental — useVehicle Hook
 * Fetches and manages a single vehicle's lifecycle, state transitions, and sub-resources.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { vehiclesApi } from '../api/services/vehicles.api';
import { queryCache } from '../api/cache';
import type { Vehicle, VehicleFormData } from '../features/fleet/types/fleet.types';
import type { ApiError } from '../api/errors';

export function useVehicle(id: string | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const isMountedRef = useRef(true);

  const fetchVehicle = useCallback(async (bypassCache = false) => {
    if (!id) {
      setVehicle(null);
      setIsLoading(false);
      return;
    }

    const cacheKey = `vehicle:${id}`;
    if (!bypassCache) {
      const cached = queryCache.get<{ vehicle: Vehicle }>(cacheKey);
      if (cached && isMountedRef.current) {
        setVehicle(cached.vehicle);
        setIsLoading(false);
        return;
      }
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const res = await vehiclesApi.getById(id);
      if (isMountedRef.current && res.success) {
        queryCache.set(cacheKey, res, 30000);
        setVehicle(res.vehicle);
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
  }, [id]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchVehicle();

    const unsubscribe = queryCache.subscribe((invalidatedKey) => {
      if (
        invalidatedKey === 'vehicles' ||
        invalidatedKey === `vehicle:${id}` ||
        invalidatedKey.startsWith(`pricing:${id}`)
      ) {
        fetchVehicle(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [id, fetchVehicle]);

  // Mutations
  const updateVehicle = async (data: Partial<VehicleFormData>) => {
    if (!id) return;
    const res = await vehiclesApi.update(id, data);
    queryCache.invalidateQueries(`vehicle:${id}`);
    queryCache.invalidateQueries('vehicles');
    queryCache.invalidateQueries('dashboard');
    return res;
  };

  const archiveVehicle = async (reason?: string) => {
    if (!id) return;
    const res = await vehiclesApi.archive(id, reason);
    queryCache.invalidateQueries(`vehicle:${id}`);
    queryCache.invalidateQueries('vehicles');
    queryCache.invalidateQueries('dashboard');
    return res;
  };

  const restoreVehicle = async () => {
    if (!id) return;
    const res = await vehiclesApi.restore(id);
    queryCache.invalidateQueries(`vehicle:${id}`);
    queryCache.invalidateQueries('vehicles');
    queryCache.invalidateQueries('dashboard');
    return res;
  };

  return {
    vehicle,
    isLoading,
    error,
    refetch: () => fetchVehicle(true),
    updateVehicle,
    archiveVehicle,
    restoreVehicle,
  };
}
