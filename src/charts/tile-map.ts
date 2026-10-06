/**
 * tile-map: a grid cartogram. Each region gets one cell in a recognizable
 * grid; inside it a square whose AREA is proportional to |value|, colored by
 * sign (growth vs decline) or by a ramp. Big values overflow their cell, which
 * is exactly the point ("Texas and Florida account for half of all growth").
 *
 * The "U.S. Population Change by State" form. Fairer than a choropleth when
 * land area would mislead (Wyoming vs New Jersey). Built-in layout: 'us'.
 * Pass `layout` ({ key: [col, row] }) for any other geography.
 */
import { alpha, darken, onColor } from '../core/color.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { areaScale } from '../core/scale.js';
import { h } from '../core/svg.js';
import { capHeight, measure, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

/** U.S. grid (51 incl. DC), 12 columns × 9 rows, AK/HI tucked bottom-left. */
const US: Record<string, [number, number]> = {
  ME: [11, 0], WI: [6, 1], VT: [10, 1], NH: [11, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], IL: [6, 2], MI: [7, 2], NY: [9, 2], MA: [10, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IN: [6, 3], OH: [7, 3], PA: [8, 3], NJ: [9, 3], CT: [10, 3], RI: [11, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], DE: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5],
  OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  TX: [4, 7], FL: [9, 7],
  AK: [1, 7], HI: [1, 8],
};

export interface TileMapLayer extends LayerBase {
  type: 'tile-map';
  values: Record<string, number>;
  layout?: 'us' | Record<string, [number, number]>;
  format?: FormatOptions;
  positive?: string;
  negative?: string;
  /** Value whose square exactly fills a cell (default: 90th percentile of |values|). */
  refValue?: number;
  /** Draw faint cell backgrounds. */
  cells?: boolean;
  cellColor?: string;
  /** Labels in the squares: abbreviation + value. */
  labelSize?: number;
}

function render(l: TileMapLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const layout = l.layout && l.layout !== 'us' ? l.layout : US;
  const cols = Math.max(...Object.values(layout).map((p) => p[0])) + 1;
  const rows = Math.max(...Object.values(layout).map((p) => p[1])) + 1;
  const cell = Math.min(box.w / cols, box.h / rows);
  const ox = box.x + (box.w - cell * cols) / 2;
  // Top-aligned: free space goes below the grid (room for notes and stats).
  const oy = box.y;
  const pos = l.positive ?? '#3d9a4a';
  const neg = l.negative ?? '#ee6c1f';
  const absVals = Object.values(l.values).map(Math.abs);
  const r = areaScale(absVals, cell * 0.45, { ref: l.refValue ?? 'p90', floor: 2.5 });
  const parts: string[] = [];
  const labels: string[] = [];
  const entries = Object.entries(l.values).filter(([k]) => layout[k]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (l.cells !== false) {
    for (const [k, [c, rr]] of Object.entries(layout)) {
      void k;
      parts.push(h('rect', { x: ox + c * cell + 1, y: oy + rr * cell + 1, width: cell - 2, height: cell - 2, fill: l.cellColor ?? alpha(pal.ink, 0.04), stroke: alpha(pal.ink, 0.08), strokeWidth: 1 }));
    }
  }
  // Big squares first, so small neighbours stay visible on top.
  for (const [k, v] of entries) {
    const [c, rr] = layout[k];
    const half = r(Math.abs(v));
    const cx = ox + (c + 0.5) * cell;
    const cy = oy + (rr + 0.5) * cell;
    const fill = v >= 0 ? pos : neg;
    parts.push(h('rect', { x: cx - half, y: cy - half, width: half * 2, height: half * 2, fill, opacity: half > cell * 0.5 ? 0.9 : 1, filter: half > cell * 0.6 ? defs.shadow({ dy: 2, blur: 8, opacity: 0.15 }) : undefined }));
  }
  for (const [k, v] of entries) {
    const [c, rr] = layout[k];
    const half = r(Math.abs(v));
    const cx = ox + (c + 0.5) * cell;
    const cy = oy + (rr + 0.5) * cell;
    const fill = v >= 0 ? pos : neg;
    const base = l.labelSize ?? cell * 0.24;
    const big = half > cell * 0.6;
    const vs: TextStyle = { ...type.display, size: big ? Math.min(base * 3, half * 0.5) : base, fill: pal.ink, weight: type.display.weight };
    const ks: TextStyle = { ...type.label, size: big ? vs.size! * 0.38 : base * 0.78, fill: pal.ink, weight: 500 };
    const vr = editorial(v, vs, { ...l.format, style: 'plain' });
    const vw = measure(vr.map((x) => x.text).join(''), vs);
    const inside = half * 2 > vw + 6 && half * 2 > (vs.size! + ks.size!) * 1.05;
    const ink = inside ? onColor(fill, darken(pal.ink, 0.1), '#ffffff') : pal.ink;
    if (inside) {
      labels.push(runs(vr, cx, cy + (big ? -vs.size! * 0.05 : capHeight(vs) * 0.2), { ...vs, fill: ink }, 'middle'));
      labels.push(text(k, cx, cy + (big ? vs.size! * 0.45 : capHeight(vs) * 0.2 + ks.size! * 1.1), { ...ks, fill: ink }, 'middle'));
    } else {
      // Small square: value above, abbreviation below, in ink.
      labels.push(runs(vr, cx, cy - Math.max(half, 4) - 6, { ...vs, size: base * 0.85 }, 'middle'));
      labels.push(text(k, cx, cy + Math.max(half, 4) + ks.size! + 2, ks, 'middle'));
    }
  }
  return parts.join('') + labels.join('');
}

registerChart('tile-map', render as never);
