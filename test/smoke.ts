/**
 * Smoke test: every example renders to a valid PNG, with no thrown errors
 * and no warnings (warnings usually mean a missing icon, asset or glyph).
 *   pnpm test            (set VIVID_NO_CUTOUT=1 to skip background removal)
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderPNG, checkLayout } from '../src/render.js';
import { listCharts } from '../src/registry.js';
import type { PosterSpec } from '../src/types.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'examples');
const warnings: string[] = [];
const origWarn = console.warn;
console.warn = (...a: unknown[]) => warnings.push(a.map(String).join(' '));

let failed = 0;
const used = new Set<string>();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const spec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as PosterSpec;
  spec.baseDir = dir;
  for (const l of spec.layers ?? []) used.add(l.type);
  const before = warnings.length;
  try {
    const png = await renderPNG(spec);
    const ok = png.length > 10_000 && png.subarray(1, 4).toString() === 'PNG';
    const newWarn = warnings.slice(before).filter((w) => !/falling back to the original/.test(w) && !/cutout failed/.test(w));
    if (!ok || newWarn.length) {
      failed++;
      origWarn(`✗ ${f}${ok ? '' : ' (bad PNG)'}\n  ${newWarn.join('\n  ')}`);
    } else console.log(`✓ ${f} (${Math.round(png.length / 1024)} KB)`);
  } catch (e) {
    failed++;
    origWarn(`✗ ${f}: ${e instanceof Error ? e.message : e}`);
  }
}
// ── layout regression tests ──
// 1. A title with a negative gap must still come out collision-free.
// 2. Two layers deliberately placed on top of each other must be flagged.
console.warn = origWarn;
{
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures-title.json'), 'utf8')) as PosterSpec;
  const issues = await checkLayout(fixture);
  if (issues.length) {
    failed++;
    origWarn(`✗ title clearance regression:\n  ${issues.join('\n  ')}`);
  } else console.log('✓ title lines never collide (negative gap fixture)');

  const clash: PosterSpec = {
    layers: [
      { type: 'stat', box: { x: 80, y: 80, w: 600, h: 200 }, value: '−99%', size: 170 },
      { type: 'text', box: { x: 80, y: 180, w: 900, h: 100 }, text: 'THE AID THAT DRIED UP', style: { size: 72, weight: 800 } },
    ],
  };
  const found = await checkLayout(clash);
  if (!found.some((i) => i.includes('overlap'))) {
    failed++;
    origWarn('✗ overlap detector missed two overlapping layers');
  } else console.log('✓ overlap detector catches overlapping layers');
}

const builtins = ['text', 'image', 'stat', 'annotation', 'shape', 'svg', 'legend'];
const missing = listCharts().filter((c) => !used.has(c) && c !== 'pictogram');
if (missing.length) origWarn(`(no example yet for: ${missing.join(', ')})`);
void builtins;
console.log(failed ? `\n${failed} example(s) failed` : '\nall examples rendered');
process.exit(failed ? 1 : 0);
