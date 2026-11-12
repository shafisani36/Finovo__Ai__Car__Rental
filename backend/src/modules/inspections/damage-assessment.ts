/**
 * Deterministic damage assessment rules.
 *
 * The vision model only *detects* damage (what, where, how bad). Everything that affects money or the
 * condition percentage is calculated here with fixed rules, so the same findings always give the same
 * score and the same fine, and the model can never invent a price.
 */

export const INSPECTION_VIEWS = ['FRONT', 'DRIVER_SIDE', 'PASSENGER_SIDE', 'REAR', 'ROOF', 'INTERIOR'] as const;
export type InspectionView = (typeof INSPECTION_VIEWS)[number];

/** Angles every pickup and return inspection must contain. */
export const REQUIRED_VIEWS: InspectionView[] = ['FRONT', 'DRIVER_SIDE', 'PASSENGER_SIDE', 'REAR'];

export const DAMAGE_CATEGORIES = ['SCRATCH', 'DENT', 'PAINT_CHIP', 'CRACK', 'BROKEN_PART'] as const;
export type DamageCategory = (typeof DAMAGE_CATEGORIES)[number];

export const DAMAGE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type DamageSeverity = (typeof DAMAGE_SEVERITIES)[number];

/** Findings below this confidence are never charged automatically; they are flagged for staff review. */
export const MIN_CHARGEABLE_CONFIDENCE = 0.6;

/** Findings below this confidence are discarded as noise. */
export const MIN_REPORTABLE_CONFIDENCE = 0.4;

/** Bounding box normalized to 0..1 relative to the photo (x/y = top-left corner). */
export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AssessedFinding {
  view: InspectionView;
  category: DamageCategory;
  severity: DamageSeverity;
  part: string;
  description: string;
  confidence: number;
  box: NormalizedBox;
  estimatedRepairCost: number;
}

/**
 * Repair cost table in PKR (Pakistan market, independent workshop rates).
 * Converted with DAMAGE_COST_MULTIPLIER for other currencies or premium vehicles.
 */
const REPAIR_COST_PKR: Record<DamageCategory, Record<DamageSeverity, number>> = {
  SCRATCH: { LOW: 4000, MEDIUM: 10000, HIGH: 22000 },
  DENT: { LOW: 7000, MEDIUM: 18000, HIGH: 40000 },
  PAINT_CHIP: { LOW: 2500, MEDIUM: 6000, HIGH: 12000 },
  CRACK: { LOW: 8000, MEDIUM: 22000, HIGH: 55000 },
  BROKEN_PART: { LOW: 12000, MEDIUM: 30000, HIGH: 75000 },
};

