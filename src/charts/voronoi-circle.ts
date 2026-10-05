/**
 * voronoi-circle: a part-to-whole shown as organic Voronoi cells inside a
 * circle (or any polygon), grouped by region, with a dashed outer ring that
 * carries the group labels and totals.
 *
 * The "World's Forests" form. Use for shares of a global total (forest area,
 * GDP, emissions, population, market share) where 15–40 parts roll up into
 * 3–7 groups. Cells get an organic lighting texture so they read like
 * material (canopy, land, money) rather than flat UI. Pass `image` per group
 * to fill cells with a photo texture instead.
 */
import { hierarchy } from 'd3-hierarchy';
import { createRequire } from 'node:module';
import { darken, lighten, mix, onColor } from '../core/color.js';
import { flag, image } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, r2 } from '../core/svg.js';
import { arcText, capHeight, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { voronoiTreemap } = require('d3-voronoi-treemap') as { voronoiTreemap: () => any };

export interface VoronoiItem {
  label: string;
  value: number;
  group: string;
  flag?: string;
  display?: string;
  /** Short label used when the cell is small (e.g. ISO code). */
  short?: string;
}

export interface VoronoiGroup {
  label?: string;
  color?: string;
  image?: string;
}

export interface VoronoiCircleLayer extends LayerBase {
  type: 'voronoi-circle';
  items: VoronoiItem[];
  groups?: Record<string, VoronoiGroup>;
  format?: FormatOptions;
  /** Show group totals on the ring ("AMERICAS · 38.9%"). */
  ring?: boolean;
  /** Organic lighting texture on cells. */
  texture?: boolean;
  /** Gap between cells, drawn in this color (default: background). */
  border?: string;
  borderWidth?: number;
  /** Space between group blobs. */
  groupGap?: number;
  seed?: number;
  /** Annotation set inside the biggest cell. */
  callout?: string;
  shape?: 'circle' | 'square';
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function circlePolygon(cx: number, cy: number, r: number, n = 96): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  });
}

function centroid(poly: [number, number][]): [number, number] {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const f = x0 * y1 - x1 * y0;
    x += (x0 + x1) * f;
    y += (y0 + y1) * f;
    a += f;
  }
  a *= 3;
  return a === 0 ? poly[0] : [x / a, y / a];
}

function area(poly: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a / 2);
}

/** Largest inscribed-ish width: distance from centroid to nearest edge × 2. */
function inradius(poly: [number, number][], c: [number, number]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((c[0] - x0) * dx + (c[1] - y0) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(c[0] - (x0 + t * dx), c[1] - (y0 + t * dy)));
  }
  return best;
}

const toPath = (poly: [number, number][]) => 'M' + poly.map((p) => `${r2(p[0])},${r2(p[1])}`).join('L') + 'Z';

