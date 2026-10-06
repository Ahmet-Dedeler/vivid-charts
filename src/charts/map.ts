/**
 * map: choropleth + labels + pins + bubbles on a world or U.S. states map.
 *
 * Covers "Mapped:" pieces: stepped choropleths with direct value labels on
 * each region, leader-line callouts for regions too small to label, a stepped
 * legend bar, HIGHEST/LOWEST tags, categorical (two-color) maps, numbered
 * teardrop pins, and proportional bubbles.
 *
 * Keys: world → ISO alpha-2, alpha-3, numeric, or English name. us-states →
 * postal code ("CA") or name.
 */
import { geoAlbersUsa, geoArea, geoCentroid, geoConicConformal, geoEqualEarth, geoMercator, geoPath, geoNaturalEarth1, type GeoProjection } from 'd3-geo';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { alpha, darken, mix, onColor, ramp } from '../core/color.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h, r2, rectPath } from '../core/svg.js';
import { capHeight, measure, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries') as {
  numericToAlpha2(n: string): string | undefined;
  alpha3ToAlpha2(a: string): string | undefined;
  getAlpha2Code(name: string, lang: string): string | undefined;
};

const US_POSTAL: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR',
  Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'Puerto Rico': 'PR',
};

export interface MapLayer extends LayerBase {
  type: 'map';
  map?: MapKind;
  projection?: 'equal-earth' | 'natural-earth' | 'mercator' | 'albers-usa' | 'conic';
  /** Numeric values per region key → stepped choropleth. */
  values?: Record<string, number>;
  /** Category per region key → categorical fill (colors from `categoryColors`). */
  categories?: Record<string, string>;
  categoryColors?: Record<string, string>;
  /** Step thresholds (ascending). Default: quantiles into 5 steps. */
  steps?: number[];
  colors?: string[];
  /** Fill for regions without data. */
  empty?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Draw "AK $97K" labels. 'auto' labels regions big enough; small ones get callouts (us-states). */
  labels?: boolean | 'auto';
  format?: FormatOptions;
  legend?: { title?: string; x?: number; y?: number; w?: number; h?: number; orientation?: 'vertical' | 'horizontal' } | false;
  /** Tag pills ("HIGHEST") with a leader to the region. `text` goes under the pill (\n for lines). */
  tags?: { key: string; label: string; text?: string; dx?: number; dy?: number }[];
  /**
   * Regions drawn in their own circle instead of on the main map (Hawaii, D.C.):
   * excluded from fitting, scaled to fill the circle, labelled with name + value.
   */
  insets?: { key: string; x: number; y: number; r: number; label?: 'above' | 'right' | 'none' }[];
  /** Clip the main map to this canvas rectangle (e.g. crop Arctic islands under the title). */
  clip?: Box;
  pins?: { lon: number; lat: number; label?: string; color?: string; size?: number }[];
  bubbles?: { lon: number; lat: number; value: number; label?: string; color?: string }[];
  /** Fit the projection to just these region keys (others still draw, possibly off-box). */
  fit?: string[];
  /** Crop to a lon/lat extent [[west, south], [east, north]]. */
  extent?: [[number, number], [number, number]];
  /** Exclude regions (e.g. Antarctica "AQ"). */
  exclude?: string[];
  shadow?: boolean;
}

type MapKind = 'world' | 'us-states' | 'us-canada';

const CA_NAME: Record<string, string> = {
  Alberta: 'AB', 'British Columbia': 'BC', Manitoba: 'MB', 'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS',
  'Northwest Territories': 'NT', Nunavut: 'NU', Ontario: 'ON', 'Prince Edward Island': 'PE', Quebec: 'QC', Québec: 'QC', Saskatchewan: 'SK', Yukon: 'YT',
};

function dataFile(name: string): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const f = path.join(dir, 'data', name);
    if (fs.existsSync(f)) return f;
    dir = path.dirname(dir);
  }
  throw new Error(`vivid: data file not found: ${name}`);
}

type Feat = { type: 'Feature'; id?: string; properties: { name: string }; geometry: any; key: string; label: string };

