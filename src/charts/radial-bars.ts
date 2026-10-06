/**
 * radial-bars: bars radiating from a ring, sorted, each labelled along its
 * own angle ("Cobalt 134%"), colored by category. One huge outlier bar is
 * allowed to shoot far out. A note sits in the empty center.
 *
 * The "Critical Mineral Price Changes" and "Most Expensive New Cars" fan
 * forms. Use for 15–40 values where a dramatic range is the story; it's less
 * precise than straight bars, so always print values.
 */
import { scaleLinear, scaleSqrt } from 'd3-scale';
import { alpha, darken, onColor } from '../core/color.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, r2 } from '../core/svg.js';
import { untracked, capHeight, measure, paragraph, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface RadialItem {
  label: string;
  value: number;
  category?: string;
  color?: string;
  display?: string;
}

export interface RadialBarsLayer extends LayerBase {
  type: 'radial-bars';
  items: RadialItem[];
  categories?: Record<string, string>;
  format?: FormatOptions;
  /** Degrees, 0 = 12 o'clock, clockwise. Default a 300° fan opening at the top-left. */
  startAngle?: number;
  endAngle?: number;
  /** Inner radius as a fraction of the max radius. */
  inner?: number;
  sort?: 'desc' | 'asc' | 'none';
  /** 'sqrt' compresses outliers; 'linear' (default) is honest bar length. */
  scale?: 'linear' | 'sqrt';
  /** Cap the drawn length of outliers at this value (the label still shows the real value). */
  cap?: number;
  center?: string;
  /** Center of the fan in canvas coordinates (default box center). */
  cx?: number;
  cy?: number;
}

function render(l: RadialBarsLayer, box: Box, ctx: Ctx): string {
  // All labels here are rotated, so they're excluded from the canvas-space overlap check.
  return untracked(() => renderInner(l, box, ctx));
}

function renderInner(l: RadialBarsLayer, box: Box, ctx: Ctx): string {
  const { pal, type } = ctx;
  const items = [...l.items];
  if (l.sort !== 'none') items.sort((a, b) => (l.sort === 'asc' ? a.value - b.value : b.value - a.value));
  const n = items.length;
  const cx = l.cx ?? box.x + box.w / 2;
  const cy = l.cy ?? box.y + box.h / 2;
  const Rmax = Math.min(box.w, box.h) / 2;
  const r0 = Rmax * (l.inner ?? 0.36);
  const a0 = ((l.startAngle ?? 20) * Math.PI) / 180;
  const a1 = ((l.endAngle ?? 330) * Math.PI) / 180;
  const step = (a1 - a0) / n;
  const bw = step * 0.78;
  const maxV = l.cap ?? Math.max(...items.map((i) => i.value));
  const L = (l.scale === 'sqrt' ? scaleSqrt() : scaleLinear()).domain([0, maxV]).range([0, Rmax - r0 - 60]);
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const colorOf = (it: RadialItem) => it.color ?? (it.category ? (l.categories?.[it.category] ?? pal.cats[cats.indexOf(it.category) % pal.cats.length]) : pal.accent);
  const parts: string[] = [];
  const pt = (a: number, r: number): [number, number] => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  items.forEach((it, i) => {
    const a = a0 + step * (i + 0.5);
    const len = Math.max(3, L(Math.min(it.value, maxV * 1.6)));
    const r1 = r0 + len;
    // Bars are wedges so neighbours stay evenly spaced at every radius.
    const s0 = a - bw / 2;
    const s1 = a + bw / 2;
    const [x00, y00] = pt(s0, r0);
    const [x01, y01] = pt(s1, r0);
    const [x10, y10] = pt(s0, r1);
    const [x11, y11] = pt(s1, r1);
    const c = colorOf(it);
    parts.push(h('path', { d: `M${r2(x00)},${r2(y00)}L${r2(x10)},${r2(y10)}A${r2(r1)},${r2(r1)} 0 0 1 ${r2(x11)},${r2(y11)}L${r2(x01)},${r2(y01)}A${r2(r0)},${r2(r0)} 0 0 0 ${r2(x00)},${r2(y00)}Z`, fill: c }));
    // Label reads outward along the bar; flip on the left half so it stays upright.
    const deg = (a * 180) / Math.PI;
    const flip = deg % 360 > 180;
    const vs: TextStyle = { ...type.number, size: Math.min(22, Math.max(13, r0 * step * 0.55)), italic: false, weight: 700 };
    const ls: TextStyle = { ...type.label, size: vs.size, fill: darken(c, -0.05), weight: 600 };
    const vr = editorial(it.display ?? it.value, vs, { ...l.format, style: 'plain' });
    const vw = measure(vr.map((r) => r.text).join(''), vs);
    const inside = len > vw + 18;
    const rot = flip ? deg + 90 : deg - 90;
    const g: string[] = [];
    // Distances along the bar axis (from center).
    if (inside) {
      const d = r1 - 10;
      g.push(runs(vr, flip ? -d : d, capHeight(vs) / 2, { ...vs, fill: onColor(c) }, flip ? 'start' : 'end'));
      g.push(text(it.label, flip ? -(r1 + 10) : r1 + 10, capHeight(ls) / 2, ls, flip ? 'end' : 'start'));
    } else {
      const d = r1 + 10;
      const lw = measure(it.label, ls);
      g.push(text(it.label, flip ? -d : d, capHeight(ls) / 2, ls, flip ? 'end' : 'start'));
      g.push(runs(vr, flip ? -(d + lw + 8) : d + lw + 8, capHeight(vs) / 2, { ...vs, fill: ls.fill }, flip ? 'end' : 'start'));
    }
    // Rotated labels are excluded from the canvas-space overlap check.
    parts.push(h('g', { transform: `translate(${r2(cx)},${r2(cy)}) rotate(${r2(rot)})` }, ...g));
  });
  parts.push(h('circle', { cx, cy, r: r0 - 8, fill: 'none', stroke: alpha(pal.ink, 0.12), strokeWidth: 1.5 }));
  if (l.center) parts.push(paragraph(l.center, cx, cy - r0 * 0.25, r0 * 1.35, { ...type.body, size: Math.max(14, r0 * 0.09), fill: pal.ink }, { anchor: 'middle', boldWeight: 700, lineHeight: 1.25 }).svg);
  return parts.join('');
}

registerChart('radial-bars', render as never);
