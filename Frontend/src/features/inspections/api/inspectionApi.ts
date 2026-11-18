import { apiClient } from '../../../api/client';

/** Driver side is the left side of the car, passenger side the right side. */
export const INSPECTION_VIEWS = [
  'FRONT',
  'FRONT_LEFT',
  'DRIVER_SIDE',
  'REAR_LEFT',
  'REAR',
  'REAR_RIGHT',
  'PASSENGER_SIDE',
  'FRONT_RIGHT',
  'ROOF',
  'INTERIOR',
  'WHEEL_FRONT_LEFT',
  'WHEEL_FRONT_RIGHT',
  'WHEEL_REAR_LEFT',
  'WHEEL_REAR_RIGHT',
  'ODOMETER',
  'CHASSIS_NUMBER',
] as const;
export type InspectionView = (typeof INSPECTION_VIEWS)[number];
/** The 8 exterior angles: 4 sides and 4 corners at 45 degrees */
export const REQUIRED_VIEWS: InspectionView[] = [
  'FRONT',
  'FRONT_LEFT',
  'DRIVER_SIDE',
  'REAR_LEFT',
  'REAR',
  'REAR_RIGHT',
  'PASSENGER_SIDE',
  'FRONT_RIGHT',
];
export const OPTIONAL_VIEWS: InspectionView[] = INSPECTION_VIEWS.filter((v) => !REQUIRED_VIEWS.includes(v));

export type DamageCategory = 'SCRATCH' | 'DENT' | 'PAINT_CHIP' | 'CRACK' | 'BROKEN_PART' | 'PAINT_MARKED' | 'RUST';
export type DamageSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type ReportSection = 'EXTERIOR' | 'GLASS_LIGHTS' | 'WHEELS_TYRES' | 'INTERIOR';
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
  /** Panel name from the fixed list, e.g. LEFT_FRONT_DOOR */
  panel: string;
  /** Diagram code: category letter + severity level, e.g. D3 = high dent */
  code: string;
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

export interface DetectedVehicle {
  make: string | null;
  model: string | null;
  year: string | null;
  bodyType: string | null;
  color: string | null;
  colorHex: string | null;
  plate: string | null;
  mileageKm: number | null;
  chassisNumber: string | null;
}

export type CustomerScanStage = 'PICKUP' | 'RETURN';

export const DAMAGE_CATEGORIES = ['SCRATCH', 'DENT', 'PAINT_CHIP', 'CRACK', 'BROKEN_PART', 'PAINT_MARKED', 'RUST'] as const;
export const DAMAGE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as const;
/** Repaints and rust are never caused during a rental, so they are never charged */
export const NON_CHARGEABLE_CATEGORIES = ['PAINT_MARKED', 'RUST'];

/** One damage recorded by staff when the AI could not check the photos. */
export interface ManualFindingInput {
  view: InspectionView;
  panel: string;
  category: (typeof DAMAGE_CATEGORIES)[number];
  severity: (typeof DAMAGE_SEVERITIES)[number];
  description?: string;
  /** Return only: not there at pickup, so the customer is charged */
  newDamage?: boolean;
  chargeAmount?: number;
}

export interface InspectionReport {
  id: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  status: string;
  /** The AI could not check the photos; staff recorded (or must record) the damage by hand */
  manualReview?: boolean;
  /** Staff must record the damage before the car is handed over or returned */
  needsStaffReview?: boolean;
  aiUnavailableReason?: string | null;
  /** null for a car that is not in the fleet */
  vehicleId: string | null;
  rentalId: string | null;
  /** Set on a check the customer ran on their own rental car */
  bookingId?: string | null;
  customerStage?: CustomerScanStage | null;
  /** Booking of a customer's own check */
  booking?: { id: string; bookingNumber: string; customer?: { fullName: string } } | null;
  createdAt: string;
  overallScore: number;
  scoreOutOf10?: number | null;
  /** Condition % per section; null when no photo covered that section */
  sectionScores?: Record<ReportSection, number | null>;
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
  } | null;
  /** The vehicle as the AI read it from the photos */
  detectedVehicle?: DetectedVehicle | null;
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
  /** The customer's reason when the charge was disputed */
  disputeReason?: string | null;
  disputeOpenedAt?: string | null;
  disputeResolvedAt?: string | null;
  /** Staff answer to the dispute */
  disputeResponse?: string | null;
  /** Last moment the customer can still dispute the charge */
  disputeWindowEndsAt?: string | null;
}

/** A disputed damage charge in the staff review list. */
export interface DamageDispute {
  id: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  vehicle: string;
  registrationNumber: string;
  description: string;
  amount: number;
  currency: string;
  status: DamageCharge['status'];
  reason: string | null;
  response: string | null;
  openedAt: string | null;
  resolvedAt: string | null;
  /** Checks the customer ran on the car themselves */
  customerScans: Array<{ id: string; stage: CustomerScanStage; scoreOutOf10: number | null; createdAt: string }>;
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
      /** Checks the customer ran on the car themselves */
      customerScans: InspectionReport[];
      /** Which own checks the customer may run right now */
      selfScan: Record<CustomerScanStage, boolean>;
      comparison: DamageComparison | null;
    }>(`/inspections/booking/${bookingId}`);
  },

  /** The customer photographs their rental car (all 8 outside angles) and the AI checks it. */
  customerScan(bookingId: string, stage: CustomerScanStage, photos: AnalyzeInspectionPayload['photos']) {
    return apiClient.post<{ success: boolean; inspection: InspectionReport }>(
      `/inspections/booking/${bookingId}/customer-scan`,
      { stage, photos },
      { timeoutMs: 180_000 }
    );
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

  /** Customer disagrees with a damage charge and explains why. */
  openDispute(chargeId: string, reason: string) {
    return apiClient.post<{ success: boolean; status: 'DISPUTED' }>(`/inspections/charges/${chargeId}/dispute`, { reason });
  },

  /** Staff decision on a disputed charge: ACCEPT waives it (refunding it if already paid), REJECT keeps it. */
  resolveDispute(chargeId: string, decision: 'ACCEPT' | 'REJECT', response: string) {
    return apiClient.post<{
      success: boolean;
      decision: 'ACCEPT' | 'REJECT';
      refund: { refundedOnline: number; pendingManual: number; failed: number } | null;
    }>(`/inspections/charges/${chargeId}/resolve-dispute`, { decision, response });
  },

  listDisputes() {
    return apiClient.get<{ success: boolean; disputes: DamageDispute[] }>('/inspections/disputes');
  },

  /** Staff record the damage of an inspection the AI could not check. */
  completeManualReview(inspectionId: string, findings: ManualFindingInput[], notes?: string) {
    return apiClient.post<{ success: boolean; inspection: InspectionReport }>(`/inspections/${inspectionId}/manual-review`, {
      findings,
      notes,
    });
  },

  reviewCharge(chargeId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) {
    return apiClient.patch<{ success: boolean; comparison: DamageComparison }>(
      `/inspections/charges/${chargeId}/review`,
      { decision, notes }
    );
  },
};
