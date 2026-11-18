import { apiClient } from '../../../api/client';

export const TRAFFIC_FINE_TYPES = ['SPEEDING', 'RED_LIGHT', 'PARKING', 'SEATBELT', 'MOBILE_PHONE', 'LANE_VIOLATION', 'OTHER'] as const;
export type TrafficFineType = (typeof TRAFFIC_FINE_TYPES)[number];
export const TRAFFIC_FINE_STATUSES = ['UNMATCHED', 'CHARGED', 'DISPUTED', 'PAID', 'WAIVED'] as const;
export type TrafficFineStatus = (typeof TRAFFIC_FINE_STATUSES)[number];
export const OFFLINE_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'DEPOSIT', 'COMPANY'] as const;
export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

export interface TrafficFine {
  id: string;
  reference: string;
  offenceType: TrafficFineType;
  offenceAt: string;
  location: string | null;
  authority: string | null;
  fineAmount: number;
  adminFee: number;
  totalAmount: number;
  currency: string;
  status: TrafficFineStatus;
  notes: string | null;
  evidenceUrl: string | null;
  dueAt: string | null;
  disputeReason: string | null;
  disputedAt: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  createdAt: string;
  canDispute: boolean;
  vehicle: { id: string; name: string; registrationNumber: string };
  booking: { id: string; bookingNumber: string; pickupDateTime: string; returnDateTime: string } | null;
  customer: { id: string; fullName: string; email: string; phone: string | null } | null;
}

export interface TrafficFineMatch {
  vehicle: { id: string; name: string; registrationNumber: string };
  renter: { bookingId: string; bookingNumber: string; customerName: string } | null;
}

export interface NewTrafficFine {
  reference: string;
  plateNumber: string;
  offenceType: TrafficFineType;
  /** ISO date-time */
  offenceAt: string;
  fineAmount: number;
  adminFee?: number;
  location?: string;
  authority?: string;
  notes?: string;
  /** Photo or PDF of the challan as a data URL */
  evidence?: string;
}

export interface TrafficFinePaymentResult {
  success: boolean;
  paymentStatus: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  message: string | null;
  fine: TrafficFine;
}

type FineResponse = { success: boolean; fine: TrafficFine };

export const trafficFineApi = {
  list(params: { status?: TrafficFineStatus | ''; search?: string }) {
    return apiClient.get<{
      success: boolean;
      fines: TrafficFine[];
      counts: Record<TrafficFineStatus, number>;
      defaults: { adminFee: number; currency: string; paymentDays: number };
    }>('/traffic-fines', { params });
  },
  match(plate: string, at: string) {
    return apiClient.get<{ success: boolean; match: TrafficFineMatch }>('/traffic-fines/match', { params: { plate, at } });
  },
  create(payload: NewTrafficFine) {
    return apiClient.post<FineResponse>('/traffic-fines', payload, { timeoutMs: 60000 });
  },
  resolveDispute(id: string, decision: 'ACCEPT' | 'REJECT', response: string) {
    return apiClient.post<FineResponse>(`/traffic-fines/${id}/resolve-dispute`, { decision, response });
  },
  waive(id: string, reason: string) {
    return apiClient.post<FineResponse>(`/traffic-fines/${id}/waive`, { reason });
  },
  markPaid(id: string, method: OfflinePaymentMethod) {
    return apiClient.post<FineResponse>(`/traffic-fines/${id}/mark-paid`, { method });
  },

  mine() {
    return apiClient.get<{ success: boolean; fines: TrafficFine[]; outstanding: number; currency: string }>('/traffic-fines/mine');
  },
  dispute(id: string, reason: string) {
    return apiClient.post<FineResponse>(`/traffic-fines/${id}/dispute`, { reason });
  },
  createPaymentIntent(id: string) {
    return apiClient.post<{ success: boolean; paymentIntentId: string; clientSecret: string; amount: number; currency: string }>(
      `/traffic-fines/${id}/pay-intent`
    );
  },
  confirmPayment(paymentIntentId: string) {
    return apiClient.post<TrafficFinePaymentResult>('/traffic-fines/confirm-payment', { paymentIntentId });
  },
};
