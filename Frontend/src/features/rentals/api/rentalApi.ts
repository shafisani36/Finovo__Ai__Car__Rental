import { authClient } from '../../auth/api/authClient';

export interface RentalInspection {
  id: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  overallScore: number;
  summary?: string;
  hasDamageDetected: boolean;
  createdAt: string;
  photos?: Array<{
    id: string;
    view: string;
    imageUrl: string;
  }>;
  findings: Array<{
    id: string;
    damageType: string;
    severity: string;
    location: string;
    region?: string | null;
    confidence: number;
    boundingBox?: string | null;
    estimatedRepairCost: number;
    status: string;
  }>;
}

export interface RentalRecord {
  id: string;
  bookingId: string;
  vehicleId: string;
  startMileage: number;
  endMileage?: number | null;
  startFuelLevel: string;
  endFuelLevel?: string | null;
  pickedUpAt?: string;
  startedAt?: string;
  returnedAt?: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'DISPUTED';
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    pickupDateTime: string;
    returnDateTime: string;
    totalAmount: number;
    currency?: string;
    depositAmount?: number;
    customer: {
      id: string;
      fullName: string;
      email: string;
      phone?: string;
      driverLicenseNumber?: string;
    };
    pickupBranch: {
      id: string;
      name: string;
      city: string;
    };
    returnBranch: {
      id: string;
      name: string;
      city: string;
    };
  };
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    registrationNumber: string;
    primaryImageUrl?: string;
    mileage: number;
    category?: {
      id: string;
      name: string;
    };
  };
  inspections?: RentalInspection[];
}

export interface HandoverPayload {
  bookingId: string;
  startMileage: number;
  startFuelLevel: string;
  notes?: string;
  /** AI pickup inspection performed right before the handover */
  pickupInspectionId: string;
}

export interface SettlementLineItem {
  lineType: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  currency: string;
  isTaxable?: boolean;
  taxAmount?: number;
}

export interface SettlementPreview {
  rentalId?: string;
  bookingNumber?: string;
  vehicle?: string;
  pricingMethod: string;
  currency: string;
  odometer: {
    startOdometer: number;
    endOdometer: number;
    actualDistanceTraveled: number;
    includedKm: number;
    extraKm: number;
    extraKmRate: number;
    extraKmCharge: number;
  };
  duration: {
    agreedHours: number;
    actualHours: number;
    gracePeriodMinutes: number;
    lateHours: number;
    lateFee: number;
  };
  breakdown: {
    baseRental: number;
    extraKmCharge: number;
    lateFee: number;
    damageCharge: number;
    fuelCharge: number;
    manualAdjustment: number;
    taxAmount: number;
    finalRentalTotal: number;
  };
  depositAccounting: {
    originalDeposit: number;
    deductions: number;
    refundableDeposit: number;
  };
  financialSummary: {
    totalBilled: number;
    amountAlreadyPaid: number;
    netPayableOrRefund: number;
    isRefundDue: boolean;
  };
  lineItems: SettlementLineItem[];
}

export interface ReturnPayload {
  rentalId: string;
  endMileage: number;
  endFuelLevel: string;
  conditionNotes?: string;
  sendToMaintenance?: boolean;
  /** AI return inspection (compared with the pickup inspection); damage fines come from it */
  returnInspectionId?: string;
  fuelDiscrepancyCharge?: number;
  additionalAdjustment?: number;
}

export interface RentalAgreementSummary {
  agreementNumber: string;
  signerName: string;
  signedAt: string;
  termsVersion: string;
  emailedAt?: string | null;
}

export const rentalApi = {
  /** Current wording of the rental agreement terms the customer signs at pickup. */
  async getAgreementTerms(): Promise<{ success: boolean; version: string; terms: string[] }> {
    return authClient.request('/rentals/agreements/terms');
  },

  async getAgreement(bookingId: string): Promise<{ success: boolean; agreement: RentalAgreementSummary | null }> {
    return authClient.request(`/rentals/agreements/${bookingId}`);
  },

  /** Saves the customer's signature, builds the agreement PDF and emails it to the customer. */
  async signAgreement(payload: {
    bookingId: string;
    signerName: string;
    signatureDataUrl: string;
    accepted: boolean;
    pickupInspectionId?: string;
  }): Promise<{ success: boolean; agreement: RentalAgreementSummary }> {
    return authClient.request('/rentals/agreements', { method: 'POST', body: JSON.stringify(payload) });
  },

  /** Endpoint of the agreement PDF (download it with downloadProtectedFile). */
  agreementPdfEndpoint(bookingId: string): string {
    return `/rentals/agreements/${bookingId}/pdf`;
  },

  async getRentals(status?: string): Promise<{ success: boolean; rentals: RentalRecord[] }> {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return authClient.request<{ success: boolean; rentals: RentalRecord[] }>(`/rentals${query}`);
  },

  async getRentalById(id: string): Promise<{ success: boolean; rental: RentalRecord }> {
    return authClient.request<{ success: boolean; rental: RentalRecord }>(`/rentals/${id}`);
  },

  async handover(payload: HandoverPayload): Promise<{ success: boolean; rental: RentalRecord }> {
    return authClient.request<{ success: boolean; rental: RentalRecord }>('/rentals/handover', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async previewSettlement(
    payload: ReturnPayload
  ): Promise<{ success: boolean; settlement: SettlementPreview }> {
    return authClient.request<{ success: boolean; settlement: SettlementPreview }>(
      '/rentals/preview-settlement',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async returnVehicle(payload: ReturnPayload): Promise<{ success: boolean; rental: RentalRecord }> {
    return authClient.request<{ success: boolean; rental: RentalRecord }>('/rentals/return', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
