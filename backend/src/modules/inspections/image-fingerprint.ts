import crypto from 'crypto';
import jpeg from 'jpeg-js';

/**
 * Detects when a return photo is the same image as the pickup photo of the same angle
 * (same file, or the same photo re-saved / re-compressed).
 *
 * For such angles the condition cannot have changed, so the result is decided here, without the AI:
 * the pickup findings are carried over unchanged and no new damage can be reported. This removes
 * the risk of the model "seeing" different damage on the very same picture.
 *
 * A real re-take (new photo of the car) always differs in noise, light and framing and goes to the AI.
 */

const GRID = 128; // images are compared as 128 x 128 grayscale
const BLOCK = 8; // 16 x 16 blocks of 8 x 8 pixels

/** Max average pixel difference (0-255) for two images to count as the same picture. */
const MAX_MEAN_DIFF = 1.5;
/** Max difference inside any 8x8 block, so a small local change (a new scratch drawn in) is never ignored. */
const MAX_BLOCK_DIFF = 4;

export interface ImageFingerprint {
  sha256: string;
  /** 128x128 grayscale thumbnail, or null when the image could not be decoded (non-JPEG). */
  gray: Float32Array | null;
}

export function fingerprint(buffer: Buffer, mimeType: string): ImageFingerprint {
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (mimeType !== 'image/jpeg') return { sha256, gray: null };
  try {
    const decoded = jpeg.decode(buffer, { useTArray: true, maxResolutionInMP: 60, maxMemoryUsageInMB: 512 });
    return { sha256, gray: toGrayGrid(decoded.data, decoded.width, decoded.height) };
  } catch {
    return { sha256, gray: null };
  }
}

/** Box-filter downsample of RGBA pixels to a GRID x GRID luminance grid. */
function toGrayGrid(rgba: Uint8Array, width: number, height: number): Float32Array {
  const out = new Float32Array(GRID * GRID);
  const counts = new Uint32Array(GRID * GRID);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(GRID - 1, Math.floor((y * GRID) / height));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(GRID - 1, Math.floor((x * GRID) / width));
      const i = (y * width + x) * 4;
      const luma = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
      out[gy * GRID + gx] += luma;
      counts[gy * GRID + gx] += 1;
    }
  }
  for (let k = 0; k < out.length; k++) out[k] = counts[k] ? out[k] / counts[k] : 0;
  return out;
}

export function isSamePicture(a: ImageFingerprint, b: ImageFingerprint): boolean {
  if (a.sha256 === b.sha256) return true;
  if (!a.gray || !b.gray) return false;

  let total = 0;
  let maxBlock = 0;
  const blocksPerRow = GRID / BLOCK;
  const blockSums = new Float64Array(blocksPerRow * blocksPerRow);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const k = y * GRID + x;
      const diff = Math.abs(a.gray[k] - b.gray[k]);
      total += diff;
      blockSums[Math.floor(y / BLOCK) * blocksPerRow + Math.floor(x / BLOCK)] += diff;
    }
  }
  for (const sum of blockSums) maxBlock = Math.max(maxBlock, sum / (BLOCK * BLOCK));
  return total / (GRID * GRID) <= MAX_MEAN_DIFF && maxBlock <= MAX_BLOCK_DIFF;
}
