/**
 * treemap: a squarified treemap grouped by region/sector, with editorial
 * tile typography (big number, name, flag/logo, sub-value), rotated group
 * labels on the outer edges, an "Other" tile in a muted tone, optional photo
 * or texture fills per group, and portrait callouts inside the biggest tiles.
 *
 * The most common Visual Capitalist part-to-whole form: billionaires by
 * country, diesel/fertilizer exporters, airlines by revenue, a country's top
 * companies. Use when you have 10–60 parts with 2–8 groups and the absolute
 * values matter (squares read better than Voronoi for precise comparison).
 */
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import { alpha, darken, lighten, mix, onColor } from '../core/color.js';
import { avatar, flag, icon, image } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, rectPath } from '../core/svg.js';
import { untracked, capHeight, measure, paragraph, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface TreemapItem {
  label: string;
  value: number;
  group?: string;
  /** Short label for small tiles (ISO code, ticker). */
  short?: string;
  flag?: string;
  /** Logo/icon ref (icon:simple-icons:apple, a URL…) drawn instead of the name when it fits. */
  logo?: string;
  /** Preformatted big number. */
  display?: string;
  /** Secondary line at the tile bottom ("$1.8T"). */
  sub?: string;
  color?: string;
  /** Portrait (ideally a cutout) shown in the tile with an optional note. */
  image?: string;
  note?: string;
  /** Mute this tile ("Other"). */
  muted?: boolean;
  /** Put the number block at the tile's bottom (leaves the top free for a title). */
  place?: 'top' | 'bottom';
}

export interface TreemapLayer extends LayerBase {
  type: 'treemap';
  items: TreemapItem[];
  groups?: Record<string, { label?: string; color?: string; image?: string; texture?: 'none' | 'hatch' | 'dots' }>;
  format?: FormatOptions;
  /** Gap between tiles (bg shows through). */
  gap?: number;
  /** Extra gap between groups. */
  groupGap?: number;
  /** Rotated group labels on the outer edges of the box. */
  edgeLabels?: boolean;
  /** Typeface role for big numbers: 'display' (serif, default) or 'number'. */
  numberRole?: 'display' | 'number';
  /** Fixed tile text color; default picks black/white per fill. */
  textColor?: string;
  /** Subtle per-tile shade variation inside a group. */
  shade?: boolean;
  /** Keep this canvas rect free (e.g. the title sits inside the biggest tile's corner). */
  reserve?: Box;
  border?: string;
}

function render(l: TreemapLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const edge = l.edgeLabels ? 34 : 0;
  const inner: Box = { x: box.x + edge, y: box.y, w: box.w - edge * 2, h: box.h - edge };
  const gap = l.gap ?? 3;
  const groupKeys = [...new Set(l.items.map((i) => i.group ?? '_'))];
  const groupColor = (g: string, i: number) => l.groups?.[g]?.color ?? pal.cats[i % pal.cats.length];
  const root = hierarchy<any>({
    children: groupKeys.map((g) => ({ key: g, children: l.items.filter((i) => (i.group ?? '_') === g) })),
  })
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  treemap<any>()
    .tile(treemapSquarify.ratio(1.15))
    .size([inner.w, inner.h])
    .paddingInner(gap)
    .paddingOuter(0)
    .paddingTop(0)(root);
  // Group gaps are drawn as bg-colored strokes around group rects.
  const parts: string[] = [];
  const labels: string[] = [];
  const border = l.border ?? pal.bg;
  const numRole = l.numberRole ?? 'display';

  root.children?.forEach((gNode: any, gi: number) => {
    const key = gNode.data.key as string;
    const base = groupColor(key, gi);
    const gx = inner.x + gNode.x0;
    const gy = inner.y + gNode.y0;
    const gw = gNode.x1 - gNode.x0;
    const gh = gNode.y1 - gNode.y0;
    const gimg = l.groups?.[key]?.image;
    const gtex = l.groups?.[key]?.texture;

    gNode.children?.forEach((leaf: any, li: number) => {
      const it = leaf.data as TreemapItem;
      const x = inner.x + leaf.x0;
      const y = inner.y + leaf.y0;
      const w = leaf.x1 - leaf.x0;
      const hh = leaf.y1 - leaf.y0;
      const fillBase = it.color ?? (it.muted ? mix(base, pal.bg, 0.55) : base);
      const fill = l.shade !== false && !it.color && !it.muted ? mix(fillBase, li % 2 ? darken(fillBase, 0.06) : lighten(fillBase, 0.04), 0.6) : fillBase;
      if (gimg) {
        // Photo/texture fill (soil, metal, water…) clipped to the tile, tinted lightly.
        const clip = defs.clipPath(rectPath(x, y, w, hh, 0));
        parts.push(image(gimg, gx, gy, gw, gh, { clip }));
        parts.push(h('rect', { x, y, width: w, height: hh, fill: alpha(fillBase, 0.28) }));
      } else {
        parts.push(h('rect', { x, y, width: w, height: hh, fill }));
        if (gtex === 'hatch') parts.push(h('rect', { x, y, width: w, height: hh, fill: defs.hatch(alpha('#000', 0.08), { gap: 8, width: 2 }) }));
        if (gtex === 'dots') parts.push(h('rect', { x, y, width: w, height: hh, fill: defs.dots(alpha('#000', 0.1), { gap: 7, r: 1.2 }) }));
      }

      // ── tile typography ──
      const ink = l.textColor ?? (gimg ? '#ffffff' : it.muted ? alpha(onColor(fill), 0.55) : onColor(fill, '#111111', '#ffffff'));
      const s = Math.sqrt(w * hh);
      const pad = Math.max(5, Math.min(18, s * 0.06));
      const numSize = Math.max(11, Math.min(96, s * 0.27, w * 0.42, hh * 0.42));
      const ns: TextStyle = { ...type[numRole], size: numSize, fill: ink, italic: numRole === 'number' ? type.number.italic : false };
      const nameSize = Math.max(9, Math.min(36, numSize * 0.42));
      const ls: TextStyle = { ...type.display, size: nameSize, fill: ink, upper: true, weight: type.display.weight };
      const subS: TextStyle = { ...type.display, size: Math.max(9, nameSize * 0.82), fill: ink, upper: false };
      const nr = editorial(it.display ?? it.value, ns, { ...l.format, style: 'plain' });
      const numW = measure(nr.map((r) => r.text).join(''), ns);
      const name = it.label;
      const shortName = it.short ?? it.label;
      const fr = Math.min(nameSize * 0.55, 16);
      const tiny = w < 26 || hh < 22;
      if (tiny) {
        if (it.flag && w > 12 && hh > 12) labels.push(flag(defs, it.flag, x + w / 2, y + hh / 2, Math.min(w, hh) * 0.32));
        return;
      }
      const cap = capHeight(ns);
      const atBottom = it.place === 'bottom';
      let ty = atBottom ? y + hh - pad - nameSize * 1.25 - (it.sub ? nameSize * 1.4 : 0) : y + pad + cap;
      const fitsNum = numW + pad * 2 <= w;
      const g: string[] = [];
      if (!fitsNum) {
        // Too narrow for the number: just a centered flag + short label.
        const ss = { ...ls, size: Math.min(nameSize, w / Math.max(2, shortName.length * 0.7)) };
        if (it.flag) g.push(flag(defs, it.flag, x + w / 2, y + hh / 2 - (hh > 40 ? 8 : 0), Math.min(fr, w * 0.3)));
        if (hh > 40) g.push(text(shortName, x + w / 2, y + hh / 2 + 16, ss, 'middle'));
        labels.push(...g);
        return;
      }
      g.push(runs(nr, x + pad, ty, ns));
      // Name beside the number when the tile is wide, under it otherwise.
      const big = s > 170;
      // Shrink the full name to fit before falling back to the short code.
      const fullW = measure(name, ls) + (it.flag ? fr * 2 + 8 : 0);
      const k = Math.min(1, (w - pad * 2) / fullW);
      const nm = k >= 0.72 ? name : shortName;
      if (nm === name && k < 1) ls.size = nameSize * k;
      const nmW = measure(nm, ls);
      const besideOk = !big && numW + pad * 3 + nmW + (it.flag ? fr * 2 + 6 : 0) <= w;
      let lx = x + pad;
      let ly = ty + nameSize * 1.15;
      if (besideOk) {
        lx = x + pad * 1.6 + numW;
        ly = ty;
      }
      const cy = ly - capHeight(ls) / 2;
      if (it.logo && w > 70 && hh > 50) {
        const lsz = Math.min(nameSize * 1.4, w * 0.4);
        g.push(icon(it.logo, lx, cy - lsz / 2, lsz, ink));
      } else if (ly - y + 4 < hh || besideOk) {
        g.push(text(nm, lx, ly, ls));
        if (it.flag) g.push(flag(defs, it.flag, lx + nmW + 6 + fr, cy, fr, alpha('#fff', 0.6)));
      }
      if (it.sub && hh > numSize * 2.2) {
        const subY = atBottom ? ly + subS.size! * 1.5 : big ? y + hh - pad : ly + subS.size! * 1.35;
        if (subY < y + hh - 2) g.push(runs(editorial(it.sub, subS, { style: 'plain' }), x + pad, subY, subS));
      }
      // Portrait + note for the hero tiles.
      if (it.image && w > 160 && hh > 160) {
        const r = Math.min(w, hh) * 0.16;
        const ax = x + w * (atBottom ? 0.36 : 0.42);
        const ay = y + hh * (atBottom ? 0.5 : 0.42);
        // Speech-bubble tail points at the tile's number.
        const tx = x + pad + numW * 0.55;
        const tyy = ty - cap * 1.1;
        const ang = Math.atan2(tyy - ay, tx - ax);
        const p1 = [ax + r * 0.8 * Math.cos(ang - 0.45), ay + r * 0.8 * Math.sin(ang - 0.45)];
        const p2 = [ax + r * 0.8 * Math.cos(ang + 0.45), ay + r * 0.8 * Math.sin(ang + 0.45)];
        const tip = [ax + r * 1.75 * Math.cos(ang), ay + r * 1.75 * Math.sin(ang)];
        g.push(h('path', { d: `M${p1[0]},${p1[1]}L${tip[0]},${tip[1]}L${p2[0]},${p2[1]}Z`, fill: '#f6f1e4' }));
        g.push(avatar(defs, it.image, ax, ay, r, { ring: '#f6f1e4', ringWidth: r * 0.12, bg: '#f6f1e4', focus: 'top' }));
        if (it.note) {
          const ps: TextStyle = { ...type.body, size: Math.max(12, Math.min(17, w * 0.04)), fill: ink };
          g.push(paragraph(it.note, ax + r * 1.25, ay - r * 0.2, Math.min(w * 0.42, x + w - (ax + r * 1.25) - pad), ps, { boldWeight: 700, lineHeight: 1.25 }).svg);
        }
      }
      labels.push(...g);
    });
    // Group outline gap.
    if ((l.groupGap ?? gap * 1.6) > gap) parts.push(h('rect', { x: gx, y: gy, width: gw, height: gh, fill: 'none', stroke: border, strokeWidth: l.groupGap ?? gap * 1.6 }));

    // Rotated edge label.
    if (l.edgeLabels && key !== '_') {
      const gl = (l.groups?.[key]?.label ?? key).toUpperCase();
      const es: TextStyle = { ...type.kicker, size: 15, weight: 700, fill: darken(base, 0.1), tracking: 0.08 };
      const len = measure(gl, es);
      if (gNode.x0 < 1 && gh > len + 20) labels.push(h('g', { transform: `translate(${inner.x - 12},${gy + gh / 2 + len / 2}) rotate(-90)` }, untracked(() => text(gl, 0, 0, es))));
      else if (gNode.x1 > inner.w - 1 && gh > len + 20) labels.push(h('g', { transform: `translate(${inner.x + inner.w + 12},${gy + gh / 2 - len / 2}) rotate(90)` }, untracked(() => text(gl, 0, 0, es))));
      else if (gNode.y1 > inner.h - 1 && gw > len + 20) labels.push(text(gl, gx + gw / 2, inner.y + inner.h + 22, es, 'middle'));
    }
  });
  return parts.join('') + labels.join('');
}

registerChart('treemap', render as never);
