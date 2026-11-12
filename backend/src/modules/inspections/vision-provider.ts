import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import {
  DAMAGE_CATEGORIES,
  DAMAGE_SEVERITIES,
  INSPECTION_VIEWS,
  type InspectionView,
} from './damage-assessment';

/**
 * Vision provider for car damage detection.
 *
 * Uses a large pre-trained multimodal vision model (Google Gemini by default, OpenAI as an alternative).
 * These models are trained on billions of images, so they generalise to every make, model, colour and
 * lighting condition without us training (and over-fitting) a small custom model on a few hundred photos.
 * Accuracy comes from: strict JSON schemas, temperature 0, explicit assessor rules, photo-quality gating,
 * pickup-vs-return side-by-side comparison, and deterministic post-processing in damage-assessment.ts.
 */

export interface VisionImage {
  view: InspectionView;
  mimeType: string;
  base64: string;
}

export interface VisionVehicle {
  make?: string;
  model?: string;
  colorName?: string;
  colorHex?: string;
  plateText?: string;
}

export interface RawPhotoCheck {
  view: string;
  isVehicle: boolean;
  viewMatches: boolean;
  usable: boolean;
  issue?: string;
}

export interface RawFinding {
  view: string;
  category: string;
  severity: string;
  part: string;
  description: string;
  confidence: number;
  box_2d: number[];
}

export interface RawDetectionResult {
  photos: RawPhotoCheck[];
  vehicle: VisionVehicle;
  findings: RawFinding[];
}

export interface RawBaselineStatus {
  baselineId: string;
  status: 'UNCHANGED' | 'WORSENED' | 'NOT_VISIBLE' | 'REPAIRED';
  currentSeverity?: string;
  box_2d?: number[];
}

export interface RawComparisonResult {
  photos: RawPhotoCheck[];
  sameVehicle: boolean;
  sameVehicleReason?: string;
  vehicle: VisionVehicle;
  baselineStatus: RawBaselineStatus[];
  newDamages: RawFinding[];
}

export interface BaselineFindingForPrompt {
  id: string;
  view: InspectionView;
  category: string;
  severity: string;
  part: string;
  description: string;
}

const ASSESSOR_RULES = `
You are a certified vehicle damage assessor for a car rental company. Your report is used to charge customers,
so false positives cost the customer money and false negatives cost the company money. Be precise.

REPORT ONLY real physical damage on the vehicle:
- SCRATCH: line marks that break the paint or clear coat.
- DENT: a deformation of a body panel (look for distorted reflections and shadow edges).
- PAINT_CHIP: small spots where paint is missing.
- CRACK: cracked glass, lights, mirrors, bumpers or plastic trim.
- BROKEN_PART: broken, hanging or missing parts (mirror, light, grille, trim, wheel cover, handle).
For the INTERIOR photo report tears, burns, stains that will not wipe off, cracks or broken parts.

NEVER report: reflections, glare, shadows, dust, dirt, mud, water drops, bird droppings, stickers or badges,
normal panel gaps, design/crease lines, tyre tread wear, license plates, background objects or image noise.
If you are not sure something is damage, either omit it or give a low confidence. Never invent damage.

SEVERITY:
- LOW: superficial and small (up to about 5 cm), clear-coat level, would polish or touch up.
- MEDIUM: through the paint, or a dent up to palm size, needs panel repair/paint on one area.
- HIGH: large or deep damage, multiple panels, cracked glass/lights, broken or missing parts.

BOUNDING BOX: box_2d = [ymin, xmin, ymax, xmax] on a 0-1000 scale of THAT photo, tight around the damage only.
CONFIDENCE: 0.0-1.0, your real certainty that this is physical damage.
PART: use standard names, e.g. "Front bumper", "Hood", "Driver front door", "Passenger rear quarter panel",
"Rear bumper", "Tailgate", "Windshield", "Driver side mirror", "Front left headlight", "Roof", "Driver seat".

PHOTO CHECK for every photo: isVehicle (a real car is the main subject), viewMatches (the photo shows the labelled
angle: FRONT, DRIVER_SIDE = left side, PASSENGER_SIDE = right side, REAR, ROOF, INTERIOR), usable (sharp and
bright enough to judge damage). If not usable, explain the issue in a few words.

VEHICLE: identify the make, model and main body colour you see, and copy the licence plate text exactly as written
(plateText) if it is clearly readable in any photo; leave plateText empty if no plate is readable. Do not guess.
`.trim();

const viewEnum = [...INSPECTION_VIEWS];
const categoryEnum = [...DAMAGE_CATEGORIES];
const severityEnum = [...DAMAGE_SEVERITIES];

