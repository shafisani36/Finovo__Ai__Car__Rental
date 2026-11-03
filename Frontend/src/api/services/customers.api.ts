import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { Customer } from '../../features/customers/api/customerApi';

export const customersApi = {
  list: async (params?: { search?: string; status?: string }): Promise<{ success: boolean; customers: Customer[] }> => {
    return apiClient.get(API_ENDPOINTS.CUSTOMERS.LIST, { params });
  },

  getById: async (id: string): Promise<{ success: boolean; customer: Customer }> => {
    return apiClient.get(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
  },

  verify: async (
    id: string,
    isVerified: boolean,
    notes?: string
  ): Promise<{ success: boolean; customer: Customer }> => {
    return apiClient.patch(API_ENDPOINTS.CUSTOMERS.VERIFY(id), { isVerified, notes });
  },
};
