import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface StripeConfigResponse {
  success: boolean;
  enabled: boolean;
  publishableKey: string | null;
}

export interface StripeIntentResponse {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface StripeConfirmResponse {
  success: boolean;
  paymentStatus: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  message: string | null;
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    receiptUrl: string | null;
    cardBrand: string | null;
    cardNumberLast4: string | null;
  };
  booking: unknown;
}

export const paymentsApi = {
  getStripeConfig: async (): Promise<StripeConfigResponse> => {
    return apiClient.get(API_ENDPOINTS.PAYMENTS.STRIPE_CONFIG, { skipAuth: true });
  },

  /** Creates a PaymentIntent for the booking balance (amount is computed on the server; `amount` can only lower it). */
  createStripeIntent: async (bookingId: string, amount?: number): Promise<StripeIntentResponse> => {
    return apiClient.post(API_ENDPOINTS.PAYMENTS.STRIPE_INTENT, { bookingId, amount });
  },

  /** Asks the backend to verify the PaymentIntent with Stripe and finalize the booking. */
  confirmStripePayment: async (paymentIntentId: string): Promise<StripeConfirmResponse> => {
    return apiClient.post(API_ENDPOINTS.PAYMENTS.STRIPE_CONFIRM, { paymentIntentId });
  },
};
