/**
 * Deterministic damage assessment rules.
 *
 * The vision model only *detects* damage (what, where, how bad). Everything that affects money or the
 * condition percentage is calculated here with fixed rules, so the same findings always give the same
 * score and the same fine, and the model can never invent a price.
 */

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

/** The 8 exterior angles (4 sides + 4 corners at 45 degrees) every pickup inspection must contain. */
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

/** Angles of inspections made before the corner photos were added; a return of such a rental needs these. */
export const LEGACY_REQUIRED_VIEWS: InspectionView[] = ['FRONT', 'DRIVER_SIDE', 'PASSENGER_SIDE', 'REAR'];

/** Photos that are read for numbers (odometer, chassis number), never checked for damage. */
export const DOCUMENT_VIEWS: InspectionView[] = ['ODOMETER', 'CHASSIS_NUMBER'];

export function isDocumentView(view: InspectionView): boolean {
  return DOCUMENT_VIEWS.includes(view);
}

export const DAMAGE_CATEGORIES = ['SCRATCH', 'DENT', 'PAINT_CHIP', 'CRACK', 'BROKEN_PART', 'PAINT_MARKED', 'RUST'] as const;
export type DamageCategory = (typeof DAMAGE_CATEGORIES)[number];

/** Repainted panels and rust are history or wear, never damage caused during a rental. */
export const NON_CHARGEABLE_CATEGORIES: DamageCategory[] = ['PAINT_MARKED', 'RUST'];

export const DAMAGE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as const;
export type DamageSeverity = (typeof DAMAGE_SEVERITIES)[number];

export const SEVERITY_RANK: Record<DamageSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, EXTREME: 4 };

export const REPORT_SECTIONS = ['EXTERIOR', 'GLASS_LIGHTS', 'WHEELS_TYRES', 'INTERIOR'] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

/**
 * Fixed list of panels, each in one report section and visible from the listed photo angles. The AI must
 * name one of these for every damage, so one damage seen from two angles is recognised as the same damage.
 */
export const VEHICLE_PANELS = {
  FRONT_BUMPER: { section: 'EXTERIOR', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'] },
  GRILLE: { section: 'EXTERIOR', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'] },
  HOOD: { section: 'EXTERIOR', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'] },
  ROOF: { section: 'EXTERIOR', views: ['ROOF'] },
  LEFT_FRONT_FENDER: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'FRONT_LEFT'] },
  LEFT_FRONT_DOOR: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'FRONT_LEFT'] },
  LEFT_REAR_DOOR: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'REAR_LEFT'] },
  LEFT_REAR_QUARTER: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'REAR_LEFT'] },
  LEFT_SIDE_SKIRT: { section: 'EXTERIOR', views: ['DRIVER_SIDE'] },
  LEFT_MIRROR: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'FRONT_LEFT', 'FRONT'] },
  RIGHT_FRONT_FENDER: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'FRONT_RIGHT'] },
  RIGHT_FRONT_DOOR: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'FRONT_RIGHT'] },
  RIGHT_REAR_DOOR: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'REAR_RIGHT'] },
  RIGHT_REAR_QUARTER: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'REAR_RIGHT'] },
  RIGHT_SIDE_SKIRT: { section: 'EXTERIOR', views: ['PASSENGER_SIDE'] },
  RIGHT_MIRROR: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'FRONT_RIGHT', 'FRONT'] },
  TRUNK: { section: 'EXTERIOR', views: ['REAR', 'REAR_LEFT', 'REAR_RIGHT'] },
  REAR_BUMPER: { section: 'EXTERIOR', views: ['REAR', 'REAR_LEFT', 'REAR_RIGHT'] },
  WINDSHIELD: { section: 'GLASS_LIGHTS', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'] },
  REAR_WINDOW: { section: 'GLASS_LIGHTS', views: ['REAR', 'REAR_LEFT', 'REAR_RIGHT'] },
  LEFT_WINDOWS: { section: 'GLASS_LIGHTS', views: ['DRIVER_SIDE'] },
  RIGHT_WINDOWS: { section: 'GLASS_LIGHTS', views: ['PASSENGER_SIDE'] },
  LEFT_HEADLIGHT: { section: 'GLASS_LIGHTS', views: ['FRONT', 'FRONT_LEFT'] },
  RIGHT_HEADLIGHT: { section: 'GLASS_LIGHTS', views: ['FRONT', 'FRONT_RIGHT'] },
  LEFT_TAILLIGHT: { section: 'GLASS_LIGHTS', views: ['REAR', 'REAR_LEFT'] },
  RIGHT_TAILLIGHT: { section: 'GLASS_LIGHTS', views: ['REAR', 'REAR_RIGHT'] },
  LEFT_FRONT_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_FRONT_LEFT', 'DRIVER_SIDE', 'FRONT_LEFT'] },
  LEFT_REAR_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_REAR_LEFT', 'DRIVER_SIDE', 'REAR_LEFT'] },
  RIGHT_FRONT_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_FRONT_RIGHT', 'PASSENGER_SIDE', 'FRONT_RIGHT'] },
  RIGHT_REAR_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_REAR_RIGHT', 'PASSENGER_SIDE', 'REAR_RIGHT'] },
  SEATS: { section: 'INTERIOR', views: ['INTERIOR'] },
  DASHBOARD: { section: 'INTERIOR', views: ['INTERIOR'] },
  STEERING_WHEEL: { section: 'INTERIOR', views: ['INTERIOR'] },
  DOOR_TRIMS: { section: 'INTERIOR', views: ['INTERIOR'] },
  HEADLINER: { section: 'INTERIOR', views: ['INTERIOR'] },
  CARPETS: { section: 'INTERIOR', views: ['INTERIOR'] },
} as const satisfies Record<string, { section: ReportSection; views: readonly InspectionView[] }>;
export type VehiclePanel = keyof typeof VEHICLE_PANELS;
export const PANEL_NAMES = Object.keys(VEHICLE_PANELS) as VehiclePanel[];

