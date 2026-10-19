import { authClient } from '../../auth/api/authClient';

export interface DamageFinding {
  id: string;
  inspectionId: string;
  photoId?: string;
  damageType: string;
  severity: string;
  location: string;
  confidence: number;
  boundingBox?: string; // JSON string of { x, y, width, height }
  estimatedRepairCost?: number;
  status?: string;
  humanDecision?: string;
  isHumanVerified?: boolean;
  reviewedById?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface InspectionPhoto {
  id: string;
  inspectionId: string;
  view: 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR';
  imageUrl: string;
  createdAt: string;
}

export interface InspectionRecord {
  id: string;
  rentalId?: string;
  vehicleId: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  overallScore: number;
  summary?: string;
  hasDamageDetected: boolean;
  createdAt: string;
  performedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    registrationNumber: string;
    primaryImageUrl?: string;
    category?: {
      name: string;
    };
    photos?: Array<{ imageUrl: string; isPrimary: boolean }>;
  };
  rental?: {
    id: string;
    booking: {
      id: string;
      bookingNumber: string;
      customer: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
      };
    };
  };
  photos: InspectionPhoto[];
  findings: DamageFinding[];
}

export type CreateInspectionPayload = AnalyzePayload;

export interface AnalyzePayload {
  vehicleId: string;
  rentalId?: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  summary?: string;
  photos: Array<{
    view: 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR';
    imageUrl: string;
  }>;
}

export interface ReviewFindingPayload {
  decision: 'APPROVED_CLAIM' | 'REJECTED_FALSE_POSITIVE' | 'MAINTENANCE_SCHEDULED';
  notes?: string;
}

export const inspectionApi = {
  async getInspections(): Promise<{ success: boolean; inspections: InspectionRecord[] }> {
    return authClient.request<{ success: boolean; inspections: InspectionRecord[] }>('/inspections');
  },

  async getInspectionById(id: string): Promise<{ success: boolean; inspection: InspectionRecord }> {
    return authClient.request<{ success: boolean; inspection: InspectionRecord }>(`/inspections/${id}`);
  },

  async analyze(payload: AnalyzePayload): Promise<{ success: boolean; inspection: InspectionRecord }> {
    return authClient.request<{ success: boolean; inspection: InspectionRecord }>('/inspections/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reviewFinding(findingId: string, payload: ReviewFindingPayload): Promise<{ success: boolean; finding: DamageFinding }> {
    return authClient.request<{ success: boolean; finding: DamageFinding }>(`/inspections/findings/${findingId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
