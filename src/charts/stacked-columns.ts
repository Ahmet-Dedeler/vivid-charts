/**
 * stacked-columns: time-series columns with stacked series, an optional
 * hatched "subset" inside each segment (e.g. summits within attempts), inline
 * series labels instead of a legend, right-side ticks, gap callouts, and an
 * optional bubble strip underneath for a second metric.
 *
 * The "Rise of Overcrowding on Everest" form. Put a hero photo behind it and
 * let the tallest columns rise into the image.
 */
import { scaleLinear } from 'd3-scale';
import { alpha, darken, mix, onColor } from '../core/color.js';
import { h, r2, rectPath } from '../core/svg.js';
import { areaScale } from '../core/scale.js';
import { untracked, capHeight, measure, runs, text, type TextStyle } from '../core/text.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface StackSeries {
  label: string;
  sublabel?: string;
  color?: string;
  values: (number | null)[];
  /** Portion of each value drawn hatched at the bottom of the segment. */
  part?: (number | null)[];
}

export interface StackedColumnsLayer extends LayerBase {
  type: 'stacked-columns';
  categories: string[];
  series: StackSeries[];
  /** Label every nth category on the x axis. */
  labelEvery?: number;
  /** Inline series labels beside the first column (default true). Set false and add a legend layer when early columns are empty. */
  seriesLabels?: boolean;
  max?: number;
  ticks?: number[];
  tickSuffix?: string;
  /** Hatched subset legend label. */
  partLabel?: string;
  /** Vertical callout text at a category index with no/low data. */
  gaps?: { index: number; label: string }[];
  /** Strip of bubbles under the axis for a second metric. */
  bubbles?: { label: string; sublabel?: string; values: (number | null)[]; color?: string; height?: number; /** White panel behind the strip (off by default). */ panel?: boolean };
  format?: FormatOptions;
  barGap?: number;
  radius?: number;
  /** Translucent white panel behind the plot so it reads over a photo. */
  panel?: boolean;
  /** Tick label color (use white over a dark photo). */
  tickColor?: string;
}

