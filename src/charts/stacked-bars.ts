/**
 * stacked-bars: horizontal stacked bars (usually 100%), one row per
 * category, series labelled once in a header above their first segment,
 * values printed inside each segment, an icon disc + label (+ sublabel) per
 * row on the left.
 *
 * The "How Billionaires Plan to Invest" and "Electricity Production Across
 * Europe" form. Use for survey splits (increase / same / decrease), mixes per
 * country, or any part-to-whole across many rows.
 */
import { alpha, darken, onColor } from '../core/color.js';
import { flag, icon } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, rectPath } from '../core/svg.js';
import { capHeight, measure, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface StackedBarsLayer extends LayerBase {
  type: 'stacked-bars';
  series: { label: string; color?: string }[];
  rows: { label: string; sub?: string; icon?: string; flag?: string; values: number[] }[];
  /** Normalize each row to 100% (default true). */
  normalize?: boolean;
  format?: FormatOptions;
  labelWidth?: number;
  thickness?: number;
  /** Rounded outer corners. */
  radius?: number;
  sortBy?: number;
}

function render(l: StackedBarsLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const rowsData = [...l.rows];
  if (l.sortBy !== undefined) rowsData.sort((a, b) => b.values[l.sortBy!] - a.values[l.sortBy!]);
  const n = rowsData.length;
  const headH = 40;
  const lw = l.labelWidth ?? 240;
  const plot = { x: box.x + lw, y: box.y + headH, w: box.w - lw, h: box.h - headH };
  const rowH = plot.h / n;
  const barH = rowH * (l.thickness ?? 0.74);
  const colors = l.series.map((s, i) => s.color ?? pal.cats[i % pal.cats.length]);
  const parts: string[] = [];
  const vs: TextStyle = { ...type.number, size: Math.min(28, barH * 0.6), italic: false, weight: 700 };
  const fmt = (v: number) => editorial(v, vs, { suffix: l.normalize === false ? '' : '%', decimals: 0, ...l.format, style: 'plain' });
  rowsData.forEach((row, ri) => {
    const total = l.normalize === false ? 1 : row.values.reduce((a, b) => a + b, 0) || 1;
    const scale = l.normalize === false ? plot.w / Math.max(...rowsData.map((r) => r.values.reduce((a, b) => a + b, 0))) : plot.w;
    const y = plot.y + rowH * ri + (rowH - barH) / 2;
    let x = plot.x;
    row.values.forEach((v, si) => {
      const w = (v / total) * scale;
      if (w <= 0) return;
      const last = si === row.values.length - 1;
      const first = si === 0;
      const rr = l.radius ?? 3;
      parts.push(h('path', { d: rectPath(x, y, w - 2, barH, [first ? rr : 0, last ? rr : 0, last ? rr : 0, first ? rr : 0]), fill: defs.linear([[0, colors[si]], [1, darken(colors[si], 0.06)]], 90) }));
      // Values that already sum to ~100 are shown as given (a survey's 10/83/8 stays 10/83/8).
      const shown = l.normalize === false || Math.abs(total - 100) <= 2.5 ? v : (v / total) * 100;
      const vr = fmt(Math.round(shown));
      const tw = measure(vr.map((r) => r.text).join(''), vs);
      if (tw + 14 < w) parts.push(runs(vr, x + 10, y + barH / 2 + capHeight(vs) / 2, { ...vs, fill: onColor(colors[si], '#141414', '#ffffff') }));
      else if (last) parts.push(runs(vr, x + w + 6, y + barH / 2 + capHeight(vs) / 2, { ...vs, size: vs.size! * 0.8, fill: darken(colors[si], 0.2) }));
      // Series header above the first row's segment.
      if (ri === 0) parts.push(text(l.series[si].label, x + 2, box.y + 24, { ...type.label, size: 18, fill: darken(colors[si], 0.15), weight: 700 }));
      x += w;
    });
    // Row label.
    const cy = y + barH / 2;
    let lx = box.x;
    if (row.icon || row.flag) {
      const ir = Math.min(barH * 0.48, 20);
      const ix = box.x + lw - ir - 10;
      if (row.flag) parts.push(flag(defs, row.flag, ix, cy, ir));
      else {
        parts.push(h('circle', { cx: ix, cy, r: ir, fill: alpha('#fff', 0.9), stroke: alpha(pal.ink, 0.5), strokeWidth: 1.2 }));
        parts.push(icon(row.icon!, ix - ir * 0.6, cy - ir * 0.6, ir * 1.2, pal.ink));
      }
      lx = ix - ir - 10;
    } else lx = box.x + lw - 12;
    const ls: TextStyle = { ...type.label, size: Math.min(21, rowH * 0.36), fill: pal.ink, weight: 700 };
    if (row.sub) {
      parts.push(text(row.label, lx, cy - 2, ls, 'end'));
      parts.push(text(row.sub, lx, cy + ls.size! * 0.95, { ...type.body, size: ls.size! * 0.72, fill: pal.muted }, 'end'));
    } else parts.push(text(row.label, lx, cy + capHeight(ls) / 2, ls, 'end'));
  });
  return parts.join('');
}

registerChart('stacked-bars', render as never);
