import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { VehiclePricingTier } from '../../features/fleet/types/fleet.types';

export const vehiclePricingApi = {
  /**
   * Retrieves all pricing tiers and seasonal rate adjustments for a vehicle
   */
  listPricingTiers: async (
    vehicleId: string
  ): Promise<{ success: boolean; pricingTiers: VehiclePricingTier[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.PRICING(vehicleId));
  },

  /**
   * Creates a new pricing tier or seasonal rate plan
   */
  createPricingTier: async (
    vehicleId: string,
    tier: {
      name: string;
      tierType?: 'STANDARD' | 'WEEKEND' | 'HOLIDAY' | 'LONG_TERM' | 'CORPORATE';
      dailyRate: number;
      hourlyRate?: number;
      minDays?: number;
      maxDays?: number;
      startDate?: string;
      endDate?: string;
      isDefault?: boolean;
    }
  ): Promise<{ success: boolean; pricingTier: VehiclePricingTier }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.PRICING(vehicleId), tier);
  },

  /**
   * Updates an existing pricing tier
   */
  updatePricingTier: async (
    vehicleId: string,
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
  ): Promise<{ success: boolean; pricingTier: VehiclePricingTier }> => {
    return apiClient.patch(API_ENDPOINTS.VEHICLES.PRICING_BY_ID(vehicleId, tierId), tier);
  },

  /**
   * Removes a pricing tier
   */
  deletePricingTier: async (
    vehicleId: string,
    tierId: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.VEHICLES.PRICING_BY_ID(vehicleId, tierId));
  },
};