function loadFeatures(map: MapKind): Feat[] {
  if (map === 'us-states' || map === 'us-canada') {
    const topo = require('us-atlas/states-10m.json');
    const fc = feature(topo, topo.objects.states) as any;
    const us = fc.features.map((f: any) => ({ ...f, key: US_POSTAL[f.properties.name] ?? f.properties.name, label: US_POSTAL[f.properties.name] ?? f.properties.name }));
    if (map === 'us-states') return us;
    // Natural Earth 1:50m admin-1 (public domain), simplified, in data/.
    const ca = JSON.parse(fs.readFileSync(dataFile('canada-provinces.json'), 'utf8'));
    const cfc = feature(ca, ca.objects.provinces) as any;
    return [...us, ...cfc.features.map((f: any) => ({ ...f, key: f.properties.postal, label: f.properties.postal }))];
  }
  const topo = require('world-atlas/countries-50m.json');
  const fc = feature(topo, topo.objects.countries) as any;
  return fc.features.map((f: any) => {
    const a2 = (f.id && iso.numericToAlpha2(f.id)) || iso.getAlpha2Code(f.properties.name, 'en') || f.properties.name;
    return { ...f, key: a2, label: f.properties.name };
  });
}

function normKey(k: string, map: MapKind): string {
  if (map === 'us-states') return US_POSTAL[k] ?? k.toUpperCase();
  if (map === 'us-canada') return US_POSTAL[k] ?? CA_NAME[k] ?? k.toUpperCase();
  if (/^\d{3}$/.test(k)) return iso.numericToAlpha2(k) ?? k;
  if (/^[A-Za-z]{3}$/.test(k)) return iso.alpha3ToAlpha2(k.toUpperCase()) ?? k;
  if (/^[A-Za-z]{2}$/.test(k)) return k.toUpperCase();
  return iso.getAlpha2Code(k, 'en') ?? k;
}

