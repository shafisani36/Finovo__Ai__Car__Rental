/**
 * Measures how well the AI inspection finds damage on a labelled photo dataset, using the same vision model,
 * prompt and clean-up rules as the app. Uses the GEMINI_API_KEY (or OPENAI_API_KEY) in backend/.env, so every
 * photo costs one AI request: start with --limit.
 *
 * Folder dataset (any dataset can be arranged like this):
 *   <dir>/undamaged/*.jpg               cars without damage
 *   <dir>/damaged/*.jpg                 damaged cars (damage type unknown)
 *   <dir>/damaged/<type>/*.jpg          damaged cars by type: scratch, dent, crack, glass, lamp, tyre, paint, rust...
 *
 * COCO dataset (e.g. CarDD): --coco <annotations.json> --images <folder of the images>
 *
 * Usage (from the backend folder):
 *   npx tsx scripts/diagnostics/evaluate-ai-inspection.ts --dir C:\datasets\cars --limit 50
 *   npx tsx scripts/diagnostics/evaluate-ai-inspection.ts --coco C:\CarDD\annotations\instances_test2017.json --images C:\CarDD\test2017 --limit 50
 * Options: --limit N (default 30) · --out results.csv · --concurrency N (default 2)
 */
import fs from 'fs';
import path from 'path';
import { VisionProvider, type VisionImage } from '../../src/modules/inspections/vision-provider';
import {
  boxFromYxyx1000,
  dedupeFindings,
  normalizeCategory,
  normalizePanel,
  normalizeSeverity,
  MIN_REPORTABLE_CONFIDENCE,
  type DamageCategory,
} from '../../src/modules/inspections/damage-assessment';

interface Sample {
  file: string;
  damaged: boolean;
  /** Damage types the label says are on the photo (empty when unknown) */
  expected: DamageCategory[];
}

interface Result extends Sample {
  found: Array<{ category: DamageCategory; severity: string; panel: string; confidence: number }>;
  error?: string;
  ms: number;
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

/** Maps a dataset label (folder or COCO category name) to the app's damage categories. */
function categoryOfLabel(label: string): DamageCategory | null {
  const text = label.toLowerCase();
  if (/scratch|scuff/.test(text)) return 'SCRATCH';
  if (/dent|deform/.test(text)) return 'DENT';
  if (/crack|glass|shatter/.test(text)) return 'CRACK';
  if (/lamp|light|broken|missing|tire|tyre|flat/.test(text)) return 'BROKEN_PART';
  if (/rust|corros/.test(text)) return 'RUST';
  if (/repaint|paint.?mark/.test(text)) return 'PAINT_MARKED';
  if (/paint|chip/.test(text)) return 'PAINT_CHIP';
  return null;
}

function imagesIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name));
}