const PHOTO_CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    view: { type: 'STRING', enum: viewEnum },
    isVehicle: { type: 'BOOLEAN' },
    viewMatches: { type: 'BOOLEAN' },
    usable: { type: 'BOOLEAN' },
    issue: { type: 'STRING' },
  },
  required: ['view', 'isVehicle', 'viewMatches', 'usable'],
};

const VEHICLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    make: { type: 'STRING' },
    model: { type: 'STRING' },
    colorName: { type: 'STRING' },
    colorHex: { type: 'STRING' },
    plateText: { type: 'STRING' },
  },
};

const FINDING_SCHEMA = {
  type: 'OBJECT',
  properties: {
    view: { type: 'STRING', enum: viewEnum },
    category: { type: 'STRING', enum: categoryEnum },
    severity: { type: 'STRING', enum: severityEnum },
    part: { type: 'STRING' },
    description: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    box_2d: { type: 'ARRAY', items: { type: 'INTEGER' } },
  },
  required: ['view', 'category', 'severity', 'part', 'description', 'confidence', 'box_2d'],
};

const DETECTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    photos: { type: 'ARRAY', items: PHOTO_CHECK_SCHEMA },
    vehicle: VEHICLE_SCHEMA,
    findings: { type: 'ARRAY', items: FINDING_SCHEMA },
  },
  required: ['photos', 'vehicle', 'findings'],
};

const COMPARISON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    photos: { type: 'ARRAY', items: PHOTO_CHECK_SCHEMA },
    sameVehicle: { type: 'BOOLEAN' },
    sameVehicleReason: { type: 'STRING' },
    vehicle: VEHICLE_SCHEMA,
    baselineStatus: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          baselineId: { type: 'STRING' },
          status: { type: 'STRING', enum: ['UNCHANGED', 'WORSENED', 'NOT_VISIBLE', 'REPAIRED'] },
          currentSeverity: { type: 'STRING', enum: severityEnum },
          box_2d: { type: 'ARRAY', items: { type: 'INTEGER' } },
        },
        required: ['baselineId', 'status'],
      },
    },
    newDamages: { type: 'ARRAY', items: FINDING_SCHEMA },
  },
  required: ['photos', 'sameVehicle', 'vehicle', 'baselineStatus', 'newDamages'],
};

export class VisionProvider {
  static isConfigured(): boolean {
    return Boolean(env.VISION.GEMINI_API_KEY || env.VISION.OPENAI_API_KEY);
  }

  private static ensureConfigured() {
    if (!this.isConfigured()) {
      throw new AppError(
        'AI inspection is not configured. Set GEMINI_API_KEY (or OPENAI_API_KEY) in the backend environment.',
        503,
        'AI_INSPECTION_NOT_CONFIGURED'
      );
    }
  }

  /** Detects all visible damage on a single set of photos (pickup or routine inspection). */
  static async detectDamage(params: {
    vehicleLabel: string;
    images: VisionImage[];
  }): Promise<RawDetectionResult> {
    this.ensureConfigured();
    const prompt = [
      ASSESSOR_RULES,
      '',
      `TASK: Inspect this vehicle (${params.vehicleLabel}) from the labelled photos and list every damage you can see.`,
      'Report each damage once, on the photo where it is clearest. Return an empty findings array for a clean car.',
    ].join('\n');

    const parts: ContentPart[] = [{ text: prompt }];
    for (const image of params.images) {
      parts.push({ text: `Photo label: ${image.view}` });
      parts.push({ image });
    }

    const result = await this.generateJson<RawDetectionResult>(parts, DETECTION_SCHEMA);
    return {
      photos: Array.isArray(result.photos) ? result.photos : [],
      vehicle: result.vehicle || {},
      findings: Array.isArray(result.findings) ? result.findings : [],
    };
  }