function render(l: StackedColumnsLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const n = l.categories.length;
  const legendW = 150;
  const tickW = 110;
  const bubbleH = l.bubbles ? (l.bubbles.height ?? 110) : 0;
  const axisH = 46;
  const plot = { x: box.x + legendW, y: box.y, w: box.w - legendW - tickW, h: box.h - axisH - bubbleH };
  const colW = plot.w / n;
  const barW = colW * (1 - (l.barGap ?? 0.18));
  const totals = l.categories.map((_, i) => l.series.reduce((s, se) => s + (se.values[i] ?? 0), 0));
  const max = l.max ?? Math.max(...totals) * 1.04;
  const y = scaleLinear().domain([0, max]).range([plot.y + plot.h, plot.y]);
  const parts: string[] = [];
  const colors = l.series.map((s, i) => s.color ?? pal.cats[i % pal.cats.length]);

  if (l.panel) parts.push(h('rect', { x: plot.x - 10, y: plot.y, width: plot.w + 20, height: plot.h, fill: alpha('#fff', 0.35) }));

  // Ticks on the right, with a small ◂ pointer like a ruler.
  const ticks = l.ticks ?? y.ticks(4).filter((t) => t > 0);
  const tickStyle: TextStyle = { ...type.number, size: 28, fill: l.tickColor ?? pal.ink, italic: false };
  const tickShadow = l.tickColor ? defs.shadow({ dy: 1, blur: 6, opacity: 0.6 }) : undefined;
  for (const t of ticks) {
    const ty = y(t);
    parts.push(h('path', { d: `M${plot.x},${r2(ty)}H${plot.x + plot.w}`, stroke: alpha('#fff', 0.7), strokeWidth: 1.5 }));
    parts.push(
      h(
        'g',
        { filter: tickShadow },
        h('path', { d: `M${plot.x + plot.w + 10},${ty}l8,-6v12z`, fill: tickStyle.fill }),
        text(`${t.toLocaleString('en-US')}`, plot.x + plot.w + 24, ty + capHeight(tickStyle) / 2, tickStyle),
        t === ticks[ticks.length - 1] && l.tickSuffix ? text(l.tickSuffix, plot.x + plot.w + 24, ty + capHeight(tickStyle) / 2 + 32, tickStyle) : '',
      ),
    );
  }

  const radius = l.radius ?? 2;
  l.categories.forEach((_, i) => {
    const x = plot.x + colW * i + (colW - barW) / 2;
    let acc = 0;
    l.series.forEach((se, si) => {
      const v = se.values[i] ?? 0;
      if (!v) return;
      const y0 = y(acc);
      const y1 = y(acc + v);
      const top = si === l.series.length - 1 || l.series.slice(si + 1).every((s) => !(s.values[i] ?? 0));
      parts.push(h('path', { d: rectPath(x, y1, barW, y0 - y1, top ? [radius, radius, 0, 0] : 0), fill: colors[si] }));
      const p = se.part?.[i];
      if (p) {
        const yp = y(acc + p);
        parts.push(h('rect', { x, y: yp, width: barW, height: y0 - yp, fill: defs.hatch(darken(colors[si], 0.45), { gap: 7, width: 2.4, opacity: 0.55 }) }));
      }
      acc += v;
    });
  });

  // Inline series labels at the left, aligned with the first column's segments.
  const firstIdx = l.series[0].values.findIndex((v) => v != null);
  let acc = 0;
  if (l.seriesLabels !== false) l.series.forEach((se, si) => {
    const v = se.values[firstIdx] ?? 0;
    const mid = y(acc + v / 2);
    acc += v;
    // A label beside a zero-height segment would point at nothing and stack on its neighbours.
    if (!v) return;
    const ls: TextStyle = { ...type.label, size: 30, fill: colors[si], weight: 800, upper: true };
    const ss: TextStyle = { ...type.label, size: 26, fill: pal.ink, weight: 700 };
    parts.push(text(se.label, plot.x - 24, mid - 2, ls, 'end'));
    parts.push(h('path', { d: `M${plot.x - 18},${mid - 18}l7,6l-7,6`, fill: 'none', stroke: colors[si], strokeWidth: 2.5 }));
    if (se.sublabel) parts.push(text(se.sublabel, plot.x - 24, mid + 28, ss, 'end'));
  });
  if (l.partLabel) {
    const ps: TextStyle = { ...type.label, size: 26, weight: 800, upper: true, fill: pal.ink };
    const w = measure(l.partLabel, ps) + 58;
    const py = y(totals[firstIdx]) - 30;
    parts.push(h('path', { d: rectPath(box.x, py - 22, w, 44, 4), fill: '#fff' }));
    parts.push(h('rect', { x: box.x + 10, y: py - 12, width: 24, height: 24, fill: defs.hatch(pal.ink, { gap: 6, width: 2.4 }) }));
    parts.push(text(l.partLabel, box.x + 44, py + capHeight(ps) / 2, ps));
  }

  for (const gp of l.gaps ?? []) {
    const gx = plot.x + colW * (gp.index + 0.5);
    const gs: TextStyle = { ...type.label, size: 24, weight: 800, upper: true, fill: alpha(pal.ink, 0.6), tracking: 0.08 };
    parts.push(h('g', { transform: `translate(${gx - capHeight(gs) / 2},${plot.y + plot.h * 0.42}) rotate(90)` }, untracked(() => text(gp.label, 0, 0, gs))));
  }

  // X axis.
  const axisY = plot.y + plot.h;
  parts.push(h('path', { d: `M${plot.x},${axisY}H${plot.x + plot.w}`, stroke: pal.ink, strokeWidth: 2 }));
  const xs: TextStyle = { ...type.label, size: 26, weight: 800, fill: pal.ink };
  const every = l.labelEvery ?? 5;
  // Always label the last column; drop the regular label just before it if the two would collide.
  const lastRegular = Math.floor((n - 1) / every) * every;
  const dropRegular = lastRegular !== n - 1 && n - 1 - lastRegular < every * 0.6 ? lastRegular : -1;
  l.categories.forEach((c, i) => {
    const cx = plot.x + colW * (i + 0.5);
    if ((i % every === 0 && i !== dropRegular) || i === n - 1) {
      parts.push(h('path', { d: `M${cx},${axisY + bubbleH}v10`, stroke: pal.ink, strokeWidth: 2 }));
      parts.push(text(c, cx, axisY + bubbleH + 40, xs, 'middle'));
    }
  });

  // Bubble strip.
  if (l.bubbles) {
    const bv = l.bubbles.values;
    // Area ∝ value: 1 death must look much smaller than 18.
    const bubbleR = areaScale(bv.map((v) => v ?? 0), bubbleH * 0.5 - 6, { ref: 'max', floor: 3 });
    const bc = l.bubbles.color ?? pal.accent;
    const cy = axisY + bubbleH / 2;
    if (l.bubbles.panel) parts.push(h('rect', { x: plot.x - 6, y: axisY + 8, width: plot.w + 12, height: bubbleH - 16, fill: alpha('#fff', 0.85), rx: 8 }));
    bv.forEach((v, i) => {
      if (v == null) return;
      const cx = plot.x + colW * (i + 0.5);
      const r = bubbleR(v);
      parts.push(h('circle', { cx, cy, r, fill: bc, opacity: 0.8, style: 'mix-blend-mode:multiply' }));
    });
    bv.forEach((v, i) => {
      if (v == null) return;
      const cx = plot.x + colW * (i + 0.5);
      const r = bubbleR(v);
      // Label inside when it fits, otherwise in ink just below the bubble.
      const inside = r >= 11;
      const vs: TextStyle = { ...type.label, size: inside ? Math.min(22, colW * 0.55, r * 1.25) : 15, weight: 800, fill: inside ? onColor(bc) : pal.ink };
      parts.push(runs(editorial(v, vs, { ...l.format, style: 'plain', decimals: 0 }), cx, inside ? cy + capHeight(vs) / 2 : cy + r + 16, vs, 'middle'));
    });
    const ls: TextStyle = { ...type.label, size: 30, weight: 800, upper: true, fill: bc };
    parts.push(text(l.bubbles.label, plot.x - 24, cy - 2, ls, 'end'));
    parts.push(h('path', { d: `M${plot.x - 18},${cy - 18}l7,6l-7,6`, fill: 'none', stroke: bc, strokeWidth: 2.5 }));
    if (l.bubbles.sublabel) parts.push(text(l.bubbles.sublabel, plot.x - 24, cy + 28, { ...type.label, size: 26, weight: 700, fill: pal.ink }, 'end'));
  }
  void mix;
  return parts.join('');
}

registerChart('stacked-columns', render as never);
