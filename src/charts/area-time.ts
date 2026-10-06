/**
 * area-time: stacked area or streamgraph over time, the Visual Capitalist way.
 *
 * - smooth layers in one hue family (or topic colors), each labelled INSIDE its
 *   widest stretch, optionally with an icon in a small disc
 * - event pins: a dot on the top edge, a thin leader up to "1973 / First Oil
 *   Shock" stacked above the chart (pins auto-stagger so they never collide)
 * - start and end values outside the plot with colored ◂ markers per layer
 * - light horizontal grid, axis title top-left, years along the bottom
 *
 * Use for energy mixes, market shares over decades, trade by category.
 * `offset: 'wiggle'` makes a streamgraph (organic, centered), 'expand' a 100% chart.
 */
import { area, curveMonotoneX, stack, stackOffsetExpand, stackOffsetNone, stackOffsetWiggle, stackOrderNone, stackOrderInsideOut } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { alpha, darken, lighten, onColor } from '../core/color.js';
import { icon } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, r2 } from '../core/svg.js';
import { capHeight, measure, text, runs, paragraph, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface AreaSeries {
  label: string;
  values: (number | null)[];
  color?: string;
  icon?: string;
  /** Override where the inside label goes (index into x). */
  labelAt?: number;
}

export interface AreaTimeLayer extends LayerBase {
  type: 'area-time';
  x: (number | string)[];
  series: AreaSeries[];
  offset?: 'none' | 'wiggle' | 'expand';
  order?: 'none' | 'insideOut';
  format?: FormatOptions;
  /** Event pins: { at: x value, label: '1973', text: 'First Oil Shock' }. */
  events?: { at: number | string; label: string; text?: string }[];
  yTitle?: string;
  ticks?: number[];
  /** Show values at the start/end of each layer. */
  endValues?: boolean;
  startValues?: boolean;
  /** Label every nth x tick. */
  labelEvery?: number;
  /** Thin line along the total (top edge). */
  outline?: boolean;
  /** Notes placed in the plot: { at, y (value), text } — y in data units. */
  notes?: { at: number | string; y: number; text: string; width?: number; color?: string }[];
  /** Glow under the top edge, for dark backgrounds. */
  glow?: boolean;
}

function render(l: AreaTimeLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const n = l.x.length;
  const keys = l.series.map((_, i) => String(i));
  const rows = l.x.map((_, xi) => Object.fromEntries(l.series.map((s, si) => [String(si), Math.max(0, s.values[xi] ?? 0)])));
  const st = stack<Record<string, number>>()
    .keys(keys)
    .order(l.order === 'insideOut' ? stackOrderInsideOut : stackOrderNone)
    .offset(l.offset === 'wiggle' ? stackOffsetWiggle : l.offset === 'expand' ? stackOffsetExpand : stackOffsetNone)(rows);

  const eventsH = l.events?.length ? 150 : 0;
  const leftW = l.startValues !== false ? 70 : 10;
  const rightW = l.endValues !== false ? 170 : 10;
  const axisH = 44;
  const plot = { x: box.x + leftW, y: box.y + eventsH, w: box.w - leftW - rightW, h: box.h - eventsH - axisH };
  const lo = Math.min(...st.flatMap((s) => s.map((d) => d[0])));
  const hi = Math.max(...st.flatMap((s) => s.map((d) => d[1])));
  const X = scaleLinear().domain([0, n - 1]).range([plot.x, plot.x + plot.w]);
  const Y = scaleLinear().domain([Math.min(0, lo), hi * (l.offset === 'expand' ? 1 : 1.04)]).range([plot.y + plot.h, plot.y]);
  const colors = l.series.map((s, i) => s.color ?? pal.cats[i % pal.cats.length]);
  const parts: string[] = [];

  // Grid + y ticks (stacked charts only; streamgraphs have no meaningful y).
  if (l.offset !== 'wiggle') {
    const ticks = l.ticks ?? Y.ticks(5);
    // Start values sit where tick labels would; show tick labels only if there are no start values.
    const showTickLabels = l.startValues === false || !!l.ticks;
    const ts: TextStyle = { ...type.label, size: 15, fill: alpha(pal.ink, 0.6), weight: 500 };
    for (const t of ticks) {
      parts.push(h('path', { d: `M${plot.x},${r2(Y(t))}H${plot.x + plot.w}`, stroke: alpha(pal.ink, 0.1), strokeWidth: 1 }));
      if (showTickLabels) parts.push(text(l.offset === 'expand' ? `${Math.round(t * 100)}%` : t.toLocaleString('en-US'), plot.x - 8, Y(t) + 5, ts, 'end'));
      else parts.push(text(l.offset === 'expand' ? `${Math.round(t * 100)}%` : t.toLocaleString('en-US'), plot.x + 6, Y(t) - 6, { ...ts, size: 13 }));
    }
    if (l.yTitle) parts.push(text(l.yTitle, plot.x, Y(ticks[ticks.length - 1]) - 28, { ...type.label, size: 16, fill: alpha(pal.ink, 0.75), weight: 600 }));
  }

  const ar = area<[number, number]>()
    .x((_, i) => X(i))
    .y0((d) => Y(d[0]))
    .y1((d) => Y(d[1]))
    .curve(curveMonotoneX);
  st.forEach((s, si) => {
    const c = colors[si];
    // Vertical gradient gives each layer a little depth.
    const fill = defs.linear([[0, lighten(c, 0.06)], [1, darken(c, 0.06)]], 90);
    parts.push(h('path', { d: ar(s as any) ?? '', fill }));
    parts.push(h('path', { d: ar(s as any) ?? '', fill: 'none', stroke: alpha('#000', 0.12), strokeWidth: 0.8 }));
  });
  const top = st[st.length - 1];
  if (l.outline !== false) {
    const line = top.map((d, i) => `${i ? 'L' : 'M'}${r2(X(i))},${r2(Y(d[1]))}`).join('');
    if (l.glow) parts.push(h('path', { d: line, fill: 'none', stroke: lighten(colors[colors.length - 1], 0.3), strokeWidth: 6, opacity: 0.35, filter: defs.shadow({ dy: 0, blur: 12, color: '#fff', opacity: 0.8 }) }));
    parts.push(h('path', { d: line, fill: 'none', stroke: alpha(pal.ink, 0.55), strokeWidth: 1.4 }));
  }

  // Inside labels: try positions from thickest to thinnest (and two sizes)
  // until the label fits inside the layer across its full width.
  st.forEach((s, si) => {
    const se = l.series[si];
    const step = X(1) - X(0) || 1;
    const thickAt = (i: number) => Y(s[i][0]) - Y(s[i][1]);
    const cands = se.labelAt !== undefined ? [se.labelAt] : Array.from({ length: n }, (_, i) => i).filter((i) => i > n * 0.08 && i < n * 0.9).sort((a, b) => thickAt(b) - thickAt(a));
    for (const i of cands.slice(0, 40)) {
      const thick = thickAt(i);
      if (thick < 16) break;
      for (const size of [Math.min(26, Math.max(14, thick * 0.32)), 14]) {
        const ls: TextStyle = { ...type.label, size, fill: onColor(colors[si], '#1b1b1b', '#ffffff'), weight: 700 };
        const iconW = se.icon ? size * 1.64 + 8 : 0;
        const w = measure(se.label, ls) + iconW;
        const cx = X(i);
        const cy = (Y(s[i][0]) + Y(s[i][1])) / 2;
        const i0 = Math.max(0, Math.floor((cx - w / 2 - plot.x) / step));
        const i1 = Math.min(n - 1, Math.ceil((cx + w / 2 - plot.x) / step));
        let ok = cx - w / 2 > plot.x && cx + w / 2 < plot.x + plot.w;
        for (let k = i0; k <= i1 && ok; k++) if (cy - size * 0.8 < Y(s[k][1]) || cy + size * 0.8 > Y(s[k][0])) ok = false;
        if (!ok) continue;
        let x0 = cx - w / 2;
        if (se.icon) {
          const r = size * 0.82;
          parts.push(h('circle', { cx: x0 + r, cy, r, fill: alpha('#ffffff', 0.92), stroke: darken(colors[si], 0.15), strokeWidth: 1.2 }));
          parts.push(icon(se.icon, x0 + r * 0.42, cy - r * 0.58, r * 1.16, darken(colors[si], 0.25)));
          x0 += iconW;
        }
        parts.push(text(se.label, x0, cy + capHeight(ls) / 2, ls));
        return;
      }
    }
  });

  // End / start values with colored pointer marks, spread so they don't overlap.
  const spread = (ys: number[], minGap: number) => {
    const idx = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < idx.length; k++) if (idx[k].y - idx[k - 1].y < minGap) idx[k].y = idx[k - 1].y + minGap;
    const out: number[] = [];
    idx.forEach((o) => (out[o.i] = o.y));
    return out;
  };
  const vs: TextStyle = { ...type.number, size: 19, italic: false, weight: 700 };
  const fmt = (v: number) => editorial(v, vs, { compact: Math.abs(v) >= 1e5, ...l.format, style: 'plain' });
  if (l.endValues !== false) {
    const mids = st.map((s) => (Y(s[n - 1][0]) + Y(s[n - 1][1])) / 2);
    const ys = spread(mids, 24);
    st.forEach((s, si) => {
      const v = l.series[si].values[n - 1] ?? 0;
      const xx = plot.x + plot.w + 6;
      parts.push(h('path', { d: `M${xx},${ys[si]}l9,-6v12z`, fill: colors[si] }));
      parts.push(runs(fmt(v), xx + 14, ys[si] + 6, { ...vs, fill: darken(colors[si], 0.15) }));
      parts.push(text(l.series[si].label, xx + 14 + measure(fmt(v).map((r) => r.text).join(''), vs) + 8, ys[si] + 6, { ...type.label, size: 15, fill: darken(colors[si], 0.15), weight: 600 }));
    });
  }
  if (l.startValues !== false) {
    const mids = st.map((s) => (Y(s[0][0]) + Y(s[0][1])) / 2);
    const ys = spread(mids, 22);
    st.forEach((s, si) => {
      const v = l.series[si].values[0] ?? 0;
      if (!v) return;
      parts.push(h('circle', { cx: plot.x, cy: ys[si], r: 4.5, fill: colors[si], stroke: pal.bg, strokeWidth: 1.5 }));
      parts.push(runs(fmt(v), plot.x - 10, ys[si] + 6, { ...vs, size: 16, fill: darken(colors[si], 0.15) }, 'end'));
    });
  }

  // X axis labels.
  const xs: TextStyle = { ...type.label, size: 17, fill: pal.ink, weight: 600 };
  const every = l.labelEvery ?? Math.ceil(n / 8);
  l.x.forEach((v, i) => {
    if (i % every && i !== n - 1) return;
    if (i !== n - 1 && n - 1 - i < every * 0.6) return;
    parts.push(text(String(v), X(i), plot.y + plot.h + 30, xs, 'middle'));
  });

  // Event pins above the plot, staggered in 3 heights.
  const idxOf = (at: number | string) => l.x.findIndex((v) => String(v) === String(at));
  const evs = (l.events ?? []).map((e) => ({ ...e, i: idxOf(e.at) })).filter((e) => e.i >= 0).sort((a, b) => a.i - b.i);
  const levels = [box.y + 22, box.y + 66, box.y + 110];
  const lastEnd = [-Infinity, -Infinity, -Infinity];
  for (const e of evs) {
    const ex = X(e.i);
    const ey = Y(top[e.i][1]);
    const ls: TextStyle = { ...type.label, size: 15, fill: pal.ink, weight: 700 };
    const ts: TextStyle = { ...type.body, size: 14, fill: alpha(pal.ink, 0.8) };
    const w = Math.max(measure(e.label, ls), e.text ? Math.min(150, measure(e.text, ts)) : 0) + 12;
    let lv = lastEnd.findIndex((end) => ex - 4 > end);
    if (lv < 0) lv = 2;
    lastEnd[lv] = ex + w;
    const ly = levels[lv];
    parts.push(h('path', { d: `M${r2(ex)},${r2(ly + 6)}V${r2(ey - 3)}`, stroke: pal.ink, strokeWidth: 1.2 }));
    parts.push(h('circle', { cx: ex, cy: ly + 4, r: 4, fill: pal.ink }));
    parts.push(h('circle', { cx: ex, cy: ey, r: 3.5, fill: pal.bg, stroke: pal.ink, strokeWidth: 1.5 }));
    parts.push(text(e.label, ex + 8, ly + 9, ls));
    if (e.text) parts.push(paragraph(e.text, ex + 8, ly + 27, 150, ts, { lineHeight: 1.15 }).svg);
  }

  for (const nt of l.notes ?? []) {
    const i = idxOf(nt.at);
    if (i < 0) continue;
    const ns: TextStyle = { ...type.body, size: 17, fill: nt.color ?? pal.ink };
    parts.push(paragraph(nt.text, X(i), Y(nt.y), nt.width ?? 260, ns, { boldWeight: 700, lineHeight: 1.25 }).svg);
  }
  return parts.join('');
}

registerChart('area-time', render as never);
