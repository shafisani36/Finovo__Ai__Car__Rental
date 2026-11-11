/**
 * Browser-side Canvas2D Computer Vision & Pixel Signature Engine.
 * Decodes JPG, PNG, WebP, AVIF, live camera captures, and local uploads into
 * standardized 192x128 RGBA tensors for real paint color extraction, quality scoring,
 * single-frame scratch/dent anomaly localization, and pickup-vs-return baseline comparison.
 */

export type VisionView =
  | 'FRONT'
  | 'DRIVER_SIDE'
  | 'PASSENGER_SIDE'
  | 'REAR'
  | 'ROOF'
  | 'INTERIOR';

export interface VisionPatchCell {
  l: number;
  r: number;
  g: number;
  b: number;
  edge: number;
  hEdge: number;
  vEdge: number;
  varL: number;
}

export interface VisionColorResult {
  colorName: string;
  hexCode: string;
  confidence: number;
  finishType: 'METALLIC' | 'GLOSS' | 'MATTE' | 'PEARL';
}

export interface VisionFinding {
  damageType: string;
  category: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  confidence: number; // 0 - 100
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  view: VisionView;
  estimatedRepairCost: number;
  description: string;
}

export interface ViewPixelTelemetry {
  view: VisionView;
  width: number;
  height: number;
  isDecoded: boolean;
  dHash64: string;
  byteHash: string;
  qualityScore: number;
  meanLuma: number;
  dominantColor?: VisionColorResult;
  patchGridB64?: string;
}

export interface ViewComparisonDelta {
  view: VisionView;
  comparedAgainstBaseline: boolean;
  isIdentical: boolean;
  framingMismatch: boolean;
  similarityScore: number;
  dHashDistance: number;
  newFindings: VisionFinding[];
}

export const GRID_COLS = 24;
export const GRID_ROWS = 16;
export const TENSOR_W = 192;
export const TENSOR_H = 128;

