import assert from 'assert';
import jpeg from 'jpeg-js';
import { fingerprint, isSamePicture } from '../../src/modules/inspections/image-fingerprint';
import {
  compareMake,
  comparePlate,
  intersectPasses,
  unionPasses,
  type AssessedFinding,
} from '../../src/modules/inspections/damage-assessment';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(` [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}:`, err.message || err);
    failed++;
  }
}

/** Synthetic "car photo": gradient background with a body-coloured block; optional scratch line. */
function makePhoto(opts: { quality?: number; scratch?: boolean; brightness?: number; seed?: number } = {}) {
  const width = 800;
  const height = 600;
  const data = Buffer.alloc(width * height * 4);
  let rnd = opts.seed ?? 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inCar = x > 150 && x < 650 && y > 220 && y < 420;
      let v = inCar ? 200 : 60 + (y / height) * 80;
      if (opts.seed !== undefined) {
        rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;
        v += ((rnd % 21) - 10) * 1.2; // sensor noise of a re-taken photo
      }
      if (opts.scratch && y >= 300 && y <= 303 && x > 300 && x < 420) v = 40;
      v = Math.max(0, Math.min(255, v + (opts.brightness || 0)));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = inCar ? v - 30 : v;
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data, width, height }, opts.quality ?? 85).data;
}

const original = makePhoto();

test('Exactly the same file counts as the same picture', () => {
  assert.strictEqual(isSamePicture(fingerprint(original, 'image/jpeg'), fingerprint(Buffer.from(original), 'image/jpeg')), true);
});
test('The same photo re-compressed (different bytes) still counts as the same picture', () => {
  const recompressed = jpeg.encode(jpeg.decode(original, { useTArray: true }) as any, 70).data;
  assert.notStrictEqual(Buffer.compare(original, recompressed), 0);
  assert.strictEqual(isSamePicture(fingerprint(original, 'image/jpeg'), fingerprint(recompressed, 'image/jpeg')), true);
});
test('A new scratch on the same photo is NOT treated as the same picture', () => {
  const scratched = makePhoto({ scratch: true });
  assert.strictEqual(isSamePicture(fingerprint(original, 'image/jpeg'), fingerprint(scratched, 'image/jpeg')), false);
});
test('A re-taken photo (noise + different light) goes to the AI', () => {
  const retake = makePhoto({ seed: 7, brightness: 12 });
  assert.strictEqual(isSamePicture(fingerprint(original, 'image/jpeg'), fingerprint(retake, 'image/jpeg')), false);
});

test('Plate: exact, different formatting and one misread character all match', () => {
  assert.strictEqual(comparePlate('ABC-123', 'ABC 123'), 'MATCH');
  assert.strictEqual(comparePlate('LEB 4521', 'LEB-4521'), 'MATCH');
  assert.strictEqual(comparePlate('LE8-4521', 'LEB-4521'), 'MATCH');
});
test('Plate: a different car is a mismatch, an unreadable plate is not', () => {
  assert.strictEqual(comparePlate('KHI-9087', 'LEB-4521'), 'MISMATCH');
  assert.strictEqual(comparePlate('', 'LEB-4521'), 'UNREAD');
});
test('Make: booked Hyundai vs photos of Hyundai / Toyota / unknown', () => {
  assert.strictEqual(compareMake('Hyundai', 'Hyundai'), 'MATCH');
  assert.strictEqual(compareMake('Mercedes-Benz', 'Mercedes'), 'MATCH');
  assert.strictEqual(compareMake('Toyota', 'Hyundai'), 'MISMATCH');
  assert.strictEqual(compareMake('', 'Hyundai'), 'UNKNOWN');
});

function f(overrides: Partial<AssessedFinding>): AssessedFinding {
  return {
    view: 'FRONT',
    category: 'SCRATCH',
    severity: 'LOW',
    part: 'Front bumper',
    description: '',
    confidence: 0.9,
    box: { x: 0.4, y: 0.6, width: 0.1, height: 0.05 },
    estimatedRepairCost: 4000,
    ...overrides,
  };
}

test('New damage seen in only one AI pass is dropped (no fine for a one-off hallucination)', () => {
  const pass1 = [f({}), f({ view: 'REAR', part: 'Rear bumper', category: 'DENT' })];
  const pass2 = [f({ box: { x: 0.41, y: 0.6, width: 0.1, height: 0.05 } })];
  const kept = intersectPasses([pass1, pass2]);
  assert.strictEqual(kept.length, 1);
  assert.strictEqual(kept[0].view, 'FRONT');
});
test('Agreed damage keeps the lower confidence of the passes', () => {
  const kept = intersectPasses([[f({ confidence: 0.95 })], [f({ confidence: 0.7 })]]);
  assert.strictEqual(kept[0].confidence, 0.7);
});
test('Pickup records damage seen in any pass (customer protected later)', () => {
  const all = unionPasses([[f({})], [f({ view: 'REAR', part: 'Rear bumper' })]]);
  assert.strictEqual(all.length, 2);
});

console.log(`\nInspection consistency tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
