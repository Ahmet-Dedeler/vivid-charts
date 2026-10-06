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
  /** Topical icons around the rim: refs, or { icon, angle (deg, 0 = top), size (× r), distance (× r), rotate }. */
  icons?: (string | { icon: string; angle?: number; size?: number; distance?: number; rotate?: number })[];
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
  // Area ∝ value; the largest bubble may use ~a full column width.
  let radius = areaScale(items.map((i) => i.value), cellW * 0.56, { ref: 'max', floor: l.minRadius ?? 4 });
  const color = l.color ?? pal.ramp[2];

  // Grid slots: row 0 holds `first` items from the left, then rows alternate
  // direction so consecutive items stay neighbours.
  const slots = items.map((_, i) => {
    if (i < first) return { row: 0, col: i };
    const k = i - first;
    const row = 1 + Math.floor(k / cols);
    const c = k % cols;
    return { row, col: row % 2 === 1 ? c : cols - 1 - c };
  });
  // Rows pack by their biggest bubble instead of an even grid, so the chain
  // stays tight (no dead bands between rows). Shrink everything if it overflows.
  const rowGap = cellW * 0.02;
  const rowHeights = () =>
    Array.from({ length: rows }, (_, r) => 2 * Math.max(...items.map((it, i) => (slots[i].row === r ? radius(it.value) : 0))) + rowGap);
  let heights = rowHeights();
  const total = heights.reduce((a, b) => a + b, 0);
  if (total > box.h) {
    const k = box.h / total;
    const base = radius;
    radius = (v: number) => base(v) * k;
    heights = rowHeights();
  }
  // Spread leftover height as extra row spacing (necks stretch a little), then center the rest.
  const spare = box.h - heights.reduce((a, b) => a + b, 0);
  const extra = rows > 1 ? Math.min(spare / (rows - 1), cellW * 0.12) : 0;
  const startY = box.y + Math.max(0, (spare - extra * (rows - 1)) / 2);
  const rowTop: number[] = [];
  heights.reduce((y, hgt, r) => ((rowTop[r] = y), y + hgt + extra), startY);
  const pos = items.map((it, i) => ({
    cx: box.x + cellW * (slots[i].col + 0.5),
    cy: rowTop[slots[i].row] + heights[slots[i].row] / 2,
    r: radius(it.value),
  }));

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
      parts.push(h('g', { clipPath: clip }, image(it.image, cx - r * 1.12, cy - r * 0.98, r * 2.24, r * 2.24, { focus: 'top', filter: photoFilter })));
      // A light shade at the bottom so the value reads without muddying the color.
      parts.push(h('circle', { cx, cy, r, fill: defs.linear([[0.55, '#000', 0], [1, '#000', 0.3]], 90) }));
    }

    // Value inside, near the bottom.
    const vs: TextStyle = { ...type.number, size: r * 0.42, fill: l.valueColor ?? '#ffffff' };
    const vy = cy + r * 0.52;
    parts.push(h('g', { filter: valueShadow }, runs(editorial(it.display ?? it.value, vs, l.format), cx, vy, vs, 'middle')));
    if (i === 0 && l.valueCaption) parts.push(text(l.valueCaption, cx, vy + r * 0.2, { ...type.label, size: r * 0.12, fill: '#fff', weight: 700 }, 'middle'));

    // Name on the curve, upper right.
    const ls: TextStyle = { ...type.label, size: Math.max(14, Math.min(30, r * 0.17)), fill: labelColor, weight: 700 };
    parts.push(arcText(it.label, cx, cy, r + ls.size! * 0.45, 34, ls));

    // Topical icons straddling the rim (half in, half out), clear of the name arc (0°–75°).
    const icons = (it.icons ?? []).map((ic) => (typeof ic === 'string' ? { icon: ic } : ic));
    const slotsDeg = [292, 248, 202, 148, 112];
    icons.slice(0, l.iconCount ?? 5).forEach((ic, k) => {
      const deg = ic.angle ?? slotsDeg[k % slotsDeg.length] + (rand(i * 7 + k) - 0.5) * 16;
      const ang = (deg * Math.PI) / 180;
      const size = Math.max(26, r * (ic.size ?? (k === 0 ? 0.42 : 0.3 + rand(i + k * 3) * 0.06)));
      const rr = r * (ic.distance ?? 0.98);
      const ix = cx + rr * Math.sin(ang) - size / 2;
      const iy = cy - rr * Math.cos(ang) - size / 2;
      parts.push(icon(ic.icon, ix, iy, size, iconColor, ic.rotate ?? (rand(i * 13 + k) - 0.5) * 36));
    });
    void mix;
    void capHeight;
  });
  return parts.join('');
}

registerChart('bubble-chain', render as never);
