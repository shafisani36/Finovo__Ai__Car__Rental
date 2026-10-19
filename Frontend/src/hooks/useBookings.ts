/**
 * Finovo AI Car Rental — useBookings Hook
 * Encapsulates reservations list querying, filtering, and status mutation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { bookingsApi } from '../api/services/bookings.api';
import { queryCache } from '../api/cache';
import type { Booking } from '../features/bookings/api/bookingApi';
import type { ApiError } from '../api/errors';

export interface UseBookingsOptions {
  status?: string;
  customerId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useBookings(options: UseBookingsOptions = {}) {
  const { status, customerId, page = 1, limit = 10, enabled = true } = options;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const isMountedRef = useRef(true);

  const cacheKey = `bookings:list:${status || 'ALL'}:${customerId || 'ALL'}:${page}:${limit}`;

  const fetchBookings = useCallback(async (bypassCache = false) => {
    if (!enabled) return;

    if (!bypassCache) {
      const cached = queryCache.get<{
        bookings: Booking[];
        pagination: { total: number; totalPages: number };
      }>(cacheKey);
      if (cached && isMountedRef.current) {
        setBookings(cached.bookings);
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
      const res = await bookingsApi.list({
        status: status && status !== 'ALL' ? status : undefined,
        customerId,
        page,
        limit,
      });

      if (isMountedRef.current && res.success) {
        queryCache.set(cacheKey, res, 20000);
        setBookings(res.bookings);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
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
  }, [cacheKey, enabled, status, customerId, page, limit]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchBookings();

    const unsubscribe = queryCache.subscribe((invalidatedKey) => {
      if (invalidatedKey === 'bookings' || invalidatedKey.startsWith('bookings:')) {
        fetchBookings(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchBookings]);

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED',
    notes?: string
  ) => {
    const res = await bookingsApi.updateStatus(bookingId, newStatus, notes);
    queryCache.invalidateQueries('bookings');
    queryCache.invalidateQueries('dashboard');
    queryCache.invalidateQueries('vehicles');
    return res;
  };

  return {
    bookings,
    total,
    totalPages,
    isLoading,
    error,
    refetch: () => fetchBookings(true),
    updateBookingStatus,
  };
}
