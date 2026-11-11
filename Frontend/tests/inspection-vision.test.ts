import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  compareViewSignatures,
  detectSingleViewAnomalies,
  encodePatchGrid,
  GRID_COLS,
  GRID_ROWS,
  type ViewPixelTelemetry,
  type VisionPatchCell,
} from '../src/features/inspections/services/pixelVisionAnalyzer';
import { InspectionAiEngine } from '../src/features/inspections/services/inspectionAiEngine';

function buildUniformGrid(luma: number, rgb: [number, number, number]): VisionPatchCell[] {
  const cells: VisionPatchCell[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      cells.push({
        l: luma,
        r: rgb[0],
        g: rgb[1],
        b: rgb[2],
        edge: 2,
        hEdge: 1,
        vEdge: 1,
        varL: 1,
      });
    }
  }
  return cells;
}

describe('Client Pixel Vision & Baseline Delta Engine', () => {
  test('Identical baseline and return pixel telemetry yield 0 new defects and 100% parity', () => {
    const cleanCells = buildUniformGrid(140, [30, 80, 200]);
    const sig: ViewPixelTelemetry = {
      view: 'FRONT',
      width: 1280,
      height: 720,
      isDecoded: true,
      dHash64: '0123456789abcdef',
      byteHash: 'abc123same',
      qualityScore: 94.5,
      meanLuma: 140,
      patchGridB64: encodePatchGrid(cleanCells),
    };

    const delta = compareViewSignatures(sig, { ...sig }, 'FRONT');
    assert.equal(delta.isIdentical, true);
    assert.equal(delta.similarityScore, 100);
    assert.equal(delta.newFindings.length, 0);
  });

  test('Single-frame clean grid produces 0 false anomalies while scratched panel localizes scratch', () => {
    const clean = buildUniformGrid(145, [220, 40, 45]);
    const cleanTelemetry: ViewPixelTelemetry = {
      view: 'PASSENGER_SIDE',
      width: 1280,
      height: 720,
      isDecoded: true,
      dHash64: 'aaaa1111bbbb2222',
      byteHash: 'clean-side',
      qualityScore: 92,
      meanLuma: 145,
      patchGridB64: encodePatchGrid(clean),
    };

    assert.equal(detectSingleViewAnomalies(cleanTelemetry).length, 0);

    // Inject localized scratch cluster at col=11..13, row=8
    const scratched = clean.map((cell, idx) => {
      const r = Math.floor(idx / GRID_COLS);
      const c = idx % GRID_COLS;
      if (r === 8 && (c === 11 || c === 12)) {
        return { l: 235, r: 240, g: 240, b: 242, edge: 95, hEdge: 22, vEdge: 90, varL: 35 };
      }
      return cell;
    });

    const damagedTelemetry: ViewPixelTelemetry = {
      ...cleanTelemetry,
      dHash64: 'aaaa1111bbbb3333',
      byteHash: 'scratched-side',
      patchGridB64: encodePatchGrid(scratched),
    };

    const detected = detectSingleViewAnomalies(damagedTelemetry);
    assert.ok(detected.length >= 1, 'Expected localized scratch detection on Passenger Side');
    assert.equal(detected[0].category, 'SCRATCH');
    assert.equal(detected[0].view, 'PASSENGER_SIDE');
  });

  test('Slightly shifted ambient brightness on identical return car yields 0 new defects', () => {
    const pickupCells = buildUniformGrid(120, [200, 205, 210]);
    const brighterReturnCells = buildUniformGrid(138, [230, 235, 241]);

    const pickup: ViewPixelTelemetry = {
      view: 'REAR',
      width: 1280,
      height: 720,
      isDecoded: true,
      dHash64: 'ff00ff00ff00ff00',
      byteHash: 'pickup-rear',
      qualityScore: 91,
      meanLuma: 120,
      patchGridB64: encodePatchGrid(pickupCells),
    };

    const ret: ViewPixelTelemetry = {
      view: 'REAR',
      width: 1280,
      height: 720,
      isDecoded: true,
      dHash64: 'ff00ff00ff00ff00',
      byteHash: 'return-rear-bright',
      qualityScore: 91,
      meanLuma: 138,
      patchGridB64: encodePatchGrid(brighterReturnCells),
    };

    const delta = compareViewSignatures(pickup, ret, 'REAR');
    assert.equal(delta.newFindings.length, 0, 'Ambient exposure gain should not produce fake damage');
  });

  test('compareReports excludes pre-existing spatial overlap and computes accurate refund', () => {
    const preExistingFinding = {
      id: 'f1',
      damageType: 'Superficial Clearcoat Scuff',
      category: 'SCRATCH' as const,
      severity: 'LOW' as const,
      location: 'Rear Bumper Driver Corner',
      confidence: 92,
      boundingBox: { x: 0.25, y: 0.62, width: 0.14, height: 0.08 },
      view: 'REAR' as const,
      estimatedRepairCost: 180,
      description: 'Pre-existing',
    };

    const dummyVehicle = { brand: 'Honda', model: 'Civic', year: 2025, registrationNumber: 'ABC-123' };
    const pickupReport = {
      id: 'p1',
      type: 'PICKUP' as const,
      detectedColor: InspectionAiEngine.detectCarColor('White'),
      overallScore: 96.5,
      summary: 'Baseline',
      findings: [preExistingFinding],
      scratchesCount: 1,
      dentsCount: 0,
      coverageScore: 100,
      inspectionHash: 'H1',
      timestamp: 'now',
      vehicle: dummyVehicle,
      photos: [],
    };
    const returnReport = {
      ...pickupReport,
      id: 'r1',
      type: 'RETURN' as const,
      findings: [{ ...preExistingFinding, id: 'f1-ret', boundingBox: { x: 0.27, y: 0.61, width: 0.14, height: 0.08 } }],
    };

    const cmp = InspectionAiEngine.compareReports(pickupReport, returnReport, 5000);
    assert.equal(cmp.preExistingCount, 1);
    assert.equal(cmp.newDamageCount, 0);
    assert.equal(cmp.netRefundAmount, 5000);
    assert.equal(cmp.depositStatus, 'FULL_REFUND');
  });
});
