import crypto from 'crypto';
import zlib from 'zlib';

export type InspectionView =
  | 'FRONT'
  | 'DRIVER_SIDE'
  | 'PASSENGER_SIDE'
  | 'REAR'
  | 'ROOF'
  | 'INTERIOR';

export interface PatchCell {
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

export interface VisionDamageFinding {
  damageType: string;
  category: 'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  confidence: number; // 0.0 - 1.0
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  view: InspectionView;
  estimatedRepairCost: number;
  description: string;
}

export interface ViewPixelTelemetry {
  view: InspectionView;
  width: number;
  height: number;
  dHash64: string;
  byteHash?: string;
  sha256Hash?: string;
  qualityScore: number;
  meanLuma: number;
  dominantColor?: VisionColorResult;
  patchGridB64?: string;
  isUploadedRealImage?: boolean;
}

export interface ViewComparisonDelta {
  view: InspectionView;
  comparedAgainstBaseline: boolean;
  isIdentical: boolean;
  framingMismatch: boolean;
  similarityScore: number; // 0 - 100
  dHashDistance: number;
  newFindings: VisionDamageFinding[];
}

export const GRID_COLS = 24;
export const GRID_ROWS = 16;
export const TENSOR_W = 192;
export const TENSOR_H = 128;

interface ColorAnchor {
  name: string;
  hex: string;
  rgb: [number, number, number];
  finish: 'METALLIC' | 'GLOSS' | 'MATTE' | 'PEARL';
}

const AUTOMOTIVE_PALETTE: ColorAnchor[] = [
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

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
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

export function encodePatchGrid(grid: PatchCell[]): string {
  const buf = Buffer.alloc(grid.length * 8);
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
  return buf.toString('base64');
}

export function decodePatchGrid(b64?: string | null): PatchCell[] | null {
  if (!b64) return null;
  try {
    const buf = Buffer.from(b64, 'base64');
    const expected = GRID_COLS * GRID_ROWS * 8;
    if (buf.length !== expected) return null;
    const grid: PatchCell[] = [];
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

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Decodes an uncompressed/zlib PNG buffer into 192x128 standardized RGBA pixels.
 * Supports 8-bit non-interlaced Grayscale, GrayAlpha, RGB, and RGBA PNG images.
 */
export function decodePngToTensor(buf: Buffer): {
  width: number;
  height: number;
  rgba192x128: Uint8Array;
} | null {
  if (buf.length < 33) return null;
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(PNG_SIG)) return null;

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;

    if (type === 'IHDR' && length >= 13) {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      bitDepth = buf[dataStart + 8];
      colorType = buf[dataStart + 9];
      interlace = buf[dataStart + 12];
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  if (
    width <= 0 ||
    height <= 0 ||
    width > 8000 ||
    height > 8000 ||
    bitDepth !== 8 ||
    interlace !== 0 ||
    idatChunks.length === 0
  ) {
    return null;
  }

  const channelsMap: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsMap[colorType];
  if (!channels) return null;

  let raw: Buffer;
  try {
    raw = zlib.inflateSync(Buffer.concat(idatChunks));
  } catch {
    return null;
  }

  const stride = width * channels;
  if (raw.length < (stride + 1) * height) return null;

  const unfiltered = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const srcRow = y * (stride + 1);
    const filter = raw[srcRow];
    const dstRow = y * stride;
    const prevRow = (y - 1) * stride;

    for (let i = 0; i < stride; i++) {
      const x = raw[srcRow + 1 + i];
      const a = i >= channels ? unfiltered[dstRow + i - channels] : 0;
      const b = y > 0 ? unfiltered[prevRow + i] : 0;
      const c = y > 0 && i >= channels ? unfiltered[prevRow + i - channels] : 0;

      let recon = x;
      if (filter === 1) recon = (x + a) & 0xff;
      else if (filter === 2) recon = (x + b) & 0xff;
      else if (filter === 3) recon = (x + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (x + paethPredictor(a, b, c)) & 0xff;
      unfiltered[dstRow + i] = recon;
    }
  }

  // Area/bilinear downsample into TENSOR_W x TENSOR_H RGBA
  const out = new Uint8Array(TENSOR_W * TENSOR_H * 4);
  for (let dy = 0; dy < TENSOR_H; dy++) {
    const sy = Math.min(height - 1, Math.floor(((dy + 0.5) * height) / TENSOR_H));
    for (let dx = 0; dx < TENSOR_W; dx++) {
      const sx = Math.min(width - 1, Math.floor(((dx + 0.5) * width) / TENSOR_W));
      const sOff = sy * stride + sx * channels;
      const dOff = (dy * TENSOR_W + dx) * 4;
      if (channels === 1) {
        const g = unfiltered[sOff];
        out[dOff] = g;
        out[dOff + 1] = g;
        out[dOff + 2] = g;
        out[dOff + 3] = 255;
      } else if (channels === 2) {
        const g = unfiltered[sOff];
        out[dOff] = g;
        out[dOff + 1] = g;
        out[dOff + 2] = g;
        out[dOff + 3] = unfiltered[sOff + 1];
      } else if (channels === 3) {
        out[dOff] = unfiltered[sOff];
        out[dOff + 1] = unfiltered[sOff + 1];
        out[dOff + 2] = unfiltered[sOff + 2];
        out[dOff + 3] = 255;
      } else {
        out[dOff] = unfiltered[sOff];
        out[dOff + 1] = unfiltered[sOff + 1];
        out[dOff + 2] = unfiltered[sOff + 2];
        out[dOff + 3] = unfiltered[sOff + 3];
      }
    }
  }

  return { width, height, rgba192x128: out };
}

/**
 * Extracts perceptual dHash, spatial 24x16 grid, quality score, and dominant color
 * from standardized 192x128 RGBA tensor pixels.
 */
export function analyzeTensorRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  view: InspectionView,
  naturalWidth = TENSOR_W,
  naturalHeight = TENSOR_H,
  sha256Hash?: string
): ViewPixelTelemetry {
  const luma = new Float32Array(TENSOR_W * TENSOR_H);
  let totalLuma = 0;

  for (let i = 0; i < TENSOR_W * TENSOR_H; i++) {
    const o = i * 4;
    const lv = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
    luma[i] = lv;
    totalLuma += lv;
  }

  const meanLuma = totalLuma / (TENSOR_W * TENSOR_H);

  // 1. 9x8 dHash64
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

  // 2. Sharpness & Exposure quality
  let lapSum = 0;
  let lapCnt = 0;
  for (let y = 1; y < TENSOR_H - 1; y++) {
    for (let x = 1; x < TENSOR_W - 1; x++) {
      const idx = y * TENSOR_W + x;
      const lap = Math.abs(
        4 * luma[idx] - luma[idx - 1] - luma[idx + 1] - luma[idx - TENSOR_W] - luma[idx + TENSOR_W]
      );
      lapSum += lap;
      lapCnt++;
    }
  }
  const meanLap = lapSum / Math.max(1, lapCnt);
  const sharpnessNorm = clamp(meanLap / 18, 0.35, 1.0);
  const exposurePenalty = meanLuma < 28 || meanLuma > 235 ? 12 : meanLuma < 45 || meanLuma > 220 ? 5 : 0;
  const qualityScore = Number(clamp(68 + sharpnessNorm * 31.2 - exposurePenalty, 42, 99.6).toFixed(1));

  // 3. Build 24x16 Patch Grid (each cell is 8x8 pixels)
  const patches: PatchCell[] = [];
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
      const stdL = Math.sqrt(sq / 64);
      cellEdges.sort((a, b) => b - a);
      const top8Edge =
        cellEdges.slice(0, 8).reduce((sum, v) => sum + v, 0) / 8;

      patches.push({
        l: avgL,
        r: sR / 64,
        g: sG / 64,
        b: sB / 64,
        edge: clamp(top8Edge, 0, 255),
        hEdge: clamp((sHEdge / 64) * 3.0, 0, 255),
        vEdge: clamp((sVEdge / 64) * 3.0, 0, 255),
        varL: clamp(stdL, 0, 255),
      });
    }
  }

  // 4. Exterior Body Paint Color from Painted Center Core (skip INTERIOR)
  const dominantColor = view === 'INTERIOR' ? undefined : detectColorFromPatches(patches);
  const patchGridB64 = encodePatchGrid(patches);
  const byteHash = sha256Hash || crypto.createHash('sha256').update(Buffer.from(rgba)).digest('hex');

  return {
    view,
    width: naturalWidth,
    height: naturalHeight,
    dHash64,
    byteHash,
    sha256Hash,
    qualityScore,
    meanLuma: Number(meanLuma.toFixed(1)),
    dominantColor,
    patchGridB64,
    isUploadedRealImage: true,
  };
}

export function detectColorFromPatches(patches: PatchCell[]): VisionColorResult {
  const hueBins = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  const achBuckets = [
    { label: 'black', w: 0, r: 0, g: 0, b: 0 },
    { label: 'graphite', w: 0, r: 0, g: 0, b: 0 },
    { label: 'gray', w: 0, r: 0, g: 0, b: 0 },
    { label: 'silver', w: 0, r: 0, g: 0, b: 0 },
    { label: 'white', w: 0, r: 0, g: 0, b: 0 },
  ];

  let totalWeight = 0;
  let chromWeight = 0;

  // Body-focused sampling zone: rows 4..12, cols 4..19
  for (let r = 4; r <= 12; r++) {
    for (let c = 4; c <= 19; c++) {
      const p = patches[r * GRID_COLS + c];
      const [h, s, v] = rgbToHsv(p.r, p.g, p.b);
      if (v > 0.98 && s < 0.06) continue; // blown glare
      // Weight center band & smooth paint higher than jagged background
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
  let confidence = 0.88;

  let bestHue = hueBins[0];
  for (const b of hueBins) {
    if (b.w > bestHue.w) bestHue = b;
  }

  if (totalWeight > 0 && chromWeight / totalWeight >= 0.18 && bestHue.w > 0) {
    targetRgb = [bestHue.r / bestHue.w, bestHue.g / bestHue.w, bestHue.b / bestHue.w];
    confidence = clamp(0.78 + (bestHue.w / Math.max(1, chromWeight)) * 0.2, 0.78, 0.985);
  } else {
    let bestAch = achBuckets[4];
    for (const b of achBuckets) {
      if (b.w > bestAch.w) bestAch = b;
    }
    if (bestAch.w > 0) {
      targetRgb = [bestAch.r / bestAch.w, bestAch.g / bestAch.w, bestAch.b / bestAch.w];
      confidence = clamp(0.76 + (bestAch.w / Math.max(1, totalWeight)) * 0.21, 0.76, 0.978);
    }
  }

  // Nearest automotive palette name while preserving measured RGB hex
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
    confidence: Number(confidence.toFixed(3)),
    finishType: nearest.finish,
  };
}

function medianOf(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function resolvePanelLocation(view: InspectionView, cx: number, cy: number): string {
  const horiz = cx < 0.36 ? 'Driver Side' : cx > 0.64 ? 'Passenger Side' : 'Center';
  const vert = cy < 0.42 ? 'Upper' : cy > 0.65 ? 'Lower' : 'Mid';

  switch (view) {
    case 'FRONT':
      if (cy < 0.44) return `Hood / Bonnet ${horiz} Section`.slice(0, 64);
      return `Front Bumper ${horiz} ${vert === 'Lower' ? 'Splitter' : 'Fascia'}`.slice(0, 64);
    case 'REAR':
      if (cy < 0.45) return `Tailgate / Bootlid ${horiz} Panel`.slice(0, 64);
      return `Rear Bumper ${horiz} Corner`.slice(0, 64);
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
  confidence: number;
}

/**
 * Computes surface anomaly detections from a single frame's 24x16 patch grid.
 * Calibrated with neighborhood smoothness, structural seam & bilateral symmetry suppression
 * to minimize false positives on clean cars while isolating localized dents, scratches, and chips.
 */
export function detectSingleViewAnomalies(
  telemetry: ViewPixelTelemetry
): VisionDamageFinding[] {
  const patches = decodePatchGrid(telemetry.patchGridB64);
  if (!patches || telemetry.view === 'INTERIOR') {
    return [];
  }

  const rawScores = new Float32Array(GRID_COLS * GRID_ROWS);
  const rawCats: Array<'SCRATCH' | 'DENT' | 'CRACK' | 'PAINT_CHIP' | null> = new Array(
    GRID_COLS * GRID_ROWS
  ).fill(null);

  const inBodyBounds = (c: number, r: number): boolean => {
    if (c < 2 || c > 21 || r < 4 || r > 12) return false;
    // Exclude standard side wheel arch footprints on lower front/rear corners
    if ((telemetry.view === 'DRIVER_SIDE' || telemetry.view === 'PASSENGER_SIDE') && r >= 10) {
      if ((c >= 3 && c <= 7) || (c >= 16 && c <= 20)) return false;
    }
    return true;
  };

  // Pass 1: Score every body cell against its 5x5 local neighborhood
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

      // Only flag localized defects on cohesive body panels (suppress chaotic outdoor foliage/meshes)
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

      // Signal 1: Sharp linear scratch / scuff on smooth panel
      if (
        p.edge > 34 &&
        edgeRatio > 2.2 &&
        (lumaJump > 20 || colorDist > 28) &&
        anisotropy > 0.14 &&
        madL < 18
      ) {
        cat = 'SCRATCH';
        score = Math.min(1, 0.6 + (edgeRatio - 2.0) * 0.1 + colorDist / 160);
      }
      // Signal 2: Localized exposed primer / chip / crack on smooth painted area
      else if (colorDist > 48 && (p.edge > 28 || maxNbEdge > 32) && madL < 18) {
        cat = colorDist > 68 && p.l < medL - 25 ? 'CRACK' : 'PAINT_CHIP';
        score = Math.min(1, 0.62 + (colorDist - 40) / 140 + Math.max(p.edge, maxNbEdge) / 220);
      }
      // Signal 3: Compression dent (adjacent concave shadow + specular lip in same hue)
      else if (
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

  // Pass 2: Bilateral symmetry + long structural seam suppression
  const candidates: CandidateCell[] = [];
  for (let r = 4; r <= 12; r++) {
    for (let c = 2; c <= 21; c++) {
      const idx = r * GRID_COLS + c;
      const score = rawScores[idx];
      const cat = rawCats[idx];
      if (!cat || score <= 0) continue;

      // Suppress symmetric fixtures on FRONT / REAR (headlights, taillights, grille symmetry)
      if (telemetry.view === 'FRONT' || telemetry.view === 'REAR') {
        const mc = GRID_COLS - 1 - c;
        if (Math.abs(c - 11.5) >= 2.2) {
          const mScore = rawScores[r * GRID_COLS + mc];
          if (mScore > 0 && Math.min(score, mScore) / Math.max(score, mScore) > 0.55) {
            continue;
          }
        }
      }

      // Suppress continuous horizontal structural panel lines / beltlines / window sills (run length >= 6)
      let rowRun = 1;
      for (let dc = c - 1; dc >= 2 && patches[r * GRID_COLS + dc].edge > 28; dc--) rowRun++;
      for (let dc = c + 1; dc <= 21 && patches[r * GRID_COLS + dc].edge > 28; dc++) rowRun++;
      if (rowRun >= 6) continue;

      candidates.push({ c, r, score, category: cat, confidence: score });
    }
  }

  return clusterCellsToFindings(candidates, telemetry.view, 'surface');
}

/**
 * Compares Return pixel telemetry against Pickup baseline telemetry for the same angle.
 * Guarantees 0 new findings when identical images are supplied.
 */
export function compareViewTelemetry(
  pickup: ViewPixelTelemetry,
  ret: ViewPixelTelemetry,
  view: InspectionView
): ViewComparisonDelta {
  const hashDist = hammingDistanceHex(pickup.dHash64, ret.dHash64);

  // Exact cryptographic buffer / pixel match
  if (
    (pickup.sha256Hash && ret.sha256Hash && pickup.sha256Hash === ret.sha256Hash) ||
    (pickup.byteHash && ret.byteHash && pickup.byteHash === ret.byteHash)
  ) {
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

  // If grids missing, fall back cleanly to dHash perceptual comparison
  if (!gridA || !gridB) {
    const isIdentical = hashDist <= 2;
    return {
      view,
      comparedAgainstBaseline: true,
      isIdentical,
      framingMismatch: hashDist > 20,
      similarityScore: Number(clamp(100 - hashDist * 2.5, 25, 100).toFixed(1)),
      dHashDistance: hashDist,
      newFindings: isIdentical ? [] : detectSingleViewAnomalies(ret),
    };
  }

  // Global ambient lighting normalization between Pickup and Return shots
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

  // Identical or near-identical recompressed photo check
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

  // Different framing / unaligned scene check -> avoid false global pixel diff
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

  // Same-angle aligned comparison: isolate localized outlier changes above ambient noise
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
        diffCandidates.push({
          c,
          r,
          score: conf,
          category: cat,
          confidence: conf,
        });
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

function clusterCellsToFindings(
  candidates: CandidateCell[],
  view: InspectionView,
  mode: 'surface' | 'baseline-delta'
): VisionDamageFinding[] {
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

  const findings: VisionDamageFinding[] = [];

  for (const cluster of clusters) {
    // Discard oversized regions (> 28% of grid) which indicate lighting/framing shift rather than localized damage
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

    // Majority vote category
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
      damageType: labels[dominantCat][severity].slice(0, 64),
      category: dominantCat,
      severity,
      location: location.slice(0, 64),
      confidence: Number(clamp(maxScore, 0.74, 0.985).toFixed(3)),
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

  // Keep highest-confidence distinct anomalies (max 3 per view)
  return findings
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
