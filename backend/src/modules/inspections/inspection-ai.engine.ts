import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.config';
import {
  analyzeTensorRgba,
  compareViewTelemetry,
  decodePngToTensor,
  detectSingleViewAnomalies,
  type InspectionView,
  type VisionColorResult,
  type VisionDamageFinding,
  type ViewPixelTelemetry,
} from './vision-core';

export interface DetectedDamageItem {
  id?: string;
  damageType: string;
  category: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  confidence: number; // 0.0 - 1.0
  boundingBox: {
    x: number; // normalized 0.0 - 1.0
    y: number;
    width: number;
    height: number;
  };
  view: InspectionView;
  estimatedRepairCost: number;
  description: string;
}

export type DetectedColorResult = VisionColorResult;

export interface AnalyzedPhotoMetadata {
  view: InspectionView;
  qualityScore: number;
  sha256Hash: string;
  fileSizeBytes?: number;
  dimensions?: string;
  qualityDetails: string;
}

export interface InspectionAnalysisResult {
  detectedColor: DetectedColorResult;
  overallScore: number;
  hasDamageDetected: boolean;
  summary: string;
  findings: DetectedDamageItem[];
  scratchesCount: number;
  dentsCount: number;
  coverageScore: number;
  inspectionHash: string;
  engineMode: 'MULTIMODAL_LLM' | 'PIXEL_CV_BASELINE_DELTA' | 'PIXEL_CV_SINGLE_FRAME';
  photoMetadata: AnalyzedPhotoMetadata[];
  parityScore?: number;
}

export interface ComparisonResult {
  pickupInspectionId: string;
  returnInspectionId: string;
  preExistingDamages: DetectedDamageItem[];
  newDamages: DetectedDamageItem[];
  preExistingCount: number;
  newDamageCount: number;
  totalProposedCharges: number;
  coverageParityScore: number;
  summary: string;
  depositStatus: 'FULL_REFUND' | 'PARTIAL_DEDUCTION' | 'FULLY_CONSUMED';
  netRefundAmount?: number;
}

export interface InputPhotoWithTelemetry {
  view: InspectionView;
  imageUrl: string;
  pixelTelemetry?: Partial<ViewPixelTelemetry>;
}

export interface BaselineStoredPhoto {
  view: string;
  imageUrl: string;
  sha256Hash?: string | null;
  qualityDetails?: string | null;
  qualityScore?: number | null;
}

interface LoadedImageBuffer {
  buffer: Buffer;
  mimeType: string;
  sha256Hash: string;
}

const VALID_VIEWS: InspectionView[] = [
  'FRONT',
  'DRIVER_SIDE',
  'PASSENGER_SIDE',
  'REAR',
  'ROOF',
  'INTERIOR',
];

function normalizeView(view: string | undefined | null): InspectionView {
  const upper = (view || 'FRONT').toUpperCase() as InspectionView;
  return VALID_VIEWS.includes(upper) ? upper : 'FRONT';
}

export class InspectionAiEngine {
  private static COLOR_PALETTE: Array<{
    name: string;
    hex: string;
    finish: 'METALLIC' | 'GLOSS' | 'MATTE' | 'PEARL';
  }> = [
    { name: 'Alpine White', hex: '#F8FAFC', finish: 'GLOSS' },
    { name: 'Pearl White', hex: '#F3F1EC', finish: 'PEARL' },
    { name: 'Obsidian Black Metallic', hex: '#111827', finish: 'METALLIC' },
    { name: 'Nardo Gray', hex: '#6B7280', finish: 'GLOSS' },
    { name: 'Graphite Metallic', hex: '#374151', finish: 'METALLIC' },
    { name: 'San Marino Blue Metallic', hex: '#1D4ED8', finish: 'METALLIC' },
    { name: 'Melbourne Red', hex: '#DC2626', finish: 'METALLIC' },
    { name: 'Arancio Borealis (Orange)', hex: '#EA580C', finish: 'PEARL' },
    { name: 'Giallo Inti (Yellow)', hex: '#EAB308', finish: 'GLOSS' },
    { name: 'Isle of Man Green', hex: '#047857', finish: 'METALLIC' },
    { name: 'Silver Metallic', hex: '#CBD5E1', finish: 'METALLIC' },
  ];