const AUTOMOTIVE_PALETTE: Array<{
  name: string;
  hex: string;
  rgb: [number, number, number];
  finish: 'METALLIC' | 'GLOSS' | 'MATTE' | 'PEARL';
}> = [
  { name: 'Alpine White', hex: '#F8FAFC', rgb: [242, 245, 248], finish: 'GLOSS' },
  { name: 'Pearl White', hex: '#F3F1EC', rgb: [236, 232, 224], finish: 'PEARL' },
  { name: 'Silver Metallic', hex: '#CBD5E1', rgb: [194, 202, 212], finish: 'METALLIC' },
  { name: 'Nardo Gray', hex: '#6B7280', rgb: [112, 118, 128], finish: 'GLOSS' },
  { name: 'Graphite Metallic', hex: '#374151', rgb: [62, 68, 78], finish: 'METALLIC' },
  { name: 'Obsidian Black Metallic', hex: '#111827', rgb: [24, 28, 36], finish: 'METALLIC' },
  { name: 'Melbourne Red', hex: '#DC2626', rgb: [204, 34, 38], finish: 'METALLIC' },
  { name: 'Crimson Burgundy', hex: '#7F1D1D', rgb: [122, 26, 32], finish: 'METALLIC' },
  { name: 'Arancio Borealis (Orange)', hex: '#EA580C', rgb: [232, 92, 20], finish: 'PEARL' },
  { name: 'Giallo Inti (Yellow)', hex: '#EAB308', rgb: [228, 178, 18], finish: 'GLOSS' },
  { name: 'Isle of Man Green', hex: '#047857', rgb: [16, 118, 82], finish: 'METALLIC' },
  { name: 'San Marino Blue Metallic', hex: '#1D4ED8', rgb: [30, 78, 208], finish: 'METALLIC' },
  { name: 'Midnight Blue', hex: '#1E3A5F', rgb: [30, 56, 98], finish: 'METALLIC' },
  { name: 'Champagne Gold Metallic', hex: '#C29B61', rgb: [192, 156, 102], finish: 'METALLIC' },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rgbToHex(r: number, g: number, b: number): string {
  const hex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function encodePatchGrid(grid: VisionPatchCell[]): string {
  const buf = new Uint8Array(grid.length * 8);
  for (let i = 0; i < grid.length; i++) {
    const p = grid[i];
    const off = i * 8;
    buf[off] = clamp(Math.round(p.l), 0, 255);
    buf[off + 1] = clamp(Math.round(p.r), 0, 255);
    buf[off + 2] = clamp(Math.round(p.g), 0, 255);
    buf[off + 3] = clamp(Math.round(p.b), 0, 255);
    buf[off + 4] = clamp(Math.round(p.edge), 0, 255);
    buf[off + 5] = clamp(Math.round(p.hEdge), 0, 255);
    buf[off + 6] = clamp(Math.round(p.vEdge), 0, 255);
    buf[off + 7] = clamp(Math.round(p.varL), 0, 255);
  }
  return bytesToBase64(buf);
}

export function decodePatchGrid(b64?: string | null): VisionPatchCell[] | null {
  if (!b64) return null;
  try {
    const buf = base64ToBytes(b64);
    const expected = GRID_COLS * GRID_ROWS * 8;
    if (buf.length !== expected) return null;
    const grid: VisionPatchCell[] = [];
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const off = i * 8;
      grid.push({
        l: buf[off],
        r: buf[off + 1],
        g: buf[off + 2],
        b: buf[off + 3],
        edge: buf[off + 4],
        hEdge: buf[off + 5],
        vEdge: buf[off + 6],
        varL: buf[off + 7],
      });
    }
    return grid;
  } catch {
    return null;
  }
}

export function hammingDistanceHex(hexA: string, hexB: string): number {
  if (!hexA || !hexB || hexA.length !== hexB.length) return 64;
  let dist = 0;
  for (let i = 0; i < hexA.length; i++) {
    const xor = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    if (!isNaN(xor)) {
      let v = xor;
      while (v > 0) {
        dist += v & 1;
        v >>= 1;
      }
    }
  }
  return dist;
}

function medianOf(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function hashRgbaBytes(rgba: Uint8ClampedArray): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const copy = new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength);
      const digest = await crypto.subtle.digest('SHA-256', copy.slice().buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback below
    }
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < rgba.length; i += 4) {
    h1 ^= rgba[i] ^ (rgba[i + 1] << 8) ^ (rgba[i + 2] << 16);
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= rgba[i + 2] ^ (rgba[i] << 12);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Compresses/normalizes a local uploaded File to a crisp standardized JPEG data URL
 * so mobile high-MP camera photos upload fast while keeping identical re-uploads consistent.
 */
export function compressImageFile(file: File, maxDimension = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || maxDimension;
        const h = img.naturalHeight || img.height || maxDimension;
        const scale = Math.min(1, maxDimension / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isRemote = /^https?:\/\//i.test(src) && !src.startsWith(window.location.origin);
    if (isRemote) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Unable to load image: ${src.slice(0, 64)}`));
    img.src = src;
  });
}

function detectColorFromPatches(patches: VisionPatchCell[]): VisionColorResult {
  const hueBins = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  const achBuckets = [
    { w: 0, r: 0, g: 0, b: 0 },
    { w: 0, r: 0, g: 0, b: 0 },
    { w: 0, r: 0, g: 0, b: 0 },
    { w: 0, r: 0, g: 0, b: 0 },
    { w: 0, r: 0, g: 0, b: 0 },
  ];

  let totalWeight = 0;
  let chromWeight = 0;

  for (let r = 4; r <= 12; r++) {
    for (let c = 4; c <= 19; c++) {
      const p = patches[r * GRID_COLS + c];
      const [h, s, v] = rgbToHsv(p.r, p.g, p.b);
      if (v > 0.98 && s < 0.06) continue;
      const smoothWeight = p.varL < 18 ? 1.5 : 0.7;
      const rowWeight = r >= 5 && r <= 10 ? 1.4 : 0.9;
      const w = smoothWeight * rowWeight;
      totalWeight += w;

      if (s >= 0.22 && v >= 0.12 && v <= 0.96) {
        const bin = Math.min(11, Math.floor(h / 30));
        hueBins[bin].w += w;
        hueBins[bin].r += p.r * w;
        hueBins[bin].g += p.g * w;
        hueBins[bin].b += p.b * w;
        chromWeight += w;
      } else {
        const idx = p.l < 52 ? 0 : p.l < 102 ? 1 : p.l < 152 ? 2 : p.l < 204 ? 3 : 4;
        achBuckets[idx].w += w;
        achBuckets[idx].r += p.r * w;
        achBuckets[idx].g += p.g * w;
        achBuckets[idx].b += p.b * w;
      }
    }
  }

  let targetRgb: [number, number, number] = [240, 244, 248];
  let confidence = 88;

  let bestHue = hueBins[0];
  for (const b of hueBins) {
    if (b.w > bestHue.w) bestHue = b;
  }

  if (totalWeight > 0 && chromWeight / totalWeight >= 0.18 && bestHue.w > 0) {
    targetRgb = [bestHue.r / bestHue.w, bestHue.g / bestHue.w, bestHue.b / bestHue.w];
    confidence = Math.round(clamp(78 + (bestHue.w / Math.max(1, chromWeight)) * 20, 78, 99));
  } else {
    let bestAch = achBuckets[4];
    for (const b of achBuckets) {
      if (b.w > bestAch.w) bestAch = b;
    }
    if (bestAch.w > 0) {
      targetRgb = [bestAch.r / bestAch.w, bestAch.g / bestAch.w, bestAch.b / bestAch.w];
      confidence = Math.round(clamp(76 + (bestAch.w / Math.max(1, totalWeight)) * 21, 76, 98));
    }
  }

  let nearest = AUTOMOTIVE_PALETTE[0];
  let bestDist = Infinity;
  for (const anchor of AUTOMOTIVE_PALETTE) {
    const dr = targetRgb[0] - anchor.rgb[0];
    const dg = targetRgb[1] - anchor.rgb[1];
    const db = targetRgb[2] - anchor.rgb[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = anchor;
    }
  }

  return {
    colorName: nearest.name,
    hexCode: rgbToHex(targetRgb[0], targetRgb[1], targetRgb[2]),
    confidence,
    finishType: nearest.finish,
  };
}

export function resolvePanelLocation(view: VisionView, cx: number, cy: number): string {
  const horiz = cx < 0.36 ? 'Driver Side' : cx > 0.64 ? 'Passenger Side' : 'Center';
  const vert = cy < 0.42 ? 'Upper' : cy > 0.65 ? 'Lower' : 'Mid';

  switch (view) {
    case 'FRONT':
      if (cy < 0.44) return `Hood / Bonnet ${horiz} Section`;
      return `Front Bumper ${horiz} ${vert === 'Lower' ? 'Splitter' : 'Fascia'}`;
    case 'REAR':
      if (cy < 0.45) return `Tailgate / Bootlid ${horiz} Panel`;
      return `Rear Bumper ${horiz} Corner`;
    case 'DRIVER_SIDE':
      if (cx < 0.33) return 'Driver Front Fender Panel';
      if (cx < 0.52) return `Driver Front Door ${vert} Panel`;
      if (cx < 0.72) return `Driver Rear Door ${vert} Panel`;
      return 'Driver Rear Quarter Panel';
    case 'PASSENGER_SIDE':
      if (cx < 0.33) return 'Passenger Rear Quarter Panel';
      if (cx < 0.52) return `Passenger Rear Door ${vert} Panel`;
      if (cx < 0.72) return `Passenger Front Door ${vert} Panel`;
      return 'Passenger Front Fender Panel';
    case 'ROOF':
      return `Roof Panel ${horiz} Section`;
    case 'INTERIOR':
      return cy < 0.5 ? 'Dashboard / Console Trim' : `Cabin ${horiz} Upholstery`;
  }
}

interface CandidateCell {
  c: number;
  r: number;
  score: number;
  category: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP';
}

function clusterCellsToFindings(
  candidates: CandidateCell[],
  view: VisionView,
  mode: 'surface' | 'baseline-delta'
): VisionFinding[] {
  if (candidates.length === 0) return [];

  const cellMap = new Map<string, CandidateCell>();
  for (const cand of candidates) {
    cellMap.set(`${cand.c},${cand.r}`, cand);
  }

  const visited = new Set<string>();
  const clusters: CandidateCell[][] = [];

  for (const cand of candidates) {
    const startKey = `${cand.c},${cand.r}`;
    if (visited.has(startKey)) continue;

    const queue = [cand];
    const cluster: CandidateCell[] = [];
    visited.add(startKey);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      cluster.push(cur);

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nKey = `${cur.c + dc},${cur.r + dr}`;
          if (!visited.has(nKey) && cellMap.has(nKey)) {
            visited.add(nKey);
            queue.push(cellMap.get(nKey)!);
          }
        }
      }
    }

    clusters.push(cluster);
  }

  const findings: VisionFinding[] = [];
  for (const cluster of clusters) {
    if (cluster.length > 48) continue;

    let minC = GRID_COLS;
    let maxC = 0;
    let minR = GRID_ROWS;
    let maxR = 0;
    let maxScore = 0;
    const catCounts: Record<string, number> = {};

    for (const cell of cluster) {
      minC = Math.min(minC, cell.c);
      maxC = Math.max(maxC, cell.c);
      minR = Math.min(minR, cell.r);
      maxR = Math.max(maxR, cell.r);
      maxScore = Math.max(maxScore, cell.score);
      catCounts[cell.category] = (catCounts[cell.category] || 0) + 1;
    }

    let dominantCat: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP' = cluster[0].category;
    let maxVotes = 0;
    for (const [k, v] of Object.entries(catCounts)) {
      if (v > maxVotes) {
        maxVotes = v;
        dominantCat = k as 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP';
      }
    }

    const x = clamp(minC / GRID_COLS - 0.015, 0.04, 0.88);
    const y = clamp(minR / GRID_ROWS - 0.015, 0.08, 0.86);
    const width = clamp((maxC - minC + 1) / GRID_COLS + 0.03, 0.07, 0.42);
    const height = clamp((maxR - minR + 1) / GRID_ROWS + 0.03, 0.07, 0.36);

    const cx = x + width / 2;
    const cy = y + height / 2;
    const location = resolvePanelLocation(view, cx, cy);

    const areaCount = cluster.length;
    const severity: 'LOW' | 'MEDIUM' | 'HIGH' =
      areaCount >= 6 || dominantCat === 'CRACK' || maxScore > 0.91
        ? 'HIGH'
        : areaCount >= 3 || dominantCat === 'DENT'
        ? 'MEDIUM'
        : 'LOW';

    const labels: Record<typeof dominantCat, Record<typeof severity, string>> = {
      SCRATCH: {
        LOW: 'Superficial Clearcoat Scuff',
        MEDIUM: 'Linear Paint Scratch & Abrasion',
        HIGH: 'Deep Gouge & Primer Exposure',
      },
      DENT: {
        LOW: 'Minor Surface Dimple',
        MEDIUM: 'Panel Compression Dent',
        HIGH: 'Deep Body Panel Crease / Crush',
      },
      PAINT_CHIP: {
        LOW: 'Localized Paint Chip',
        MEDIUM: 'Impact Paint Transfer & Scuff',
        HIGH: 'Severe Impact Chipping / Peel',
      },
      CRACK: {
        LOW: 'Surface Hairline Fracture',
        MEDIUM: 'Panel / Trim Impact Crack',
        HIGH: 'Structural Bumper / Housing Fracture',
      },
    };

    const baseCost =
      dominantCat === 'CRACK'
        ? 480
        : dominantCat === 'DENT'
        ? 390
        : dominantCat === 'PAINT_CHIP'
        ? 260
        : 210;
    const sevMult = severity === 'HIGH' ? 1.8 : severity === 'MEDIUM' ? 1.25 : 0.75;
    const estimatedRepairCost = Math.round(baseCost * sevMult);

    findings.push({
      damageType: labels[dominantCat][severity],
      category: dominantCat,
      severity,
      location,
      confidence: Math.round(clamp(maxScore, 0.74, 0.985) * 100),
      boundingBox: {
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
        width: Number(width.toFixed(3)),
        height: Number(height.toFixed(3)),
      },
      view,
      estimatedRepairCost,
      description:
        mode === 'baseline-delta'
          ? `New localized surface change detected at ${location} compared against pickup baseline photo.`
          : `Surface anomaly localized at ${location} via computer vision texture & gradient analysis.`,
    });
  }

  return findings.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export function detectSingleViewAnomalies(telemetry: ViewPixelTelemetry): VisionFinding[] {
  const patches = decodePatchGrid(telemetry.patchGridB64);
  if (!patches || telemetry.view === 'INTERIOR') return [];

  const rawScores = new Float32Array(GRID_COLS * GRID_ROWS);
  const rawCats: Array<'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP' | null> = new Array(
    GRID_COLS * GRID_ROWS
  ).fill(null);

  const inBodyBounds = (c: number, r: number): boolean => {
    if (c < 2 || c > 21 || r < 4 || r > 12) return false;
    if ((telemetry.view === 'DRIVER_SIDE' || telemetry.view === 'PASSENGER_SIDE') && r >= 10) {
      if ((c >= 3 && c <= 7) || (c >= 16 && c <= 20)) return false;
    }
    return true;
  };

  for (let r = 4; r <= 12; r++) {
    for (let c = 2; c <= 21; c++) {
      if (!inBodyBounds(c, r)) continue;
      const p = patches[r * GRID_COLS + c];

      const nLs: number[] = [];
      const nRs: number[] = [];
      const nGs: number[] = [];
      const nBs: number[] = [];
      const nEdges: number[] = [];
      let minNbL = 255;
      let maxNbL = 0;
      let maxNbEdge = 0;

      for (let nr = Math.max(0, r - 2); nr <= Math.min(GRID_ROWS - 1, r + 2); nr++) {
        for (let nc = Math.max(0, c - 2); nc <= Math.min(GRID_COLS - 1, c + 2); nc++) {
          if (nr === r && nc === c) continue;
          const np = patches[nr * GRID_COLS + nc];
          nLs.push(np.l);
          nRs.push(np.r);
          nGs.push(np.g);
          nBs.push(np.b);
          nEdges.push(np.edge);
          if (Math.abs(nr - r) <= 1 && Math.abs(nc - c) <= 1) {
            minNbL = Math.min(minNbL, np.l);
            maxNbL = Math.max(maxNbL, np.l);
            maxNbEdge = Math.max(maxNbEdge, np.edge);
          }
        }
      }

      const medL = medianOf(nLs);
      const medR = medianOf(nRs);
      const medG = medianOf(nGs);
      const medB = medianOf(nBs);
      const medEdge = medianOf(nEdges);
      const madL = medianOf(nLs.map((x) => Math.abs(x - medL)));
      if (madL > 22) continue;

      const dr = p.r - medR;
      const dg = p.g - medG;
      const db = p.b - medB;
      const colorDist = Math.sqrt(dr * dr + dg * dg + db * db);
      const lumaJump = Math.abs(p.l - medL);
      const edgeRatio = p.edge / Math.max(6, medEdge);
      const anisotropy = Math.abs(p.hEdge - p.vEdge) / (p.hEdge + p.vEdge + 1);
      const dipoleSpan = maxNbL - minNbL;

      const idx = r * GRID_COLS + c;
      let cat: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP' | null = null;
      let score = 0;

      if (
        p.edge > 34 &&
        edgeRatio > 2.2 &&
        (lumaJump > 20 || colorDist > 28) &&
        anisotropy > 0.14 &&
        madL < 18
      ) {
        cat = 'SCRATCH';
        score = Math.min(1, 0.6 + (edgeRatio - 2.0) * 0.1 + colorDist / 160);
      } else if (colorDist > 48 && (p.edge > 28 || maxNbEdge > 32) && madL < 18) {
        cat = colorDist > 68 && p.l < medL - 25 ? 'CRACK' : 'PAINT_CHIP';
        score = Math.min(1, 0.62 + (colorDist - 40) / 140 + Math.max(p.edge, maxNbEdge) / 220);
      } else if (
        dipoleSpan > 36 &&
        lumaJump > 24 &&
        p.l - medL < -20 &&
        madL < 16 &&
        p.edge < 80 &&
        colorDist < 52
      ) {
        cat = 'DENT';
        score = Math.min(1, 0.56 + (dipoleSpan - 32) / 120 + lumaJump / 140);
      }

      if (cat && score >= 0.72) {
        rawScores[idx] = score;
        rawCats[idx] = cat;
      }
    }
  }

  const candidates: CandidateCell[] = [];
  for (let r = 4; r <= 12; r++) {
    for (let c = 2; c <= 21; c++) {
      const idx = r * GRID_COLS + c;
      const score = rawScores[idx];
      const cat = rawCats[idx];
      if (!cat || score <= 0) continue;

      if (telemetry.view === 'FRONT' || telemetry.view === 'REAR') {
        const mc = GRID_COLS - 1 - c;
        if (Math.abs(c - 11.5) >= 2.2) {
          const mScore = rawScores[r * GRID_COLS + mc];
          if (mScore > 0 && Math.min(score, mScore) / Math.max(score, mScore) > 0.55) {
            continue;
          }
        }
      }

      let rowRun = 1;
      for (let dc = c - 1; dc >= 2 && patches[r * GRID_COLS + dc].edge > 28; dc--) rowRun++;
      for (let dc = c + 1; dc <= 21 && patches[r * GRID_COLS + dc].edge > 28; dc++) rowRun++;
      if (rowRun >= 6) continue;

      candidates.push({ c, r, score, category: cat });
    }
  }

  return clusterCellsToFindings(candidates, telemetry.view, 'surface');
}

export function compareViewSignatures(
  pickup: ViewPixelTelemetry,
  ret: ViewPixelTelemetry,
  view: VisionView
): ViewComparisonDelta {
  const hashDist = hammingDistanceHex(pickup.dHash64, ret.dHash64);

  if (pickup.byteHash && ret.byteHash && pickup.byteHash === ret.byteHash) {
    return {
      view,
      comparedAgainstBaseline: true,
      isIdentical: true,
      framingMismatch: false,
      similarityScore: 100,
      dHashDistance: 0,
      newFindings: [],
    };
  }

  const gridA = decodePatchGrid(pickup.patchGridB64);
  const gridB = decodePatchGrid(ret.patchGridB64);

  if (!gridA || !gridB) {
    const isIdentical = hashDist <= 2;
    return {
      view,
      comparedAgainstBaseline: Boolean(pickup.isDecoded && ret.isDecoded),
      isIdentical,
      framingMismatch: hashDist > 20,
      similarityScore: Number(clamp(100 - hashDist * 2.5, 25, 100).toFixed(1)),
      dHashDistance: hashDist,
      newFindings: isIdentical ? [] : detectSingleViewAnomalies(ret),
    };
  }

  const gain = clamp(pickup.meanLuma / Math.max(12, ret.meanLuma), 0.72, 1.38);
  const cellDiffs: number[] = [];
  const diffGrid = new Float32Array(GRID_COLS * GRID_ROWS);
  const edgeDeltaGrid = new Float32Array(GRID_COLS * GRID_ROWS);
  const colorDeltaGrid = new Float32Array(GRID_COLS * GRID_ROWS);

  for (let r = 3; r <= 13; r++) {
    for (let c = 2; c <= 21; c++) {
      const idx = r * GRID_COLS + c;
      const a = gridA[idx];
      const b = gridB[idx];

      const dl = Math.abs(b.l * gain - a.l);
      const dr = b.r * gain - a.r;
      const dg = b.g * gain - a.g;
      const db = b.b * gain - a.b;
      const dCol = Math.sqrt(dr * dr + dg * dg + db * db);
      const dEdge = Math.abs(b.edge - a.edge);

      diffGrid[idx] = dl;
      edgeDeltaGrid[idx] = dEdge;
      colorDeltaGrid[idx] = dCol;
      cellDiffs.push(dl);
    }
  }

  const medianDiffL = medianOf(cellDiffs);
  const meanDiffL = cellDiffs.reduce((s, x) => s + x, 0) / Math.max(1, cellDiffs.length);

  if (hashDist <= 2 && meanDiffL < 4.5 && medianDiffL < 3.5) {
    return {
      view,
      comparedAgainstBaseline: true,
      isIdentical: true,
      framingMismatch: false,
      similarityScore: Number(clamp(100 - meanDiffL * 0.4, 98.5, 100).toFixed(1)),
      dHashDistance: hashDist,
      newFindings: [],
    };
  }

  if (hashDist > 18 && medianDiffL >= 20) {
    return {
      view,
      comparedAgainstBaseline: true,
      isIdentical: false,
      framingMismatch: true,
      similarityScore: Number(clamp(100 - medianDiffL * 1.4, 30, 75).toFixed(1)),
      dHashDistance: hashDist,
      newFindings: detectSingleViewAnomalies(ret),
    };
  }

  const diffCandidates: CandidateCell[] = [];
  for (let r = 4; r <= 12; r++) {
    for (let c = 2; c <= 21; c++) {
      const idx = r * GRID_COLS + c;
      const dl = diffGrid[idx];
      const dEdge = edgeDeltaGrid[idx];
      const dCol = colorDeltaGrid[idx];

      if (dl > Math.max(22, medianDiffL * 2.6) && (dEdge > 11 || dCol > 24)) {
        const bPatch = gridB[idx];
        const aPatch = gridA[idx];
        const edgeSpike = bPatch.edge - aPatch.edge;
        let cat: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP' = 'DENT';
        if (edgeSpike > 12 && dCol > 24) cat = 'SCRATCH';
        else if (dCol > 42 && edgeSpike > 8) cat = 'PAINT_CHIP';
        else if (edgeSpike > 22 && dl > 45) cat = 'CRACK';

        const conf = clamp(0.74 + dl / 150 + dEdge / 180, 0.74, 0.985);
        diffCandidates.push({ c, r, score: conf, category: cat });
      }
    }
  }

  const newFindings = clusterCellsToFindings(diffCandidates, view, 'baseline-delta');
  const similarity = clamp(100 - medianDiffL * 0.9 - newFindings.length * 4.5, 45, 99.6);

  return {
    view,
    comparedAgainstBaseline: true,
    isIdentical: false,
    framingMismatch: false,
    similarityScore: Number(similarity.toFixed(1)),
    dHashDistance: hashDist,
    newFindings,
  };
}

/**
 * Extracts standardized pixel telemetry and runs single-view anomaly detection
 * on any uploaded image URL / data-URI / local photo in browser Canvas2D.
 */
export async function extractImageTelemetry(
  imageUrl: string,
  view: VisionView
): Promise<{ telemetry: ViewPixelTelemetry; findings: VisionFinding[] }> {
  const emptyResult = {
    telemetry: {
      view,
      width: 0,
      height: 0,
      isDecoded: false,
      dHash64: '',
      byteHash: '',
      qualityScore: 80,
      meanLuma: 128,
    },
    findings: [],
  };

  if (!imageUrl || typeof document === 'undefined') {
    return emptyResult;
  }

  try {
    const img = await loadImageElement(imageUrl);
    const naturalWidth = img.naturalWidth || img.width || TENSOR_W;
    const naturalHeight = img.naturalHeight || img.height || TENSOR_H;

    const canvas = document.createElement('canvas');
    canvas.width = TENSOR_W;
    canvas.height = TENSOR_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return emptyResult;

    ctx.drawImage(img, 0, 0, TENSOR_W, TENSOR_H);
    const { data: rgba } = ctx.getImageData(0, 0, TENSOR_W, TENSOR_H);

    const luma = new Float32Array(TENSOR_W * TENSOR_H);
    let totalLuma = 0;
    for (let i = 0; i < TENSOR_W * TENSOR_H; i++) {
      const o = i * 4;
      const lv = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
      luma[i] = lv;
      totalLuma += lv;
    }
    const meanLuma = totalLuma / (TENSOR_W * TENSOR_H);

    // 9x8 dHash64
    const dGrid: number[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 9; c++) {
        const x0 = Math.floor((c * TENSOR_W) / 9);
        const x1 = Math.floor(((c + 1) * TENSOR_W) / 9);
        const y0 = Math.floor((r * TENSOR_H) / 8);
        const y1 = Math.floor(((r + 1) * TENSOR_H) / 8);
        let s = 0;
        let cnt = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            s += luma[y * TENSOR_W + x];
            cnt++;
          }
        }
        dGrid.push(s / Math.max(1, cnt));
      }
    }

    let bits = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        bits += dGrid[r * 9 + c + 1] > dGrid[r * 9 + c] ? '1' : '0';
      }
    }
    let dHash64 = '';
    for (let i = 0; i < 64; i += 4) {
      dHash64 += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }

    // Laplacian sharpness + exposure quality
    let lapSum = 0;
    let lapCnt = 0;
    for (let y = 1; y < TENSOR_H - 1; y++) {
      for (let x = 1; x < TENSOR_W - 1; x++) {
        const idx = y * TENSOR_W + x;
        const lap = Math.abs(
          4 * luma[idx] -
            luma[idx - 1] -
            luma[idx + 1] -
            luma[idx - TENSOR_W] -
            luma[idx + TENSOR_W]
        );
        lapSum += lap;
        lapCnt++;
      }
    }
    const meanLap = lapSum / Math.max(1, lapCnt);
    const sharpnessNorm = clamp(meanLap / 18, 0.35, 1.0);
    const exposurePenalty =
      meanLuma < 28 || meanLuma > 235 ? 12 : meanLuma < 45 || meanLuma > 220 ? 5 : 0;
    const qualityScore = Number(
      clamp(68 + sharpnessNorm * 31.2 - exposurePenalty, 42, 99.6).toFixed(1)
    );

    const patches: VisionPatchCell[] = [];
    for (let pr = 0; pr < GRID_ROWS; pr++) {
      for (let pc = 0; pc < GRID_COLS; pc++) {
        let sL = 0;
        let sR = 0;
        let sG = 0;
        let sB = 0;
        let sHEdge = 0;
        let sVEdge = 0;
        const cellLs: number[] = [];
        const cellEdges: number[] = [];

        for (let dy = 0; dy < 8; dy++) {
          const y = pr * 8 + dy;
          for (let dx = 0; dx < 8; dx++) {
            const x = pc * 8 + dx;
            const idx = y * TENSOR_W + x;
            const o = idx * 4;
            const lv = luma[idx];
            cellLs.push(lv);
            sL += lv;
            sR += rgba[o];
            sG += rgba[o + 1];
            sB += rgba[o + 2];

            const gx =
              x > 0 && x < TENSOR_W - 1 ? Math.abs(luma[idx + 1] - luma[idx - 1]) * 0.5 : 0;
            const gy =
              y > 0 && y < TENSOR_H - 1
                ? Math.abs(luma[idx + TENSOR_W] - luma[idx - TENSOR_W]) * 0.5
                : 0;
            sHEdge += gx;
            sVEdge += gy;
            cellEdges.push(gx + gy);
          }
        }

        const avgL = sL / 64;
        let sq = 0;
        for (const v of cellLs) {
          const d = v - avgL;
          sq += d * d;
        }
        cellEdges.sort((a, b) => b - a);
        const top8Edge = cellEdges.slice(0, 8).reduce((sum, v) => sum + v, 0) / 8;

        patches.push({
          l: avgL,
          r: sR / 64,
          g: sG / 64,
          b: sB / 64,
          edge: clamp(top8Edge, 0, 255),
          hEdge: clamp((sHEdge / 64) * 3.0, 0, 255),
          vEdge: clamp((sVEdge / 64) * 3.0, 0, 255),
          varL: clamp(Math.sqrt(sq / 64), 0, 255),
        });
      }
    }

    const dominantColor = view === 'INTERIOR' ? undefined : detectColorFromPatches(patches);
    const patchGridB64 = encodePatchGrid(patches);
    const byteHash = await hashRgbaBytes(rgba);

    const telemetry: ViewPixelTelemetry = {
      view,
      width: naturalWidth,
      height: naturalHeight,
      isDecoded: true,
      dHash64,
      byteHash,
      qualityScore,
      meanLuma: Number(meanLuma.toFixed(1)),
      dominantColor,
      patchGridB64,
    };

    const findings = detectSingleViewAnomalies(telemetry);
    return { telemetry, findings };
  } catch {
    return emptyResult;
  }
}
