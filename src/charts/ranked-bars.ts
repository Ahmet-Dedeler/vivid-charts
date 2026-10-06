/**
 * ranked-bars: the workhorse ranking chart, done properly.
 *
 * Covers most "Ranked: the world's X" pieces: name + role labels, rank
 * numbers, flags, avatar photos (at the start or riding the bar tip),
 * category colors, pill/rounded/tab bars, gradient / ramp / hatch /
 * banknote fills, editorial value labels with a raised currency symbol, a
 * column header, and the "bleed" variant where bars run in from the canvas
 * edge.
 *
 * Pair with an `image` layer (hero photo, grayscale, faded) and a title
 * lockup in the empty space to the right of the short bars. That's the
 * classic composition.
 */
import { scaleLinear } from 'd3-scale';
import { alpha, darken, lighten, mix, onColor, ramp } from '../core/color.js';
import { avatar, flag, icon, image } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, rectPath } from '../core/svg.js';
import { capHeight, measure, measureRuns, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface RankedItem {
  label: string;
  sub?: string;
  value: number;
  /** Preformatted value label, overrides format. */
  display?: string;
  color?: string;
  category?: string;
  image?: string;
  flag?: string;
  icon?: string;
  /** Logo / brand image drawn next to the value. */
  logo?: string;
  highlight?: boolean;
  /** Small italic note under/after the value. */
  note?: string;
}

export interface RankedBarsLayer extends LayerBase {
  type: 'ranked-bars';
  items: RankedItem[];
  sort?: 'desc' | 'asc' | 'none';
  max?: number;
  format?: FormatOptions;
  /** Where name labels go. */
  labels?: 'left' | 'inside' | 'tip';
  labelAlign?: 'start' | 'end';
  rank?: boolean;
  flags?: boolean;
  avatars?: 'left' | 'tip' | 'none';
  avatarRing?: string;
  avatarFilter?: 'grayscale' | 'duotone' | 'none';
  bar?: {
    shape?: 'rounded' | 'pill' | 'flat' | 'tab';
    /** Bar thickness as a fraction of row height. */
    thickness?: number;
    fill?: 'solid' | 'gradient' | 'ramp' | 'hatch' | 'guilloche' | 'glass';
    color?: string;
    /** Draw the track (full-width faint bar) behind each bar. */
    track?: boolean | string;
    shadow?: boolean;
    /** Alternate a lighter shade on every other bar. */
    zebra?: boolean;
  };
  value?: { position?: 'outside' | 'inside'; size?: number; color?: string; style?: 'editorial' | 'plain'; family?: string; /** Scale label size with the value (top values read bigger). */ grow?: boolean };
  header?: string;
  /** true: solid baseline. 'shadow': baseline with a soft shadow, bars look like they slide out from a wall. */
  axis?: boolean | 'shadow';
  /** Bars start at the canvas left edge. */
  bleed?: boolean;
  categories?: Record<string, string>;
  labelSize?: number;
  labelColor?: string;
  subColor?: string;
  highlightColor?: string;
}

function render(l: RankedBarsLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const items = [...l.items];
  if (l.sort !== 'none') items.sort((a, b) => (l.sort === 'asc' ? a.value - b.value : b.value - a.value));
  const n = items.length;
  if (!n) return '';

  const bar = { shape: 'rounded', thickness: 0.56, fill: 'solid', ...l.bar } as Required<NonNullable<RankedBarsLayer['bar']>>;
  const labelsAt = l.labels ?? 'left';
  const avatars = l.avatars ?? (items.some((i) => i.image) ? 'left' : 'none');
  const rowH = box.h / n;
  const barH = rowH * bar.thickness;
  const labelSize = l.labelSize ?? Math.max(12, Math.min(30, rowH * (items.some((i) => i.sub) ? 0.34 : 0.46)));
  const subSize = labelSize * 0.8;
  const valueSize = l.value?.size ?? Math.max(13, Math.min(46, rowH * 0.52));
  const labelStyle: TextStyle = { ...type.label, size: labelSize, fill: l.labelColor ?? pal.ink };
  const subStyle: TextStyle = { ...type.body, size: subSize, fill: l.subColor ?? pal.muted };
  const valueStyle: TextStyle = { ...type.number, size: valueSize, fill: l.value?.color ?? (bar.color || pal.accent), ...(l.value?.family ? { family: l.value.family } : {}) };
  const catColors = l.categories ?? {};
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  cats.forEach((c, i) => (catColors[c] ??= pal.cats[i % pal.cats.length]));
  const baseColor = bar.color ?? pal.accent;
  const rampColors = ramp(lighten(baseColor, 0.25), darken(baseColor, 0.12), n);

  const colorOf = (it: RankedItem, i: number) =>
    it.color ?? (it.category ? catColors[it.category] : bar.fill === 'ramp' ? rampColors[i] : it.highlight && l.highlightColor ? l.highlightColor : baseColor);

  // ── column widths ──
  const rankW = l.rank ? measure(String(n), { ...labelStyle, weight: 800 }) + labelSize * 0.5 : 0;
  const flagR = l.flags ? Math.min(rowH * 0.32, labelSize * 0.62) : 0;
  const avatarR = avatars !== 'none' ? Math.min(rowH * 0.46, barH * 0.95) : 0;
  const labelW = labelsAt === 'left' ? Math.max(...items.map((it) => Math.max(measure(it.label, labelStyle), it.sub ? measure(it.sub, subStyle) : 0))) : 0;
  const gap = labelSize * 0.7;
  let x0 = box.x + (labelsAt === 'left' ? rankW + labelW + gap + (flagR ? flagR * 2 + gap * 0.6 : 0) + (avatars === 'left' ? avatarR * 2 + gap * 0.6 : 0) : 0);
  if (l.bleed) x0 = 0;
  const valueRuns = (it: RankedItem) => editorial(it.display ?? it.value, valueStyle, { ...l.format, style: l.value?.style });
  const valueW = Math.max(...items.map((it) => measureRuns(valueRuns(it), valueStyle)));
  const tipLabelW = labelsAt === 'tip' ? Math.max(...items.map((it) => measure(it.label, labelStyle) + (it.sub ? 0 : 0))) + gap : 0;
  const logoW = items.some((i) => i.logo) ? rowH * 2.2 : 0;
  const reserve = (l.value?.position === 'inside' ? 0 : valueW + gap) + (avatars === 'tip' ? avatarR * 2 + gap * 0.5 : 0) + tipLabelW + logoW;
  const xMax = box.x + box.w - reserve;
  const max = l.max ?? Math.max(...items.map((i) => i.value));
  const x = scaleLinear().domain([0, max]).range([0, Math.max(10, xMax - x0)]);

  const parts: string[] = [];
  if (l.header) {
    const hs: TextStyle = { ...type.note, size: labelSize * 0.9, fill: valueStyle.fill, weight: 700 };
    const topEnd = x0 + x(items[0].value) + gap + valueW;
    parts.push(text(l.header, Math.min(box.x + box.w, topEnd), box.y - labelSize * 0.6, hs, 'end'));
  }
  if (l.axis === 'shadow') {
    parts.push(h('rect', { x: x0 - 26, y: box.y, width: 26, height: box.h, fill: defs.linear([[0, pal.ink, 0], [1, pal.ink, 0.1]], 0) }));
  } else if (l.axis) parts.push(h('rect', { x: x0 - 1.5, y: box.y, width: 3, height: box.h, fill: pal.ink }));

  items.forEach((it, i) => {
    const cy = box.y + rowH * (i + 0.5);
    const w = Math.max(barH * (bar.shape === 'pill' ? 1 : 0.2), x(it.value));
    const by = cy - barH / 2;
    const col = colorOf(it, i);
    const radius = bar.shape === 'pill' ? barH / 2 : bar.shape === 'rounded' ? Math.min(6, barH * 0.22) : bar.shape === 'tab' ? barH * 0.45 : 0;
    const corners: [number, number, number, number] = bar.shape === 'tab' ? [radius, radius, radius, 0] : l.bleed ? [0, radius, radius, 0] : bar.shape === 'pill' ? [radius, radius, radius, radius] : [0, radius, radius, 0];

    if (bar.track) parts.push(h('path', { d: rectPath(x0, by, xMax - x0, barH, corners), fill: typeof bar.track === 'string' ? bar.track : alpha(pal.ink, 0.06) }));

    let fill: string = col;
    if (bar.fill === 'gradient') fill = defs.linear([[0, darken(col, 0.18)], [1, col]], 0);
    if (bar.fill === 'glass') fill = defs.linear([[0, lighten(col, 0.12)], [0.5, col], [1, darken(col, 0.1)]], 90);
    if (bar.fill === 'hatch') fill = defs.hatch(darken(col, 0.25), { gap: 6, width: 2, bg: col });
    if (bar.fill === 'guilloche') fill = defs.guilloche(col, { bg: mix(col, pal.bg, 0.85), scale: barH / 40 });
    if (bar.zebra && i % 2) fill = mix(col, pal.bg, 0.18);
    const filter = bar.shadow ? defs.shadow({ dy: barH * 0.12, blur: barH * 0.35, opacity: 0.28 }) : undefined;
    parts.push(h('path', { d: rectPath(x0, by, w, barH, corners), fill, filter, stroke: bar.fill === 'guilloche' ? col : undefined, strokeWidth: bar.fill === 'guilloche' ? 2 : undefined }));
    if (it.highlight && !l.highlightColor) parts.push(h('path', { d: rectPath(x0, by, w, barH, corners), fill: 'none', stroke: pal.ink, strokeWidth: 2.5 }));

    // ── left column: rank, flag, avatar, labels ──
    if (labelsAt === 'left') {
      let lx = x0 - gap;
      if (avatars === 'left') {
        parts.push(avatar(defs, it.image, lx - avatarR, cy, avatarR, { ring: l.avatarRing ?? col, filter: filterFor(l, ctx) }));
        lx -= avatarR * 2 + gap * 0.6;
      }
      if (l.flags && it.flag) {
        parts.push(flag(defs, it.flag, lx - flagR, cy, flagR));
        lx -= flagR * 2 + gap * 0.6;
      }
      const align = l.labelAlign ?? 'end';
      const tx = align === 'end' ? lx : box.x + rankW;
      if (it.sub) {
        parts.push(text(it.label, tx, cy - labelSize * 0.12, labelStyle, align));
        parts.push(text(it.sub, tx, cy + subSize * 0.98, subStyle, align));
      } else parts.push(text(it.label, tx, cy + capHeight(labelStyle) / 2, labelStyle, align));
      if (l.rank) parts.push(text(String(i + 1), align === 'end' ? tx - Math.max(measure(it.label, labelStyle), it.sub ? measure(it.sub, subStyle) : 0) - labelSize * 0.35 : box.x, cy + capHeight(labelStyle) / 2, { ...labelStyle, weight: 800 }, align === 'end' ? 'end' : 'start'));
    }

    if (labelsAt === 'inside') {
      const ins: TextStyle = { ...labelStyle, fill: onColor(col), size: Math.min(labelSize, barH * 0.62) };
      let lx = x0 + barH * 0.45;
      if (l.bleed) lx = box.x;
      if (l.flags && it.flag) {
        const fr = barH * 0.42;
        parts.push(flag(defs, it.flag, (l.bleed ? box.x : x0) - fr - 8, cy, fr));
      }
      const label = l.rank ? `${i + 1}  ${it.label}` : it.label;
      parts.push(text(label, lx, cy + capHeight(ins) / 2, ins));
    }

    // ── tip: avatar riding the bar end, then value, then name ──
    let vx = x0 + w + gap * 0.7;
    if (avatars === 'tip') {
      const ar = Math.min(rowH * 0.48, barH * 0.62 + rowH * 0.12);
      parts.push(avatar(defs, it.image, x0 + w + ar * 0.15, cy, ar, { ring: l.avatarRing ?? pal.bg, ringWidth: ar * 0.12, filter: filterFor(l, ctx) }));
      vx = x0 + w + ar * 1.4;
      if (it.sub && labelsAt !== 'left') {
        const ss: TextStyle = { ...subStyle, fill: onColor(col, alpha(pal.ink, 0.7), alpha('#fff', 0.8)), italic: true, size: subSize * 0.95 };
        parts.push(text(it.sub, x0 + w - ar - gap * 0.5, cy + capHeight(ss) / 2, ss, 'end'));
      }
    }
    if (l.value?.position === 'inside') {
      const vs = { ...valueStyle, fill: onColor(col), size: Math.min(valueSize, barH * 0.7) };
      parts.push(runs(valueRuns(it), x0 + w - barH * 0.4, cy + capHeight(vs) / 2, vs, 'end'));
    } else {
      const k = l.value?.grow ? 0.78 + 0.42 * (it.value / max) : 1;
      const vsz = { ...valueStyle, size: valueSize * k };
      const vr = editorial(it.display ?? it.value, vsz, { ...l.format, style: l.value?.style });
      parts.push(runs(vr, vx, cy + capHeight(vsz) / 2, vsz));
      vx += measureRuns(vr, vsz) + gap * 0.6;
    }
    if (labelsAt === 'tip') {
      parts.push(text(it.label, vx, cy + capHeight(labelStyle) / 2, labelStyle));
      vx += measure(it.label, labelStyle) + gap * 0.5;
    }
    if (it.logo) {
      parts.push(image(it.logo, vx, cy - rowH * 0.3, rowH * 2, rowH * 0.6, { fit: 'contain' }));
      vx += rowH * 2.2;
    }
    if (it.icon) parts.push(icon(it.icon, vx, cy - valueSize * 0.5, valueSize, col));
    if (it.note) {
      const ns: TextStyle = { ...type.note, size: subSize, fill: pal.muted };
      parts.push(text(it.note, vx, cy + capHeight(ns) / 2, ns));
    }
  });
  if (l.axis === 'shadow') parts.push(h('rect', { x: x0, y: box.y, width: 18, height: box.h, fill: defs.linear([[0, '#000', 0.28], [1, '#000', 0]], 0) }));
  return parts.join('');
}

function filterFor(l: RankedBarsLayer, ctx: Ctx) {
  if (l.avatarFilter === 'grayscale') return ctx.defs.grayscale();
  if (l.avatarFilter === 'duotone') return ctx.defs.duotone(ctx.pal.ramp[ctx.pal.ramp.length - 1], ctx.pal.ramp[0]);
  return undefined;
}

registerChart('ranked-bars', render as never);