export function isVehiclePanel(value: unknown): value is VehiclePanel {
  return typeof value === 'string' && value in VEHICLE_PANELS;
}

/**
 * Panel of a finding: the AI's panel when valid, otherwise derived from the free-text part name and the
 * photo angle (used for findings saved before panels existed).
 */
export function normalizePanel(value: unknown, part: string, view: InspectionView): VehiclePanel {
  const upper = String(value || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (isVehiclePanel(upper)) return upper;
  const text = `${part} ${String(value || '')}`.toLowerCase();
  const leftView = ['DRIVER_SIDE', 'FRONT_LEFT', 'REAR_LEFT', 'WHEEL_FRONT_LEFT', 'WHEEL_REAR_LEFT'].includes(view);
  const rightView = ['PASSENGER_SIDE', 'FRONT_RIGHT', 'REAR_RIGHT', 'WHEEL_FRONT_RIGHT', 'WHEEL_REAR_RIGHT'].includes(view);
  const side = /\b(left|driver)\b/.test(text) ? 'LEFT' : /\b(right|passenger)\b/.test(text) ? 'RIGHT' : leftView ? 'LEFT' : rightView ? 'RIGHT' : 'LEFT';
  const rear = /\brear|back\b/.test(text) || view.startsWith('REAR');
  if (view === 'INTERIOR') {
    if (/seat/.test(text)) return 'SEATS';
    if (/steering/.test(text)) return 'STEERING_WHEEL';
    if (/door/.test(text)) return 'DOOR_TRIMS';
    if (/roof|headliner|ceiling/.test(text)) return 'HEADLINER';
    if (/carpet|floor|mat/.test(text)) return 'CARPETS';
    return 'DASHBOARD';
  }
  if (/windshield|windscreen/.test(text)) return 'WINDSHIELD';
  if (/rear window|back glass|rear glass/.test(text)) return 'REAR_WINDOW';
  if (/window|glass/.test(text)) return side === 'LEFT' ? 'LEFT_WINDOWS' : 'RIGHT_WINDOWS';
  if (/head ?light|headlamp/.test(text)) return side === 'LEFT' ? 'LEFT_HEADLIGHT' : 'RIGHT_HEADLIGHT';
  if (/tail ?light|tail ?lamp|rear light/.test(text)) return side === 'LEFT' ? 'LEFT_TAILLIGHT' : 'RIGHT_TAILLIGHT';
  if (/wheel|rim|tyre|tire/.test(text)) return `${side}_${rear ? 'REAR' : 'FRONT'}_WHEEL` as VehiclePanel;
  if (/mirror/.test(text)) return side === 'LEFT' ? 'LEFT_MIRROR' : 'RIGHT_MIRROR';
  if (/grille/.test(text)) return 'GRILLE';
  if (/hood|bonnet/.test(text)) return 'HOOD';
  if (/roof/.test(text)) return 'ROOF';
  if (/trunk|boot|tailgate|hatch/.test(text)) return 'TRUNK';
  if (/bumper/.test(text)) return rear ? 'REAR_BUMPER' : 'FRONT_BUMPER';
  if (/skirt|sill|rocker/.test(text)) return side === 'LEFT' ? 'LEFT_SIDE_SKIRT' : 'RIGHT_SIDE_SKIRT';
  if (/quarter/.test(text)) return side === 'LEFT' ? 'LEFT_REAR_QUARTER' : 'RIGHT_REAR_QUARTER';
  if (/fender|wing/.test(text)) return side === 'LEFT' ? 'LEFT_FRONT_FENDER' : 'RIGHT_FRONT_FENDER';
  if (/door/.test(text)) return `${side}_${rear ? 'REAR' : 'FRONT'}_DOOR` as VehiclePanel;
  if (view === 'FRONT') return 'FRONT_BUMPER';
  if (view === 'REAR') return 'REAR_BUMPER';
  if (view === 'ROOF') return 'ROOF';
  return `${side}_FRONT_DOOR` as VehiclePanel;
}

/** Short code of a finding for the diagram, e.g. "D3" = high dent. */
const CATEGORY_CODE: Record<DamageCategory, string> = {
  SCRATCH: 'S',
  DENT: 'D',
  PAINT_CHIP: 'C',
  CRACK: 'K',
  BROKEN_PART: 'B',
  PAINT_MARKED: 'P',
  RUST: 'R',
};

export function findingCode(category: DamageCategory, severity: DamageSeverity): string {
  return `${CATEGORY_CODE[category]}${SEVERITY_RANK[severity]}`;
}

/** Findings below this confidence are never charged automatically; they are flagged for staff review. */
export const MIN_CHARGEABLE_CONFIDENCE = 0.6;

/** Findings below this confidence are discarded as noise. */
/**
 * Version of the AI rules (prompt, severity scale, scoring). Saved on every inspection; an earlier scan is only
 * reused for identical photos when it was made with the same rules.
 */
export const AI_RULES_VERSION = 'v3.2';

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
  panel: VehiclePanel;
}