function render(l: MapLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const map = l.map ?? 'world';
  const exclude = new Set((l.exclude ?? (map === 'world' ? ['AQ'] : [])).map((k) => normKey(k, map)));
  const insetKeys = new Set((l.insets ?? []).map((i) => normKey(i.key, map)));
  const all = loadFeatures(map).filter((f) => !exclude.has(f.key));
  const feats = all.filter((f) => !insetKeys.has(f.key));
  const fc = { type: 'FeatureCollection', features: feats } as any;

  const proj: GeoProjection =
    l.projection === 'mercator'
      ? geoMercator()
      : l.projection === 'natural-earth'
        ? geoNaturalEarth1()
        : l.projection === 'conic' || map === 'us-canada'
          ? geoConicConformal().parallels([40, 64]).rotate([98, 0])
          : map === 'us-states' || l.projection === 'albers-usa'
            ? (geoAlbersUsa() as unknown as GeoProjection)
            : geoEqualEarth();
  // Fit to a lon/lat box via a dense MultiPoint along its edges (polygon winding
  // on the sphere is easy to get backwards, which fits the whole globe instead).
  const fitTarget = l.extent
    ? (() => {
        const [[w, sth], [e, n]] = l.extent!;
        const pts: [number, number][] = [];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          pts.push([w + (e - w) * t, sth], [w + (e - w) * t, n], [w, sth + (n - sth) * t], [e, sth + (n - sth) * t]);
        }
        return { type: 'MultiPoint', coordinates: pts };
      })()
    : l.fit
      ? { type: 'FeatureCollection', features: feats.filter((f) => l.fit!.map((k) => normKey(k, map)).includes(f.key)) }
      : fc;
  proj.fitExtent([[box.x, box.y], [box.x + box.w, box.y + box.h]], fitTarget as any);
  const path = geoPath(proj);

  const values = Object.fromEntries(Object.entries(l.values ?? {}).map(([k, v]) => [normKey(k, map), v]));
  const cats = Object.fromEntries(Object.entries(l.categories ?? {}).map(([k, v]) => [normKey(k, map), v]));
  const vals = Object.values(values).sort((a, b) => a - b);
  const colors = l.colors ?? pal.ramp;
  const steps =
    l.steps ?? (vals.length ? Array.from({ length: colors.length - 1 }, (_, i) => vals[Math.floor(((i + 1) / colors.length) * vals.length)]) : []);
  const colorFor = (v: number) => {
    let i = 0;
    while (i < steps.length && v >= steps[i]) i++;
    return colors[Math.min(i, colors.length - 1)];
  };
  const catNames = [...new Set(Object.values(cats))];
  const catColor = (c: string) => l.categoryColors?.[c] ?? pal.cats[catNames.indexOf(c) % pal.cats.length];
  const empty = l.empty ?? mix(pal.bg, pal.ink, 0.12);
  const stroke = l.stroke ?? pal.bg;

  const parts: string[] = [];
  const regionPaths: string[] = [];
  for (const f of feats) {
    const d = path(f as any);
    if (!d) continue;
    const v = values[f.key];
    const c = cats[f.key];
    const fill = v !== undefined ? colorFor(v) : c !== undefined ? catColor(c) : empty;
    regionPaths.push(h('path', { d, fill, stroke, strokeWidth: l.strokeWidth ?? (map === 'world' ? 0.6 : 1), strokeLinejoin: 'round' }));
  }
  parts.push(h('g', { filter: l.shadow ? defs.shadow({ dy: 6, blur: 18, opacity: 0.25 }) : undefined, clipPath: l.clip ? defs.clipPath(rectPath(l.clip.x, l.clip.y, l.clip.w, l.clip.h, 0)) : undefined }, ...regionPaths));

  // Insets: each region in its own circle, fitted to ~60% of it.
  const insetCenters = new Map<string, [number, number, number]>();
  for (const ins of l.insets ?? []) {
    const key = normKey(ins.key, map);
    const f = all.find((x) => x.key === key);
    if (!f) continue;
    insetCenters.set(key, [ins.x, ins.y, ins.r]);
    const ip = geoMercator().fitExtent([[ins.x - ins.r * 0.62, ins.y - ins.r * 0.62], [ins.x + ins.r * 0.62, ins.y + ins.r * 0.62]], f as any);
    const v = values[f.key];
    const fill = v !== undefined ? colorFor(v) : empty;
    parts.push(h('circle', { cx: ins.x, cy: ins.y, r: ins.r, fill: pal.bg, stroke: alpha(pal.ink, 0.55), strokeWidth: 1.5 }));
    parts.push(h('path', { d: geoPath(ip)(f as any) ?? '', fill, stroke, strokeWidth: 0.8 }));
    if (ins.label !== 'none' && v !== undefined) {
      const ls: TextStyle = { ...type.label, size: 20, weight: 500, fill: pal.ink };
      const vs: TextStyle = { ...type.number, size: 24, italic: false, fill: pal.ink };
      if (ins.label === 'right') {
        parts.push(text(f.label, ins.x + ins.r + 14, ins.y - 4, ls));
        parts.push(runs(editorial(v, vs, { ...l.format, style: 'plain' }), ins.x + ins.r + 14, ins.y + 24, vs));
      } else {
        parts.push(text(f.label, ins.x, ins.y - ins.r - 40, ls, 'middle'));
        parts.push(runs(editorial(v, vs, { ...l.format, style: 'plain' }), ins.x, ins.y - ins.r - 12, vs, 'middle'));
      }
    }
  }

  // Labels: abbreviation + value at the centroid, or a callout when the region is tiny.
  if (l.labels && Object.keys(values).length) {
    const ls: TextStyle = { ...type.label, size: map === 'us-states' ? 20 : map === 'us-canada' ? 16 : 15, weight: 500 };
    const vs: TextStyle = { ...type.number, size: map === 'us-states' ? 22 : map === 'us-canada' ? 18 : 16, italic: false };
    const callouts: { f: Feat; c: [number, number] }[] = [];
    for (const f of feats) {
      const v = values[f.key];
      if (v === undefined) continue;
      const c = path.centroid(f as any) as [number, number];
      if (!isFinite(c[0])) continue;
      const b = path.bounds(f as any);
      const w = b[1][0] - b[0][0];
      const hh = b[1][1] - b[0][1];
      // Try full size, then a compact size, before giving up and using a callout.
      let placed = false;
      for (const k of [1, 0.74]) {
        const lsk = { ...ls, size: ls.size! * k };
        const vsk = { ...vs, size: vs.size! * k };
        const vRuns = editorial(v, vsk, { ...l.format, style: 'plain' });
        const need = Math.max(measure(f.label, lsk), measure(vRuns.map((r) => r.text).join(''), vsk));
        if (w > need + 4 && hh > (lsk.size! + vsk.size!) * 1.05) {
          const fill = onColor(colorFor(v), '#111', '#fff');
          parts.push(text(f.label, c[0], c[1] - 3 * k, { ...lsk, fill }, 'middle'));
          parts.push(runs(vRuns, c[0], c[1] + vsk.size! * 0.95, { ...vsk, fill }, 'middle'));
          placed = true;
          break;
        }
      }
      if (!placed && map !== 'world') callouts.push({ f, c });
    }
    // Stack callouts in a column to the right of the map, sorted top→bottom.
    callouts.sort((a, b) => a.c[1] - b.c[1]);
    const colX = box.x + box.w + 26;
    const startY = Math.min(...callouts.map((c) => c.c[1])) - 10;
    const step = Math.max(34, Math.min(42, (box.y + box.h - startY) / Math.max(1, callouts.length)));
    callouts.forEach(({ f, c }, i) => {
      const ty = startY + i * step;
      parts.push(h('path', { d: `M${r2(c[0])},${r2(c[1])}C${r2(c[0] + 40)},${r2(c[1])} ${r2(colX - 40)},${r2(ty)} ${r2(colX - 6)},${r2(ty)}`, fill: 'none', stroke: pal.ink, strokeWidth: 1.2, strokeOpacity: 0.8 }));
      parts.push(h('circle', { cx: c[0], cy: c[1], r: 4, fill: '#fff', stroke: pal.bg, strokeWidth: 1 }));
      parts.push(text(f.label, colX, ty + capHeight(ls) / 2, { ...ls, fill: pal.ink }));
      parts.push(runs(editorial(values[f.key], vs, { ...l.format, style: 'plain' }), colX + 44, ty + capHeight(vs) / 2, { ...vs, fill: pal.ink }));
    });
  }

  // HIGHEST / LOWEST tags: pill, optional caption lines under it, leader to the region (or its inset).
  for (const tg of l.tags ?? []) {
    const key = normKey(tg.key, map);
    const f = all.find((x) => x.key === key);
    if (!f) continue;
    const inset = insetCenters.get(key);
    const c0: [number, number] = inset ? [inset[0], inset[1] - inset[2]] : (path.centroid(f as any) as [number, number]);
    const c: [number, number] = [c0[0] + (tg.dx ?? 0), c0[1] + (tg.dy ?? -72)];
    const ts: TextStyle = { ...type.label, size: 24, weight: 800, upper: true, tracking: 0.06, fill: pal.bg };
    const w = measure(tg.label, ts) + 28;
    const lines = tg.text ? tg.text.split('\n') : [];
    const capS: TextStyle = { ...type.label, size: 22, weight: 500, fill: pal.ink, upper: true };
    const valS: TextStyle = { ...type.number, size: 26, italic: false, fill: pal.ink };
    const blockBottom = c[1] + 19 + lines.length * 28;
    // Leader from the nearest edge of the tag block to the region.
    const fromY = c0[1] > c[1] ? blockBottom + 4 : c[1] - 22;
    if (!inset || tg.dx || tg.dy) parts.push(h('path', { d: `M${r2(c[0])},${r2(fromY)}L${r2(c0[0])},${r2(c0[1])}`, stroke: pal.ink, strokeWidth: 1.6 }));
    if (!inset) parts.push(h('circle', { cx: c0[0], cy: c0[1], r: 4, fill: pal.ink, stroke: pal.bg, strokeWidth: 1.5 }));
    parts.push(h('path', { d: rectPath(c[0] - w / 2, c[1] - 19, w, 38, 3), fill: pal.ink }));
    parts.push(text(tg.label, c[0], c[1] + capHeight(ts) / 2, ts, 'middle'));
    lines.forEach((ln, i) => {
      const isValue = /^[$€£\d]/.test(ln);
      parts.push(text(ln, c[0], c[1] + 19 + 30 + i * 30, isValue ? valS : capS, 'middle'));
    });
  }

  // Bubbles.
  if (l.bubbles?.length) {
    const bmax = Math.max(...l.bubbles.map((b) => b.value));
    const R = Math.min(box.w, box.h) * 0.07;
    const sorted = [...l.bubbles].sort((a, b) => b.value - a.value);
    for (const b of sorted) {
      const p = proj([b.lon, b.lat]);
      if (!p) continue;
      const r = R * Math.sqrt(b.value / bmax);
      const c = b.color ?? pal.accent;
      parts.push(h('circle', { cx: p[0], cy: p[1], r, fill: alpha(c, 0.78), stroke: darken(c, 0.15), strokeWidth: 1.5 }));
      if (b.label && r > 18) parts.push(text(b.label, p[0], p[1] + 5, { ...type.label, size: Math.min(22, r * 0.5), fill: onColor(c) }, 'middle'));
    }
  }

  // Teardrop pins with labels (rank numbers).
  for (const pin of l.pins ?? []) {
    const p = proj([pin.lon, pin.lat]);
    if (!p) continue;
    const s = pin.size ?? 22;
    const c = pin.color ?? pal.accent;
    const [x, y] = p;
    const d = `M${x},${y}C${x - s * 0.2},${y - s * 0.7} ${x - s},${y - s * 1.1} ${x - s},${y - s * 1.8}A${s},${s} 0 1 1 ${x + s},${y - s * 1.8}C${x + s},${y - s * 1.1} ${x + s * 0.2},${y - s * 0.7} ${x},${y}Z`;
    parts.push(h('path', { d, fill: c, stroke: darken(c, 0.35), strokeWidth: 2 }));
    if (pin.label) parts.push(text(pin.label, x, y - s * 1.8 + capHeight({ ...type.number, size: s * 1.05 }) / 2, { ...type.number, size: s * 1.05, fill: onColor(c), italic: false }, 'middle'));
  }

  // Stepped legend bar.
  if (l.legend !== false && Object.keys(values).length) {
    const lg = l.legend || {};
    const vertical = lg.orientation !== 'horizontal';
    const lx = lg.x ?? box.x + box.w - 90;
    const ly = lg.y ?? box.y;
    const lw = lg.w ?? (vertical ? 80 : 420);
    const lh = lg.h ?? (vertical ? 560 : 30);
    const n = colors.length;
    const ls: TextStyle = { ...type.number, size: 24, fill: pal.ink, italic: false };
    if (lg.title) parts.push(text(lg.title, lx + lw, ly - 24, { ...type.kicker, size: 22, fill: pal.ink, weight: 700 }, 'end'));
    for (let i = 0; i < n; i++) {
      // Vertical legends read high → low from the top, like the maps they sit beside.
      const ci = vertical ? n - 1 - i : i;
      const seg = vertical ? { x: lx, y: ly + (lh / n) * i, w: lw, h: lh / n - 4 } : { x: lx + (lw / n) * i, y: ly, w: lw / n - 3, h: lh };
      parts.push(h('rect', { x: seg.x, y: seg.y, width: seg.w, height: seg.h, fill: colors[ci] }));
      const lo = ci === 0 ? vals[0] : steps[ci - 1];
      if (lo === undefined) continue;
      const label = editorial(lo, ls, { ...l.format, style: 'plain', decimals: 0 });
      if (vertical) parts.push(runs([...label, ...(ci === n - 1 ? [{ text: '+' }] : [])], seg.x - 14, seg.y + seg.h * 0.75, ls, 'end'));
      else parts.push(runs(label, seg.x, seg.y + seg.h + 28, { ...ls, size: 20 }, 'start'));
    }
  }
  void geoArea;
  void geoCentroid;
  void ramp;
  return parts.join('');
}

registerChart('map', render as never);
