/**
 * snake-timeline: a long time series laid out as a winding track, one bubble
 * per period whose AREA is the value, the track colored by who held the title,
 * and a cut-out "sticker" head wherever the holder changes.
 *
 * The "World's Richest Person Every Year" form. Great for "who was #1 each
 * year", reigning champions, top product per year, largest company by year.
 *
 * Sizing is honest: r = refR * sqrt(v / ref) with ref = 90th percentile, so a
 * $19B year is visibly tiny next to a $178B year, and an outlier ($923B) is
 * allowed to spill far past its cell. Give it a tall canvas (≈1900px for 40
 * periods) so typical bubbles can fill their column.
 */
import { darken, mix } from '../core/color.js';
import { arrow, flag, headSticker, image } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { areaScale } from '../core/scale.js';
import { h, r2 } from '../core/svg.js';
import { capHeight, measure, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface SnakeHolder {
  name: string;
  image?: string;
  color?: string;
  flag?: string;
  /** Logo image shown under the first year of each reign. */
  logo?: string;
  /** Text fallback for the logo: company / source of wealth ("Microsoft"). */
  source?: string;
}

export interface SnakeItem {
  label: string;
  value: number;
  holder: string;
  display?: string;
}

export interface SnakeTimelineLayer extends LayerBase {
  type: 'snake-timeline';
  items: SnakeItem[];
  holders: Record<string, SnakeHolder>;
  perRow?: number;
  format?: FormatOptions;
  /** Portrait at every holder change (default) or never. */
  portraits?: boolean;
  /** Value that fills a column (default: 90th percentile). */
  refValue?: number;
  /** Small note under the first source label ("Main source of wealth"). */
  sourceNote?: string;
}

function render(l: SnakeTimelineLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const n = l.items.length;
  const per = l.perRow ?? 8;
  const rows = Math.ceil(n / per);
  const rowH = box.h / rows;
  const x0 = box.x + 20;
  const x1 = box.x + box.w - 20;
  const colW = (x1 - x0) / per;
  const r = areaScale(
    l.items.map((i) => i.value),
    colW * 0.53,
    { ref: l.refValue ?? 'p90', floor: 3 },
  );
  const holderKeys = [...new Set(l.items.map((i) => i.holder))];
  const colorOf = (k: string) => l.holders[k]?.color ?? pal.cats[holderKeys.indexOf(k) % pal.cats.length];

  // Track sits a third of the way down each row: room above for heads, below for labels.
  const pts = l.items.map((it, i) => {
    const row = Math.floor(i / per);
    const c = i % per;
    const col = row % 2 === 0 ? c : per - 1 - c;
    return { x: x0 + colW * (col + 0.5), y: box.y + rowH * row + rowH * 0.36, row, r: r(it.value) };
  });

  const parts: string[] = [];
  const bandW = colW * 0.22;
  // Turns are rounded corners hugging the box edge, not semicircles off-canvas.
  const turnX = (row: number) => (row % 2 === 0 ? box.x + box.w : box.x);
  const rc = Math.min(56, rowH * 0.18);

  const seg = (a: (typeof pts)[0], b: (typeof pts)[0]) => {
    if (a.row === b.row) return `M${r2(a.x)},${r2(a.y)}L${r2(b.x)},${r2(b.y)}`;
    const right = a.row % 2 === 0;
    const edge = turnX(a.row);
    const d = right ? 1 : -1;
    const sweep = right ? 1 : 0;
    return (
      `M${r2(a.x)},${r2(a.y)}L${r2(edge - d * rc)},${r2(a.y)}` +
      `A${rc},${rc} 0 0 ${sweep} ${r2(edge)},${r2(a.y + rc)}L${r2(edge)},${r2(b.y - rc)}` +
      `A${rc},${rc} 0 0 ${sweep} ${r2(edge - d * rc)},${r2(b.y)}L${r2(b.x)},${r2(b.y)}`
    );
  };

  // Colored band: within a row it takes the color of the year it leads into;
  // around a turn it only continues if the same holder keeps the title.
  for (let i = 0; i < n - 1; i++) {
    const a = l.items[i];
    const b = l.items[i + 1];
    const turn = pts[i].row !== pts[i + 1].row;
    if (turn && a.holder !== b.holder) continue;
    parts.push(h('path', { d: seg(pts[i], pts[i + 1]), stroke: colorOf(b.holder), strokeWidth: bandW, fill: 'none', strokeLinecap: 'butt' }));
  }

  // Bubbles. Overlapping ones go slightly translucent so neighbours still read.
  const order = l.items.map((_, i) => i).sort((a, b) => pts[b].r - pts[a].r);
  for (const i of order) {
    const p = pts[i];
    const overlaps = p.r > colW * 0.5;
    parts.push(h('circle', { cx: p.x, cy: p.y, r: p.r, fill: colorOf(l.items[i].holder), opacity: overlaps ? 0.88 : 1 }));
  }

  // Thin black line + dots over everything, with lead-in/out to the canvas edge.
  const line: string[] = [`M${box.x - 200},${pts[0].y}L${pts[0].x},${pts[0].y}`];
  for (let i = 0; i < n - 1; i++) line.push(seg(pts[i], pts[i + 1]));
  const last = pts[n - 1];
  line.push(`M${last.x},${last.y}L${last.row % 2 === 0 ? ctx.width + 10 : -10},${last.y}`);
  parts.push(h('path', { d: line.join(''), stroke: pal.ink, strokeWidth: 2, fill: 'none' }));
  pts.forEach((p) => parts.push(h('circle', { cx: p.x, cy: p.y, r: 4.5, fill: pal.ink })));

  // Year + value under each bubble.
  const yearStyle: TextStyle = { family: 'Bodoni Moda', weight: 900, italic: true, size: Math.min(34, colW * 0.25), fill: pal.ink };
  const valStyle: TextStyle = { ...type.body, size: Math.min(25, colW * 0.18), fill: pal.ink, weight: 500 };
  const labelY = (p: (typeof pts)[0]) => p.y + colW * 0.42;
  l.items.forEach((it, i) => {
    const p = pts[i];
    const ly = labelY(p);
    parts.push(text(it.label, p.x, ly, yearStyle, 'middle'));
    parts.push(runs(editorial(it.display ?? it.value, valStyle, { ...l.format, style: 'plain' }), p.x, ly + valStyle.size! * 1.15, valStyle, 'middle'));
  });

  if (l.portraits === false) return parts.join('');

  const changes: number[] = [];
  l.items.forEach((it, i) => {
    if (i === 0 || it.holder !== l.items[i - 1].holder) changes.push(i);
  });

  // Source of wealth under each reign start (logo or gray wordmark).
  changes.forEach((i, ci) => {
    const hd = l.holders[l.items[i].holder];
    if (!hd) return;
    const p = pts[i];
    const sy = labelY(p) + valStyle.size! * 2.3;
    if (hd.logo) parts.push(image(hd.logo, p.x - colW * 0.42, sy - 18, colW * 0.84, 34, { fit: 'contain', opacity: 0.5 }));
    else if (hd.source) {
      const ss: TextStyle = { family: 'Barlow', weight: 700, size: Math.min(19, colW * 0.13), tracking: 0.04, fill: mix(pal.muted, pal.bg, 0.35) };
      const words = hd.source.split(' · ');
      words.forEach((w, k) => parts.push(text(w, p.x, sy + k * ss.size! * 1.2, ss, 'middle')));
    }
    if (ci === 0 && l.sourceNote) {
      const ns: TextStyle = { ...type.body, size: Math.min(19, colW * 0.13), fill: mix(pal.muted, pal.bg, 0.35) };
      const ny = sy + 26;
      parts.push(h('path', { d: `M${p.x},${ny + 10}V${ny - 10}M${p.x - 5},${ny - 4}L${p.x},${ny - 10}L${p.x + 5},${ny - 4}`, stroke: ns.fill, strokeWidth: 1.6, fill: 'none' }));
      l.sourceNote.split('\n').forEach((ln, k) => parts.push(text(ln, p.x, ny + 30 + k * ns.size! * 1.15, ns, 'middle')));
    }
  });

  // Sticker heads + flags + names (name with a small curved arrow, first reign only).
  const named = new Set<string>();
  const headW = colW * 0.74;
  changes.forEach((i, ci) => {
    const it = l.items[i];
    const hd = l.holders[it.holder];
    if (!hd) return;
    const p = pts[i];
    const col = colorOf(it.holder);
    const hcx = p.x;
    const hcy = p.y - headW * 0.66;
    const initials = hd.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
    parts.push(headSticker(defs, hd.image, hcx, hcy, headW, { fallback: col, initials }));
    if (named.has(it.holder)) return;
    named.add(it.holder);

    // Put the name on whichever side is free of the neighbouring heads in this row.
    const sameRow = changes.filter((j) => j !== i && pts[j].row === p.row).map((j) => pts[j].x);
    const clear = (dir: 1 | -1) => sameRow.every((x) => (x - p.x) * dir <= 0 || Math.abs(x - p.x) > colW * 1.9);
    const inBounds = (dir: 1 | -1) => (dir === 1 ? p.x + colW * 2 < box.x + box.w + 20 : p.x - colW * 2 > box.x - 20);
    const dir: 1 | -1 | 0 = clear(1) && inBounds(1) ? 1 : clear(-1) && inBounds(-1) ? -1 : 0;
    const [first, ...rest] = hd.name.split(' ');
    // A bg-colored halo keeps the name legible where it crosses a bubble.
    const halo = { stroke: pal.bg, strokeWidth: 6 };
    const ns: TextStyle = { ...type.label, size: Math.min(30, colW * 0.21), fill: darken(col, 0.04), weight: 500, ...halo };
    const bs: TextStyle = { ...ns, weight: 800 };
    const restText = rest.join(' ');
    if (dir === 0) {
      const ny = hcy - headW * 0.66 - ns.size! * 1.05;
      parts.push(text(first, hcx, ny, ns, 'middle'));
      if (restText) parts.push(text(restText, hcx, ny + ns.size! * 1.08, bs, 'middle'));
      return;
    }
    const nx = hcx + dir * headW * 0.6;
    const ny = hcy - headW * 0.3;
    const anchor = dir === 1 ? 'start' : 'end';
    parts.push(text(first, nx, ny, ns, anchor));
    if (restText) parts.push(text(restText, nx, ny + ns.size! * 1.08, bs, anchor));
    // Small hooked arrow from above the name back to the head.
    parts.push(arrow(nx + dir * 26, ny - ns.size! * 1.15, hcx + dir * headW * 0.4, hcy - headW * 0.44, { color: col, width: 1.6, bend: dir * 0.5, head: 6 }));
  });
  // Flags go on the side away from the name (drawn last so they sit on top).
  named.clear();
  changes.forEach((i, ci) => {
    const it = l.items[i];
    const hd = l.holders[it.holder];
    if (!hd?.flag) return;
    const p = pts[i];
    const hcx = p.x;
    const hcy = p.y - headW * 0.66;
    const sameRow = changes.filter((j) => j !== i && pts[j].row === p.row).map((j) => pts[j].x);
    const nameRight = sameRow.every((x) => x < p.x || Math.abs(x - p.x) > colW * 1.9) && p.x + colW * 2 < box.x + box.w + 20;
    const firstReign = changes.findIndex((j) => l.items[j].holder === it.holder) === ci;
    const side = firstReign && nameRight ? -1 : 1;
    parts.push(h('g', { filter: defs.sticker('#ffffff', 2.5, 0.15) }, flag(defs, hd.flag, hcx + side * headW * 0.5, hcy - headW * 0.3, headW * 0.17, 'rgba(0,0,0,0.12)')));
  });
  return parts.join('');
}

registerChart('snake-timeline', render as never);