  static generateVerificationHash(seed: string): string {
    const digest = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 10);
    return `FIN-CERT-${digest.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  }

  static detectCarColor(vehicleHintColor?: string | null): DetectedColorResult {
    if (vehicleHintColor) {
      const lower = vehicleHintColor.toLowerCase();
      const matched = this.COLOR_PALETTE.find(
        (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase().split(' ')[0])
      );
      if (matched) {
        return {
          colorName: matched.name,
          hexCode: matched.hex,
          confidence: 0.85,
          finishType: matched.finish,
        };
      }
    }
    return {
      colorName: 'Silver Metallic',
      hexCode: '#CBD5E1',
      confidence: 0.72,
      finishType: 'METALLIC',
    };
  }

  /**
   * Resolves actual binary bytes + MIME + SHA-256 from data-URI or local /uploads disk path.
   */
  static async loadPhotoBinary(imageUrl: string): Promise<LoadedImageBuffer | null> {
    if (!imageUrl || !imageUrl.trim()) return null;
    const trimmed = imageUrl.trim();

    const dataMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/i);
    if (dataMatch) {
      try {
        const buffer = Buffer.from(dataMatch[2], 'base64');
        const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');
        return {
          buffer,
          mimeType: dataMatch[1].toLowerCase(),
          sha256Hash,
        };
      } catch {
        return null;
      }
    }

    if (trimmed.startsWith('/uploads/')) {
      try {
        const cleanRel = trimmed.replace(/^\/+/, '');
        const fullPath = path.resolve(process.cwd(), cleanRel);
        const uploadsRoot = path.resolve(process.cwd(), 'uploads');
        if (fullPath.startsWith(uploadsRoot) && fs.existsSync(fullPath)) {
          const buffer = fs.readFileSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mimeType =
            ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');
          return { buffer, mimeType, sha256Hash };
        }
      } catch {
        return null;
      }
    }

    // Fallback deterministic identifier hash for remote HTTPS URLs
    return {
      buffer: Buffer.from(trimmed, 'utf8'),
      mimeType: 'image/jpeg',
      sha256Hash: crypto.createHash('sha256').update(trimmed).digest('hex'),
    };
  }

  /**
   * Builds complete ViewPixelTelemetry for an input photo using server PNG decoding,
   * binary SHA-256, and any Canvas2D patchGrid telemetry sent by the client.
   */
  private static async resolveTelemetry(
    photo: InputPhotoWithTelemetry
  ): Promise<{ telemetry: ViewPixelTelemetry; meta: AnalyzedPhotoMetadata }> {
    const view = normalizeView(photo.view);
    const loaded = await this.loadPhotoBinary(photo.imageUrl);
    const clientTel = photo.pixelTelemetry || {};
    const isRealBinary =
      Boolean(loaded && (photo.imageUrl.startsWith('data:image/') || photo.imageUrl.startsWith('/uploads/')));

    let serverTelemetry: ViewPixelTelemetry | null = null;
    if (loaded && loaded.mimeType === 'image/png') {
      const decoded = decodePngToTensor(loaded.buffer);
      if (decoded) {
        serverTelemetry = analyzeTensorRgba(
          decoded.rgba192x128,
          view,
          decoded.width,
          decoded.height,
          loaded.sha256Hash
        );
      }
    }

    const width = serverTelemetry?.width || clientTel.width || 0;
    const height = serverTelemetry?.height || clientTel.height || 0;
    const sha256Hash = loaded?.sha256Hash || clientTel.sha256Hash || crypto.createHash('sha256').update(photo.imageUrl || view).digest('hex');
    const qualityScore = Number(
      (serverTelemetry?.qualityScore ?? clientTel.qualityScore ?? (isRealBinary ? 88.0 : 82.0)).toFixed(1)
    );

    const telemetry: ViewPixelTelemetry = {
      view,
      width,
      height,
      dHash64: serverTelemetry?.dHash64 || clientTel.dHash64 || '',
      byteHash: serverTelemetry?.byteHash || clientTel.byteHash || sha256Hash,
      sha256Hash,
      qualityScore,
      meanLuma: serverTelemetry?.meanLuma ?? clientTel.meanLuma ?? 128,
      dominantColor: serverTelemetry?.dominantColor || clientTel.dominantColor,
      patchGridB64: serverTelemetry?.patchGridB64 || clientTel.patchGridB64,
      isUploadedRealImage: Boolean(serverTelemetry || clientTel.patchGridB64 || isRealBinary),
    };

    const detailsJson = JSON.stringify({
      dHash64: telemetry.dHash64,
      byteHash: telemetry.byteHash,
      meanLuma: telemetry.meanLuma,
      dominantColor: telemetry.dominantColor,
      patchGridB64: telemetry.patchGridB64,
    });

    const meta: AnalyzedPhotoMetadata = {
      view,
      qualityScore,
      sha256Hash,
      fileSizeBytes: isRealBinary ? loaded?.buffer.length : undefined,
      dimensions: width > 0 && height > 0 ? `${width}x${height}` : undefined,
      qualityDetails: detailsJson,
    };

    return { telemetry, meta };
  }

  private static parseBaselineTelemetry(stored: BaselineStoredPhoto): ViewPixelTelemetry {
    const view = normalizeView(stored.view);
    let parsed: Record<string, any> = {};
    if (stored.qualityDetails) {
      try {
        parsed = JSON.parse(stored.qualityDetails);
      } catch {
        parsed = {};
      }
    }

    return {
      view,
      width: 0,
      height: 0,
      dHash64: parsed.dHash64 || '',
      byteHash: parsed.byteHash || stored.sha256Hash || '',
      sha256Hash: stored.sha256Hash || '',
      qualityScore: stored.qualityScore ?? 88,
      meanLuma: typeof parsed.meanLuma === 'number' ? parsed.meanLuma : 128,
      dominantColor: parsed.dominantColor,
      patchGridB64: parsed.patchGridB64,
      isUploadedRealImage: Boolean(parsed.patchGridB64 || stored.sha256Hash),
    };
  }

  /**
   * Optional Tier-1 Multimodal Vision LLM inspection (runs when GEMINI_API_KEY or OPENAI_API_KEY is configured).
   */
  private static async tryMultimodalLlmInspection(params: {
    type: 'PICKUP' | 'RETURN' | 'ROUTINE';
    vehicleBrand: string;
    vehicleModel: string;
    vehicleColor?: string | null;
    photos: InputPhotoWithTelemetry[];
    baselinePhotos?: BaselineStoredPhoto[];
  }): Promise<{
    detectedColor?: DetectedColorResult;
    findings: DetectedDamageItem[];
    summary: string;
    overallScore?: number;
  } | null> {
    const geminiKey = env.VISION.GEMINI_API_KEY;
    const openAiKey = env.VISION.OPENAI_API_KEY;
    if (!geminiKey && !openAiKey) return null;

    const loadedCurrent = await Promise.all(
      params.photos.slice(0, 6).map(async (p) => ({
        view: normalizeView(p.view),
        binary: await this.loadPhotoBinary(p.imageUrl),
      }))
    );
    const validParts = loadedCurrent.filter((x) => x.binary && x.binary.buffer.length > 64);
    if (validParts.length === 0) return null;

    const promptText = [
      `You are an automotive computer vision inspector analyzing ${params.type} inspection photos for a ${params.vehicleBrand} ${params.vehicleModel}.`,
      params.type === 'RETURN' && params.baselinePhotos?.length
        ? 'Compare the returned car photos carefully against normal clean panels and report ONLY genuinely visible dents, scratches, paint chips, or cracks.'
        : 'Inspect every angle carefully for genuinely visible dents, scratches, paint chips, or cracks.',
      'CRITICAL: Do NOT invent defects on clean cars. If no damage is visible on an angle, return empty findings [].',
      'Return ONLY valid JSON with shape:',
      '{"detectedColor":{"colorName":"...","hexCode":"#RRGGBB","confidence":0.95,"finishType":"GLOSS|METALLIC|PEARL|MATTE"},"overallScore":number,"summary":"...","findings":[{"damageType":"...","category":"SCRATCH|DENT|CRACK|PAINT_CHIP","severity":"LOW|MEDIUM|HIGH","location":"...","view":"FRONT|DRIVER_SIDE|PASSENGER_SIDE|REAR|ROOF|INTERIOR","confidence":0.9,"boundingBox":{"x":0.1,"y":0.1,"width":0.15,"height":0.12},"estimatedRepairCost":250,"description":"..."}]}',
    ].join('\n');

    try {
      let rawText = '';

      if (geminiKey) {
        const parts: Array<Record<string, unknown>> = [{ text: promptText }];
        for (const item of validParts) {
          parts.push({ text: `Current ${params.type} view: ${item.view}` });
          parts.push({
            inlineData: {
              mimeType: item.binary!.mimeType,
              data: item.binary!.buffer.toString('base64'),
            },
          });
        }

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${env.VISION.GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
            }),
          }
        );

        if (resp.ok) {
          const data: any = await resp.json();
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } else if (openAiKey) {
        const content: Array<Record<string, unknown>> = [{ type: 'text', text: promptText }];
        for (const item of validParts) {
          content.push({ type: 'text', text: `Current ${params.type} view: ${item.view}` });
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${item.binary!.mimeType};base64,${item.binary!.buffer.toString('base64')}`,
            },
          });
        }

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: env.VISION.OPENAI_MODEL,
            response_format: { type: 'json_object' },
            temperature: 0.1,
            messages: [{ role: 'user', content }],
          }),
        });

        if (resp.ok) {
          const data: any = await resp.json();
          rawText = data?.choices?.[0]?.message?.content || '';
        }
      }

      if (!rawText) return null;
      const parsed = JSON.parse(rawText);
      const findings: DetectedDamageItem[] = Array.isArray(parsed.findings)
        ? parsed.findings.map((f: any) => ({
            damageType: String(f.damageType || 'Surface Anomaly').slice(0, 64),
            category: ['SCRATCH', 'DENT', 'CRACK', 'PAINT_CHIP'].includes(f.category)
              ? f.category
              : 'SCRATCH',
            severity: ['LOW', 'MEDIUM', 'HIGH'].includes(f.severity) ? f.severity : 'MEDIUM',
            location: String(f.location || 'Body Panel').slice(0, 64),
            view: normalizeView(f.view),
            confidence: Math.min(1, Math.max(0.5, Number(f.confidence || 0.88))),
            boundingBox: {
              x: Number(f.boundingBox?.x ?? 0.3),
              y: Number(f.boundingBox?.y ?? 0.4),
              width: Number(f.boundingBox?.width ?? 0.15),
              height: Number(f.boundingBox?.height ?? 0.12),
            },
            estimatedRepairCost: Number(f.estimatedRepairCost || 250),
            description: String(f.description || f.damageType || 'Detected by Vision LLM'),
          }))
        : [];

      return {
        detectedColor: parsed.detectedColor,
        findings,
        summary: String(parsed.summary || ''),
        overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Executes dynamic computer vision inspection on real uploaded photos.
   * Compares Return photos against stored Pickup baseline photos when available so
   * identical photos yield 0 new defects while real surface damage is accurately localized.
   */
  static async analyzeVehiclePhotosAsync(params: {
    type: 'PICKUP' | 'RETURN' | 'ROUTINE';
    vehicleBrand: string;
    vehicleModel: string;
    vehicleColor?: string | null;
    photos: InputPhotoWithTelemetry[];
    baselinePhotos?: BaselineStoredPhoto[];
    baselineFindings?: DetectedDamageItem[];
  }): Promise<InspectionAnalysisResult> {
    const resolved = await Promise.all(params.photos.map((p) => this.resolveTelemetry(p)));
    const photoMetadata = resolved.map((r) => r.meta);

    // Compute real coverage from unique exterior angles
    const exteriorAngles = new Set(
      resolved
        .map((r) => r.telemetry.view)
        .filter((v) => v === 'FRONT' || v === 'DRIVER_SIDE' || v === 'PASSENGER_SIDE' || v === 'REAR')
    );
    const coverageScore = Math.min(100, Math.max(25, Math.round((exteriorAngles.size / 4) * 100)));

    // Aggregate exterior vehicle paint color from real pixel telemetry across angles
    const colorCandidates = resolved
      .map((r) => r.telemetry.dominantColor)
      .filter((c): c is DetectedColorResult => Boolean(c));

    let detectedColor = this.detectCarColor(params.vehicleColor);
    if (colorCandidates.length > 0) {
      // Pick highest-confidence exterior color reading
      detectedColor = colorCandidates.sort((a, b) => b.confidence - a.confidence)[0];
    }

    // Attempt Multimodal LLM first if configured in backend/.env
    const llmResult = await this.tryMultimodalLlmInspection(params);
    if (llmResult) {
      const findings = llmResult.findings;
      const scratchesCount = findings.filter((f) => f.category === 'SCRATCH').length;
      const dentsCount = findings.filter((f) => f.category === 'DENT').length;
      const overallScore =
        llmResult.overallScore ?? this.computeConditionScore(findings);

      return {
        detectedColor: llmResult.detectedColor || detectedColor,
        overallScore,
        hasDamageDetected: findings.length > 0,
        summary:
          llmResult.summary ||
          this.buildSummary(params.type, params.vehicleBrand, params.vehicleModel, findings, false),
        findings,
        scratchesCount,
        dentsCount,
        coverageScore,
        inspectionHash: this.generateVerificationHash(
          `${params.vehicleBrand}-${params.vehicleModel}-${params.type}-${Date.now()}`
        ),
        engineMode: 'MULTIMODAL_LLM',
        photoMetadata,
      };
    }

    // Built-in Real Pixel CV Engine (zero API keys needed)
    const findings: DetectedDamageItem[] = [];
    let engineMode: InspectionAnalysisResult['engineMode'] = 'PIXEL_CV_SINGLE_FRAME';
    let parityScore: number | undefined;
    const isReturnWithBaseline =
      params.type === 'RETURN' &&
      Boolean(params.baselinePhotos && params.baselinePhotos.length > 0);

    if (isReturnWithBaseline && params.baselinePhotos) {
      engineMode = 'PIXEL_CV_BASELINE_DELTA';
      const similarityAccumulator: number[] = [];

      // Map baseline photos + stored pickup findings by view
      const baselineByView = new Map<InspectionView, ViewPixelTelemetry>();
      for (const b of params.baselinePhotos) {
        const bTel = this.parseBaselineTelemetry(b);
        // If baseline had stored file on disk without patchGrid, attempt PNG decode / sha256 load
        if (!bTel.sha256Hash || (!bTel.patchGridB64 && b.imageUrl.startsWith('/uploads/'))) {
          const bin = await this.loadPhotoBinary(b.imageUrl);
          if (bin) {
            bTel.sha256Hash = bTel.sha256Hash || bin.sha256Hash;
            bTel.byteHash = bTel.byteHash || bin.sha256Hash;
            if (bin.mimeType === 'image/png') {
              const decoded = decodePngToTensor(bin.buffer);
              if (decoded) {
                const parsedPng = analyzeTensorRgba(
                  decoded.rgba192x128,
                  bTel.view,
                  decoded.width,
                  decoded.height,
                  bin.sha256Hash
                );
                Object.assign(bTel, parsedPng);
              }
            }
          }
        }
        baselineByView.set(bTel.view, bTel);
      }

      for (const { telemetry } of resolved) {
        const baselineTel = baselineByView.get(telemetry.view);
        const baselineViewFindings = (params.baselineFindings || []).filter(
          (bf) => normalizeView(bf.view) === telemetry.view
        );

        if (baselineTel) {
          const delta = compareViewTelemetry(baselineTel, telemetry, telemetry.view);
          similarityAccumulator.push(delta.similarityScore);

          // Preserve genuine pre-existing pickup marks on identical or matching view
          for (const bf of baselineViewFindings) {
            findings.push(bf);
          }

          if (!delta.isIdentical && delta.newFindings.length > 0) {
            for (const nf of delta.newFindings) {
              // Avoid duplicating a finding at the exact same pre-existing coordinate
              const overlapsExisting = baselineViewFindings.some((bf) =>
                this.isSameLocationFinding(bf, nf)
              );
              if (!overlapsExisting) {
                findings.push(nf);
              }
            }
          }
        } else {
          // No baseline photo existed for this angle: analyze angle directly
          const singleFindings = detectSingleViewAnomalies(telemetry);
          findings.push(...singleFindings);
        }
      }

      if (similarityAccumulator.length > 0) {
        parityScore = Number(
          (similarityAccumulator.reduce((s, x) => s + x, 0) / similarityAccumulator.length).toFixed(1)
        );
      }
    } else {
      // Single Inspection (PICKUP baseline / ROUTINE / standalone scan): analyze real pixels per angle
      for (const { telemetry } of resolved) {
        const viewFindings = detectSingleViewAnomalies(telemetry);
        findings.push(...viewFindings);
      }
    }

    const scratchesCount = findings.filter((f) => f.category === 'SCRATCH').length;
    const dentsCount = findings.filter((f) => f.category === 'DENT').length;
    const overallScore = this.computeConditionScore(findings);
    const hasIdenticalReturn = isReturnWithBaseline && findings.length === (params.baselineFindings?.length || 0);

    return {
      detectedColor,
      overallScore,
      hasDamageDetected: findings.length > 0,
      summary: this.buildSummary(
        params.type,
        params.vehicleBrand,
        params.vehicleModel,
        findings,
        hasIdenticalReturn,
        parityScore
      ),
      findings,
      scratchesCount,
      dentsCount,
      coverageScore,
      inspectionHash: this.generateVerificationHash(
        `${params.vehicleBrand}-${params.vehicleModel}-${params.type}-${Date.now()}`
      ),
      engineMode,
      photoMetadata,
      parityScore,
    };
  }

  private static computeConditionScore(findings: DetectedDamageItem[]): number {
    if (findings.length === 0) return 100.0;
    let penalty = 0;
    for (const f of findings) {
      if (f.severity === 'HIGH') penalty += 14;
      else if (f.severity === 'MEDIUM') penalty += 7.5;
      else penalty += 3.5;
    }
    return Number(Math.max(15, 100 - penalty).toFixed(1));
  }

  private static buildSummary(
    type: 'PICKUP' | 'RETURN' | 'ROUTINE',
    brand: string,
    model: string,
    findings: DetectedDamageItem[],
    matchedBaselineClean: boolean,
    parityScore?: number
  ): string {
    const scratches = findings.filter((f) => f.category === 'SCRATCH').length;
    const dents = findings.filter((f) => f.category === 'DENT').length;
    const others = findings.length - scratches - dents;

    if (type === 'RETURN' && matchedBaselineClean) {
      return `Return CV Scan (${brand} ${model}): Photos match pickup baseline (${parityScore ?? 100}% parity). Zero new exterior defects detected.`;
    }
    if (findings.length === 0) {
      return `${type} Computer Vision Scan (${brand} ${model}): Exterior panels verified across uploaded angles with zero detected scratches or dents.`;
    }
    const parts = [
      scratches > 0 ? `${scratches} scratch(es)` : '',
      dents > 0 ? `${dents} dent(s)` : '',
      others > 0 ? `${others} chip/crack(s)` : '',
    ].filter(Boolean);
    return `${type} Computer Vision Scan (${brand} ${model}): Localized ${parts.join(', ')} across inspected exterior panels.`;
  }

  private static isSameLocationFinding(a: DetectedDamageItem, b: DetectedDamageItem): boolean {
    if (normalizeView(a.view) !== normalizeView(b.view)) return false;
    const ax = a.boundingBox.x + a.boundingBox.width / 2;
    const ay = a.boundingBox.y + a.boundingBox.height / 2;
    const bx = b.boundingBox.x + b.boundingBox.width / 2;
    const by = b.boundingBox.y + b.boundingBox.height / 2;
    const centerDist = Math.hypot(ax - bx, ay - by);
    return (
      centerDist < 0.22 ||
      (a.location === b.location && a.damageType === b.damageType)
    );
  }

  /**
   * Compares Return Inspection Findings against Pickup Baseline Findings.
   * Matches by camera angle + spatial proximity / anatomical location so pre-existing
   * damages are cleanly excluded while genuine new damages calculate fair repair totals.
   */
  static compareInspections(
    pickupFindings: DetectedDamageItem[],
    returnFindings: DetectedDamageItem[],
    securityDeposit: number = 50000
  ): ComparisonResult {
    const preExisting: DetectedDamageItem[] = [];
    const newDamages: DetectedDamageItem[] = [];
    const matchedPickupIndices = new Set<number>();

    returnFindings.forEach((retFinding) => {
      const matchIdx = pickupFindings.findIndex(
        (pickFinding, idx) =>
          !matchedPickupIndices.has(idx) && this.isSameLocationFinding(pickFinding, retFinding)
      );

      if (matchIdx >= 0) {
        matchedPickupIndices.add(matchIdx);
        preExisting.push(retFinding);
      } else {
        newDamages.push(retFinding);
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

    const coverageParityScore =
      returnFindings.length === 0 && pickupFindings.length === 0
        ? 100.0
        : Number(
            Math.max(
              82,
              100 - newDamages.length * 4.5
            ).toFixed(1)
          );

    return {
      pickupInspectionId: 'PICKUP',
      returnInspectionId: 'RETURN',
      preExistingDamages: preExisting,
      newDamages,
      preExistingCount: preExisting.length,
      newDamageCount: newDamages.length,
      totalProposedCharges,
      coverageParityScore,
      summary,
      depositStatus,
      netRefundAmount: netRefund,
    };
  }
}
