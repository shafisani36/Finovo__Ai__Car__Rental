import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { InspectionAiEngine } from '../../src/modules/inspections/inspection-ai.engine';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodeRgbaPng(width: number, height: number, rgba: Uint8Array): string {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * (width * 4 + 1);
    raw[rowOff] = 0; // filter None
    for (let x = 0; x < width * 4; x++) {
      raw[rowOff + 1 + x] = rgba[y * width * 4 + x];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

function generateCarPanelRgba(
  width: number,
  height: number,
  paintRgb: [number, number, number],
  options: {
    symmetricHeadlights?: boolean;
    scratchBox?: { x0: number; y0: number; x1: number; y1: number };
    dentBox?: { cx: number; cy: number; rx: number; ry: number };
    chipBox?: { x0: number; y0: number; x1: number; y1: number };
  } = {}
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  const [pr, pg, pb] = paintRgb;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      let r = pr;
      let g = pg;
      let b = pb;

      // Sky & Studio floor outside car silhouette
      if (ny < 0.22) {
        r = 225;
        g = 228;
        b = 235;
      } else if (ny > 0.86) {
        r = 55;
        g = 58;
        b = 64;
      } else if (ny >= 0.24 && ny <= 0.36 && nx > 0.2 && nx < 0.8) {
        // Upper dark tinted cabin glass
        r = 35;
        g = 42;
        b = 54;
      } else {
        // Gentle curved metallic shading across glossy paint
        const shade = Math.sin(ny * Math.PI) * 14 - 5;
        r = Math.max(0, Math.min(255, Math.round(pr + shade)));
        g = Math.max(0, Math.min(255, Math.round(pg + shade)));
        b = Math.max(0, Math.min(255, Math.round(pb + shade)));
      }

      // Clean bilateral headlights on FRONT/REAR (should NEVER be marked as damage!)
      if (options.symmetricHeadlights) {
        const inLeftLamp = nx >= 0.14 && nx <= 0.27 && ny >= 0.44 && ny <= 0.56;
        const inRightLamp = nx >= 0.73 && nx <= 0.86 && ny >= 0.44 && ny <= 0.56;
        if (inLeftLamp || inRightLamp) {
          r = 248;
          g = 248;
          b = 252;
        }
      }

      // Draw sharp linear scratch / abrasion with exposed silver-white primer
      if (options.scratchBox) {
        const s = options.scratchBox;
        if (nx >= s.x0 && nx <= s.x1 && ny >= s.y0 && ny <= s.y1) {
          // Thin horizontal jagged gouge lines
          if (Math.abs((ny - (s.y0 + s.y1) / 2) * height) <= 2.2) {
            r = 235;
            g = 235;
            b = 240;
          }
        }
      }

      // Draw compression dent (shadow pocket adjacent to bright specular crease)
      if (options.dentBox) {
        const d = options.dentBox;
        const dx = (nx - d.cx) / d.rx;
        const dy = (ny - d.cy) / d.ry;
        const dist = dx * dx + dy * dy;
        if (dist <= 1.0) {
          const offset = dy < -0.15 ? 48 : -68;
          r = Math.max(0, Math.min(255, r + offset));
          g = Math.max(0, Math.min(255, g + offset));
          b = Math.max(0, Math.min(255, b + offset));
        }
      }

      // Draw dark paint chip / bare primer scrape
      if (options.chipBox) {
        const c = options.chipBox;
        if (nx >= c.x0 && nx <= c.x1 && ny >= c.y0 && ny <= c.y1) {
          r = 38;
          g = 36;
          b = 34;
        }
      }

      const o = (y * width + x) * 4;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = 255;
    }
  }

  return rgba;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   RUNNING FINOVO DYNAMIC AI VISION INSPECTION TESTS');
  console.log('======================================================\n');

  const W = 192;
  const H = 128;

  // 1. Clean 4-side Metallic Blue Sedan should yield 0 false positives & detect blue paint
  const blueFrontClean = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [28, 76, 204], { symmetricHeadlights: true }));
  const blueLeftClean = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [28, 76, 204]));
  const blueRightClean = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [28, 76, 204]));
  const blueRearClean = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [28, 76, 204], { symmetricHeadlights: true }));

  const cleanPickup = await InspectionAiEngine.analyzeVehiclePhotosAsync({
    type: 'PICKUP',
    vehicleBrand: 'BMW',
    vehicleModel: '5 Series',
    photos: [
      { view: 'FRONT', imageUrl: blueFrontClean },
      { view: 'DRIVER_SIDE', imageUrl: blueLeftClean },
      { view: 'PASSENGER_SIDE', imageUrl: blueRightClean },
      { view: 'REAR', imageUrl: blueRearClean },
    ],
  });

  assert.equal(cleanPickup.findings.length, 0, 'Clean car with headlights must have 0 false defects');
  assert.equal(cleanPickup.overallScore, 100);
  assert.equal(cleanPickup.coverageScore, 100);
  assert.ok(cleanPickup.detectedColor.colorName.includes('Blue'), `Expected Blue, got ${cleanPickup.detectedColor.colorName}`);
  console.log(' [PASS] Clean 4-angle Blue Sedan produces 100% score, 0 false defects & accurate paint color');

  // 2. Identical Return Photos uploaded after Pickup -> MUST yield 0 NEW defects (User's main bug fix!)
  const identicalReturn = await InspectionAiEngine.analyzeVehiclePhotosAsync({
    type: 'RETURN',
    vehicleBrand: 'BMW',
    vehicleModel: '5 Series',
    photos: [
      { view: 'FRONT', imageUrl: blueFrontClean },
      { view: 'DRIVER_SIDE', imageUrl: blueLeftClean },
      { view: 'PASSENGER_SIDE', imageUrl: blueRightClean },
      { view: 'REAR', imageUrl: blueRearClean },
    ],
    baselinePhotos: cleanPickup.photoMetadata.map((m, i) => ({
      view: m.view,
      imageUrl: [blueFrontClean, blueLeftClean, blueRightClean, blueRearClean][i],
      sha256Hash: m.sha256Hash,
      qualityDetails: m.qualityDetails,
      qualityScore: m.qualityScore,
    })),
    baselineFindings: cleanPickup.findings,
  });

  assert.equal(identicalReturn.findings.length, 0, 'Identical return photos must yield 0 defects');
  assert.equal(identicalReturn.overallScore, 100);
  assert.equal(identicalReturn.parityScore, 100);

  const identicalCmp = InspectionAiEngine.compareInspections(cleanPickup.findings, identicalReturn.findings, 50000);
  assert.equal(identicalCmp.newDamageCount, 0);
  assert.equal(identicalCmp.totalProposedCharges, 0);
  assert.equal(identicalCmp.depositStatus, 'FULL_REFUND');
  console.log(' [PASS] Identical Return vs Pickup photos produce 0 defects, 100% parity & FULL_REFUND');

  // 3. Real Red SUV with Rear Bumper Scratch & Passenger Door Dent on Return -> must localize accurately
  const redCleanFront = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [205, 32, 36], { symmetricHeadlights: true }));
  const redCleanLeft = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [205, 32, 36]));
  const redCleanRight = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [205, 32, 36]));
  const redCleanRear = encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [205, 32, 36], { symmetricHeadlights: true }));

  const suvPickup = await InspectionAiEngine.analyzeVehiclePhotosAsync({
    type: 'PICKUP',
    vehicleBrand: 'Kia',
    vehicleModel: 'Sportage',
    photos: [
      { view: 'FRONT', imageUrl: redCleanFront },
      { view: 'DRIVER_SIDE', imageUrl: redCleanLeft },
      { view: 'PASSENGER_SIDE', imageUrl: redCleanRight },
      { view: 'REAR', imageUrl: redCleanRear },
    ],
  });
  assert.ok(suvPickup.detectedColor.colorName.includes('Red'), `Expected Red, got ${suvPickup.detectedColor.colorName}`);

  const redDamagedRear = encodeRgbaPng(
    W,
    H,
    generateCarPanelRgba(W, H, [205, 32, 36], {
      symmetricHeadlights: true,
      scratchBox: { x0: 0.62, y0: 0.56, x1: 0.78, y1: 0.68 },
    })
  );
  const redDentedRight = encodeRgbaPng(
    W,
    H,
    generateCarPanelRgba(W, H, [205, 32, 36], {
      dentBox: { cx: 0.45, cy: 0.54, rx: 0.08, ry: 0.09 },
    })
  );

  const damagedReturn = await InspectionAiEngine.analyzeVehiclePhotosAsync({
    type: 'RETURN',
    vehicleBrand: 'Kia',
    vehicleModel: 'Sportage',
    photos: [
      { view: 'FRONT', imageUrl: redCleanFront },
      { view: 'DRIVER_SIDE', imageUrl: redCleanLeft },
      { view: 'PASSENGER_SIDE', imageUrl: redDentedRight },
      { view: 'REAR', imageUrl: redDamagedRear },
    ],
    baselinePhotos: suvPickup.photoMetadata.map((m, i) => ({
      view: m.view,
      imageUrl: [redCleanFront, redCleanLeft, redCleanRight, redCleanRear][i],
      sha256Hash: m.sha256Hash,
      qualityDetails: m.qualityDetails,
      qualityScore: m.qualityScore,
    })),
    baselineFindings: suvPickup.findings,
  });

  assert.ok(damagedReturn.findings.length >= 2, `Expected >=2 findings on damaged angles, got ${damagedReturn.findings.length}`);
  assert.ok(damagedReturn.findings.some((f) => f.view === 'REAR'), 'Must detect REAR scratch anomaly');
  assert.ok(damagedReturn.findings.some((f) => f.view === 'PASSENGER_SIDE'), 'Must detect PASSENGER_SIDE dent anomaly');
  assert.equal(damagedReturn.findings.some((f) => f.view === 'FRONT' || f.view === 'DRIVER_SIDE'), false, 'Clean unchanged angles must stay clean');

  const damagedCmp = InspectionAiEngine.compareInspections(suvPickup.findings, damagedReturn.findings, 50000);
  assert.ok(damagedCmp.newDamageCount >= 2);
  assert.ok(damagedCmp.totalProposedCharges > 0);
  assert.equal(damagedCmp.depositStatus, 'PARTIAL_DEDUCTION');
  console.log(' [PASS] Return scan isolates ONLY truly modified angles (Rear + Passenger Door) and preserves clean angles');

  // 4. Pre-Existing Damage present BEFORE Key Handover (Pickup) -> must NOT be billed on Return when unchanged!
  const pickupWithPreExisting = await InspectionAiEngine.analyzeVehiclePhotosAsync({
    type: 'PICKUP',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    photos: [
      { view: 'FRONT', imageUrl: redDamagedRear.length > 0 ? redCleanFront : redCleanFront },
      { view: 'REAR', imageUrl: encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [205, 32, 36], { chipBox: { x0: 0.25, y0: 0.56, x1: 0.36, y1: 0.68 } })) },
    ],
  });
  assert.ok(pickupWithPreExisting.findings.length >= 1, 'Pickup single-frame CV must detect pre-existing damage when present in photo!');

  const sameReturnWithPreExisting = await InspectionAiEngine.analyzeVehiclePhotosAsync({
    type: 'RETURN',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    photos: [
      { view: 'FRONT', imageUrl: redCleanFront },
      { view: 'REAR', imageUrl: encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [205, 32, 36], { chipBox: { x0: 0.25, y0: 0.56, x1: 0.36, y1: 0.68 } })) },
    ],
    baselinePhotos: pickupWithPreExisting.photoMetadata.map((m, i) => ({
      view: m.view,
      imageUrl: i === 0 ? redCleanFront : encodeRgbaPng(W, H, generateCarPanelRgba(W, H, [205, 32, 36], { chipBox: { x0: 0.25, y0: 0.56, x1: 0.36, y1: 0.68 } })),
      sha256Hash: m.sha256Hash,
      qualityDetails: m.qualityDetails,
      qualityScore: m.qualityScore,
    })),
    baselineFindings: pickupWithPreExisting.findings,
  });

  const preExistingCmp = InspectionAiEngine.compareInspections(
    pickupWithPreExisting.findings,
    sameReturnWithPreExisting.findings,
    50000
  );
  assert.equal(preExistingCmp.newDamageCount, 0, 'Pre-existing defect returned unchanged must incur 0 new charges');
  assert.ok(preExistingCmp.preExistingCount >= 1);
  assert.equal(preExistingCmp.depositStatus, 'FULL_REFUND');
  console.log(' [PASS] Pre-existing pickup defect detected cleanly before handover and excluded from new charges at return');

  // 5. Real PNG assets from Frontend/public/cars/ test (color accuracy + real PNG decode without crash)
  const redCarPath = path.resolve(process.cwd(), 'Frontend/public/cars/finovo-red-car.png');
  const blueCarPath = path.resolve(process.cwd(), 'Frontend/public/cars/finovo-blue-car.png');
  if (fs.existsSync(redCarPath) && fs.existsSync(blueCarPath)) {
    const redB64 = `data:image/png;base64,${fs.readFileSync(redCarPath).toString('base64')}`;
    const blueB64 = `data:image/png;base64,${fs.readFileSync(blueCarPath).toString('base64')}`;
    const redCheck = await InspectionAiEngine.analyzeVehiclePhotosAsync({
      type: 'PICKUP',
      vehicleBrand: 'Porsche',
      vehicleModel: '911 GT3',
      photos: [{ view: 'FRONT', imageUrl: redB64 }],
    });
    const blueCheck = await InspectionAiEngine.analyzeVehiclePhotosAsync({
      type: 'PICKUP',
      vehicleBrand: 'BMW',
      vehicleModel: 'M4',
      photos: [{ view: 'FRONT', imageUrl: blueB64 }],
    });
    assert.notEqual(redCheck.detectedColor.hexCode, blueCheck.detectedColor.hexCode);
    console.log(
      ` [PASS] Real PNG cutouts decoded cleanly (Red asset -> ${redCheck.detectedColor.colorName} ${redCheck.detectedColor.hexCode}, Blue asset -> ${blueCheck.detectedColor.colorName} ${blueCheck.detectedColor.hexCode})`
    );
  }

  console.log('\n======================================================');
  console.log('INSPECTION VISION TESTS: All suites passed');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Inspection test failure:', err);
  process.exit(1);
});
