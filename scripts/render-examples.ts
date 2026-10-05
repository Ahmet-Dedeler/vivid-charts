/**
 * Render every spec in examples/ to docs/gallery as PNG + a compact JPEG,
 * then build a contact sheet for the README.
 *   pnpm examples
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderFile } from '../src/render.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'docs/gallery');
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv[2];
const specs = fs.readdirSync(path.join(root, 'examples')).filter((f) => f.endsWith('.json') && (!only || f.includes(only)));

for (const f of specs) {
  const name = f.replace(/\.json$/, '');
  const png = path.join(outDir, `${name}.png`);
  const t = Date.now();
  await renderFile(path.join(root, 'examples', f), png);
  // Compact copy for the README (needs ImageMagick; skipped if missing).
  try {
    execFileSync('magick', [png, '-resize', '900x', '-quality', '86', path.join(outDir, `${name}.jpg`)]);
    fs.rmSync(png);
  } catch {
    /* keep the PNG */
  }
  console.log(`${name} (${Date.now() - t}ms)`);
}
