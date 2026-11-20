import { AsyncLocalStorage } from 'async_hooks';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import {
  DAMAGE_CATEGORIES,
  DAMAGE_SEVERITIES,
  DOCUMENT_VIEWS,
  INSPECTION_VIEWS,
  PANEL_NAMES,
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
  bodyType?: string;
  year?: string;
  /** A number plate or registration placard is mounted on the car, even if it cannot be read */
  platePresent?: boolean;
}

export interface RawDocumentReading {
  odometerKm?: number | null;
  odometerUnit?: string | null;
  chassisNumber?: string | null;
}

export interface RawSameVehicleResult {
  sameVehicle: boolean;
  confidence: number;
  reason?: string;
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
  panel?: string;
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

/** Fixed sampling seed for every vision request. */
const VISION_SEED = 20260117;

const ASSESSOR_RULES = `
You are a certified vehicle damage assessor for a car rental company. Your report is used to charge customers,
so false positives cost the customer money and false negatives cost the company money. Be precise.

Judge ONLY what is visible in these photos. You know nothing about this car's history or records.

WORK SYSTEMATICALLY: for every photo, check each visible part one by one before answering:
front and rear bumpers (corners and lower edges), grille, hood, roof, every door, front fenders, rear quarter
panels, tailgate/boot lid, side skirts, mirrors, headlights, tail lights, fog lights, windshield, rear and side glass,
door handles, and every wheel rim and tyre sidewall. Zoom into each area mentally; small damage counts.

REPORT ONLY real physical damage on the vehicle:
- SCRATCH: line marks or scuffs that break the paint or clear coat, including kerb rash on wheel rims.
- DENT: a deformation of a body panel (look for distorted reflections and shadow edges).
- PAINT_CHIP: small spots where paint is missing.
- CRACK: cracked glass, lights, mirrors, bumpers or plastic trim.
- BROKEN_PART: broken, hanging or missing parts (mirror, light, grille, trim, wheel cover, handle), or a cut or
  bulging tyre sidewall.
- PAINT_MARKED: a panel that was clearly repainted: its shade, gloss or texture (orange peel) visibly differs from
  the panels next to it, or there are overspray lines on rubber, glass or trim. Use a low confidence unless clear.
- RUST: corrosion, bubbling paint or brown/orange oxidation on metal (wheel arches, sills, door bottoms, boot).
For the INTERIOR photo report tears, burns, stains that will not wipe off, cracks or broken parts.

ONE DAMAGE = ONE FINDING: a single scrape, dent or crack area on one panel is one finding with one box around the
whole area, even when it has several lines or marks. Never split it into several findings. A scrape that crosses
from one panel onto the next is one finding per panel.

PAINT TRANSFER: a small mark lying ON TOP of the paint (rubber or another car's paint rubbed on, a few cm) that
would polish off is a LOW scratch. A larger scrape area is rated by its size like any scratch, even when it is
mostly dark transfer marks, because it needs a body shop to make good.

NEVER report: reflections, glare, shadows, dust, dirt, mud, water drops, bird droppings, stickers or badges,
normal panel gaps, design/crease lines, tyre tread wear, license plates, background objects or image noise.
If you are not sure something is damage, either omit it or give a low confidence. Never invent damage.

SEVERITY, judged by size and depth (the size of the whole damaged area on that panel):
- LOW: small, up to about 5 cm (thumb size), surface only, would polish or touch up.
- MEDIUM: 5 to 20 cm (up to palm size), or through the clear coat, needs repair or paint on part of a panel.
- HIGH: longer than 20 cm or most of a panel (up to elbow size), down to primer, plastic or metal, a dent with a
  crease, cracked glass or lights, or a broken part; needs a body shop.
- EXTREME: the panel or part must be replaced: crushed or torn panel, shattered glass, part missing or hanging off,
  deep damage across several panels, or signs of an accident to the structure.
When unsure between two levels, pick the one that matches the visible size.

BOUNDING BOX: box_2d = [ymin, xmin, ymax, xmax] on a 0-1000 scale of THAT photo, tight around the damage only.
CONFIDENCE: 0.0-1.0, your real certainty that this is physical damage.
PANEL: choose exactly one panel from the list for every damage. LEFT is the driver side, RIGHT the passenger side
(as seen sitting in the car). The same damage visible on two photos (e.g. a side photo and a corner photo) must be
reported ONCE, on the photo where it is clearest.
PART: a short readable name, e.g. "Front bumper, lower left corner", "Driver front door", "Rear left alloy rim".

PHOTO ANGLES: FRONT, REAR = straight on; DRIVER_SIDE = full left side; PASSENGER_SIDE = full right side;
FRONT_LEFT, FRONT_RIGHT, REAR_LEFT, REAR_RIGHT = corner views at about 45 degrees showing two sides at once;
ROOF = from above; INTERIOR = inside the cabin; WHEEL_* = close-up of that wheel (rim and tyre).
PHOTO CHECK for every photo: isVehicle (a real car is the main subject), viewMatches (the photo shows the labelled
angle), usable (sharp and bright enough to judge damage). If not usable, explain the issue in a few words.

VEHICLE: you are NOT told which car this is. Identify it only from the photos: make, model, body type (Sedan, SUV,
Hatchback, Pickup, Van, Coupe, Convertible, Wagon), the model years it fits (year, e.g. "2022-2024", empty if unsure),
and the main body colour as it really looks in the photos. colorName must be the specific shade with its finish
when visible, never just a basic colour: e.g. "Navy blue", "Sky blue", "Royal blue", "Metallic dark blue",
"Jet black", "Pearl white", "Solid white", "Metallic silver", "Gunmetal grey", "Charcoal grey", "Maroon",
"Cherry red", "Champagne gold", "Beige", "Olive green", "Dark green metallic". colorHex is the hex code of the paint in
good light. platePresent: true if a number plate or registration placard is mounted on the car (even if unreadable),
false if there is clearly none. Copy the licence plate text exactly as written (plateText) if it is clearly readable
in any photo; leave it empty if no plate is readable. Never guess a value you cannot see.
`.trim();

const viewEnum = INSPECTION_VIEWS.filter((v) => !DOCUMENT_VIEWS.includes(v));
const panelEnum = [...PANEL_NAMES];
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
    bodyType: { type: 'STRING' },
    year: { type: 'STRING' },
    platePresent: { type: 'BOOLEAN' },
  },
};

const DOCUMENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    odometerKm: { type: 'NUMBER' },
    odometerUnit: { type: 'STRING', enum: ['KM', 'MILES'] },
    chassisNumber: { type: 'STRING' },
  },
};

const SAME_VEHICLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sameVehicle: { type: 'BOOLEAN' },
    confidence: { type: 'NUMBER' },
    reason: { type: 'STRING' },
  },
  required: ['sameVehicle', 'confidence'],
};

const FINDING_SCHEMA = {
  type: 'OBJECT',
  properties: {
    view: { type: 'STRING', enum: viewEnum },
    panel: { type: 'STRING', enum: panelEnum },
    category: { type: 'STRING', enum: categoryEnum },
    severity: { type: 'STRING', enum: severityEnum },
    part: { type: 'STRING' },
    description: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    box_2d: { type: 'ARRAY', items: { type: 'INTEGER' } },
  },
  required: ['view', 'panel', 'category', 'severity', 'part', 'description', 'confidence', 'box_2d'],
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
  static async detectDamage(params: { images: VisionImage[] }): Promise<RawDetectionResult> {
    this.ensureConfigured();
    const prompt = [
      ASSESSOR_RULES,
      '',
      'TASK: Inspect the vehicle shown in the labelled photos, identify it, and list every damage you can see.',
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

  /** Reads the odometer total and the chassis (VIN) number from their close-up photos. */
  static async readDocuments(params: { images: VisionImage[] }): Promise<RawDocumentReading> {
    this.ensureConfigured();
    const prompt = [
      'Read numbers from close-up photos of a car. Copy only what is clearly readable; leave a field empty otherwise.',
      'ODOMETER photo: odometerKm = the TOTAL distance (ODO), not a trip meter (TRIP A/B), fuel range or clock.',
      'Give the number exactly as shown and set odometerUnit to KM or MILES as displayed.',
      'CHASSIS_NUMBER photo: chassisNumber = the chassis / VIN number exactly as stamped or printed (letters and',
      'digits, no spaces). A 17-character VIN never contains the letters I, O or Q.',
    ].join('\n');
    const parts: ContentPart[] = [{ text: prompt }];
    for (const image of params.images) {
      parts.push({ text: `Photo label: ${image.view}` });
      parts.push({ image });
    }
    return this.generateJson<RawDocumentReading>(parts, DOCUMENT_SCHEMA);
  }

  /**
   * Decides whether two photo sets show the very same car (not just the same model and colour), using the
   * individual details a car has: plate or placard present, plate text, wheels, accessories, stickers, tint,
   * existing marks. Used when the plate cannot be read to prove it.
   */
  static async isSameVehicle(params: {
    referenceImages: VisionImage[];
    images: VisionImage[];
  }): Promise<RawSameVehicleResult> {
    this.ensureConfigured();
    const prompt = [
      'You compare two sets of photos of a car. Set A is an earlier inspection of a car in our fleet; set B was just taken.',
      'The two cars may be the same model and colour, so do NOT decide by model or colour alone.',
      'Decide if set B shows the very same individual car as set A. Strong evidence of a DIFFERENT car: a number plate or',
      'registration placard on one car but none on the other, different plate text, different wheel or rim design,',
      'different trim level details (lights, grille, badges, roof rails, mirrors), different window tint, stickers or',
      'accessories that come and go are weak evidence. New damage on B is NOT evidence of a different car.',
      'confidence: 0.0-1.0, your real certainty in the sameVehicle answer. reason: one short sentence.',
    ].join('\n');
    const parts: ContentPart[] = [{ text: prompt }];
    for (const image of params.referenceImages) {
      parts.push({ text: `Set A photo: ${image.view}` });
      parts.push({ image });
    }
    for (const image of params.images) {
      parts.push({ text: `Set B photo: ${image.view}` });
      parts.push({ image });
    }
    const result = await this.generateJson<RawSameVehicleResult>(parts, SAME_VEHICLE_SCHEMA);
    return {
      sameVehicle: result.sameVehicle !== false,
      confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0)),
      reason: typeof result.reason === 'string' ? result.reason.slice(0, 300) : undefined,
    };
  }

  /**
   * Compares the return photos against the pickup photos of the same angle and reports the status
   * of every damage recorded at pickup plus any NEW damage.
   */
  static async compareWithBaseline(params: {
    baselineImages: VisionImage[];
    returnImages: VisionImage[];
    baselineFindings: BaselineFindingForPrompt[];
  }): Promise<RawComparisonResult> {
    this.ensureConfigured();
    const prompt = [
      ASSESSOR_RULES,
      '',
      'TASK: This vehicle was rented out. For each angle you get the PICKUP photo (before the rental)',
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

  /** Runs one inspection with a time limit shared by all of its AI requests (also those running in parallel). */
  static runWithinBudget<T>(fn: () => Promise<T>, budgetMs = AI_SCAN_BUDGET_MS): Promise<T> {
    return scanDeadline.run(Date.now() + budgetMs, fn);
  }

  private static async generateJson<T>(parts: ContentPart[], schema: object): Promise<T> {
    const raw = await this.callAvailableModel(parts, schema);

    try {
      return JSON.parse(stripCodeFence(raw)) as T;
    } catch {
      throw new AppError('The AI vision service returned an unreadable answer. Please run the scan again.', 502, 'AI_BAD_RESPONSE');
    }
  }

  /**
   * Uses the main Gemini model, then the fallback models, then OpenAI, moving on when a model's request quota
   * is used up or the model is overloaded, unreachable or refuses the request. An unreadable answer is reported
   * straight away. A model that failed is skipped until it can answer again, so later scans do not waste
   * requests and time on it.
   */
  private static async callAvailableModel(parts: ContentPart[], schema: object): Promise<string> {
    const geminiModels = env.VISION.GEMINI_API_KEY ? [env.VISION.GEMINI_MODEL, ...env.VISION.GEMINI_FALLBACK_MODELS] : [];
    const attempts: Array<{ name: string; call: () => Promise<string> }> = [
      ...geminiModels.map((model) => ({ name: model, call: () => this.callGemini(parts, schema, model) })),
      ...(env.VISION.OPENAI_API_KEY ? [{ name: env.VISION.OPENAI_MODEL, call: () => this.callOpenAi(parts) }] : []),
    ];
    let unavailable: AppError | null = null;
    for (const { name, call } of attempts) {
      if ((modelPausedUntil.get(name) ?? 0) > Date.now()) continue;
      try {
        return await call();
      } catch (err) {
        if (err instanceof QuotaExhaustedError) {
          pauseModel(name, err.daily ? msUntilQuotaReset() : 60_000, err.daily ? 'its daily request quota is used up' : 'its per-minute request limit is reached');
        } else if (err instanceof ModelUnavailableError) {
          unavailable = err;
          // 404: the model was retired or renamed and will not come back; anything else is usually brief
          pauseModel(name, err.status === 404 ? 24 * 3600_000 : 60_000, err.status === 404 ? 'it is no longer available (remove it from the settings)' : 'it is overloaded or unreachable');
        } else {
          if (err instanceof AppError && err.code === 'AI_SERVICE_UNAVAILABLE' && err.statusCode === 503) {
            console.warn(`[VisionProvider] ${name} was still answering when the scan time limit ran out`);
          }
          throw err;
        }
      }
    }
    // An overload passes within minutes, a used-up daily quota does not: report the one that will clear first
    if (unavailable) throw unavailable;
    throw new AppError(
      'The AI inspection limit has been reached. Please try again later, or ask the administrator to raise the AI usage limit (enable billing for the AI key).',
      429,
      'AI_QUOTA_EXCEEDED'
    );
  }

  private static async callGemini(parts: ContentPart[], schema: object, model: string): Promise<string> {
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
        ...(model.startsWith('gemini-2') ? { temperature: 0, topP: 0.1 } : {}),
        // A fixed seed makes repeated scans of the same photos answer the same way as far as the model allows
        seed: VISION_SEED,
        responseMimeType: 'application/json',
        responseSchema: schema,
        mediaResolution: 'MEDIA_RESOLUTION_HIGH',
      },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
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
      seed: VISION_SEED,
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
    let lastStatus = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const left = budgetLeftMs();
      if (left < MIN_REQUEST_MS) throw budgetExceeded();
      const controller = new AbortController();
      const requestMs = Math.min(REQUEST_TIMEOUT_MS, left);
      const timer = setTimeout(() => controller.abort(), requestMs);
      let waitMs = attempt * 1500;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (resp.ok) return (await resp.json()) as any;

        const errorText = await resp.text().catch(() => '');
        lastStatus = resp.status;
        lastError = `${resp.status} ${errorText.slice(0, 300)}`;
        if (resp.status === 429) {
          // A daily quota does not come back within this request; a per-minute limit does after a short wait
          const retryAfterMs = rateLimitWaitMs(resp, errorText);
          if (/PerDay/i.test(errorText) || retryAfterMs === null || retryAfterMs > MAX_RATE_LIMIT_WAIT_MS || attempt === maxAttempts) {
            throw new QuotaExhaustedError(lastError, /PerDay/i.test(errorText) || retryAfterMs === null || retryAfterMs > MAX_RATE_LIMIT_WAIT_MS);
          }
          waitMs = retryAfterMs;
        } else if (resp.status < 500) {
          // Other client errors will not succeed on a retry
          break;
        }
      } catch (err) {
        if (err instanceof QuotaExhaustedError) throw err;
        if (controller.signal.aborted) {
          // The scan ran out of time: stop here instead of trying the next model
          if (requestMs < REQUEST_TIMEOUT_MS) throw budgetExceeded();
          // This model is too slow right now: asking it again would only repeat the wait
          lastError = `no answer within ${REQUEST_TIMEOUT_MS / 1000} s`;
          lastStatus = 504;
          break;
        }
        lastError = err instanceof Error ? err.message : String(err);
      } finally {
        clearTimeout(timer);
      }
      if (attempt < maxAttempts) {
        if (budgetLeftMs() - waitMs < MIN_REQUEST_MS) throw budgetExceeded();
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    console.error('[VisionProvider] request failed:', lastError);
    throw new ModelUnavailableError(lastStatus);
  }
}

/** Longest wait for a per-minute rate limit, so a scan stays well inside the 180 s the screen waits. */
const MAX_RATE_LIMIT_WAIT_MS = 30_000;

/**
 * Longest time one inspection may spend waiting for the AI. The screen waits 180 s for the whole scan, so the
 * AI gets 150 s and the rest is left for saving photos and the report. When the time is up the inspection is
 * saved for a staff review instead of failing.
 */
export const AI_SCAN_BUDGET_MS = 150_000;
/** A request that cannot get at least this long is not started. */
const MIN_REQUEST_MS = 15_000;
/**
 * Longest wait for one model's answer. A model that is slow under heavy demand is left for the next one, so a
 * single slow model cannot use up the whole scan time.
 */
const REQUEST_TIMEOUT_MS = 75_000;
const scanDeadline = new AsyncLocalStorage<number>();

/** Time left for the AI in the current scan (unlimited outside a scan). */
function budgetLeftMs(): number {
  const deadline = scanDeadline.getStore();
  return deadline === undefined ? Number.POSITIVE_INFINITY : deadline - Date.now();
}

function budgetExceeded(): AppError {
  return new AppError(
    'The AI took too long to answer. The photos are saved for a staff review.',
    503,
    'AI_SERVICE_UNAVAILABLE'
  );
}

/** A model's request quota is used up (for the day, or for this minute); the next model can still answer. */
class QuotaExhaustedError extends Error {
  constructor(message: string, readonly daily: boolean) {
    super(message);
  }
}

/** A model is overloaded, unreachable or refused the request (status 0 = no answer at all). */
class ModelUnavailableError extends AppError {
  constructor(readonly status: number) {
    super('The AI vision service is not reachable right now. Please try the scan again in a minute.', 502, 'AI_SERVICE_UNAVAILABLE');
  }
}

/** Models skipped until the given time (epoch ms), because they could not answer. Kept per server process. */
const modelPausedUntil = new Map<string, number>();

function pauseModel(name: string, durationMs: number, reason: string): void {
  modelPausedUntil.set(name, Date.now() + durationMs);
  console.warn(`[VisionProvider] ${name} skipped for ${Math.ceil(durationMs / 60_000)} min: ${reason}; using the next model`);
}

/** Gemini daily quotas reset at midnight Pacific time. */
function msUntilQuotaReset(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const elapsedMs = (part('hour') * 3600 + part('minute') * 60 + part('second')) * 1000;
  return 24 * 3600_000 - elapsedMs + 60_000;
}

/**
 * How long a 429 answer asks to wait: the Retry-After header (OpenAI) or the RetryInfo retryDelay in
 * the body (Gemini, e.g. "34s"). Null when the answer gives no wait time.
 */
function rateLimitWaitMs(resp: Response, errorText: string): number | null {
  const header = Number(resp.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(errorText);
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

type ContentPart = { text: string } | { image: VisionImage };

function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}
