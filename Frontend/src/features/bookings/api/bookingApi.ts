import { authClient } from '../../auth/api/authClient';

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupDateTime: string;
  returnDateTime: string;
  status:
    | 'DRAFT'
    | 'QUOTED'
    | 'RESERVED'
    | 'PENDING'
    | 'CONFIRMED'
    | 'READY_FOR_PICKUP'
    | 'ACTIVE'
    | 'RETURN_INSPECTION'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'REJECTED'
    | 'REQUIRES_REVIEW';
  dailyRate: number;
  totalDays: number;
  subtotal: number;
  taxAmount: number;
  depositAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
  promoDiscount?: number | string;
  pointsRedeemed?: number;
  pointsDiscount?: number | string;
  deliveryAddress?: string | null;
  collectionAddress?: string | null;
  deliveryFee?: number | string;
  cancellationFee?: number | string | null;
  refundAmount?: number | string | null;
  promoCode?: { code: string } | null;
  customer: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    driverLicenseNumber?: string;
    isLicenseVerified?: boolean;
  };
  vehicle: {
    id: string;
    brand: string;
    model: string;
    registrationNumber: string;
    primaryImageUrl?: string;
    category: {
      id: string;
      name: string;
    };
  };
  pickupBranch: {
    id: string;
    name: string;
    code: string;
    city: string;
  };
  returnBranch: {
    id: string;
    name: string;
    code: string;
    city: string;
  };
  rental?: {
    id: string;
    status: string;
    startMileage: number;
    endMileage?: number;
    startFuelLevel: string;
  };
}

export interface CreateBookingPayload {
  customerId?: string;
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupDateTime: string;
  returnDateTime: string;
  notes?: string;
  addons?: BookingAddonCode[];
  /** Optional promo code; the server checks it again when the booking is saved */
  promoCode?: string;
  /** Reward points the signed-in customer wants to spend on this booking */
  pointsToRedeem?: number;
  /** Address where the car is brought to the customer (adds a delivery fee) */
  deliveryAddress?: string;
  /** Address where the car is collected from at the end (adds a delivery fee) */
  collectionAddress?: string;
}

/** Extra checkout choices that change the server quote. */
export interface QuoteExtras {
  promoCode?: string;
  points?: number;
  deliveryAddress?: string;
  collectionAddress?: string;
}

export interface AppliedPromo {
  promoCodeId: string;
  code: string;
  description?: string | null;
  amount: number;
}

/** Public checkout rules served by GET /bookings/options. */
export interface BookingOptions {
  currency: string;
  /** Tax added to rentals, in percent, and its name (for example VAT) */
  taxRatePercent: number;
  taxLabel: string;
  deliveryFeePerTrip: number;
  points: { pointValue: number; minRedeemPoints: number; maxSharePercent: number; pointsPerHundred: number };
  cancellation: { freeCancellationHours: number; lateFee: 'ONE_DAY' };
}

export type BookingAddonCode = 'PROTECTION_STANDARD' | 'PROTECTION_PREMIUM' | 'GPS' | 'CHILD_SEAT' | 'EXTRA_DRIVER';

export interface BookingAddon {
  code: BookingAddonCode;
  description: string;
  unitPrice: number;
  chargeUnit: 'DAY' | 'BOOKING';
}

export interface QuoteAvailability {
  available: boolean;
  conflictReason?: string;
}

export interface PricingBreakdownItem {
  lineType: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  isTaxable?: boolean;
}

export interface QuoteResult {
  vehicleId: string;
  vehicleName: string;
  categoryName?: string;
  pricingMethod: 'daily' | 'per_km' | 'daily_extra_km' | 'hourly' | 'monthly';
  currency: string;
  pickupDateTime?: string;
  returnDateTime?: string;
  duration?: {
    totalHours: number;
    billableDays: number;
    billableHours: number;
    billableMonths: number;
    gracePeriodMinutes: number;
  };
  mileage?: {
    includedKm: number;
    estimatedKm: number;
    extraKm: number;
    isUnlimited: boolean;
  };
  rates?: {
    unitRate: number;
    billingUnit: string;
    extraKmRate?: number;
    minimumTripCharge?: number;
  };
  breakdown?: PricingBreakdownItem[];
  totalDays: number;
  dailyRate: number;
  subtotal: number;
  driverFee?: number;
  taxAmount: number;
  depositAmount: number;
  totalRental?: number;
  totalAmount: number;
  grandTotal?: number;
  addonsTotal?: number;
  selectedAddons?: BookingAddonCode[];
  taxRatePercent?: number;
  rentalTotal?: number;
  lineItems?: PricingBreakdownItem[];
  deliveryFee?: number;
  deliveryAddress?: string | null;
  collectionAddress?: string | null;
  promo?: AppliedPromo | null;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  pointValue?: number;
}

export interface CalendarEvent {
  id: string;
  bookingNumber: string;
  title: string;
  start: string;
  end: string;
  status: string;
  vehicleId: string;
  vehicleName: string;
  registration: string;
  customerName: string;
  totalAmount: number;
}

export const bookingApi = {
  list: async (params: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const qs = q.toString() ? `?${q.toString()}` : '';
    return authClient.request<{ success: boolean; bookings: Booking[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
      `/bookings${qs}`
    );
  },

  getById: async (id: string) => {
    return authClient.request<{ success: boolean; booking: Booking }>(`/bookings/${id}`);
  },

  getQuote: async (
    vehicleId: string,
    pickupDateTime: string,
    returnDateTime: string,
    options?: { estimatedKm?: number; driverRequired?: boolean }
  ) => {
    const q = new URLSearchParams({
      vehicleId,
      pickupDateTime,
      returnDateTime,
      ...(options?.estimatedKm !== undefined ? { estimatedKm: String(options.estimatedKm) } : {}),
      ...(options?.driverRequired !== undefined ? { driverRequired: String(options.driverRequired) } : {}),
    });
    return authClient.request<{ success: boolean; quote: QuoteResult }>(`/bookings/quote?${q.toString()}`);
  },

  checkAvailability: async (vehicleId: string, pickupDateTime: string, returnDateTime: string) => {
    const q = new URLSearchParams({ vehicleId, pickupDateTime, returnDateTime });
    return authClient.request<{ success: boolean; available: boolean; conflictReason?: string }>(
      `/bookings/availability?${q.toString()}`
    );
  },

  create: async (data: {
    customerId: string;
    vehicleId: string;
    pickupBranchId: string;
    returnBranchId: string;
    pickupDateTime: string;
    returnDateTime: string;
    estimatedKm?: number;
    driverRequired?: boolean;
    notes?: string;
  }) => {
    return authClient.request<{ success: boolean; booking: Booking }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id: string, status: string, reason?: string) => {
    return authClient.request<{ success: boolean; booking: Booking }>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },

  getCalendarEvents: async (start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return authClient.request<{ success: boolean; events: CalendarEvent[] }>(`/bookings/calendar${qs}`);
  },
};
