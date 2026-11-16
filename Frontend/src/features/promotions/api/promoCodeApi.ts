import { apiClient } from '../../../api/client';
import { API_ENDPOINTS } from '../../../api/endpoints';

export type PromoDiscountType = 'PERCENT' | 'FIXED';

/** Money fields arrive as strings from the database; read them with Number(). */
export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: PromoDiscountType;
  discountValue: number | string;
  maxDiscountAmount: number | string | null;
  minRentalAmount: number | string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  maxRedemptionsPerCustomer: number;
  isActive: boolean;
  createdAt: string;
  timesUsed: number;
  totalDiscountGiven: number;
}

export interface PromoCodePayload {
  code?: string;
  description?: string | null;
  discountType?: PromoDiscountType;
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minRentalAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  maxRedemptionsPerCustomer?: number;
  isActive?: boolean;
}

export const promoCodeApi = {
  list() {
    return apiClient.get<{ success: boolean; promoCodes: PromoCode[] }>(API_ENDPOINTS.PROMO_CODES.LIST);
  },

  create(payload: PromoCodePayload) {
    return apiClient.post<{ success: boolean; promoCode: PromoCode }>(API_ENDPOINTS.PROMO_CODES.LIST, payload);
  },

  update(id: string, payload: PromoCodePayload) {
    return apiClient.patch<{ success: boolean; promoCode: PromoCode }>(API_ENDPOINTS.PROMO_CODES.BY_ID(id), payload);
  },

  /** Deletes an unused code; a code that was already used is deactivated instead so history stays intact. */
  remove(id: string) {
    return apiClient.delete<{ success: boolean; deleted: boolean; deactivated: boolean }>(API_ENDPOINTS.PROMO_CODES.BY_ID(id));
  },
};