  /**
   * Compares the return photos against the pickup photos of the same angle and reports the status
   * of every damage recorded at pickup plus any NEW damage.
   */
  static async compareWithBaseline(params: {
    vehicleLabel: string;
    baselineImages: VisionImage[];
    returnImages: VisionImage[];
    baselineFindings: BaselineFindingForPrompt[];
  }): Promise<RawComparisonResult> {
    this.ensureConfigured();
    const prompt = [
      ASSESSOR_RULES,
      '',
      `TASK: This vehicle (${params.vehicleLabel}) was rented out. For each angle you get the PICKUP photo (before the rental)`,
      'and the RETURN photo (after the rental). Compare them side by side.',
      '1. sameVehicle: is the RETURN vehicle clearly the same vehicle as the PICKUP vehicle (model, colour, plate, details)?',
      '2. baselineStatus: for EVERY damage recorded at pickup (list below) say if it is UNCHANGED, WORSENED, REPAIRED or',
      '   NOT_VISIBLE in the return photos. If visible, give currentSeverity and its box_2d on the RETURN photo.',
      '3. newDamages: damage visible in a RETURN photo that is NOT present in the matching PICKUP photo and is not one of',
      '   the recorded pickup damages. box_2d is on the RETURN photo. Differences in lighting, angle, dirt, water or',
      '   reflections are NOT new damage. If the pickup photo does not clearly show that area, use a lower confidence.',
      'photos: the photo check is about the RETURN photos.',
      '',
      `Damages recorded at pickup (JSON): ${JSON.stringify(params.baselineFindings)}`,
    ].join('\n');

    const parts: ContentPart[] = [{ text: prompt }];
    for (const returnImage of params.returnImages) {
      const baseline = params.baselineImages.find((b) => b.view === returnImage.view);
      if (baseline) {
        parts.push({ text: `PICKUP photo, angle ${baseline.view}:` });
        parts.push({ image: baseline });
      } else {
        parts.push({ text: `No PICKUP photo exists for angle ${returnImage.view}; judge new damage carefully.` });
      }
      parts.push({ text: `RETURN photo, angle ${returnImage.view}:` });
      parts.push({ image: returnImage });
    }

    const result = await this.generateJson<RawComparisonResult>(parts, COMPARISON_SCHEMA);
    return {
      photos: Array.isArray(result.photos) ? result.photos : [],
      sameVehicle: result.sameVehicle !== false,
      sameVehicleReason: result.sameVehicleReason,
      vehicle: result.vehicle || {},
      baselineStatus: Array.isArray(result.baselineStatus) ? result.baselineStatus : [],
      newDamages: Array.isArray(result.newDamages) ? result.newDamages : [],
    };
  }

  // ------------------------------------------------------------------
  // Provider plumbing
  // ------------------------------------------------------------------

  private static async generateJson<T>(parts: ContentPart[], schema: object): Promise<T> {
    const raw = env.VISION.GEMINI_API_KEY
      ? await this.callGemini(parts, schema)
      : await this.callOpenAi(parts);

    try {
      return JSON.parse(stripCodeFence(raw)) as T;
    } catch {
      throw new AppError('The AI vision service returned an unreadable answer. Please run the scan again.', 502, 'AI_BAD_RESPONSE');
    }
  }

  private static async callGemini(parts: ContentPart[], schema: object): Promise<string> {
    const body = {
      contents: [
        {
          role: 'user',
          parts: parts.map((p) =>
            'text' in p ? { text: p.text } : { inlineData: { mimeType: p.image.mimeType, data: p.image.base64 } }
          ),
        },
      ],
      generationConfig: {
        // Gemini 2.x is most consistent at temperature 0; Gemini 3+ is tuned for its default temperature
        ...(env.VISION.GEMINI_MODEL.startsWith('gemini-2') ? { temperature: 0, topP: 0.1 } : {}),
        responseMimeType: 'application/json',
        responseSchema: schema,
        mediaResolution: 'MEDIA_RESOLUTION_HIGH',
      },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.VISION.GEMINI_MODEL)}:generateContent`;
    const data = await this.postWithRetry(url, body, { 'x-goog-api-key': env.VISION.GEMINI_API_KEY });
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'empty response';
      throw new AppError(`The AI vision service did not return a result (${reason}).`, 502, 'AI_EMPTY_RESPONSE');
    }
    return text;
  }

  private static async callOpenAi(parts: ContentPart[]): Promise<string> {
    const content = parts.map((p) =>
      'text' in p
        ? { type: 'text', text: p.text }
        : { type: 'image_url', image_url: { url: `data:${p.image.mimeType};base64,${p.image.base64}`, detail: 'high' } }
    );
    content.unshift({
      type: 'text',
      text: 'Answer with one JSON object only, matching the field names described in the task.',
    });
    const body = {
      model: env.VISION.OPENAI_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    };
    const data = await this.postWithRetry('https://api.openai.com/v1/chat/completions', body, {
      Authorization: `Bearer ${env.VISION.OPENAI_API_KEY}`,
    });
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) {
      throw new AppError('The AI vision service did not return a result.', 502, 'AI_EMPTY_RESPONSE');
    }
    return text;
  }

  private static async postWithRetry(url: string, body: unknown, headers: Record<string, string>) {
    const maxAttempts = 3;
    let lastError = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120_000);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (resp.ok) return (await resp.json()) as any;

        const errorText = await resp.text().catch(() => '');
        lastError = `${resp.status} ${errorText.slice(0, 300)}`;
        // Only rate limits and server errors are worth retrying
        if (resp.status !== 429 && resp.status < 500) break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      } finally {
        clearTimeout(timer);
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
    console.error('[VisionProvider] request failed:', lastError);
    throw new AppError(
      'The AI vision service is not reachable right now. Please try the scan again in a minute.',
      502,
      'AI_SERVICE_UNAVAILABLE'
    );
  }
}

type ContentPart = { text: string } | { image: VisionImage };

function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}
