import { apiClient } from '../../../api/client';

export const INSPECTION_VIEWS = ['FRONT', 'DRIVER_SIDE', 'PASSENGER_SIDE', 'REAR', 'ROOF', 'INTERIOR'] as const;
export type InspectionView = (typeof INSPECTION_VIEWS)[number];
export const REQUIRED_VIEWS: InspectionView[] = ['FRONT', 'DRIVER_SIDE', 'PASSENGER_SIDE', 'REAR'];

export type DamageCategory = 'SCRATCH' | 'DENT' | 'PAINT_CHIP' | 'CRACK' | 'BROKEN_PART';
export type DamageSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ComparisonClassification =
  | 'PRE_EXISTING_UNCHANGED'
  | 'PRE_EXISTING_WORSENED'
  | 'CONFIRMED_NEW_DAMAGE'
  | 'POSSIBLY_NEW_DAMAGE'
  | 'INCONCLUSIVE';

export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InspectionFinding {
  id: string;
  view: InspectionView;
  category: DamageCategory;
  damageType: string;
  severity: DamageSeverity;
  part: string;
  description: string;
  /** 0-100 */
  confidence: number;
  box: NormalizedBox;
  estimatedRepairCost: number;
  classification: ComparisonClassification | null;
  baselineFindingId: string | null;
  humanDecision: string | null;
}

export interface InspectionPhoto {
  id: string;
  view: InspectionView;
  imageUrl: string;
  qualityIssue?: string | null;
}

export interface InspectionReport {
  id: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  status: string;
  vehicleId: string;
  rentalId: string | null;
  createdAt: string;
  overallScore: number;
  conditionGrade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  summary: string | null;
  hasDamageDetected: boolean;
  coverageScore: number | null;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    registrationNumber: string;
    color?: string | null;
    vin?: string | null;
  };
  rental?: {
    id: string;
    booking?: { id: string; bookingNumber: string; currency?: string; customer?: { fullName: string; email?: string } };
  } | null;
  performedBy?: { id: string; fullName: string } | null;
  photos: InspectionPhoto[];
  findings: InspectionFinding[];
  totals: { findings: number; scratches: number; dents: number; estimatedRepairCost: number };
  comparison?: DamageComparison | null;
}

export interface DamageCharge {
  id: string;
  damageFindingId: string | null;
  description: string;
  proposedAmount: number;
  approvedAmount: number;
  currency: string;
  status: 'PROPOSED' | 'EVIDENCE_REVIEW' | 'APPROVED' | 'REJECTED' | 'CUSTOMER_NOTIFIED' | 'SETTLED' | 'DISPUTED';
  notes: string | null;
}

export interface DamageComparison {
  id: string;
  status: string;
  summary: string | null;
  coverageParityScore: number;
  preExistingCount: number;
  newDamageCount: number;
  inconclusiveCount: number;
  currency: string;
  depositAmount: number;
  totalProposedCharges: number;
  totalActiveCharges: number;
  bookingId: string;
  bookingNumber: string;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    registrationNumber: string;
    color?: string | null;
  };
  pickupInspection: InspectionReport | null;
  returnInspection: InspectionReport | null;
  matches: Array<{
    id: string;
    findingId: string | null;
    baselineFindingId: string | null;
    region: string;
    classification: ComparisonClassification;
    confidence: number;
    proposedCost: number;
  }>;
  charges: DamageCharge[];
}

export interface AnalyzeInspectionPayload {
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  vehicleId?: string;
  bookingId?: string;
  rentalId?: string;
  notes?: string;
  photos: Array<{ view: InspectionView; imageData: string }>;
}

export const inspectionApi = {
  getInspections(params: { vehicleId?: string; type?: string } = {}) {
    return apiClient.get<{ success: boolean; inspections: InspectionReport[] }>('/inspections', { params });
  },

  getInspectionById(id: string) {
    return apiClient.get<{ success: boolean; inspection: InspectionReport }>(`/inspections/${id}`);
  },

  getForBooking(bookingId: string) {
    return apiClient.get<{
      success: boolean;
      bookingNumber: string;
      inspections: InspectionReport[];
      comparison: DamageComparison | null;
    }>(`/inspections/booking/${bookingId}`);
  },

  getComparisonById(id: string) {
    return apiClient.get<{ success: boolean; comparison: DamageComparison }>(`/inspections/comparisons/${id}`);
  },

  /** Runs the AI vision inspection (usually 10-60 seconds). */
  analyze(payload: AnalyzeInspectionPayload) {
    return apiClient.post<{ success: boolean; inspection: InspectionReport }>('/inspections/analyze', payload, {
      timeoutMs: 180_000,
    });
  },

  reviewCharge(chargeId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) {
    return apiClient.patch<{ success: boolean; comparison: DamageComparison }>(
      `/inspections/charges/${chargeId}/review`,
      { decision, notes }
    );
  },
};
