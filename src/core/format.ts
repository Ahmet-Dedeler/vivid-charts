/**
 * Number formatting in the editorial style: "$7.1B", "850M", "41.3K", "26%".
 *
 * `valueRuns()` splits a formatted value into typographic runs so the
 * currency symbol is small and raised and the unit letter is smaller than the
 * digits ("ˢ7.1ʙ"). That one detail does a lot to make a chart read as
 * designed rather than generated.
 */
import type { Run, TextStyle } from './text.js';

export interface FormatOptions {
  prefix?: string; // "$"
  suffix?: string; // "%", " yrs"
  /** Fixed decimals. Default: smart (1 decimal below 100, none above). */
  decimals?: number;
  /** Compact with K/M/B/T. Default true. */
  compact?: boolean;
  /** Multiply before formatting (e.g. 1e9 if data is in billions and you want "B"). */
  scale?: number;
}

const UNITS: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

export function smartDecimals(v: number): number {
  const a = Math.abs(v);
  if (a === 0) return 0;
  if (a < 10) return 1;
  if (a < 100) return 1;
  return 0;
}

/** Split a value into number + unit parts. */
export function parts(value: number, opts: FormatOptions = {}): { prefix: string; num: string; unit: string; suffix: string } {
  const v = value * (opts.scale ?? 1);
  let unit = '';
  let n = v;
  if (opts.compact !== false) {
    for (const [div, u] of UNITS) {
      if (Math.abs(v) >= div) {
        n = v / div;
        unit = u;
        break;
      }
    }
  }
  const dec = opts.decimals ?? (unit ? (Math.abs(n) < 100 ? 1 : 0) : smartDecimals(n));
  let num = n.toFixed(dec);
  if (!unit && Math.abs(n) >= 1000) num = Number(num).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return { prefix: opts.prefix ?? '', num, unit, suffix: opts.suffix ?? '' };
}

export function format(value: number, opts: FormatOptions = {}): string {
  const p = parts(value, opts);
  return `${p.prefix}${p.num}${p.unit}${p.suffix}`;
}

/**
 * Editorial value label runs. The prefix symbol is ~55% size and raised to
 * the cap line; the unit is ~72% size on the baseline.
 */
export function valueRuns(value: number | string, opts: FormatOptions & { style?: 'editorial' | 'plain' } = {}, base: TextStyle = {}): Run[] {
  if (typeof value === 'string') return stringRuns(value, opts.style ?? 'editorial');
  const p = parts(value, opts);
  if (opts.style === 'plain') return [{ text: `${p.prefix}${p.num}${p.unit}${p.suffix}` }];
  const list: Run[] = [];
  if (p.prefix) list.push({ text: p.prefix, size: (base.size ?? 16) * 0.55, dy: -0.75 });
  list.push({ text: p.num });
  if (p.unit) list.push({ text: p.unit, size: (base.size ?? 16) * 0.72 });
  if (p.suffix) list.push({ text: p.suffix, size: (base.size ?? 16) * (p.suffix.trim().length > 1 ? 0.6 : 0.72) });
  return list.map((r) => (r.size ? r : { ...r, size: base.size }));
}

/** Parse an already formatted string like "$2.8B" into editorial runs. */
function stringRuns(str: string, mode: 'editorial' | 'plain'): Run[] {
  if (mode === 'plain') return [{ text: str }];
  const m = str.match(/^([^\d\-+.]*)([\-+]?[\d.,]+)([A-Za-z%×x]*)(.*)$/);
  if (!m) return [{ text: str }];
  const [, pre, num, unit, rest] = m;
  const list: Run[] = [];
  if (pre) list.push({ text: pre, dy: -0.75, size: -0.55 });
  list.push({ text: num });
  if (unit) list.push({ text: unit, size: -0.72 });
  if (rest) list.push({ text: rest, size: -0.6 });
  return list;
}

/**
 * Resolve relative run sizes (negative numbers mean "fraction of base size")
 * produced by stringRuns.
 */
export function resolveRuns(list: Run[], base: TextStyle): Run[] {
  return list.map((r) => (r.size !== undefined && r.size < 0 ? { ...r, size: -r.size * (base.size ?? 16) } : r));
}

export function editorial(value: number | string, base: TextStyle, opts: FormatOptions & { style?: 'editorial' | 'plain' } = {}): Run[] {
  return resolveRuns(valueRuns(value, opts, base), base);
}