/**
 * Repair cost table in PKR (Pakistan market, independent workshop rates).
 * Converted with DAMAGE_COST_MULTIPLIER for other currencies or premium vehicles.
 */
const REPAIR_COST_PKR: Record<DamageCategory, Record<DamageSeverity, number>> = {
  SCRATCH: { LOW: 4000, MEDIUM: 10000, HIGH: 22000, EXTREME: 45000 },
  DENT: { LOW: 7000, MEDIUM: 18000, HIGH: 40000, EXTREME: 90000 },
  PAINT_CHIP: { LOW: 2500, MEDIUM: 6000, HIGH: 12000, EXTREME: 25000 },
  CRACK: { LOW: 8000, MEDIUM: 22000, HIGH: 55000, EXTREME: 110000 },
  BROKEN_PART: { LOW: 12000, MEDIUM: 30000, HIGH: 75000, EXTREME: 150000 },
  // A repainted panel is already repaired: it lowers the condition but has no repair cost
  PAINT_MARKED: { LOW: 0, MEDIUM: 0, HIGH: 0, EXTREME: 0 },
  RUST: { LOW: 5000, MEDIUM: 12000, HIGH: 25000, EXTREME: 45000 },
};

/** Condition-score penalty points per finding. */
const CONDITION_PENALTY: Record<DamageCategory, Record<DamageSeverity, number>> = {
  SCRATCH: { LOW: 3, MEDIUM: 7, HIGH: 12, EXTREME: 20 },
  DENT: { LOW: 4, MEDIUM: 10, HIGH: 18, EXTREME: 28 },
  PAINT_CHIP: { LOW: 2, MEDIUM: 5, HIGH: 9, EXTREME: 14 },
  CRACK: { LOW: 6, MEDIUM: 12, HIGH: 22, EXTREME: 32 },
  BROKEN_PART: { LOW: 10, MEDIUM: 20, HIGH: 32, EXTREME: 45 },
  PAINT_MARKED: { LOW: 3, MEDIUM: 5, HIGH: 8, EXTREME: 12 },
  RUST: { LOW: 4, MEDIUM: 9, HIGH: 16, EXTREME: 26 },
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
  if (upper.includes('REPAINT') || upper.includes('PAINT_MARK') || upper.includes('PAINT_MISMATCH')) return 'PAINT_MARKED';
  if (upper.includes('RUST') || upper.includes('CORROSION')) return 'RUST';
  if (upper.includes('SCRATCH') || upper.includes('SCUFF')) return 'SCRATCH';
  if (upper.includes('CHIP') || upper.includes('PEEL')) return 'PAINT_CHIP';
  if (upper.includes('CRACK') || upper.includes('SHATTER')) return 'CRACK';
  if (upper.includes('BROKEN') || upper.includes('MISSING')) return 'BROKEN_PART';
  return 'DENT';
}