/** Condition-score penalty points per finding. */
const CONDITION_PENALTY: Record<DamageCategory, Record<DamageSeverity, number>> = {
  SCRATCH: { LOW: 2, MEDIUM: 5, HIGH: 10 },
  DENT: { LOW: 3, MEDIUM: 8, HIGH: 15 },
  PAINT_CHIP: { LOW: 1.5, MEDIUM: 4, HIGH: 8 },
  CRACK: { LOW: 4, MEDIUM: 10, HIGH: 20 },
  BROKEN_PART: { LOW: 8, MEDIUM: 18, HIGH: 30 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isInspectionView(value: unknown): value is InspectionView {
  return typeof value === 'string' && (INSPECTION_VIEWS as readonly string[]).includes(value);
}

export function normalizeCategory(value: unknown): DamageCategory {
  const upper = String(value || '').toUpperCase().replace(/[\s-]+/g, '_');
  if ((DAMAGE_CATEGORIES as readonly string[]).includes(upper)) return upper as DamageCategory;
  if (upper.includes('SCRATCH') || upper.includes('SCUFF')) return 'SCRATCH';
  if (upper.includes('CHIP') || upper.includes('PEEL')) return 'PAINT_CHIP';
  if (upper.includes('CRACK') || upper.includes('SHATTER')) return 'CRACK';
  if (upper.includes('BROKEN') || upper.includes('MISSING')) return 'BROKEN_PART';
  return 'DENT';
}

export function normalizeSeverity(value: unknown): DamageSeverity {
  const upper = String(value || '').toUpperCase();
  if (upper === 'HIGH' || upper === 'SEVERE') return 'HIGH';
  if (upper === 'MEDIUM' || upper === 'MODERATE') return 'MEDIUM';
  return 'LOW';
}

/**
 * Converts a model box in [ymin, xmin, ymax, xmax] on a 0..1000 scale (Gemini's native format)
 * into a normalized {x, y, width, height}. Returns null for degenerate boxes.
 */
export function boxFromYxyx1000(raw: unknown): NormalizedBox | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const [ymin, xmin, ymax, xmax] = raw.map((n) => clamp(Number(n) / 1000, 0, 1));
  if (![ymin, xmin, ymax, xmax].every(Number.isFinite)) return null;
  const width = xmax - xmin;
  const height = ymax - ymin;
  if (width <= 0.005 || height <= 0.005) return null;
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return { x: r(xmin), y: r(ymin), width: r(width), height: r(height) };
}

export function intersectionOverUnion(a: NormalizedBox, b: NormalizedBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

export function repairCost(category: DamageCategory, severity: DamageSeverity, multiplier = 1): number {
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return roundMoney(REPAIR_COST_PKR[category][severity] * safeMultiplier);
}

/**
 * Removes duplicate detections of the same damage (same view, overlapping boxes), keeping the most
 * confident one. Prevents one scratch from being charged twice.
 */
export function dedupeFindings<T extends Pick<AssessedFinding, 'view' | 'box' | 'confidence'>>(findings: T[]): T[] {
  const sorted = [...findings].sort((a, b) => b.confidence - a.confidence);
  const kept: T[] = [];
  for (const finding of sorted) {
    const duplicate = kept.some(
      (k) => k.view === finding.view && intersectionOverUnion(k.box, finding.box) >= 0.5
    );
    if (!duplicate) kept.push(finding);
  }
  return kept;
}

/**
 * Condition score 0..100 derived only from the findings (100 = no visible damage).
 */
export function conditionScore(findings: Pick<AssessedFinding, 'category' | 'severity'>[]): number {
  const penalty = findings.reduce((sum, f) => sum + CONDITION_PENALTY[f.category][f.severity], 0);
  return Number(clamp(100 - penalty, 0, 100).toFixed(1));
}

export function conditionGrade(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
  if (score >= 95) return 'EXCELLENT';
  if (score >= 80) return 'GOOD';
  if (score >= 60) return 'FAIR';
  return 'POOR';
}

export type ComparisonClassification =
  | 'PRE_EXISTING_UNCHANGED'
  | 'PRE_EXISTING_WORSENED'
  | 'CONFIRMED_NEW_DAMAGE'
  | 'POSSIBLY_NEW_DAMAGE'
  | 'INCONCLUSIVE';

/**
 * Safety net on top of the model's comparison: a "new" damage that sits on top of a damage already
 * recorded at pickup (same angle, overlapping area) is treated as pre-existing, never charged twice.
 */
export function findOverlappingBaseline<T extends Pick<AssessedFinding, 'view' | 'box'>>(
  candidate: Pick<AssessedFinding, 'view' | 'box'>,
  baseline: T[]
): T | undefined {
  let best: T | undefined;
  let bestIou = 0.3;
  for (const b of baseline) {
    if (b.view !== candidate.view) continue;
    const iou = intersectionOverUnion(b.box, candidate.box);
    if (iou >= bestIou) {
      best = b;
      bestIou = iou;
    }
  }
  return best;
}

export function classifyNewDamage(
  candidate: Pick<AssessedFinding, 'view' | 'box' | 'confidence' | 'severity'>,
  baseline: Pick<AssessedFinding, 'view' | 'box' | 'severity'>[]
): ComparisonClassification {
  const severityRank: Record<DamageSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  const overlapping = findOverlappingBaseline(candidate, baseline);
  if (overlapping) {
    return severityRank[candidate.severity] > severityRank[overlapping.severity]
      ? 'PRE_EXISTING_WORSENED'
      : 'PRE_EXISTING_UNCHANGED';
  }
  return candidate.confidence >= MIN_CHARGEABLE_CONFIDENCE ? 'CONFIRMED_NEW_DAMAGE' : 'POSSIBLY_NEW_DAMAGE';
}

/** Only these classifications create a proposed fine. */
export function isChargeable(classification: ComparisonClassification): boolean {
  return classification === 'CONFIRMED_NEW_DAMAGE' || classification === 'PRE_EXISTING_WORSENED';
}

// ------------------------------------------------------------------
// Vehicle identity (photos must show the booked car)
// ------------------------------------------------------------------

export function normalizePlate(value: string | null | undefined): string {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** UNREAD when no plate was readable; one misread character is tolerated. */
export function comparePlate(read: string | null | undefined, registered: string): 'MATCH' | 'MISMATCH' | 'UNREAD' {
  const a = normalizePlate(read);
  const b = normalizePlate(registered);
  if (a.length < 3 || !b) return 'UNREAD';
  if (a === b) return 'MATCH';
  if (a.length >= 4 && (a.includes(b) || b.includes(a))) return 'MATCH';
  return editDistance(a, b) <= 1 ? 'MATCH' : 'MISMATCH';
}

/** UNKNOWN when the model could not tell the make. */
export function compareMake(detected: string | null | undefined, registered: string): 'MATCH' | 'MISMATCH' | 'UNKNOWN' {
  const clean = (s: string | null | undefined) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = clean(detected);
  const b = clean(registered);
  if (!a || !b || a === 'unknown') return 'UNKNOWN';
  if (a.includes(b) || b.includes(a)) return 'MATCH';
  const aliases: string[][] = [
    ['mercedes', 'mercedesbenz', 'benz'],
    ['volkswagen', 'vw'],
    ['suzuki', 'marutisuzuki'],
    ['mini', 'bmwmini'],
    ['landrover', 'rangerover'],
    ['chevrolet', 'chevy'],
  ];
  return aliases.some((group) => group.some((x) => a.includes(x)) && group.some((x) => b.includes(x)))
    ? 'MATCH'
    : 'MISMATCH';
}

// ------------------------------------------------------------------
// Two-pass consensus (reduces random false positives / negatives)
// ------------------------------------------------------------------

function sameDamage(
  a: Pick<AssessedFinding, 'view' | 'box' | 'part' | 'category'>,
  b: Pick<AssessedFinding, 'view' | 'box' | 'part' | 'category'>
): boolean {
  if (a.view !== b.view) return false;
  if (intersectionOverUnion(a.box, b.box) >= 0.2) return true;
  return a.category === b.category && a.part.trim().toLowerCase() === b.part.trim().toLowerCase();
}

/**
 * Keeps only findings reported by EVERY pass (used for NEW damage at return: the customer is charged
 * only for damage the model sees consistently). Confidence = lowest of the passes.
 */
export function intersectPasses(passes: AssessedFinding[][]): AssessedFinding[] {
  if (passes.length === 0) return [];
  const [first, ...rest] = passes;
  const kept: AssessedFinding[] = [];
  for (const f of first) {
    const matches = rest.map((pass) => pass.find((g) => sameDamage(f, g)));
    if (matches.every(Boolean)) {
      kept.push({ ...f, confidence: Math.min(f.confidence, ...matches.map((m) => m!.confidence)) });
    }
  }
  return dedupeFindings(kept);
}

/**
 * Keeps findings reported by ANY pass (used at pickup: every existing mark is recorded, so the customer
 * is never charged later for damage that was already there).
 */
export function unionPasses(passes: AssessedFinding[][]): AssessedFinding[] {
  return dedupeFindings(passes.flat());
}
