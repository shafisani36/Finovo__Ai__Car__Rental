import { authClient } from '../../auth/api/authClient';

export interface RentalInspection {
  id: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  overallScore: number;
  summary?: string;
  hasDamageDetected: boolean;
  createdAt: string;
  findings: Array<{
    id: string;
    damageType: string;
    severity: string;
    location: string;
    confidence: number;
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
  startedAt: string;
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
}

export interface ReturnPayload {
  rentalId: string;
  endMileage: number;
  endFuelLevel: string;
  conditionNotes?: string;
  sendToMaintenance?: boolean;
  damageCharges?: number;
  fuelCharges?: number;
  additionalAdjustment?: number;
  returnDateTime?: string;
}

export const rentalApi = {
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

  async previewSettlement(payload: ReturnPayload): Promise<{ success: boolean; settlement: any }> {
    return authClient.request<{ success: boolean; settlement: any }>('/rentals/preview-settlement', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async returnVehicle(payload: ReturnPayload): Promise<{ success: boolean; rental: RentalRecord }> {
    return authClient.request<{ success: boolean; rental: RentalRecord }>('/rentals/return', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
