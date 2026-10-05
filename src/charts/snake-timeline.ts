/**
 * snake-timeline: a long time series laid out as a winding track, one bubble
 * per period sized by value, the track colored by who/what held the title,
 * and a portrait wherever the holder changes.
 *
 * The "World's Richest Person Every Year" form. Great for "who was #1 each
 * year", reigning champions, top product per year, largest company by year.
 */
import { alpha, darken } from '../core/color.js';
import { avatar, flag, image } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, r2 } from '../core/svg.js';
import { capHeight, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface SnakeHolder {
  name: string;
  image?: string;
  color?: string;
  flag?: string;
  /** Logo/brand shown under the first year of a reign. */
  logo?: string;
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
  trackColor?: string;
  /** Portrait at every holder change (default) or never. */
  portraits?: boolean;
}

function render(l: SnakeTimelineLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const n = l.items.length;
  const per = l.perRow ?? 8;
  const rows = Math.ceil(n / per);
  const rowH = box.h / rows;
  const turnR = rowH / 2;
  const x0 = box.x + turnR * 0.55;
  const x1 = box.x + box.w - turnR * 0.55;
  const colW = (x1 - x0) / per;
  const trackOffset = -rowH * 0.06;
  const maxR = Math.min(colW * 0.95, rowH * 0.42);
  const max = Math.max(...l.items.map((i) => i.value));
  const holderKeys = [...new Set(l.items.map((i) => i.holder))];
  const colorOf = (k: string) => l.holders[k]?.color ?? pal.cats[holderKeys.indexOf(k) % pal.cats.length];

  const pts = l.items.map((it, i) => {
    const row = Math.floor(i / per);
    const c = i % per;
    const col = row % 2 === 0 ? c : per - 1 - c;
    return { x: x0 + colW * (col + 0.5), y: box.y + rowH * row + rowH * 0.42 + trackOffset, row, r: Math.max(maxR * 0.28, maxR * Math.sqrt(it.value / max)) };
  });

  const parts: string[] = [];
  const bandW = Math.max(10, maxR * 0.42);

  // Track segments: straight within a row, a half-circle turn between rows.
  const seg = (a: (typeof pts)[0], b: (typeof pts)[0]) => {
    if (a.row === b.row) return `M${r2(a.x)},${r2(a.y)}L${r2(b.x)},${r2(b.y)}`;
    const goingRight = a.row % 2 === 0;
    const edge = goingRight ? x1 : x0;
    const rr = (b.y - a.y) / 2;
    return `M${r2(a.x)},${r2(a.y)}L${r2(edge)},${r2(a.y)}A${r2(rr)},${r2(rr)} 0 0 ${goingRight ? 1 : 0} ${r2(edge)},${r2(b.y)}L${r2(b.x)},${r2(b.y)}`;
  };
  for (let i = 0; i < n - 1; i++) parts.push(h('path', { d: seg(pts[i], pts[i + 1]), stroke: colorOf(l.items[i + 1].holder), strokeWidth: bandW, fill: 'none', strokeLinecap: 'round' }));
  // Lead-in and lead-out stubs.
  parts.push(h('path', { d: `M${box.x - 64},${pts[0].y}L${pts[0].x},${pts[0].y}`, stroke: pal.ink, strokeWidth: 2 }));
  for (let i = 0; i < n - 1; i++) parts.push(h('path', { d: seg(pts[i], pts[i + 1]), stroke: pal.ink, strokeWidth: 2, fill: 'none' }));
  const last = pts[n - 1];
  parts.push(h('path', { d: `M${last.x},${last.y}L${last.row % 2 === 0 ? box.x + box.w + 64 : box.x - 64},${last.y}`, stroke: pal.ink, strokeWidth: 2 }));

  // Bubbles, slightly translucent so neighbours that overlap still read.
  l.items.forEach((it, i) => {
    const p = pts[i];
    parts.push(h('circle', { cx: p.x, cy: p.y, r: p.r, fill: colorOf(it.holder), opacity: p.r > colW * 0.6 ? 0.82 : 1 }));
  });
  l.items.forEach((_, i) => parts.push(h('circle', { cx: pts[i].x, cy: pts[i].y, r: 4, fill: pal.ink })));

  // Labels under each bubble.
  const yearStyle: TextStyle = { family: 'Playfair Display', weight: 900, italic: true, size: Math.min(28, colW * 0.24), fill: pal.ink };
  const valStyle: TextStyle = { ...type.body, size: Math.min(22, colW * 0.19), fill: pal.ink, weight: 500 };
  l.items.forEach((it, i) => {
    const p = pts[i];
    const ly = p.y + rowH * 0.2;
    parts.push(text(it.label, p.x, ly, yearStyle, 'middle'));
    parts.push(runs(editorial(it.display ?? it.value, valStyle, { ...l.format, style: 'plain' }), p.x, ly + valStyle.size! * 1.25, valStyle, 'middle'));
  });

  // Portraits wherever the holder changes; the name only on a holder's first
  // reign, placed on whichever side has room (or above when boxed in).
  if (l.portraits !== false) {
    const changes: number[] = [];
    l.items.forEach((it, i) => {
      if (i === 0 || it.holder !== l.items[i - 1].holder) changes.push(i);
    });
    const named = new Set<string>();
    changes.forEach((i, ci) => {
      const it = l.items[i];
      const hd = l.holders[it.holder];
      if (!hd) return;
      const p = pts[i];
      const ar = Math.min(colW * 0.52, rowH * 0.2);
      const ay = p.y - ar * 0.55;
      const col = colorOf(it.holder);
      parts.push(avatar(defs, hd.image, p.x, ay, ar, { ring: '#fff', ringWidth: ar * 0.07, bg: col, shadow: true }));
      if (hd.flag) parts.push(flag(defs, hd.flag, p.x + ar * 0.82, ay - ar * 0.68, ar * 0.26, '#fff'));
      if (hd.logo) parts.push(image(hd.logo, p.x - colW * 0.45, p.y + rowH * 0.3, colW * 0.9, rowH * 0.1, { fit: 'contain', opacity: 0.55 }));
      if (named.has(it.holder)) return;
      named.add(it.holder);

      // Which neighbouring portraits share this row, and how close are they (in px)?
      const near = (j: number | undefined) => (j === undefined || pts[j].row !== p.row ? Infinity : Math.abs(pts[j].x - p.x));
      const prevX = changes[ci - 1] !== undefined && pts[changes[ci - 1]].row === p.row ? pts[changes[ci - 1]].x : undefined;
      const nextX = changes[ci + 1] !== undefined && pts[changes[ci + 1]].row === p.row ? pts[changes[ci + 1]].x : undefined;
      const room = colW * 2.2;
      const rightFree = (nextX === undefined || nextX < p.x || near(changes[ci + 1]) > room) && (prevX === undefined || prevX < p.x || Math.abs(prevX - p.x) > room) && p.x < box.x + box.w * 0.8;
      const leftFree = (prevX === undefined || prevX > p.x || Math.abs(prevX - p.x) > room) && (nextX === undefined || nextX > p.x || Math.abs(nextX - p.x) > room) && p.x > box.x + box.w * 0.2;
      const [first, ...restWords] = hd.name.split(' ');
      const ns: TextStyle = { ...type.label, size: Math.min(26, colW * 0.21), fill: darken(col, 0.05), weight: 500 };
      if (rightFree || leftFree) {
        const onLeft = !rightFree;
        const nx = onLeft ? p.x - ar * 1.25 : p.x + ar * 1.25;
        const anchor = onLeft ? 'end' : 'start';
        // Keep both name lines above the track band.
        const ny = ay - ar * 0.95;
        parts.push(text(first, nx, ny, ns, anchor));
        if (restWords.length) parts.push(text(restWords.join(' '), nx, ny + ns.size! * 1.05, { ...ns, weight: 800 }, anchor));
      } else {
        // Boxed in: stack the name above the portrait.
        const ny = ay - ar * 1.25 - ns.size! * 1.05;
        parts.push(text(first, p.x, ny, ns, 'middle'));
        if (restWords.length) parts.push(text(restWords.join(' '), p.x, ny + ns.size! * 1.05, { ...ns, weight: 800 }, 'middle'));
      }
    });
  }
  void alpha;
  void capHeight;
  return parts.join('');
}

registerChart('snake-timeline', render as never);
