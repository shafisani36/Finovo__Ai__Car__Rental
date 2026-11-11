import { authClient } from '../../auth/api/authClient';
import type { ViewPixelTelemetry } from '../services/pixelVisionAnalyzer';

export interface DamageFinding {
  id: string;
  inspectionId: string;
  photoId?: string;
  damageType: string;
  severity: string;
  location: string;
  confidence: number;
  boundingBox?: string; // JSON string of { x, y, width, height }
  region?: string;
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
  view: 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR' | 'ROOF' | 'INTERIOR';
  imageUrl: string;
  qualityScore?: number | null;
  qualityDetails?: string | null;
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
      depositAmount?: number;
      customer: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
      };
      damage_comparisons?: Array<{
        id: string;
        status: string;
        summary?: string;
        preExistingCount: number;
        newDamageCount: number;
        totalProposedCharges: number;
        totalApprovedCharges: number;
      }>;
    };
    inspections?: InspectionRecord[];
  };
  photos: InspectionPhoto[];
  findings: DamageFinding[];
}

export type CreateInspectionPayload = AnalyzePayload;

export interface AnalyzePayload {
  vehicleId: string;
  rentalId?: string;
  bookingId?: string;
  pickupInspectionId?: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  summary?: string;
  simulatedDamage?: boolean;
  photos: Array<{
    view: 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR' | 'ROOF' | 'INTERIOR';
    imageUrl: string;
    pixelTelemetry?: Partial<ViewPixelTelemetry>;
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

  async compare(payload: {
    bookingId: string;
    pickupInspectionId: string;
    returnInspectionId: string;
    securityDeposit?: number;
  }): Promise<{ success: boolean; comparison: any }> {
    return authClient.request('/inspections/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getComparisonById(id: string): Promise<{ success: boolean; comparison: any }> {
    return authClient.request('/inspections/comparisons/' + id);
  },

  async analyze(payload: AnalyzePayload): Promise<{ success: boolean; inspection: InspectionRecord }> {
    return authClient.request<{ success: boolean; inspection: InspectionRecord }>('/inspections/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reviewFinding(
    findingId: string,
    payload: ReviewFindingPayload
  ): Promise<{
    success: boolean;
    finding: DamageFinding;
    maintenanceCreated?: boolean;
    maintenanceRecordId?: string | null;
    vehicleStatus?: string;
  }> {
    return authClient.request(`/inspections/findings/${findingId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