export function normalizeSeverity(value: unknown): DamageSeverity {
  const upper = String(value || '').toUpperCase();
  if (upper === 'EXTREME' || upper === 'CRITICAL') return 'EXTREME';
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

/** True when two boxes overlap or are less than 2% of the photo apart. */
export function boxesTouch(a: NormalizedBox, b: NormalizedBox, gap = 0.02): boolean {
  return (
    a.x <= b.x + b.width + gap &&
    b.x <= a.x + a.width + gap &&
    a.y <= b.y + b.height + gap &&
    b.y <= a.y + a.height + gap
  );
}

/** Smallest box that contains both boxes. */
export function unionBox(a: NormalizedBox, b: NormalizedBox): NormalizedBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return {
    x: r(x),
    y: r(y),
    width: r(Math.max(a.x + a.width, b.x + b.width) - x),
    height: r(Math.max(a.y + a.height, b.y + b.height) - y),
  };
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
export function dedupeFindings<T extends Pick<AssessedFinding, 'view' | 'box' | 'confidence'> & { panel?: VehiclePanel; category?: DamageCategory }>(
  findings: T[]
): T[] {
  const sorted = [...findings].sort((a, b) => b.confidence - a.confidence);
  const kept: T[] = [];
  for (const finding of sorted) {
    const samePanelAndKind = (k: T) => Boolean(k.panel) && k.panel === finding.panel && k.category === finding.category;
    const index = kept.findIndex((k) => {
      if (k.view !== finding.view) {
        // The same panel and kind of damage seen from two angles (e.g. side and corner photo) is one damage
        return samePanelAndKind(k);
      }
      if (intersectionOverUnion(k.box, finding.box) >= 0.5) return true;
      // One scrape split into touching or overlapping pieces on the same panel is one damage
      return samePanelAndKind(k) && boxesTouch(k.box, finding.box);
    });
    if (index === -1) {
      kept.push(finding);
    } else if (kept[index].view === finding.view && samePanelAndKind(kept[index])) {
      // Keep the more confident finding, with a box that covers the whole damage area
      kept[index] = { ...kept[index], box: unionBox(kept[index].box, finding.box) };
    }
  }
  return kept;
}

/**
 * Condition score 0..100 derived only from the findings (100 = no visible damage).
 * The penalty points shrink the score proportionally (100 x e^(-points/100)): a few damages cost nearly their
 * full points, while many medium damages leave a poor but realistic score instead of a wreck's 0.
 * Examples: one small scratch 97, a long scrape on two panels 79, seven mixed damages 46, a wreck under 10.
 */
export function conditionScore(findings: Pick<AssessedFinding, 'category' | 'severity'>[]): number {
  const penalty = findings.reduce((sum, f) => sum + CONDITION_PENALTY[f.category][f.severity], 0);
  return Number(clamp(100 * Math.exp(-penalty / 100), 0, 100).toFixed(1));
}

/** Condition % of each report section (null when no photo covered that section). */
export function sectionScores(
  findings: Pick<AssessedFinding, 'category' | 'severity' | 'panel'>[],
  photographedViews: InspectionView[]
): Record<ReportSection, number | null> {
  const result = {} as Record<ReportSection, number | null>;
  for (const section of REPORT_SECTIONS) {
    const covered = PANEL_NAMES.some(
      (panel) => VEHICLE_PANELS[panel].section === section && VEHICLE_PANELS[panel].views.some((v) => photographedViews.includes(v))
    );
    if (!covered) {
      result[section] = null;
      continue;
    }
    result[section] = conditionScore(findings.filter((f) => VEHICLE_PANELS[f.panel].section === section));
  }
  return result;
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
export function findOverlappingBaseline<T extends Pick<AssessedFinding, 'view' | 'box' | 'panel' | 'category'>>(
  candidate: Pick<AssessedFinding, 'view' | 'box' | 'panel' | 'category'>,
  baseline: T[]
): T | undefined {
  let best: T | undefined;
  let bestIou = 0.3;
  for (const b of baseline) {
    // Seen from another angle, or recorded by staff without a marked area: the same panel with the same
    // kind of damage is the same damage
    if (b.view !== candidate.view || b.box.width <= 0 || b.box.height <= 0) {
      if (!best && candidate.panel && b.panel === candidate.panel && b.category === candidate.category) best = b;
      continue;
    }
    const iou = intersectionOverUnion(b.box, candidate.box);
    if (iou >= bestIou) {
      best = b;
      bestIou = iou;
    }
  }
  return best;
}

export function classifyNewDamage(
  candidate: Pick<AssessedFinding, 'view' | 'box' | 'confidence' | 'severity' | 'panel' | 'category'>,
  baseline: Pick<AssessedFinding, 'view' | 'box' | 'severity' | 'panel' | 'category'>[]
): ComparisonClassification {
  const overlapping = findOverlappingBaseline(candidate, baseline);
  if (overlapping) {
    return SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[overlapping.severity] &&
      !NON_CHARGEABLE_CATEGORIES.includes(candidate.category)
      ? 'PRE_EXISTING_WORSENED'
      : 'PRE_EXISTING_UNCHANGED';
  }
  // A repaint or rust is never caused during a rental: staff look at it, nobody is charged for it
  if (NON_CHARGEABLE_CATEGORIES.includes(candidate.category)) return 'INCONCLUSIVE';
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

/**
 * Colour family of a free-text colour name ("Pearl white" -> white, "Gunmetal" -> grey). Shades that look
 * alike in photos share a family, so lighting differences are not reported as a different car.
 */
export function colorFamily(name: string | null | undefined): string | null {
  const text = String(name || '').toLowerCase();
  if (!text.trim()) return null;
  const families: Array<[string, string[]]> = [
    ['white', ['white', 'pearl', 'ivory', 'cream', 'snow', 'alabaster', 'frost']],
    ['black', ['black', 'onyx', 'obsidian', 'ebony', 'jet', 'midnight', 'phantom']],
    ['grey', ['grey', 'gray', 'silver', 'graphite', 'gunmetal', 'charcoal', 'titanium', 'platinum', 'metallic']],
    ['red', ['red', 'maroon', 'burgundy', 'crimson', 'wine', 'ruby']],
    ['blue', ['blue', 'navy', 'teal', 'turquoise', 'cyan', 'azure', 'cobalt', 'indigo', 'sapphire', 'aqua']],
    ['green', ['green', 'olive', 'lime', 'emerald', 'mint', 'jade']],
    ['brown', ['brown', 'beige', 'bronze', 'tan', 'champagne', 'copper', 'khaki', 'sand']],
    ['yellow', ['yellow', 'gold', 'mustard']],
    ['orange', ['orange']],
    ['purple', ['purple', 'violet', 'magenta', 'lilac']],
  ];
  // The last colour word names the colour ("Midnight blue" is blue, "Pearl white" is white); words before it
  // are shades or finishes. Fall back to shade words when no basic colour word is present ("Gunmetal").
  const words = text.split(/[^a-z]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const basic = families.find(([family]) => family === words[i] || (family === 'grey' && words[i] === 'gray'));
    if (basic) return basic[0];
  }
  for (const [family, shades] of families) {
    if (shades.some((w) => text.includes(w))) return family;
  }
  return null;
}

/** Colour families that can look like each other in a photo (shade, shadow, reflections). */
const LOOK_ALIKE_FAMILIES: Array<[string, string]> = [
  ['black', 'grey'],
  ['black', 'blue'],
  ['black', 'green'],
  ['black', 'brown'],
  ['black', 'purple'],
  ['white', 'grey'],
  ['white', 'yellow'],
  ['white', 'brown'],
  ['brown', 'yellow'],
  ['brown', 'orange'],
  ['red', 'orange'],
  ['red', 'purple'],
  ['yellow', 'orange'],
  ['blue', 'grey'],
  ['blue', 'purple'],
  ['green', 'grey'],
];

/**
 * MATCH: same colour family. NEAR: different families that can look alike in a photo, so no conclusion.
 * MISMATCH: clearly a different colour (e.g. black vs white). UNKNOWN: a colour is missing or not recognised.
 */
export function compareColor(
  detected: string | null | undefined,
  registered: string | null | undefined
): 'MATCH' | 'NEAR' | 'MISMATCH' | 'UNKNOWN' {
  const a = colorFamily(detected);
  const b = colorFamily(registered);
  if (!a || !b) return 'UNKNOWN';
  if (a === b) return 'MATCH';
  return LOOK_ALIKE_FAMILIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ? 'NEAR' : 'MISMATCH';
}

// ------------------------------------------------------------------
// Two-pass consensus (reduces random false positives / negatives)
// ------------------------------------------------------------------

function sameDamage(
  a: Pick<AssessedFinding, 'view' | 'box' | 'part' | 'category' | 'panel'>,
  b: Pick<AssessedFinding, 'view' | 'box' | 'part' | 'category' | 'panel'>
): boolean {
  // From two angles, only a known panel ties two findings together (older findings may have no panel)
  if (a.view !== b.view) return Boolean(a.panel) && a.panel === b.panel && a.category === b.category;
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
 * Combines the passes of a pickup or routine scan. A damage seen in any pass is kept (so existing marks are
 * recorded and never charged later), except a damage seen only once with low confidence, which is noise.
 * Its severity is the middle answer of the passes (the lower one on a tie), so one pass calling a scuff
 * "high" does not swing the score.
 */
export function unionPasses(
  passes: AssessedFinding[][],
  costOf?: (category: DamageCategory, severity: DamageSeverity) => number
): AssessedFinding[] {
  if (passes.length <= 1) return dedupeFindings(passes.flat());
  const groups: Array<{ members: AssessedFinding[]; passIndexes: Set<number> }> = [];
  passes.forEach((pass, passIndex) => {
    for (const finding of pass) {
      const group = groups.find((g) => g.members.some((m) => sameDamage(m, finding)));
      if (group) {
        group.members.push(finding);
        group.passIndexes.add(passIndex);
      } else {
        groups.push({ members: [finding], passIndexes: new Set([passIndex]) });
      }
    }
  });
  const combined: AssessedFinding[] = [];
  for (const { members, passIndexes } of groups) {
    const best = members.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    if (passIndexes.size === 1 && best.confidence < MIN_CHARGEABLE_CONFIDENCE) continue;
    const severities = members.map((m) => m.severity).sort((a, b) => SEVERITY_RANK[a] - SEVERITY_RANK[b]);
    const severity = severities[Math.floor((severities.length - 1) / 2)];
    combined.push({
      ...best,
      severity,
      estimatedRepairCost: costOf ? costOf(best.category, severity) : best.estimatedRepairCost,
    });
  }
  return dedupeFindings(combined);
}
