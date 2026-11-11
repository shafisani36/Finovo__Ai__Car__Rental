import {
  compareViewSignatures,
  extractImageTelemetry,
  type ViewPixelTelemetry,
  type VisionColorResult,
  type VisionFinding,
  type VisionView,
} from './pixelVisionAnalyzer';

/**
 * Finovo AI Dynamic Computer Vision Vehicle Damage & Color Inspection Engine
 *
 * Analyzes real decoded RGBA pixels from uploaded/captured multi-angle vehicle photos:
 * - Dominant exterior paint color & finish from body panel clusters
 * - Localized scratches, dents, paint chips, and cracks via neighborhood texture & dipole analysis
 * - True baseline-vs-return perceptual + spatial pixel delta comparison (0 false bugs on identical scans)
 */

export interface DetectedDamageItem {
  id: string;
  damageType: string;
  category: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  confidence: number; // 0-100%
  boundingBox: {
    x: number; // 0.0 - 1.0 (normalized)
    y: number;
    width: number;
    height: number;
  };
  view: VisionView;
  estimatedRepairCost: number;
  description: string;
}

export type DetectedColorResult = VisionColorResult;

export interface AnalyzedReportPhoto {
  view: string;
  imageUrl: string;
  qualityScore?: number;
  pixelTelemetry?: ViewPixelTelemetry;
  baselineSimilarity?: number;
}

export interface ClientInspectionReport {
  id: string;
  type: 'PICKUP' | 'RETURN';
  detectedColor: DetectedColorResult;
  overallScore: number;
  summary: string;
  findings: DetectedDamageItem[];
  scratchesCount: number;
  dentsCount: number;
  coverageScore: number;
  inspectionHash: string;
  engineMode?: 'PIXEL_CV' | 'BASELINE_DELTA_CV' | 'SERVER_SYNCED';
  parityScore?: number;
  timestamp: string;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    registrationNumber: string;
    vin?: string;
  };
  photos: AnalyzedReportPhoto[];
}

export interface ClientComparisonReport {
  comparisonId: string;
  pickupReport: ClientInspectionReport;
  returnReport: ClientInspectionReport;
  preExistingDamages: DetectedDamageItem[];
  newDamages: DetectedDamageItem[];
  preExistingCount: number;
  newDamageCount: number;
  totalProposedCharges: number;
  securityDeposit: number;
  netRefundAmount: number;
  depositStatus: 'FULL_REFUND' | 'PARTIAL_DEDUCTION' | 'FULLY_CONSUMED';
  summary: string;
  timestamp: string;
}

const VALID_VIEWS: VisionView[] = [
  'FRONT',
  'DRIVER_SIDE',
  'PASSENGER_SIDE',
  'REAR',
  'ROOF',
  'INTERIOR',
];

function normalizeView(view?: string | null): VisionView {
  const upper = (view || 'FRONT').toUpperCase() as VisionView;
  return VALID_VIEWS.includes(upper) ? upper : 'FRONT';
}

export class InspectionAiEngine {
  private static COLOR_PALETTE = [
    { name: 'Alpine White', hex: '#F8FAFC', finish: 'GLOSS' as const },
    { name: 'Pearl White', hex: '#F3F1EC', finish: 'PEARL' as const },
    { name: 'Obsidian Black Metallic', hex: '#111827', finish: 'METALLIC' as const },
    { name: 'Nardo Gray', hex: '#6B7280', finish: 'GLOSS' as const },
    { name: 'Graphite Metallic', hex: '#374151', finish: 'METALLIC' as const },
    { name: 'San Marino Blue Metallic', hex: '#1D4ED8', finish: 'METALLIC' as const },
    { name: 'Melbourne Red', hex: '#DC2626', finish: 'METALLIC' as const },
    { name: 'Arancio Borealis (Orange)', hex: '#EA580C', finish: 'PEARL' as const },
    { name: 'Giallo Inti (Yellow)', hex: '#EAB308', finish: 'GLOSS' as const },
    { name: 'Isle of Man Green', hex: '#047857', finish: 'METALLIC' as const },
    { name: 'Silver Metallic', hex: '#CBD5E1', finish: 'METALLIC' as const },
  ];

