/**
 * sized-tiles: images (album covers, products, logos) scaled by value and
 * lined up on shelves, with a value label over each and a category-colored
 * tag on the shelf. Objects-as-data: the thing itself is the bar.
 *
 * The "Best-Selling Albums by Year" form. Use for any ranking of physical or
 * branded things (books, games, cars, phones, sneakers).
 */
import { alpha, darken, lighten, onColor } from '../core/color.js';
import { image } from '../core/draw.js';
import { imageAspect } from '../core/assets.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, rectPath } from '../core/svg.js';
import { capHeight, measure, measureRuns, text, runs, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface TileItem {
  label: string;
  sub?: string;
  value: number;
  display?: string;
  image?: string;
  category?: string;
  tag?: string;
  color?: string;
}

export interface SizedTilesLayer extends LayerBase {
  type: 'sized-tiles';
  items: TileItem[];
  perRow?: number;
  format?: FormatOptions;
  categories?: Record<string, string>;
  shelf?: 'wood' | 'line' | 'none';
  shelfColor?: string;
  /** Glossy shrink-wrap highlight over tiles. */
  gloss?: boolean;
  /** cover for square art (albums), contain for cutout objects. */
  fit?: 'cover' | 'contain';
  /** Pack items tightly by their real width instead of an even grid. */
  pack?: boolean;
  /** Items per shelf, top to bottom, e.g. [4, 3, 3]. Overrides perRow. */
  rows?: number[];
  /** Fraction of each item's width that overlaps its neighbour when packed (0–0.3). */
  overlap?: number;
}

function render(l: SizedTilesLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const per = l.perRow ?? 5;
  // Explicit shelf sizes (e.g. [4, 3, 3]) or even rows of `perRow`.
  const sizes = l.rows ?? Array.from({ length: Math.ceil(l.items.length / per) }, (_, r) => Math.min(per, l.items.length - r * per));
  const rows = sizes.length;
  const starts = sizes.map((_, r) => sizes.slice(0, r).reduce((a, b) => a + b, 0));
  const rowItems = (r: number) => l.items.slice(starts[r], starts[r] + sizes[r]);
  const labelH = Math.min(64, (box.h / rows) * 0.18);
  const shelfH = Math.min(32, (box.h / rows) * 0.08);
  const valueH = Math.min(44, (box.h / rows) * 0.11);
  const fixedH = labelH + shelfH + valueH * 1.25;
  const max = Math.max(...l.items.map((i) => i.value));
  const cats = [...new Set(l.items.map((i) => i.category).filter(Boolean))] as string[];
  const catColor = (c?: string) => (c ? (l.categories?.[c] ?? pal.cats[cats.indexOf(c) % pal.cats.length]) : pal.accent);
  const overlap = l.overlap ?? 0;
  const parts: string[] = [];

  // Honest sizing: the visible object's AREA ∝ value, whatever its aspect ratio.
  // At scale k an item covers k² · v/max px²; cutouts keep their real shape.
  const aspectOf = (it: TileItem) => (l.fit === 'contain' && it.image ? (imageAspect(it.image) ?? 1) : 1);
  const dims = (it: TileItem, k: number) => {
    const ar = aspectOf(it);
    const a = (it.value / max) * k * k;
    return { w: Math.sqrt(a * ar), h: Math.sqrt(a / ar) };
  };
  const ls: TextStyle = { ...type.label, size: labelH * 0.36, fill: pal.ink, weight: 700 };
  const labelW = (it: TileItem) => measure(it.label, ls) + 16;

  // Biggest k such that every row fits the width and all rows fit the height.
  // Rows are as tall as their tallest object, so there are no dead bands.
  const rowWidth = (r: number, k: number) => {
    const its = rowItems(r);
    if (!l.pack) return 0;
    let w = 0;
    its.forEach((it, i) => {
      const own = dims(it, k).w * (1 - overlap);
      w += Math.max(own, labelW(it)) + (i ? 10 : 0);
    });
    return w;
  };
  const rowObjH = (r: number, k: number) => Math.max(...rowItems(r).map((it) => dims(it, k).h));
  let k = 1;
  const sumH1 = Array.from({ length: rows }, (_, r) => rowObjH(r, 1)).reduce((a, b) => a + b, 0);
  k = (box.h - rows * fixedH) / sumH1;
  if (l.pack) {
    for (let iter = 0; iter < 30; iter++) {
      const widest = Math.max(...Array.from({ length: rows }, (_, r) => rowWidth(r, k)));
      if (widest <= box.w) break;
      k *= 0.97;
    }
  } else {
    const colW = box.w / per;
    const widestItem = Math.max(...l.items.map((it) => dims(it, 1).w));
    k = Math.min(k, (colW * 1.1) / widestItem);
  }
  const heights = Array.from({ length: rows }, (_, r) => rowObjH(r, k) + fixedH);
  // Leftover height (when width is the binding limit) becomes modest shelf spacing; the rest centers the block.
  const spare = box.h - heights.reduce((a, b) => a + b, 0);
  const rowGap = rows > 1 ? Math.min(spare / (rows - 1), labelH * 0.8) : 0;
  let top = box.y + (spare - rowGap * (rows - 1)) / 2;

  for (let r = 0; r < rows; r++) {
    const its = rowItems(r);
    const shelfY = top + heights[r] - labelH - shelfH;
    top += heights[r] + rowGap;
    // Shelf: wooden plank with a top lip, wood grain and a cast shadow on the wall.
    if (l.shelf !== 'none') {
      const wood = l.shelfColor ?? '#9a6a3c';
      if (l.shelf === 'line') parts.push(h('rect', { x: box.x, y: shelfY, width: box.w, height: 4, fill: pal.ink }));
      else {
        const x0 = box.x - 8;
        const w = box.w + 16;
        parts.push(h('rect', { x: x0 + 6, y: shelfY + shelfH, width: w - 12, height: shelfH * 0.9, fill: defs.linear([[0, '#000', 0.3], [1, '#000', 0]], 90) }));
        parts.push(h('path', { d: rectPath(x0, shelfY - shelfH * 0.28, w, shelfH * 0.3, 2), fill: lighten(wood, 0.12) }));
        parts.push(h('path', { d: rectPath(x0, shelfY, w, shelfH, 3), fill: defs.linear([[0, lighten(wood, 0.04)], [0.5, wood], [1, darken(wood, 0.16)]], 90) }));
        parts.push(h('rect', { x: x0, y: shelfY, width: w, height: shelfH, fill: defs.hatch(darken(wood, 0.08), { angle: 2, gap: 5, width: 1, opacity: 0.5 }) }));
      }
    }
    // Centers: packed by real width (but never closer than their labels need), or an even grid.
    const centers: number[] = [];
    if (l.pack) {
      const slots = its.map((it) => Math.max(dims(it, k).w * (1 - overlap), labelW(it)));
      const runW = slots.reduce((a, b) => a + b, 0) + 10 * (its.length - 1);
      let x = box.x + (box.w - runW) / 2;
      slots.forEach((w, i) => {
        centers[i] = x + w / 2;
        x += w + 10;
      });
    } else its.forEach((_, i) => (centers[i] = box.x + (box.w / its.length) * (i + 0.5)));

    // Big items first so smaller ones overlap in front.
    const order = its.map((_, i) => i).sort((a, b) => its[b].value - its[a].value);
    for (const i of order) {
      const it = its[i];
      const d = dims(it, k);
      const x = centers[i] - d.w / 2;
      const y = shelfY - d.h;
      const shadow = defs.shadow({ dx: 3, dy: 6, blur: 12, opacity: 0.4 });
      if (it.image) parts.push(h('g', { filter: shadow }, image(it.image, x, y, d.w, d.h, { fit: l.fit ?? 'cover', focus: 'bottom' })));
      else parts.push(h('rect', { x, y, width: d.w, height: d.h, fill: it.color ?? catColor(it.category), filter: shadow }));
      if (l.gloss !== false) parts.push(h('rect', { x, y, width: d.w, height: d.h, fill: defs.linear([[0, '#fff', 0.28], [0.35, '#fff', 0.04], [0.6, '#fff', 0], [1, '#fff', 0.12]], 35) }));
    }
    its.forEach((it, i) => {
      const d = dims(it, k);
      const cx = centers[i];
      const y = shelfY - d.h;
      const vs: TextStyle = { ...type.number, size: valueH * 0.85, fill: pal.ink, italic: false };
      const vr = editorial(it.display ?? it.value, vs, { ...l.format, style: 'plain' });
      // A bg-colored halo keeps the value legible where it overlaps a neighbour.
      parts.push(runs(vr, cx, y - valueH * 0.3, { ...vs, stroke: alpha(pal.bg, 0.9), strokeWidth: 6 }, 'middle'));
      if (it.tag) {
        const ts: TextStyle = { ...type.label, size: shelfH * 0.62, fill: '#fff', weight: 700 };
        const tw = measure(it.tag, ts) + 18;
        const col = catColor(it.category);
        parts.push(h('rect', { x: cx - tw / 2, y: shelfY + shelfH * 0.15, width: tw, height: shelfH * 0.7, fill: col }));
        parts.push(text(it.tag, cx, shelfY + shelfH / 2 + capHeight(ts) / 2, { ...ts, fill: onColor(col) }, 'middle'));
      }
      parts.push(text(it.label, cx, shelfY + shelfH + labelH * 0.5, ls, 'middle'));
      if (it.sub) parts.push(text(it.sub, cx, shelfY + shelfH + labelH * 0.85, { ...type.note, size: labelH * 0.25, fill: pal.muted }, 'middle'));
    });
  }
  return parts.join('');
}

registerChart('sized-tiles', render as never);
