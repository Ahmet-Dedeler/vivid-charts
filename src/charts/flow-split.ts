/**
 * flow-split: two stacked 100% columns ("share of households" vs "share of
 * wealth") joined by smooth ribbons, with portraits and big percentages on
 * each side. Makes a share mismatch impossible to miss.
 *
 * The "America's Net Worth by Generation" form. Use whenever the story is
 * "X% of the people hold Y% of the thing".
 */
import { alpha, mix } from '../core/color.js';
import { avatar } from '../core/draw.js';
import { h, r2, rectPath } from '../core/svg.js';
import { capHeight, measure, text, runs, type TextStyle } from '../core/text.js';
import { editorial } from '../core/format.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface FlowItem {
  label: string;
  sublabel?: string;
  left: number;
  right: number;
  color?: string;
  image?: string;
  /** Extra value printed after the right share ("$97.4T"). */
  rightExtra?: string;
}

export interface FlowSplitLayer extends LayerBase {
  type: 'flow-split';
  items: FlowItem[];
  leftTitle?: string;
  rightTitle?: string;
  gap?: number;
  columnWidth?: number;
  /** Fraction of the box width used by the flow area; the rest is right-side labels. */
  flowWidth?: number;
}

function render(l: FlowSplitLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const items = l.items;
  const gap = l.gap ?? 14;
  const colW = l.columnWidth ?? 110;
  const titleH = l.leftTitle || l.rightTitle ? 100 : 0;
  const top = box.y + titleH;
  const usableH = box.h - titleH - gap * (items.length - 1);
  const leftTotal = items.reduce((s, i) => s + i.left, 0);
  const rightTotal = items.reduce((s, i) => s + i.right, 0);
  const pctW = 150;
  const xL = box.x + pctW + 60;
  const flowW = box.w * (l.flowWidth ?? 0.62) - pctW;
  const xR = xL + flowW - colW;
  const parts: string[] = [];
  const colors = items.map((it, i) => it.color ?? pal.cats[i % pal.cats.length]);

  let yl = top;
  let yr = top;
  const segs = items.map((it) => {
    const hl = (it.left / leftTotal) * usableH;
    const hr = (it.right / rightTotal) * usableH;
    const s = { l0: yl, l1: yl + hl, r0: yr, r1: yr + hr };
    yl += hl + gap;
    yr += hr + gap;
    return s;
  });

  // Ribbons behind the columns, with a dotted texture like printed paper.
  items.forEach((_, i) => {
    const s = segs[i];
    const x0 = xL + colW;
    const x1 = xR;
    const mx = (x0 + x1) / 2;
    const d = `M${r2(x0)},${r2(s.l0)}C${r2(mx)},${r2(s.l0)} ${r2(mx)},${r2(s.r0)} ${r2(x1)},${r2(s.r0)}L${r2(x1)},${r2(s.r1)}C${r2(mx)},${r2(s.r1)} ${r2(mx)},${r2(s.l1)} ${r2(x0)},${r2(s.l1)}Z`;
    parts.push(h('path', { d, fill: mix(colors[i], pal.bg, 0.55) }));
    parts.push(h('path', { d, fill: defs.dots(alpha('#ffffff', 0.35), { gap: 7, r: 1.1 }) }));
  });
  // Columns.
  items.forEach((_, i) => {
    const s = segs[i];
    const shadow = defs.shadow({ dx: 2, dy: 2, blur: 6, opacity: 0.18 });
    parts.push(h('rect', { x: xL, y: s.l0, width: colW, height: s.l1 - s.l0, fill: colors[i], filter: shadow }));
    parts.push(h('rect', { x: xR, y: s.r0, width: colW, height: s.r1 - s.r0, fill: colors[i], filter: shadow }));
  });

  // Column titles as dark tabs with a down arrow.
  const tab = (label: string, cx: number, anchorLeft: boolean) => {
    const ts: TextStyle = { ...type.label, size: 26, fill: '#fff', weight: 700 };
    const w = measure(label, ts) + 36;
    const x = anchorLeft ? box.x : cx - w / 2;
    parts.push(h('path', { d: rectPath(x, box.y, w, 50, 4), fill: pal.ink }));
    parts.push(text(label, x + 18, box.y + 25 + capHeight(ts) / 2, ts));
    const ax = anchorLeft ? xL + colW / 2 : xR + colW / 2;
    parts.push(h('path', { d: `M${ax},${box.y + 56}V${box.y + 86}M${ax - 7},${box.y + 79}L${ax},${box.y + 87}L${ax + 7},${box.y + 79}`, stroke: pal.ink, strokeWidth: 2, fill: 'none' }));
  };
  if (l.leftTitle) tab(l.leftTitle, xL, true);
  if (l.rightTitle) tab(l.rightTitle, xR + colW / 2 + 140, false);

  // Left: big % + portrait on the column edge.
  items.forEach((it, i) => {
    const s = segs[i];
    const cy = (s.l0 + s.l1) / 2;
    const ar = Math.min(48, (s.l1 - s.l0) / 2 - 2, colW * 0.46);
    if (it.image) parts.push(avatar(defs, it.image, xL, cy, Math.max(ar, 30), { ring: colors[i], ringWidth: 3.5, bg: mix(colors[i], '#fff', 0.6), shadow: true }));
    const ps: TextStyle = { ...type.number, size: 54, fill: colors[i], italic: false };
    parts.push(runs(editorial(`${it.left}%`, ps), xL - 64, cy + capHeight(ps) / 2, ps, 'end'));
  });

  // Right: portrait + name + sublabel + share | extra.
  items.forEach((it, i) => {
    const s = segs[i];
    const cy = (s.r0 + s.r1) / 2;
    if (it.image) parts.push(avatar(defs, it.image, xR + colW, cy, 48, { ring: colors[i], ringWidth: 3.5, bg: mix(colors[i], '#fff', 0.6), shadow: true }));
    const lx = xR + colW + 72;
    const ns: TextStyle = { ...type.label, size: 34, fill: pal.ink, weight: 700 };
    const ss: TextStyle = { ...type.body, size: 25, fill: pal.muted };
    const vs: TextStyle = { ...type.number, size: 56, fill: colors[i], italic: false };
    const blockH = 34 + (it.sublabel ? 38 : 0) + 64;
    let y = cy - blockH / 2 + capHeight(ns);
    parts.push(text(it.label, lx, y, ns));
    if (it.sublabel) {
      y += 40;
      parts.push(text(it.sublabel, lx, y, ss));
    }
    y += 66;
    const share = editorial(`${it.right}%`, vs);
    parts.push(runs(share, lx, y, vs));
    if (it.rightExtra) {
      const sw = measure(`${it.right}%`, vs);
      parts.push(h('rect', { x: lx + sw + 18, y: y - capHeight(vs), width: 4, height: capHeight(vs), fill: colors[i] }));
      const es: TextStyle = { ...vs, size: 40 };
      parts.push(runs(editorial(it.rightExtra, es), lx + sw + 40, y, es));
    }
  });
  return parts.join('');
}

registerChart('flow-split', render as never);
