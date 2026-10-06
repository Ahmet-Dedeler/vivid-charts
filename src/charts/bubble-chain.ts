/**
 * bubble-chain: portraits in circles sized by value, joined by gooey
 * metaball necks in a snake path, names set on the circle's curve, the value
 * big inside, and little topical icons orbiting each bubble.
 *
 * The "Richest Music Artists" form. Works for any short ranking (6–14 items)
 * of people, brands or places where faces/logos carry the story.
 */
import { darken, lighten, mix } from '../core/color.js';
import { capsule, icon, image, metaball } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h } from '../core/svg.js';
import { areaScale } from '../core/scale.js';
import { arcText, capHeight, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface BubbleItem {
  label: string;
  value: number;
  display?: string;
  image?: string;
  /** Icons scattered around the bubble (icon:set:name). Repeats if fewer than iconCount. */
  icons?: string[];
  color?: string;
  sublabel?: string;
}

export interface BubbleChainLayer extends LayerBase {
  type: 'bubble-chain';
  items: BubbleItem[];
  columns?: number;
  /** Items in the first row (leave room for a title on the right). */
  firstRow?: number;
  format?: FormatOptions;
  color?: string;
  /** Photo treatment. duotone uses [dark, light]. */
  photo?: 'duotone' | 'grayscale' | 'color';
  duotone?: [string, string];
  connector?: 'metaball' | 'capsule' | 'none';
  iconColor?: string;
  iconCount?: number;
  labelColor?: string;
  valueColor?: string;
  /** Small caption under the first value ("Net Worth"). */
  valueCaption?: string;
  /** Visibility floor in px only. Never use it to even out sizes: area must stay proportional. */
  minRadius?: number;
  sort?: boolean;
}

/** Deterministic jitter so renders are stable. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function render(l: BubbleChainLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const items = l.sort === false ? [...l.items] : [...l.items].sort((a, b) => b.value - a.value);
  const cols = l.columns ?? 3;
  const first = l.firstRow ?? 1;
  const rest = items.length - first;
  const rows = 1 + Math.ceil(rest / cols);
  const cellW = box.w / cols;
  const cellH = box.h / rows;
  const maxR = Math.min(cellW, cellH) * 0.5 * 1.04;
  const max = items[0]?.value ?? 1;
  // Area ∝ value. The largest item fills its cell; nothing is clamped up.
  const radius = areaScale(items.map((i) => i.value), maxR, { ref: 'max', floor: l.minRadius ?? 4 });
  const color = l.color ?? pal.ramp[2];

  // Snake positions: row 0 holds `first` items from the left, then rows
  // alternate direction so consecutive items stay neighbours.
  const pos: { cx: number; cy: number; r: number }[] = [];
  items.forEach((it, i) => {
    let row: number;
    let col: number;
    if (i < first) {
      row = 0;
      col = i;
    } else {
      const k = i - first;
      row = 1 + Math.floor(k / cols);
      const c = k % cols;
      col = row % 2 === 1 ? c : cols - 1 - c;
    }
    const r = radius(it.value);
    // Nudge small bubbles toward the row's baseline so the chain undulates.
    const jitterY = (rand(i + 3) - 0.5) * cellH * 0.12;
    pos.push({ cx: box.x + cellW * (col + 0.5), cy: box.y + cellH * (row + 0.5) + jitterY, r });
  });

  const parts: string[] = [];
  const connector = l.connector ?? 'metaball';
  // Necks first so circles sit on top.
  for (let i = 0; i < pos.length - 1; i++) {
    const a = pos[i];
    const b = pos[i + 1];
    const fill = items[i].color ?? color;
    if (connector === 'metaball') {
      // Metaball gives the gooey shoulders; a capsule underneath guarantees a
      // minimum neck width when bubbles are far apart.
      const d = metaball([a.cx, a.cy], a.r, [b.cx, b.cy], b.r, 0.55, 2.4, Infinity);
      parts.push(h('path', { d: capsule([a.cx, a.cy], [b.cx, b.cy], Math.min(a.r, b.r) * 0.34), fill }));
      if (d) parts.push(h('path', { d, fill }));
    } else if (connector === 'capsule') {
      parts.push(h('path', { d: capsule([a.cx, a.cy], [b.cx, b.cy], Math.min(a.r, b.r) * 0.28), fill }));
    }
  }

  const [duoDark, duoLight] = l.duotone ?? [darken(color, 0.38), lighten(color, 0.12)];
  const photoFilter = l.photo === 'grayscale' ? defs.grayscale(1.2) : l.photo === 'color' ? undefined : defs.duotone(duoDark, duoLight, 1.25);
  const valueShadow = defs.shadow({ dy: 2, blur: 6, opacity: 0.55 });
  const iconColor = l.iconColor ?? pal.accent;
  const labelColor = l.labelColor ?? pal.accent;

  items.forEach((it, i) => {
    const { cx, cy, r } = pos[i];
    const fill = it.color ?? color;
    const clip = defs.clipCircle(cx, cy, r);
    parts.push(h('circle', { cx, cy, r, fill }));
    if (it.image) {
      // Slightly oversized and top-anchored so heads fill the circle and shoulders run off the bottom edge.
      parts.push(h('g', { clipPath: clip }, image(it.image, cx - r * 1.05, cy - r * 0.92, r * 2.1, r * 2.1, { focus: 'top', filter: photoFilter })));
      // Darken the bottom third so the value reads on any photo.
      parts.push(h('circle', { cx, cy, r, fill: defs.linear([[0.45, '#000', 0], [1, '#000', 0.55]], 90) }));
    }

    // Value inside, near the bottom.
    const vs: TextStyle = { ...type.number, size: r * 0.42, fill: l.valueColor ?? '#ffffff' };
    const vy = cy + r * 0.52;
    parts.push(h('g', { filter: valueShadow }, runs(editorial(it.display ?? it.value, vs, l.format), cx, vy, vs, 'middle')));
    if (i === 0 && l.valueCaption) parts.push(text(l.valueCaption, cx, vy + r * 0.2, { ...type.label, size: r * 0.12, fill: '#fff', weight: 700 }, 'middle'));

    // Name on the curve, upper right.
    const ls: TextStyle = { ...type.label, size: Math.max(14, Math.min(30, r * 0.17)), fill: labelColor, weight: 700 };
    parts.push(arcText(it.label, cx, cy, r + ls.size! * 0.45, 34, ls));

    // Orbiting icons: avoid the label arc (roughly 0°..70°).
    const icons = it.icons ?? [];
    if (icons.length) {
      const count = l.iconCount ?? Math.min(4, Math.max(2, icons.length));
      const angles = [292, 228, 128, 168, 258];
      for (let k = 0; k < count; k++) {
        const ang = ((angles[k % angles.length] + (rand(i * 7 + k) - 0.5) * 24) * Math.PI) / 180;
        const size = Math.max(22, r * (k === 0 ? 0.4 : 0.27 + rand(i + k * 3) * 0.08));
        const rr = r * (0.98 + rand(k + i) * 0.12);
        const ix = cx + rr * Math.sin(ang) - size / 2;
        const iy = cy - rr * Math.cos(ang) - size / 2;
        parts.push(icon(icons[k % icons.length], ix, iy, size, iconColor, (rand(i * 13 + k) - 0.5) * 40));
      }
    }
    void mix;
    void capHeight;
  });
  return parts.join('');
}

registerChart('bubble-chain', render as never);
