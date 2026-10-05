/**
 * dual-ranking: two top-N tables side by side, with every entry that appears
 * on BOTH lists highlighted like a marker pen. The overlap is the story.
 *
 * The "Wealthiest vs Happiest Countries" form. Works for any "does A track
 * B?" comparison: richest vs most generous, biggest vs fastest growing.
 */
import { alpha, mix } from '../core/color.js';
import { flag } from '../core/draw.js';
import { h } from '../core/svg.js';
import { capHeight, measure, text, runs, type TextStyle } from '../core/text.js';
import { editorial } from '../core/format.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface DualList {
  title?: string;
  subtitle?: string;
  items: { label: string; value: string | number; flag?: string; note?: string }[];
  /** Small unit after the first value ("USD"). */
  unit?: string;
}

export interface DualRankingLayer extends LayerBase {
  type: 'dual-ranking';
  left: DualList;
  right: DualList;
  highlight?: string;
  /** Match on label (default) — set explicit keys to override. */
  matchKeys?: string[];
}

function render(l: DualRankingLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const n = Math.max(l.left.items.length, l.right.items.length);
  const rowH = box.h / n;
  const half = box.w / 2;
  const hl = l.highlight ?? pal.accent;
  const match = new Set(l.matchKeys ?? l.left.items.map((i) => i.label).filter((x) => l.right.items.some((r) => r.label === x)));
  const parts: string[] = [];
  const side = (list: DualList, x0: number, bleedLeft: boolean) => {
    list.items.forEach((it, i) => {
      const y = box.y + i * rowH;
      const on = match.has(it.label);
      const bx = bleedLeft ? 0 : x0;
      const bw = bleedLeft ? x0 + half : ctx.width - x0;
      // Zebra rows fading out toward the outer edge, a highlighter band for matches.
      const fill = on ? hl : i % 2 ? defs.linear([[0, alpha('#000', bleedLeft ? 0 : 0.05)], [1, alpha('#000', bleedLeft ? 0.05 : 0)]], 0) : 'none';
      parts.push(h('rect', { x: bx, y: y + 1, width: bw - (bleedLeft ? 4 : 0), height: rowH - 2, fill, filter: on ? defs.shadow({ dy: 2, blur: 4, opacity: 0.15 }) : undefined }));
      const cy = y + rowH / 2;
      const size = Math.min(34, rowH * 0.5);
      const rs: TextStyle = { ...type.body, size: size * 0.85, fill: pal.ink };
      const ls: TextStyle = { ...type.body, size, fill: pal.ink, weight: on ? 700 : 400 };
      const vs: TextStyle = { ...type.body, size, fill: pal.ink, weight: on ? 600 : 400 };
      const fr = size * 0.62;
      parts.push(text(String(i + 1), x0 + 36, cy + capHeight(rs) / 2, rs, 'end'));
      if (it.flag) parts.push(flag(defs, it.flag, x0 + 36 + fr + 26, cy, fr));
      parts.push(text(it.label, x0 + 36 + fr * 2 + 46, cy + capHeight(ls) / 2, ls));
      if (it.note) parts.push(text(it.note, x0 + 36 + fr * 2 + 52 + measure(it.label, ls), cy + capHeight(ls) / 2, { ...ls, size: size * 0.6, fill: pal.muted, weight: 500 }));
      const vx = x0 + half - 70;
      parts.push(runs(editorial(it.value, vs, { style: 'plain' }), vx, cy + capHeight(vs) / 2, vs, 'end'));
      if (i === 0 && list.unit) parts.push(text(list.unit, vx + 6, cy + capHeight(vs) / 2, { ...vs, size: size * 0.6, fill: pal.muted }));
    });
  };
  side(l.left, box.x, true);
  side(l.right, box.x + half, false);
  parts.push(h('rect', { x: box.x + half - 2, y: box.y, width: 4, height: box.h, fill: mix(pal.bg, '#fff', 0.6) }));
  return parts.join('');
}

registerChart('dual-ranking', render as never);