  static detectCarColor(colorHint?: string | null): DetectedColorResult {
    if (colorHint) {
      const lower = colorHint.toLowerCase();
      const match = this.COLOR_PALETTE.find(
        (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase().split(' ')[0])
      );
      if (match) {
        return {
          colorName: match.name,
          hexCode: match.hex,
          confidence: 85,
          finishType: match.finish,
        };
      }
    }

    return {
      colorName: 'Silver Metallic',
      hexCode: '#CBD5E1',
      confidence: 72,
      finishType: 'METALLIC',
    };
  }

  static generateHash(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `FIN-CERT-${hex.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private static inferCategory(damageType: string): DetectedDamageItem['category'] {
    const lower = (damageType || '').toLowerCase();
    if (lower.includes('scratch') || lower.includes('scuff') || lower.includes('abrasion') || lower.includes('gouge')) {
      return 'SCRATCH';
    }
    if (lower.includes('crack') || lower.includes('fracture')) {
      return 'CRACK';
    }
    if (lower.includes('chip') || lower.includes('peel')) {
      return 'PAINT_CHIP';
    }
    return 'DENT';
  }

  private static isSameLocation(a: DetectedDamageItem, b: DetectedDamageItem): boolean {
    if (normalizeView(a.view) !== normalizeView(b.view)) return false;
    const ax = a.boundingBox.x + a.boundingBox.width / 2;
    const ay = a.boundingBox.y + a.boundingBox.height / 2;
    const bx = b.boundingBox.x + b.boundingBox.width / 2;
    const by = b.boundingBox.y + b.boundingBox.height / 2;
    return Math.hypot(ax - bx, ay - by) < 0.22 || (a.location === b.location && a.damageType === b.damageType);
  }

  private static mapVisionFinding(f: VisionFinding, idx: number): DetectedDamageItem {
    return {
      id: `cv-${Date.now()}-${idx}`,
      damageType: f.damageType,
      category: f.category,
      severity: f.severity,
      location: f.location,
      confidence: f.confidence,
      boundingBox: f.boundingBox,
      view: f.view,
      estimatedRepairCost: f.estimatedRepairCost,
      description: f.description,
    };
  }

  /**
   * Executes real pixel-level computer vision inspection across all uploaded photos.
   * When inspecting RETURN with baselineReport, compares each angle directly against Pickup
   * baseline pixels so unchanged cars yield 0 new defects.
   */
  static async runInspectionAsync(params: {
    type: 'PICKUP' | 'RETURN';
    vehicle: {
      brand: string;
      model: string;
      year: number;
      registrationNumber: string;
      vin?: string;
      color?: string;
    };
    photos: Array<{ view: string; imageUrl: string }>;
    baselineReport?: ClientInspectionReport | null;
  }): Promise<ClientInspectionReport> {
    const validPhotos = params.photos.filter((p) => Boolean(p.imageUrl && p.imageUrl.trim()));
    const analyzedViews = await Promise.all(
      validPhotos.map(async (p) => {
        const view = normalizeView(p.view);
        const extracted = await extractImageTelemetry(p.imageUrl, view);
        return { raw: p, view, ...extracted };
      })
    );

    // Prepare baseline photo telemetry map if performing RETURN comparison
    const baselineTelByView = new Map<VisionView, ViewPixelTelemetry>();
    if (params.type === 'RETURN' && params.baselineReport?.photos?.length) {
      await Promise.all(
        params.baselineReport.photos.map(async (bp) => {
          const bView = normalizeView(bp.view);
          if (bp.pixelTelemetry?.isDecoded && bp.pixelTelemetry.patchGridB64) {
            baselineTelByView.set(bView, bp.pixelTelemetry);
          } else if (bp.imageUrl) {
            const res = await extractImageTelemetry(bp.imageUrl, bView);
            if (res.telemetry.isDecoded) {
              baselineTelByView.set(bView, res.telemetry);
            }
          }
        })
      );
    }

    const findings: DetectedDamageItem[] = [];
    const outputPhotos: AnalyzedReportPhoto[] = [];
    const similarityScores: number[] = [];
    let findingCounter = 0;

    for (const item of analyzedViews) {
      const baseTel = baselineTelByView.get(item.view);
      const baseFindings = (params.baselineReport?.findings || []).filter(
        (bf) => normalizeView(bf.view) === item.view
      );

      if (params.type === 'RETURN' && baseTel && item.telemetry.isDecoded) {
        const delta = compareViewSignatures(baseTel, item.telemetry, item.view);
        similarityScores.push(delta.similarityScore);
        outputPhotos.push({
          view: item.view,
          imageUrl: item.raw.imageUrl,
          qualityScore: item.telemetry.qualityScore,
          pixelTelemetry: item.telemetry,
          baselineSimilarity: delta.similarityScore,
        });

        // Retain genuine pre-existing pickup marks
        for (const bf of baseFindings) {
          findings.push({ ...bf });
        }

        if (!delta.isIdentical) {
          for (const nf of delta.newFindings) {
            const mapped = this.mapVisionFinding(nf, ++findingCounter);
            if (!baseFindings.some((bf) => this.isSameLocation(bf, mapped))) {
              findings.push(mapped);
            }
          }
        }
      } else {
        outputPhotos.push({
          view: item.view,
          imageUrl: item.raw.imageUrl,
          qualityScore: item.telemetry.qualityScore,
          pixelTelemetry: item.telemetry,
        });

        for (const vf of item.findings) {
          findings.push(this.mapVisionFinding(vf, ++findingCounter));
        }
      }
    }

    // Exterior paint color measured from decoded pixels across exterior angles
    const pixelColors = analyzedViews
      .map((v) => v.telemetry.dominantColor)
      .filter((c): c is DetectedColorResult => Boolean(c));
    const detectedColor =
      pixelColors.length > 0
        ? pixelColors.sort((a, b) => b.confidence - a.confidence)[0]
        : this.detectCarColor(params.vehicle.color);

    const exteriorScannedCount = new Set(
      analyzedViews
        .filter((v) =>
          v.view === 'FRONT' ||
          v.view === 'DRIVER_SIDE' ||
          v.view === 'PASSENGER_SIDE' ||
          v.view === 'REAR'
        )
        .map((v) => v.view)
    ).size;
    const coverageScore = Math.min(100, Math.round((exteriorScannedCount / 4) * 100));

    const scratchesCount = findings.filter((f) => f.category === 'SCRATCH').length;
    const dentsCount = findings.filter((f) => f.category === 'DENT').length;

    let penalty = 0;
    for (const f of findings) {
      if (f.severity === 'HIGH') penalty += 14;
      else if (f.severity === 'MEDIUM') penalty += 7.5;
      else penalty += 3.5;
    }
    const overallScore = Number(Math.max(15, 100 - penalty).toFixed(1));

    const parityScore =
      similarityScores.length > 0
        ? Number((similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length).toFixed(1))
        : undefined;

    const baselineMatchClean =
      params.type === 'RETURN' &&
      Boolean(params.baselineReport) &&
      findings.length === (params.baselineReport?.findings.length || 0);

    const summary =
      baselineMatchClean
        ? `Return CV Scan (${params.vehicle.brand} ${params.vehicle.model}): Uploaded angles match pickup baseline (${parityScore ?? 100}% visual parity). Zero new exterior damage detected.`
        : findings.length === 0
        ? `${params.type} Computer Vision Scan (${params.vehicle.brand} ${params.vehicle.model}): Surface verified across ${validPhotos.length} angle(s) with zero scratches or dents detected.`
        : `${params.type} Computer Vision Scan (${params.vehicle.brand} ${params.vehicle.model}): Localized ${findings.length} surface anomaly/anomalies (${scratchesCount} scratch, ${dentsCount} dent) from pixel analysis.`;

    return {
      id: `insp-${Date.now()}`,
      type: params.type,
      detectedColor,
      overallScore,
      summary,
      findings,
      scratchesCount,
      dentsCount,
      coverageScore,
      engineMode: baselineTelByView.size > 0 ? 'BASELINE_DELTA_CV' : 'PIXEL_CV',
      parityScore,
      inspectionHash: this.generateHash(
        `${params.vehicle.brand}-${params.vehicle.model}-${params.type}-${Date.now()}`
      ),
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      vehicle: params.vehicle,
      photos: outputPhotos,
    };
  }

  static inferFindingView(
    region?: string | null,
    location?: string | null
  ): VisionView {
    const r = (region || '').toUpperCase();
    if (VALID_VIEWS.includes(r as VisionView)) {
      return r as VisionView;
    }
    const loc = (location || '').toLowerCase();
    if (loc.includes('rear') || loc.includes('tailgate') || loc.includes('boot')) return 'REAR';
    if (loc.includes('driver') || loc.includes('left')) return 'DRIVER_SIDE';
    if (loc.includes('passenger') || loc.includes('right')) return 'PASSENGER_SIDE';
    if (loc.includes('roof')) return 'ROOF';
    return 'FRONT';
  }

  /**
   * Converts a backend Inspection record into a ClientInspectionReport for display, comparison & PDF.
   */
  static fromServerRecord(
    record: {
      id: string;
      type: string;
      overallScore?: number | null;
      summary?: string | null;
      createdAt: string;
      photos?: Array<{
        view: string;
        imageUrl: string;
        qualityScore?: number | null;
        qualityDetails?: string | null;
      }>;
      findings?: Array<{
        id: string;
        damageType: string;
        severity: string;
        location: string;
        region?: string | null;
        confidence: number;
        boundingBox?: string | null;
        estimatedRepairCost?: number;
        status?: string;
        humanDecision?: string;
      }>;
    },
    vehicle: {
      brand: string;
      model: string;
      year?: number;
      registrationNumber: string;
      vin?: string;
      color?: string;
      primaryImageUrl?: string;
    }
  ): ClientInspectionReport {
    const mappedFindings: DetectedDamageItem[] = (record.findings || []).map((f) => {
      let parsedBox = { x: 0.25, y: 0.35, width: 0.16, height: 0.1 };
      if (f.boundingBox) {
        try {
          const raw = JSON.parse(f.boundingBox);
          parsedBox = {
            x: raw.x > 1 ? raw.x / 100 : raw.x,
            y: raw.y > 1 ? raw.y / 100 : raw.y,
            width: raw.width > 1 ? raw.width / 100 : raw.width,
            height: raw.height > 1 ? raw.height / 100 : raw.height,
          };
        } catch {
          // keep default
        }
      }
      const conf = Number(f.confidence ?? 0);
      const confidencePct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
      return {
        id: f.id,
        damageType: f.damageType,
        category: this.inferCategory(f.damageType),
        severity: (['LOW', 'MEDIUM', 'HIGH'].includes((f.severity || '').toUpperCase())
          ? f.severity.toUpperCase()
          : 'MEDIUM') as DetectedDamageItem['severity'],
        location: f.location,
        confidence: confidencePct,
        boundingBox: parsedBox,
        view: this.inferFindingView(f.region, f.location),
        estimatedRepairCost: Number(f.estimatedRepairCost || 0),
        description: f.damageType,
      };
    });

    // Hydrate color & telemetry from stored inspection photo qualityDetails when present
    let measuredColor: DetectedColorResult | undefined;
    const mappedPhotos: AnalyzedReportPhoto[] = (record.photos || []).map((p) => {
      let tel: ViewPixelTelemetry | undefined;
      if (p.qualityDetails) {
        try {
          const parsed = JSON.parse(p.qualityDetails);
          if (parsed.dominantColor && !measuredColor) {
            measuredColor = parsed.dominantColor;
          }
          if (parsed.dHash64 || parsed.patchGridB64) {
            tel = {
              view: normalizeView(p.view),
              width: 0,
              height: 0,
              isDecoded: Boolean(parsed.patchGridB64),
              dHash64: parsed.dHash64 || '',
              byteHash: parsed.byteHash || '',
              qualityScore: p.qualityScore ?? 88,
              meanLuma: typeof parsed.meanLuma === 'number' ? parsed.meanLuma : 128,
              dominantColor: parsed.dominantColor,
              patchGridB64: parsed.patchGridB64,
            };
          }
        } catch {
          // ignore unparseable telemetry
        }
      }
      return {
        view: p.view,
        imageUrl: p.imageUrl,
        qualityScore: p.qualityScore ?? undefined,
        pixelTelemetry: tel,
      };
    });

    const scratches = mappedFindings.filter((f) => f.category === 'SCRATCH').length;
    const dents = mappedFindings.filter((f) => f.category === 'DENT').length;

    return {
      id: record.id,
      type: record.type === 'RETURN' ? 'RETURN' : 'PICKUP',
      detectedColor: measuredColor || this.detectCarColor(vehicle.color),
      overallScore: record.overallScore ?? 100,
      summary: record.summary || 'Vehicle inspection documented.',
      findings: mappedFindings,
      scratchesCount: scratches,
      dentsCount: dents,
      coverageScore:
        mappedPhotos.length > 0 ? Math.min(100, Math.round((mappedPhotos.length / 4) * 100)) : 25,
      engineMode: 'SERVER_SYNCED',
      inspectionHash: this.generateHash(`${record.id}-${vehicle.registrationNumber}`),
      timestamp: new Date(record.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year || 2026,
        registrationNumber: vehicle.registrationNumber,
        vin: vehicle.vin,
      },
      photos:
        mappedPhotos.length > 0
          ? mappedPhotos
          : vehicle.primaryImageUrl
          ? [{ view: 'FRONT', imageUrl: vehicle.primaryImageUrl }]
          : [],
    };
  }

  /**
   * Compares Return Inspection Report vs Pickup Baseline Report using 1-to-1 spatial + region matching.
   */
  static compareReports(
    pickupReport: ClientInspectionReport,
    returnReport: ClientInspectionReport,
    securityDeposit: number = 50000
  ): ClientComparisonReport {
    const preExisting: DetectedDamageItem[] = [];
    const newDamages: DetectedDamageItem[] = [];
    const matchedPickupIndices = new Set<number>();

    returnReport.findings.forEach((retItem) => {
      const matchIdx = pickupReport.findings.findIndex(
        (pItem, idx) => !matchedPickupIndices.has(idx) && this.isSameLocation(pItem, retItem)
      );

      if (matchIdx >= 0) {
        matchedPickupIndices.add(matchIdx);
        preExisting.push(retItem);
      } else {
        newDamages.push(retItem);
      }
    });

    const totalProposedCharges = newDamages.reduce(
      (sum, item) => sum + Number(item.estimatedRepairCost || 0),
      0
    );

    let depositStatus: 'FULL_REFUND' | 'PARTIAL_DEDUCTION' | 'FULLY_CONSUMED' = 'FULL_REFUND';
    let netRefund = securityDeposit;

    if (totalProposedCharges > 0) {
      if (totalProposedCharges >= securityDeposit) {
        depositStatus = 'FULLY_CONSUMED';
        netRefund = 0;
      } else {
        depositStatus = 'PARTIAL_DEDUCTION';
        netRefund = securityDeposit - totalProposedCharges;
      }
    }

    const summary =
      newDamages.length === 0
        ? 'Vehicle returned in consistent condition with pickup baseline. No new damages detected. 100% Security Deposit authorized for refund.'
        : `AI Comparison identified ${newDamages.length} NEW damage incident(s) not present at pickup (${preExisting.length} pre-existing excluded). Total assessed repair charge: PKR ${totalProposedCharges.toLocaleString()}.`;

    return {
      comparisonId: `CMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      pickupReport,
      returnReport,
      preExistingDamages: preExisting,
      newDamages,
      preExistingCount: preExisting.length,
      newDamageCount: newDamages.length,
      totalProposedCharges,
      securityDeposit,
      netRefundAmount: netRefund,
      depositStatus,
      summary,
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };
  }
}
