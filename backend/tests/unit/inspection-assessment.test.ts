import assert from 'assert';
import {
  boxFromYxyx1000,
  classifyNewDamage,
  conditionScore,
  dedupeFindings,
  findOverlappingBaseline,
  intersectionOverUnion,
  isChargeable,
  normalizeCategory,
  repairCost,
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

function finding(overrides: Partial<AssessedFinding> = {}): AssessedFinding {
  return {
    view: 'FRONT',
    category: 'SCRATCH',
    severity: 'LOW',
    part: 'Front bumper',
    description: 'Scratch on bumper',
    confidence: 0.9,
    box: { x: 0.4, y: 0.6, width: 0.1, height: 0.05 },
    estimatedRepairCost: repairCost('SCRATCH', 'LOW'),
    ...overrides,
  };
}

test('Model box [ymin,xmin,ymax,xmax] 0-1000 converts to normalized x/y/width/height', () => {
  assert.deepStrictEqual(boxFromYxyx1000([100, 200, 300, 500]), { x: 0.2, y: 0.1, width: 0.3, height: 0.2 });
});
test('Degenerate or malformed boxes are rejected', () => {
  assert.strictEqual(boxFromYxyx1000([100, 200, 100, 500]), null);
  assert.strictEqual(boxFromYxyx1000([1, 2, 3]), null);
  assert.strictEqual(boxFromYxyx1000('x'), null);
});
test('IoU of identical boxes is 1 and of separate boxes is 0', () => {
  const a = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
  assert.ok(Math.abs(intersectionOverUnion(a, a) - 1) < 1e-9);
  assert.strictEqual(intersectionOverUnion(a, { x: 0.6, y: 0.6, width: 0.1, height: 0.1 }), 0);
});
test('Clean car scores 100%', () => {
  assert.strictEqual(conditionScore([]), 100);
});
test('Condition score is deterministic: 1 low scratch + 1 medium dent = 100 - 2 - 8 = 90%', () => {
  assert.strictEqual(
    conditionScore([finding(), finding({ category: 'DENT', severity: 'MEDIUM' })]),
    90
  );
});
test('Condition score never goes below 0', () => {
  const many = Array.from({ length: 10 }, () => finding({ category: 'BROKEN_PART', severity: 'HIGH' }));
  assert.strictEqual(conditionScore(many), 0);
});
test('Duplicate detections of the same damage are merged (most confident kept)', () => {
  const kept = dedupeFindings([finding({ confidence: 0.7 }), finding({ confidence: 0.95 })]);
  assert.strictEqual(kept.length, 1);
  assert.strictEqual(kept[0].confidence, 0.95);
});
test('Same box on a different angle is not a duplicate', () => {
  assert.strictEqual(dedupeFindings([finding(), finding({ view: 'REAR' })]).length, 2);
});
test('Return damage on top of a pickup damage is pre-existing (no fine)', () => {
  const baseline = [finding()];
  const cls = classifyNewDamage(finding({ box: { x: 0.41, y: 0.6, width: 0.1, height: 0.05 } }), baseline);
  assert.strictEqual(cls, 'PRE_EXISTING_UNCHANGED');
  assert.strictEqual(isChargeable(cls), false);
});
test('Same spot but more severe at return = worsened (chargeable)', () => {
  const cls = classifyNewDamage(finding({ severity: 'HIGH' }), [finding()]);
  assert.strictEqual(cls, 'PRE_EXISTING_WORSENED');
  assert.strictEqual(isChargeable(cls), true);
});
test('Damage in a new place with high confidence = confirmed new damage (chargeable)', () => {
  const cls = classifyNewDamage(
    finding({ view: 'DRIVER_SIDE', category: 'DENT', severity: 'MEDIUM', box: { x: 0.2, y: 0.4, width: 0.1, height: 0.1 } }),
    [finding()]
  );
  assert.strictEqual(cls, 'CONFIRMED_NEW_DAMAGE');
  assert.strictEqual(isChargeable(cls), true);
});
test('Low-confidence new damage is only flagged for staff review, never charged automatically', () => {
  const cls = classifyNewDamage(finding({ view: 'REAR', confidence: 0.5 }), [finding()]);
  assert.strictEqual(cls, 'POSSIBLY_NEW_DAMAGE');
  assert.strictEqual(isChargeable(cls), false);
});
test('Best-overlapping baseline damage is matched', () => {
  const near = finding({ box: { x: 0.4, y: 0.6, width: 0.1, height: 0.05 } });
  const far = finding({ box: { x: 0.0, y: 0.0, width: 0.1, height: 0.05 } });
  assert.strictEqual(findOverlappingBaseline(finding(), [far, near]), near);
});
test('Repair cost table: medium dent = PKR 18,000; multiplier scales it', () => {
  assert.strictEqual(repairCost('DENT', 'MEDIUM'), 18000);
  assert.strictEqual(repairCost('DENT', 'MEDIUM', 1.5), 27000);
});
test('Free-text categories are normalized', () => {
  assert.strictEqual(normalizeCategory('deep scratch'), 'SCRATCH');
  assert.strictEqual(normalizeCategory('cracked windshield'), 'CRACK');
  assert.strictEqual(normalizeCategory('missing mirror'), 'BROKEN_PART');
});

console.log(`\nInspection assessment tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
