/**
 * dumbbell: two values per category joined by a stem, two marker shapes
 * (circle vs diamond), each value labelled beside its marker. Vertical
 * (lollipop columns, the "Mean vs Median Net Worth by Age" look) or
 * horizontal (rows, for long category names).
 *
 * Use whenever the GAP between two numbers per category is the point:
 * mean vs median, men vs women, 2010 vs 2025, target vs actual.
 */
import { scaleLinear } from 'd3-scale';
import { alpha, darken } from '../core/color.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, r2 } from '../core/svg.js';
import { capHeight, paragraph, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface DumbbellLayer extends LayerBase {
  type: 'dumbbell';
  items: { label: string; a: number; b: number }[];
  aLabel?: string;
  bLabel?: string;
  aColor?: string;
  bColor?: string;
  orientation?: 'vertical' | 'horizontal';
  format?: FormatOptions;
  max?: number;
  ticks?: number[];
  yTitle?: string;
  xTitle?: string;
  note?: { text: string; x: number; y: number; width?: number };
}

function render(l: DumbbellLayer, box: Box, ctx: Ctx): string {
  const { pal, type } = ctx;
  const n = l.items.length;
  const ca = l.aColor ?? pal.accent;
  const cb = l.bColor ?? darken(pal.accent, 0.25);
  const vertical = l.orientation !== 'horizontal';
  const max = l.max ?? Math.max(...l.items.flatMap((i) => [i.a, i.b])) * 1.08;
  const leftW = vertical ? 90 : 220;
  const bottomH = vertical ? 70 : 40;
  const legendH = l.aLabel || l.bLabel ? 46 : 0;
  const plot = { x: box.x + leftW, y: box.y + legendH, w: box.w - leftW - 20, h: box.h - bottomH - legendH };
  const V = scaleLinear().domain([0, max]).range(vertical ? [plot.y + plot.h, plot.y] : [plot.x, plot.x + plot.w]);
  const parts: string[] = [];
  const ts: TextStyle = { ...type.label, size: 16, fill: alpha(pal.ink, 0.65), weight: 500 };
  const fmt = (v: number, s: TextStyle) => editorial(v, s, { ...l.format, style: 'plain' });
  for (const t of l.ticks ?? V.ticks(6)) {
    if (vertical) {
      parts.push(h('path', { d: `M${plot.x},${r2(V(t))}H${plot.x + plot.w}`, stroke: alpha(pal.ink, 0.1) }));
      parts.push(runs(fmt(t, ts), plot.x - 12, V(t) + 5, ts, 'end'));
    } else {
      parts.push(h('path', { d: `M${r2(V(t))},${plot.y}V${plot.y + plot.h}`, stroke: alpha(pal.ink, 0.1) }));
      parts.push(runs(fmt(t, ts), V(t), plot.y + plot.h + 24, ts, 'middle'));
    }
  }
  // Legend.
  const lg: TextStyle = { ...type.label, size: 19, weight: 600 };
  const diamond = (x: number, y: number, s: number, c: string) => h('path', { d: `M${x},${y - s}L${x + s},${y}L${x},${y + s}L${x - s},${y}Z`, fill: c, stroke: pal.bg, strokeWidth: 2 });
  if (l.aLabel) {
    parts.push(h('circle', { cx: box.x + box.w - 300, cy: box.y + 14, r: 8, fill: ca }));
    parts.push(text(l.aLabel, box.x + box.w - 286, box.y + 21, { ...lg, fill: darken(ca, 0.1) }));
  }
  if (l.bLabel) {
    parts.push(diamond(box.x + box.w - 140, box.y + 14, 9, cb));
    parts.push(text(l.bLabel, box.x + box.w - 126, box.y + 21, { ...lg, fill: darken(cb, 0.05) }));
  }
  const band = (vertical ? plot.w : plot.h) / n;
  const vs: TextStyle = { ...type.number, size: 21, italic: false, weight: 700 };
  l.items.forEach((it, i) => {
    const c = (vertical ? plot.x : plot.y) + band * (i + 0.5);
    const pa = V(it.a);
    const pb = V(it.b);
    if (vertical) {
      parts.push(h('path', { d: `M${r2(c)},${r2(plot.y + plot.h)}V${r2(Math.min(pa, pb))}`, stroke: alpha(pal.ink, 0.15), strokeWidth: 2 }));
      parts.push(h('path', { d: `M${r2(c)},${r2(pa)}V${r2(pb)}`, stroke: ca, strokeWidth: 6, strokeLinecap: 'round' }));
      parts.push(h('circle', { cx: c, cy: pa, r: 10, fill: ca, stroke: pal.bg, strokeWidth: 2.5 }));
      parts.push(diamond(c, pb, 11, cb));
      parts.push(runs(fmt(it.a, vs), c + 16, pa + 7, { ...vs, fill: darken(ca, 0.12) }));
      parts.push(runs(fmt(it.b, vs), c + 16, pb + 7, { ...vs, fill: darken(cb, 0.05) }));
      parts.push(text(it.label, c, plot.y + plot.h + 32, { ...type.label, size: 18, fill: pal.ink, weight: 600 }, 'middle'));
    } else {
      parts.push(h('path', { d: `M${r2(pa)},${r2(c)}H${r2(pb)}`, stroke: ca, strokeWidth: 6, strokeLinecap: 'round' }));
      parts.push(h('circle', { cx: pa, cy: c, r: 10, fill: ca, stroke: pal.bg, strokeWidth: 2.5 }));
      parts.push(diamond(pb, c, 11, cb));
      const left = Math.min(pa, pb);
      const right = Math.max(pa, pb);
      parts.push(runs(fmt(pa < pb ? it.a : it.b, vs), left - 16, c + 7, { ...vs, fill: darken(pa < pb ? ca : cb, 0.1) }, 'end'));
      parts.push(runs(fmt(pa < pb ? it.b : it.a, vs), right + 16, c + 7, { ...vs, fill: darken(pa < pb ? cb : ca, 0.1) }));
      parts.push(text(it.label, plot.x - 16, c + 6, { ...type.label, size: 18, fill: pal.ink, weight: 600 }, 'end'));
    }
  });
  if (l.xTitle) parts.push(text(l.xTitle, plot.x + plot.w / 2, box.y + box.h - 6, { ...type.label, size: 17, fill: alpha(pal.ink, 0.7) }, 'middle'));
  if (l.yTitle) parts.push(text(l.yTitle, box.x, box.y + legendH - 12, { ...type.label, size: 17, fill: alpha(pal.ink, 0.7) }));
  if (l.note) parts.push(paragraph(l.note.text, l.note.x, l.note.y, l.note.width ?? 300, { ...type.note, size: 20, fill: darken(ca, 0.15) }, { boldWeight: 700 }).svg);
  return parts.join('');
}

registerChart('dumbbell', render as never);
