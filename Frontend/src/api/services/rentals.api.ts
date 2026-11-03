import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { RentalRecord, HandoverPayload, ReturnPayload } from '../../features/rentals/api/rentalApi';

export const rentalsApi = {
  list: async (params?: { status?: string }): Promise<{ success: boolean; rentals: RentalRecord[] }> => {
    return apiClient.get(API_ENDPOINTS.RENTALS.LIST, { params });
  },

  getById: async (id: string): Promise<{ success: boolean; rental: RentalRecord }> => {
    return apiClient.get(API_ENDPOINTS.RENTALS.BY_ID(id));
  },

  handover: async (payload: HandoverPayload): Promise<{ success: boolean; rental: RentalRecord }> => {
    return apiClient.post(API_ENDPOINTS.RENTALS.HANDOVER, payload);
  },

  previewSettlement: async (payload: ReturnPayload): Promise<{ success: boolean; settlement: any }> => {
    return apiClient.post(API_ENDPOINTS.RENTALS.PREVIEW_SETTLEMENT, payload);
  },

  returnVehicle: async (payload: ReturnPayload): Promise<{ success: boolean; rental: RentalRecord }> => {
    return apiClient.post(API_ENDPOINTS.RENTALS.RETURN, payload);
  },
};