function loadFolderDataset(root: string): Sample[] {
  const samples: Sample[] = imagesIn(path.join(root, 'undamaged')).map((file) => ({ file, damaged: false, expected: [] }));
  const damagedDir = path.join(root, 'damaged');
  samples.push(...imagesIn(damagedDir).map((file) => ({ file, damaged: true, expected: [] })));
  if (fs.existsSync(damagedDir)) {
    for (const entry of fs.readdirSync(damagedDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const category = categoryOfLabel(entry.name);
      samples.push(
        ...imagesIn(path.join(damagedDir, entry.name)).map((file) => ({
          file,
          damaged: true,
          expected: category ? [category] : [],
        }))
      );
    }
  }
  return samples;
}

function loadCocoDataset(annotationsFile: string, imagesDir: string): Sample[] {
  const coco = JSON.parse(fs.readFileSync(annotationsFile, 'utf8')) as {
    images: Array<{ id: number; file_name: string }>;
    annotations: Array<{ image_id: number; category_id: number }>;
    categories: Array<{ id: number; name: string }>;
  };
  const categoryNames = new Map(coco.categories.map((c) => [c.id, c.name]));
  return coco.images.map((image) => {
    const labels = coco.annotations.filter((a) => a.image_id === image.id).map((a) => categoryNames.get(a.category_id) || '');
    const expected = [...new Set(labels.map(categoryOfLabel).filter((c): c is DamageCategory => Boolean(c)))];
    return { file: path.join(imagesDir, image.file_name), damaged: labels.length > 0, expected };
  });
}

/** Same order every run, mixing damaged and undamaged photos so a small --limit still tests both. */
function interleave(samples: Sample[]): Sample[] {
  const damaged = samples.filter((s) => s.damaged).sort((a, b) => a.file.localeCompare(b.file));
  const clean = samples.filter((s) => !s.damaged).sort((a, b) => a.file.localeCompare(b.file));
  const mixed: Sample[] = [];
  for (let i = 0; i < Math.max(damaged.length, clean.length); i++) {
    if (damaged[i]) mixed.push(damaged[i]);
    if (clean[i]) mixed.push(clean[i]);
  }
  return mixed;
}

async function evaluate(sample: Sample): Promise<Result> {
  const started = Date.now();
  try {
    const bytes = fs.readFileSync(sample.file);
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error('image larger than 7 MB, skipped');
    const ext = path.extname(sample.file).toLowerCase();
    const image: VisionImage = {
      view: 'FRONT',
      mimeType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
      base64: bytes.toString('base64'),
    };
    const raw = await VisionProvider.detectDamage({ images: [image] });
    // The same clean-up as the app: confidence floor, valid boxes, one damage counted once
    const findings = dedupeFindings(
      raw.findings
        .map((f) => {
          const box = boxFromYxyx1000(f.box_2d);
          const confidence = Number(f.confidence);
          if (!box || !Number.isFinite(confidence) || confidence < MIN_REPORTABLE_CONFIDENCE) return null;
          const part = String(f.part || '');
          return {
            view: 'FRONT' as const,
            box,
            confidence,
            category: normalizeCategory(f.category),
            severity: normalizeSeverity(f.severity),
            panel: normalizePanel(f.panel, part, 'FRONT'),
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null)
    );
    return {
      ...sample,
      found: findings.map((f) => ({ category: f.category, severity: f.severity, panel: f.panel, confidence: f.confidence })),
      ms: Date.now() - started,
    };
  } catch (err) {
    return { ...sample, found: [], error: err instanceof Error ? err.message : String(err), ms: Date.now() - started };
  }
}

const percent = (part: number, total: number) => (total === 0 ? 'n/a' : `${((part / total) * 100).toFixed(1)}%`);

async function main() {
  const dir = argument('dir');
  const coco = argument('coco');
  const limit = Math.max(1, Number(argument('limit') || 30));
  const concurrency = Math.min(5, Math.max(1, Number(argument('concurrency') || 2)));
  const outFile = path.resolve(argument('out') || 'ai-inspection-evaluation.csv');

  let samples: Sample[];
  if (coco) samples = loadCocoDataset(coco, argument('images') || path.dirname(coco));
  else if (dir) samples = loadFolderDataset(dir);
  else {
    console.error('Give --dir <dataset folder> or --coco <annotations.json> --images <folder>. See the top of this file.');
    process.exit(1);
  }
  samples = interleave(samples).slice(0, limit);
  if (samples.length === 0) {
    console.error('No images found. Check the folder layout described at the top of this file.');
    process.exit(1);
  }
  console.log(`Evaluating ${samples.length} photos (${concurrency} at a time)...`);

  const results: Result[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < samples.length) {
        const sample = samples[next++];
        const result = await evaluate(sample);
        results.push(result);
        const verdict = result.error ? `ERROR ${result.error}` : result.found.map((f) => `${f.category}/${f.severity}`).join(', ') || 'no damage';
        console.log(`[${results.length}/${samples.length}] ${path.basename(sample.file)} (${sample.damaged ? 'damaged' : 'clean'}): ${verdict}`);
      }
    })
  );

  const ok = results.filter((r) => !r.error);
  const damaged = ok.filter((r) => r.damaged);
  const clean = ok.filter((r) => !r.damaged);
  const caught = damaged.filter((r) => r.found.length > 0).length;
  const falseAlarms = clean.filter((r) => r.found.length > 0).length;
  const labelled = damaged.filter((r) => r.expected.length > 0);
  const expectedTotal = labelled.reduce((n, r) => n + r.expected.length, 0);
  const typeHits = labelled.reduce((n, r) => n + r.expected.filter((c) => r.found.some((f) => f.category === c)).length, 0);

  console.log('\n===== AI inspection accuracy =====');
  console.log(`Photos checked:                        ${ok.length} (${results.length - ok.length} failed)`);
  console.log(`Damaged cars where damage was found:   ${caught}/${damaged.length} = ${percent(caught, damaged.length)}  (higher is better)`);
  console.log(`Clean cars wrongly reported damaged:   ${falseAlarms}/${clean.length} = ${percent(falseAlarms, clean.length)}  (lower is better)`);
  console.log(`Damage types recognised correctly:     ${typeHits}/${expectedTotal} = ${percent(typeHits, expectedTotal)}`);
  for (const category of [...new Set(labelled.flatMap((r) => r.expected))]) {
    const withType = labelled.filter((r) => r.expected.includes(category));
    const hits = withType.filter((r) => r.found.some((f) => f.category === category)).length;
    console.log(`  ${category.padEnd(14)} ${hits}/${withType.length} = ${percent(hits, withType.length)}`);
  }
  console.log(`Average time per photo:                ${(ok.reduce((n, r) => n + r.ms, 0) / Math.max(1, ok.length) / 1000).toFixed(1)} s`);

  const csv = [
    'file,label,expected_types,found_count,found,error,seconds',
    ...results.map((r) =>
      [
        r.file,
        r.damaged ? 'damaged' : 'clean',
        r.expected.join(' '),
        r.found.length,
        r.found.map((f) => `${f.category}/${f.severity}/${f.panel}/${f.confidence}`).join(' '),
        r.error || '',
        (r.ms / 1000).toFixed(1),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');
  fs.writeFileSync(outFile, csv);
  console.log(`\nEvery photo with its result: ${outFile}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
