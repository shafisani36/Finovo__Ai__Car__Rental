import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { Booking, CreateBookingPayload, QuoteResult, CalendarEvent } from '../../features/bookings/api/bookingApi';

export const bookingsApi = {
  /**
   * Retrieves paginated bookings with optional status or customer filter
   */
  list: async (params: {
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    success: boolean;
    bookings: Booking[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    return apiClient.get(API_ENDPOINTS.BOOKINGS.LIST, { params });
  },

  /**
   * Single booking record
   */
  getById: async (id: string): Promise<{ success: boolean; booking: Booking }> => {
    return apiClient.get(API_ENDPOINTS.BOOKINGS.BY_ID(id));
  },

  /**
   * Calculates dynamic booking quote with breakdown
   */
  quote: async (params: {
    vehicleId: string;
    pickupDateTime: string;
    returnDateTime: string;
  }): Promise<{ success: boolean; quote: QuoteResult }> => {
    return apiClient.get(API_ENDPOINTS.BOOKINGS.QUOTE, { params });
  },

  /**
   * Tests date/time availability against existing confirmed reservations
   */
  checkAvailability: async (params: {
    vehicleId: string;
    pickupDateTime: string;
    returnDateTime: string;
    excludeBookingId?: string;
  }): Promise<{ success: boolean; available: boolean; conflictReason?: string }> => {
    return apiClient.get(API_ENDPOINTS.BOOKINGS.AVAILABILITY, { params });
  },

  /**
   * Creates a confirmed reservation
   */
  create: async (data: CreateBookingPayload): Promise<{ success: boolean; booking: Booking }> => {
    return apiClient.post(API_ENDPOINTS.BOOKINGS.CREATE, data);
  },

  /**
   * Updates booking lifecycle state (CONFIRMED, CANCELLED, REJECTED)
   */
  updateStatus: async (
    id: string,
    status: 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED',
    notes?: string
  ): Promise<{ success: boolean; booking: Booking }> => {
    return apiClient.patch(API_ENDPOINTS.BOOKINGS.UPDATE_STATUS(id), { status, notes });
  },

  /**
   * Retrieves scheduled calendar reservations
   */
  getCalendar: async (params?: {
    start?: string;
    end?: string;
    vehicleId?: string;
  }): Promise<{ success: boolean; events: CalendarEvent[] }> => {
    return apiClient.get(API_ENDPOINTS.BOOKINGS.CALENDAR, { params });
  },
};
