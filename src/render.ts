/**
 * Entry points: spec → SVG string, spec → PNG buffer.
 * PNG rendering uses resvg (Rust, no browser needed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { preloadAssets, setAssetBaseDir } from './core/assets.js';
import { renderPosterSVG } from './poster.js';
import './charts/index.js';
import type { PosterSpec } from './types.js';

export async function renderSVG(spec: PosterSpec): Promise<string> {
  if (spec.baseDir) setAssetBaseDir(spec.baseDir);
  await preloadAssets(spec);
  return renderPosterSVG(spec);
}

export async function renderPNG(spec: PosterSpec, opts: { scale?: number } = {}): Promise<Buffer> {
  const svg = await renderSVG(spec);
  return svgToPNG(svg, opts.scale ?? 1);
}

export function svgToPNG(svg: string, scale = 1): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: scale === 1 ? { mode: 'original' } : { mode: 'zoom', value: scale },
    font: { loadSystemFonts: false },
    imageRendering: 0,
    shapeRendering: 2,
  });
  return Buffer.from(resvg.render().asPng());
}

/** Render a spec file to disk. Format is picked from the output extension. */
export async function renderFile(specPath: string, outPath: string, opts: { scale?: number } = {}) {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as PosterSpec;
  spec.baseDir ??= path.dirname(path.resolve(specPath));
  if (outPath.endsWith('.svg')) fs.writeFileSync(outPath, await renderSVG(spec));
  else fs.writeFileSync(outPath, await renderPNG(spec, opts));
}
