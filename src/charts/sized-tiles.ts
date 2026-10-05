/**
 * sized-tiles: images (album covers, products, logos) scaled by value and
 * lined up on shelves, with a value label over each and a category-colored
 * tag on the shelf. Objects-as-data: the thing itself is the bar.
 *
 * The "Best-Selling Albums by Year" form. Use for any ranking of physical or
 * branded things (books, games, cars, phones, sneakers).
 */
import { darken, lighten, onColor } from '../core/color.js';
import { image } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, rectPath } from '../core/svg.js';
import { capHeight, measure, text, runs, type TextStyle } from '../core/text.js';
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
}

function render(l: SizedTilesLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const per = l.perRow ?? 5;
  const rows = Math.ceil(l.items.length / per);
  const rowH = box.h / rows;
  const colW = box.w / per;
  const labelH = Math.min(70, rowH * 0.2);
  const shelfH = Math.min(36, rowH * 0.09);
  const valueH = Math.min(46, rowH * 0.12);
  const maxSide = Math.min(colW * 1.18, rowH - labelH - shelfH - valueH - 8);
  const max = Math.max(...l.items.map((i) => i.value));
  const cats = [...new Set(l.items.map((i) => i.category).filter(Boolean))] as string[];
  const catColor = (c?: string) => (c ? (l.categories?.[c] ?? pal.cats[cats.indexOf(c) % pal.cats.length]) : pal.accent);
  const parts: string[] = [];

  for (let r = 0; r < rows; r++) {
    const rowItems = l.items.slice(r * per, r * per + per);
    const shelfY = box.y + r * rowH + rowH - labelH - shelfH;
    // Shelf plank with a soft cast shadow.
    if (l.shelf !== 'none') {
      const wood = l.shelfColor ?? '#9a6a3c';
      if (l.shelf === 'line') parts.push(h('rect', { x: box.x, y: shelfY, width: box.w, height: 4, fill: pal.ink }));
      else {
        parts.push(h('rect', { x: box.x - 6, y: shelfY + shelfH, width: box.w + 12, height: 14, fill: defs.linear([[0, '#000', 0.25], [1, '#000', 0]], 90) }));
        parts.push(h('path', { d: rectPath(box.x - 10, shelfY, box.w + 20, shelfH, 4), fill: defs.linear([[0, lighten(wood, 0.08)], [0.5, wood], [1, darken(wood, 0.14)]], 90) }));
        parts.push(h('rect', { x: box.x - 10, y: shelfY, width: box.w + 20, height: 3, fill: lighten(wood, 0.2) }));
      }
    }
    // Tiles overlap slightly like records leaning on a shelf.
    rowItems.forEach((it, i) => {
      const side = maxSide * Math.sqrt(it.value / max);
      const cx = box.x + colW * (i + 0.5);
      const x = cx - side / 2;
      const y = shelfY - side;
      // Drop shadow follows the image's alpha, so cutouts cast object-shaped shadows.
      const shadow = defs.shadow({ dx: 3, dy: 6, blur: 12, opacity: 0.45 });
      if (it.image) parts.push(h('g', { filter: shadow }, image(it.image, x, y, side, side, { fit: l.fit ?? 'cover', focus: 'bottom' })));
      else parts.push(h('rect', { x, y, width: side, height: side, fill: it.color ?? catColor(it.category), filter: shadow }));
      if (l.gloss !== false) parts.push(h('rect', { x, y, width: side, height: side, fill: defs.linear([[0, '#fff', 0.28], [0.35, '#fff', 0.04], [0.6, '#fff', 0], [1, '#fff', 0.12]], 35) }));
      const vs: TextStyle = { ...type.number, size: valueH * 0.85, fill: pal.ink, italic: false };
      parts.push(runs(editorial(it.display ?? it.value, vs, { ...l.format, style: 'plain' }), cx, y - 12, vs, 'middle'));
      if (it.tag) {
        const ts: TextStyle = { ...type.label, size: shelfH * 0.62, fill: '#fff', weight: 700 };
        const tw = measure(it.tag, ts) + 18;
        const col = catColor(it.category);
        parts.push(h('rect', { x: cx - tw / 2, y: shelfY + shelfH * 0.15, width: tw, height: shelfH * 0.7, fill: col }));
        parts.push(text(it.tag, cx, shelfY + shelfH / 2 + capHeight(ts) / 2, { ...ts, fill: onColor(col) }, 'middle'));
      }
      const ls: TextStyle = { ...type.label, size: labelH * 0.36, fill: pal.ink, weight: 700 };
      parts.push(text(it.label, cx, shelfY + shelfH + labelH * 0.5, ls, 'middle'));
      if (it.sub) parts.push(text(it.sub, cx, shelfY + shelfH + labelH * 0.85, { ...type.note, size: labelH * 0.25, fill: pal.muted }, 'middle'));
    });
  }
  return parts.join('');
}

registerChart('sized-tiles', render as never);
