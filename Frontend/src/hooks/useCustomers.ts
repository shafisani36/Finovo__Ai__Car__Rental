/**
 * Finovo AI Car Rental — useCustomers Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { customersApi } from '../api/services/customers.api';
import { queryCache } from '../api/cache';
import type { Customer } from '../features/customers/api/customerApi';
import type { ApiError } from '../api/errors';

export function useCustomers(params: { search?: string; status?: string } = {}) {
  const { search = '', status = 'ALL' } = params;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const isMountedRef = useRef(true);

  const cacheKey = `customers:list:${search}:${status}`;

  const fetchCustomers = useCallback(async (bypassCache = false) => {
    if (!bypassCache) {
      const cached = queryCache.get<{ customers: Customer[] }>(cacheKey);
      if (cached && isMountedRef.current) {
        setCustomers(cached.customers);
        setIsLoading(false);
        return;
      }
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const res = await customersApi.list({
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
      });
      if (isMountedRef.current && res.success) {
        queryCache.set(cacheKey, res, 30000);
        setCustomers(res.customers);
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
  }, [cacheKey, search, status]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchCustomers();

    const unsubscribe = queryCache.subscribe((invalidatedKey) => {
      if (invalidatedKey === 'customers' || invalidatedKey.startsWith('customers:')) {
        fetchCustomers(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchCustomers]);

  const verifyCustomer = async (id: string, isVerified: boolean, notes?: string) => {
    const res = await customersApi.verify(id, isVerified, notes);
    queryCache.invalidateQueries('customers');
    return res;
  };

  return {
    customers,
    isLoading,
    error,
    refetch: () => fetchCustomers(true),
    verifyCustomer,
  };
}
