/**
 * slope: two columns (before → after) joined by straight lines, each end
 * labelled "Name 351 ⚑" / "⚑ 384 Name", colored by group. Items that are only
 * on one list fade out toward the other side (they dropped off / are new).
 * Labels are de-overlapped per side.
 *
 * The "Largest Gold Producers 2010 vs 2025" form. Use for rank or value
 * changes between two points in time, or two metrics with the same unit.
 */
import { scaleLinear } from 'd3-scale';
import { alpha, darken } from '../core/color.js';
import { flag } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, r2 } from '../core/svg.js';
import { capHeight, measure, paragraph, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface SlopeItem {
  label: string;
  left?: number | null;
  right?: number | null;
  group?: string;
  flag?: string;
  color?: string;
}

export interface SlopeLayer extends LayerBase {
  type: 'slope';
  items: SlopeItem[];
  leftTitle?: string;
  rightTitle?: string;
  groups?: Record<string, { label?: string; color?: string }>;
  format?: FormatOptions;
  /** Position the two axes as fractions of the box width. */
  axes?: [number, number];
  min?: number;
  max?: number;
  /** Column title size. */
  titleSize?: number;
  lineWidth?: number;
  /** Paragraph in the middle of the plot. */
  note?: { text: string; x: number; y: number; width?: number };
}

function spread(ys: number[], gap: number, lo: number, hi: number): number[] {
  const idx = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < idx.length; k++) if (idx[k].y - idx[k - 1].y < gap) idx[k].y = idx[k - 1].y + gap;
  // If we overflowed the bottom, push everything back up.
  const over = idx.length ? idx[idx.length - 1].y - hi : 0;
  if (over > 0) for (let k = idx.length - 1; k >= 0; k--) idx[k].y = Math.min(idx[k].y - over, k < idx.length - 1 ? idx[k + 1].y - gap : Infinity);
  void lo;
  const out: number[] = [];
  idx.forEach((o) => (out[o.i] = o.y));
  return out;
}

function render(l: SlopeLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const [ax0, ax1] = l.axes ?? [0.28, 0.72];
  const xL = box.x + box.w * ax0;
  const xR = box.x + box.w * ax1;
  const titleH = l.leftTitle || l.rightTitle ? (l.titleSize ?? 56) * 1.4 : 0;
  const top = box.y + titleH;
  const vals = l.items.flatMap((i) => [i.left, i.right]).filter((v): v is number => v != null);
  const Y = scaleLinear()
    .domain([l.min ?? Math.min(...vals) * 0.9, l.max ?? Math.max(...vals) * 1.02])
    .range([box.y + box.h, top]);
  const groups = [...new Set(l.items.map((i) => i.group ?? '_'))];
  const colorOf = (it: SlopeItem) => it.color ?? l.groups?.[it.group ?? '_']?.color ?? pal.cats[groups.indexOf(it.group ?? '_') % pal.cats.length];
  const parts: string[] = [];
  const ts: TextStyle = { ...type.display, size: l.titleSize ?? 56, fill: pal.ink };
  if (l.leftTitle) parts.push(text(l.leftTitle, xL, box.y + capHeight(ts), ts, 'middle'));
  if (l.rightTitle) parts.push(text(l.rightTitle, xR, box.y + capHeight(ts), ts, 'middle'));
  parts.push(h('rect', { x: xL - 1, y: top, width: 2, height: box.y + box.h - top, fill: alpha(pal.ink, 0.15) }));
  parts.push(h('rect', { x: xR - 1, y: top, width: 2, height: box.y + box.h - top, fill: alpha(pal.ink, 0.15) }));
  parts.push(h('rect', { x: xL, y: top, width: xR - xL, height: box.y + box.h - top, fill: alpha('#ffffff', 0.04) }));

  const lw = l.lineWidth ?? 3;
  const fr = 9;
  // Lines first; one-sided items fade toward the missing end.
  for (const it of l.items) {
    const c = colorOf(it);
    if (it.left != null && it.right != null) parts.push(h('path', { d: `M${xL},${r2(Y(it.left))}L${xR},${r2(Y(it.right))}`, stroke: c, strokeWidth: lw, strokeLinecap: 'round' }));
    else if (it.left != null) {
      const y0 = Y(it.left);
      parts.push(h('path', { d: `M${xL},${r2(y0)}L${r2(xL + (xR - xL) * 0.85)},${r2(box.y + box.h + 6)}`, stroke: defs.linear([[0, c, 0.9], [1, c, 0]], 0), strokeWidth: lw }));
    } else if (it.right != null) {
      const y1 = Y(it.right);
      parts.push(h('path', { d: `M${r2(xL + (xR - xL) * 0.15)},${r2(box.y + box.h + 6)}L${xR},${r2(y1)}`, stroke: defs.linear([[0, c, 0], [1, c, 0.9]], 0), strokeWidth: lw }));
    }
  }
  const ls: TextStyle = { ...type.label, size: 21, weight: 600 };
  const vs: TextStyle = { ...type.number, size: 22, italic: false, weight: 800 };
  const side = (key: 'left' | 'right') => {
    const its = l.items.filter((i) => i[key] != null);
    const ys = spread(its.map((i) => Y(i[key]!)), 21, top, box.y + box.h);
    its.forEach((it, k) => {
      const c = colorOf(it);
      const y = ys[k];
      const ax = key === 'left' ? xL : xR;
      const dot = Y(it[key]!);
      if (it.flag) parts.push(flag(defs, it.flag, ax, dot, fr, alpha('#fff', 0.8)));
      else parts.push(h('circle', { cx: ax, cy: dot, r: 5, fill: c }));
      const vr = editorial(it[key]!, vs, { ...l.format, style: 'plain' });
      const vw = measure(vr.map((r) => r.text).join(''), vs);
      const lc = darken(c, -0.05);
      if (key === 'left') {
        parts.push(runs(vr, ax - fr - 8, y + 7, { ...vs, fill: lc }, 'end'));
        parts.push(text(it.label, ax - fr - 14 - vw, y + 7, { ...ls, fill: lc }, 'end'));
      } else {
        parts.push(runs(vr, ax + fr + 8, y + 7, { ...vs, fill: lc }));
        parts.push(text(it.label, ax + fr + 14 + vw, y + 7, { ...ls, fill: lc }));
      }
    });
  };
  side('left');
  side('right');
  if (l.note) parts.push(paragraph(l.note.text, l.note.x, l.note.y, l.note.width ?? 260, { ...type.note, size: 20, fill: pal.ink }, { boldWeight: 700 }).svg);
  return parts.join('');
}

registerChart('slope', render as never);
