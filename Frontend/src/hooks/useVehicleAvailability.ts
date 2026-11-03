/**
 * Finovo AI Car Rental — useVehicleAvailability Hook
 * Evaluates live reservation conflict state against backend scheduling engine.
 */

import { useState, useCallback, useRef } from 'react';
import { vehiclesApi } from '../api/services/vehicles.api';
import type { ApiError } from '../api/errors';

export function useVehicleAvailability() {
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    isAvailable: boolean;
    reason?: string;
    conflictingBooking?: unknown;
  } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const isMountedRef = useRef(true);

  const checkAvailability = useCallback(
    async (vehicleId: string, fromDateTime: string, toDateTime: string) => {
      setIsChecking(true);
      setError(null);
      setAvailabilityResult(null);

      try {
        const res = await vehiclesApi.checkAvailability(vehicleId, fromDateTime, toDateTime);
        if (isMountedRef.current) {
          setAvailabilityResult({
            isAvailable: res.isAvailable,
            reason: res.reason,
            conflictingBooking: res.conflictingBooking,
          });
          return res;
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err as ApiError);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setIsChecking(false);
        }
      }
    },
    []
  );

  return {
    isChecking,
    availabilityResult,
    error,
    checkAvailability,
    clearResult: () => setAvailabilityResult(null),
  };
}
