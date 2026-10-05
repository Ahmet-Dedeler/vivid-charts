/**
 * pictogram: a unit chart. Each icon (or square/dot) is one unit, colored by
 * category, so "1 in 5" or "17 vs 3" becomes countable. Big, friendly, and
 * honest about magnitude.
 *
 * Use for shares of a population ("out of 100 people"), small counts
 * (deaths per 1,000), or comparing two quantities side by side with
 * `groups` (one block per group).
 */
import { mix } from '../core/color.js';
import { icon } from '../core/draw.js';
import { h, rectPath } from '../core/svg.js';
import { capHeight, text, runs, type TextStyle } from '../core/text.js';
import { editorial } from '../core/format.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface PictogramLayer extends LayerBase {
  type: 'pictogram';
  /** Either parts of one whole... */
  parts?: { label: string; value: number; color?: string }[];
  /** ...or separate groups, each its own block with a label and count. */
  groups?: { label: string; value: number; color?: string; icon?: string }[];
  total?: number;
  columns?: number;
  icon?: string;
  shape?: 'icon' | 'square' | 'dot';
  /** Color for the unfilled remainder. */
  rest?: string;
  gap?: number;
  showLabels?: boolean;
}

function render(l: PictogramLayer, box: Box, ctx: Ctx): string {
  const { pal, type } = ctx;
  const out: string[] = [];
  const shape = l.shape ?? (l.icon ? 'icon' : 'square');
  const cell = (x: number, y: number, s: number, color: string, ic?: string) => {
    if (shape === 'icon' && (ic ?? l.icon)) return icon((ic ?? l.icon)!, x, y, s, color);
    if (shape === 'dot') return h('circle', { cx: x + s / 2, cy: y + s / 2, r: s * 0.42, fill: color });
    return h('path', { d: rectPath(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.14), fill: color });
  };

  if (l.groups?.length) {
    const gW = box.w / l.groups.length;
    const maxV = Math.max(...l.groups.map((g) => g.value));
    const cols = l.columns ?? Math.ceil(Math.sqrt(maxV));
    const s = Math.min((gW * 0.8) / cols, (box.h - 140) / Math.ceil(maxV / cols));
    l.groups.forEach((g, gi) => {
      const color = g.color ?? pal.cats[gi % pal.cats.length];
      const x0 = box.x + gi * gW + (gW - cols * s) / 2;
      const rowsUsed = Math.ceil(maxV / cols);
      for (let i = 0; i < g.value; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        // Fill from the bottom so taller stacks read as "more".
        out.push(cell(x0 + c * s, box.y + 110 + (rowsUsed - 1 - r) * s, s, color, g.icon));
      }
      const vs: TextStyle = { ...type.number, size: 72, fill: color };
      out.push(runs(editorial(g.value, vs, { style: 'plain', decimals: 0 }), box.x + gi * gW + gW / 2, box.y + capHeight(vs), vs, 'middle'));
      out.push(text(g.label, box.x + gi * gW + gW / 2, box.y + capHeight(vs) + 36, { ...type.label, size: 26, fill: pal.ink }, 'middle'));
    });
    return out.join('');
  }

  const total = l.total ?? 100;
  const cols = l.columns ?? 10;
  const rows = Math.ceil(total / cols);
  const s = Math.min(box.w / cols, (box.h - (l.showLabels !== false ? 60 : 0)) / rows);
  const colors: string[] = [];
  (l.parts ?? []).forEach((p, i) => {
    for (let k = 0; k < Math.round(p.value); k++) colors.push(p.color ?? pal.cats[i % pal.cats.length]);
  });
  const rest = l.rest ?? mix(pal.bg, pal.ink, 0.12);
  for (let i = 0; i < total; i++) out.push(cell(box.x + (i % cols) * s, box.y + Math.floor(i / cols) * s, s, colors[i] ?? rest));
  if (l.showLabels !== false) {
    let x = box.x;
    const y = box.y + rows * s + 44;
    (l.parts ?? []).forEach((p, i) => {
      const c = p.color ?? pal.cats[i % pal.cats.length];
      const ls: TextStyle = { ...type.label, size: 24, fill: c, weight: 800 };
      const label = `${p.value}  ${p.label}`;
      out.push(text(label, x, y, ls));
      x += label.length * 13 + 40;
    });
  }
  return out.join('');
}

registerChart('pictogram', render as never);
