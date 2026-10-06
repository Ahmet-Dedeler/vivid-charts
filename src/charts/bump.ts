/**
 * bump: rank over time. One column per period, a badge per entity (logo or
 * initials in a colored disc), smooth S-curves joining an entity's positions,
 * entities that drop out of the top N curve off the bottom, value captions
 * under the first/last columns.
 *
 * The "World's Top 10 Companies by Revenue 2020–2026" form. Use when the
 * story is who overtook whom; 4–8 periods, top 5–12.
 */
import { alpha, darken, onColor } from '../core/color.js';
import { icon, image } from '../core/draw.js';
import { h, r2 } from '../core/svg.js';
import { capHeight, measure, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface BumpEntity {
  label: string;
  color?: string;
  /** icon ref (simple-icons) or image ref. */
  logo?: string;
  /** Short text when there is no logo (2–4 chars). */
  short?: string;
}

export interface BumpLayer extends LayerBase {
  type: 'bump';
  periods: string[];
  /** For each period, entity keys in rank order (index 0 = #1). */
  ranks: string[][];
  entities: Record<string, BumpEntity>;
  /** Optional value captions per period per entity ("$611B"). */
  values?: Record<string, string>[];
  /** Label column on the left and right with entity names. */
  sideLabels?: boolean;
  badge?: 'circle' | 'rounded';
}

function render(l: BumpLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const P = l.periods.length;
  const N = Math.max(...l.ranks.map((r) => r.length));
  const side = l.sideLabels !== false ? 120 : 0;
  const headH = 48;
  const colX = (i: number) => box.x + side + ((box.w - side * 2) * (i + 0.5)) / P;
  const rowH = (box.h - headH) / N;
  const rowY = (r: number) => box.y + headH + rowH * (r + 0.5);
  const R = Math.min(rowH * 0.38, ((box.w - side * 2) / P) * 0.3);
  const keys = Object.keys(l.entities);
  const colorOf = (k: string, i: number) => l.entities[k].color ?? pal.cats[i % pal.cats.length];
  const parts: string[] = [];
  const hs: TextStyle = { ...type.display, size: 30, fill: pal.ink };
  l.periods.forEach((p, i) => parts.push(text(p, colX(i), box.y + capHeight(hs), hs, 'middle')));

  // Lines.
  keys.forEach((k, ki) => {
    const c = colorOf(k, ki);
    const pos = l.ranks.map((r) => r.indexOf(k));
    for (let i = 0; i < P - 1; i++) {
      const a = pos[i];
      const b = pos[i + 1];
      if (a < 0 && b < 0) continue;
      let x0 = colX(i);
      let x1 = colX(i + 1);
      let y0 = a < 0 ? 0 : rowY(a);
      let y1 = b < 0 ? 0 : rowY(b);
      // Entering / leaving the top N: a short stub that fades out, not a line to the floor.
      let stroke = c;
      if (b < 0) {
        x1 = x0 + (x1 - x0) * 0.42;
        y1 = y0 + rowH * 0.7;
        stroke = defs.linear([[0, c, 0.9], [1, c, 0]], 0);
      } else if (a < 0) {
        x0 = x1 - (x1 - x0) * 0.42;
        y0 = y1 + rowH * 0.7;
        stroke = defs.linear([[0, c, 0], [1, c, 0.9]], 0);
      }
      const mx = (x0 + x1) / 2;
      const d = `M${r2(x0)},${r2(y0)}C${r2(mx)},${r2(y0)} ${r2(mx)},${r2(y1)} ${r2(x1)},${r2(y1)}`;
      if (a >= 0 && b >= 0) parts.push(h('path', { d, fill: 'none', stroke: pal.bg, strokeWidth: R * 0.34 + 4 }));
      parts.push(h('path', { d, fill: 'none', stroke, strokeWidth: R * 0.34 }));
    }
  });
  // Badges.
  l.ranks.forEach((r, i) => {
    r.forEach((k, rank) => {
      const e = l.entities[k];
      if (!e) return;
      const c = colorOf(k, keys.indexOf(k));
      const cx = colX(i);
      const cy = rowY(rank);
      const ink = onColor(c);
      if (l.badge === 'rounded') parts.push(h('rect', { x: cx - R * 1.25, y: cy - R * 0.8, width: R * 2.5, height: R * 1.6, rx: R * 0.35, fill: c, stroke: pal.bg, strokeWidth: 3 }));
      else parts.push(h('circle', { cx, cy, r: R, fill: c, stroke: pal.bg, strokeWidth: 3, filter: defs.shadow({ dy: 2, blur: 4, opacity: 0.2 }) }));
      if (e.logo?.startsWith('icon:')) parts.push(icon(e.logo, cx - R * 0.58, cy - R * 0.58, R * 1.16, ink));
      else if (e.logo) parts.push(image(e.logo, cx - R * 0.7, cy - R * 0.7, R * 1.4, R * 1.4, { fit: 'contain' }));
      else {
        const sh = e.short ?? e.label.slice(0, 3).toUpperCase();
        const ss: TextStyle = { ...type.label, size: Math.min(R * 0.7, (R * 1.6) / Math.max(1, sh.length * 0.62)), fill: ink, weight: 800 };
        parts.push(text(sh, cx, cy + capHeight(ss) / 2, ss, 'middle'));
      }
      const val = l.values?.[i]?.[k];
      if (val && (i === 0 || i === P - 1)) parts.push(text(val, cx, cy + R + 14, { ...type.label, size: 13, fill: darken(c, 0.1), weight: 700 }, 'middle'));
    });
  });
  // Side labels: names of the first and last column entries.
  if (side) {
    const ls: TextStyle = { ...type.label, size: 16, weight: 700 };
    l.ranks[0].forEach((k, rank) => {
      const e = l.entities[k];
      parts.push(text(e.label, colX(0) - R - 10, rowY(rank) + 5, { ...ls, fill: darken(colorOf(k, keys.indexOf(k)), 0.1), size: Math.min(16, (side + 10) / Math.max(1, measure(e.label, { ...ls, size: 1 }))) }, 'end'));
    });
    l.ranks[P - 1].forEach((k, rank) => {
      const e = l.entities[k];
      parts.push(text(e.label, colX(P - 1) + R + 10, rowY(rank) + 5, { ...ls, fill: darken(colorOf(k, keys.indexOf(k)), 0.1), size: Math.min(16, (side + 10) / Math.max(1, measure(e.label, { ...ls, size: 1 }))) }));
    });
  }
  return parts.join('');
}

registerChart('bump', render as never);