function render(l: VoronoiCircleLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const R = Math.min(box.w, box.h) / 2 - (l.ring !== false ? 46 : 0);
  const clip = l.shape === 'square' ? ([[cx - R, cy - R], [cx + R, cy - R], [cx + R, cy + R], [cx - R, cy + R]] as [number, number][]) : circlePolygon(cx, cy, R);

  const groupKeys = [...new Set(l.items.map((i) => i.group))];
  const total = l.items.reduce((s, i) => s + i.value, 0);
  const data = { children: groupKeys.map((g) => ({ key: g, children: l.items.filter((i) => i.group === g).map((i) => ({ ...i })) })) };
  const root = hierarchy<any>(data).sum((d) => d.value ?? 0);
  voronoiTreemap().clip(clip).prng(lcg(l.seed ?? 42)).convergenceRatio(0.001).maxIterationCount(200)(root);

  const groupColor = (g: string, i: number) => l.groups?.[g]?.color ?? pal.cats[i % pal.cats.length];
  const border = l.border ?? pal.bg;
  const bw = l.borderWidth ?? 2.5;
  const gap = l.groupGap ?? 9;
  const tex = l.texture !== false ? defs.texture(0.5, 0.06) : undefined;
  const parts: string[] = [];
  const labels: string[] = [];

  root.children?.forEach((gNode: any, gi: number) => {
    const key = gNode.data.key as string;
    const base = groupColor(key, gi);
    const gpoly = gNode.polygon as [number, number][];
    const cells: string[] = [];
    const gimg = l.groups?.[key]?.image;
    gNode.children?.forEach((leaf: any, li: number) => {
      const poly = leaf.polygon as [number, number][];
      // Subtle per-cell shade variation so neighbours separate even without borders.
      const shade = mix(base, li % 2 ? darken(base, 0.08) : lighten(base, 0.05), 0.5);
      cells.push(h('path', { d: toPath(poly), fill: gimg ? 'none' : shade }));
    });
    const gclip = defs.clipPath(toPath(gpoly));
    const fillLayer = gimg ? image(gimg, box.x, box.y, box.w, box.h, { clip: gclip }) : h('g', { filter: tex }, ...cells);
    const lines = gNode.children?.map((leaf: any) => h('path', { d: toPath(leaf.polygon), fill: 'none', stroke: border, strokeWidth: bw, strokeOpacity: 0.85 })) ?? [];
    parts.push(h('g', { clipPath: gclip }, fillLayer, ...lines));
    parts.push(h('path', { d: toPath(gpoly), fill: 'none', stroke: border, strokeWidth: gap, strokeLinejoin: 'round' }));

    // Cell labels: flag, name, value; scaled to the cell's inradius.
    gNode.children?.forEach((leaf: any) => {
      const it = leaf.data as VoronoiItem;
      const poly = leaf.polygon as [number, number][];
      const c = centroid(poly);
      const ir = inradius(poly, c);
      if (ir < 16) return;
      const vs: TextStyle = { ...type.number, size: Math.max(13, Math.min(64, ir * 0.42)), fill: onColor(base, '#1b1b1b', '#ffffff') };
      const ls: TextStyle = { ...type.label, size: Math.max(11, Math.min(40, ir * 0.24)), fill: vs.fill };
      const share = (it.value / total) * 100;
      const vText = it.display ?? `${share.toFixed(1)}%`;
      const name = ir < 34 && it.short ? it.short : it.label;
      const fitLabel = Math.min(ls.size!, (ir * 1.7) / Math.max(1, name.length * 0.52));
      const lsz = { ...ls, size: fitLabel };
      const shadow = defs.shadow({ dy: 1, blur: 4, opacity: 0.45 });
      const blockH = (it.flag && ir > 40 ? ls.size! * 1.6 : 0) + capHeight(lsz) + vs.size! * 0.95;
      // Leave room under the biggest cell's label for the callout.
      let y = c[1] - blockH / 2 - (l.callout && ir > 120 ? ir * 0.28 : 0);
      const g: string[] = [];
      if (it.flag && ir > 40) {
        const fr = Math.min(22, ls.size! * 0.65);
        g.push(flag(defs, it.flag, c[0], y + fr, fr, 'rgba(255,255,255,0.7)'));
        y += fr * 2 + 6;
      }
      y += capHeight(lsz);
      g.push(text(name, c[0], y, lsz, 'middle'));
      y += vs.size! * 0.95;
      g.push(runs(editorial(vText, vs, { ...l.format, style: 'plain' }), c[0], y, vs, 'middle'));
      labels.push(h('g', { filter: shadow }, ...g));
    });
  });

  if (l.callout) {
    // Put the callout under the biggest cell's label.
    const leaves = root.leaves();
    const big: any = leaves.reduce((a: any, b: any) => (area(b.polygon) > area(a.polygon) ? b : a));
    const c = centroid(big.polygon);
    const ir = inradius(big.polygon, c);
    const ns: TextStyle = { ...type.note, size: Math.min(28, ir * 0.13), fill: '#fff' };
    labels.push(h('g', { filter: defs.shadow({ dy: 1, blur: 4, opacity: 0.4 }) }, ...wrapCenter(l.callout, c[0], c[1] + ir * 0.4, ir * 1.5, ns)));
  }

  // Outer ring with group labels.
  if (l.ring !== false) {
    const rr = R + 30;
    parts.push(h('circle', { cx, cy, r: rr, fill: 'none', stroke: pal.ink, strokeOpacity: 0.35, strokeWidth: 1.5, strokeDasharray: '5 6' }));
    root.children?.forEach((gNode: any, gi: number) => {
      const key = gNode.data.key as string;
      const c = centroid(gNode.polygon);
      const ang = (Math.atan2(c[0] - cx, -(c[1] - cy)) * 180) / Math.PI;
      const share = ((gNode.value as number) / total) * 100;
      const label = `${(l.groups?.[key]?.label ?? key).toUpperCase()} · ${share.toFixed(1)}%`;
      const gs: TextStyle = { family: 'DM Serif Display', size: 26, fill: darken(groupColor(key, gi), 0.1), tracking: 0.04 };
      const bottom = ang > 95 || ang < -95;
      // Clear the dashed line with a bg-colored band behind the text.
      parts.push(arcText(label, cx, cy, rr - capHeight(gs) / 2 + (bottom ? -2 : 0), ang, { ...gs, stroke: pal.bg, strokeWidth: 10, fill: pal.bg }, bottom));
      parts.push(arcText(label, cx, cy, rr - capHeight(gs) / 2 + (bottom ? -2 : 0), ang, gs, bottom));
    });
  }
  return parts.join('') + labels.join('');
}

function wrapCenter(str: string, x: number, y: number, w: number, s: TextStyle): string[] {
  const words = str.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const t = line ? `${line} ${word}` : word;
    if (line && t.length * (s.size ?? 20) * 0.5 > w) {
      lines.push(line);
      line = word;
    } else line = t;
  }
  lines.push(line);
  return lines.map((ln, i) => text(ln, x, y + i * (s.size ?? 20) * 1.25, s, 'middle'));
}

registerChart('voronoi-circle', render as never);
