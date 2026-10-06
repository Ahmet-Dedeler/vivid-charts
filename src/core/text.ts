/**
 * Text engine: measure, wrap, and draw text as SVG paths.
 *
 * Supports mixed-style "runs" on one line (e.g. a small raised "$", a big
 * "7.1" and a small "B"), letter spacing, uppercase, and text set along a
 * circular arc, which together cover nearly every typographic trick in an
 * editorial infographic.
 */
import { getFont } from './fonts.js';
import { esc, h, r2 } from './svg.js';

export interface TextStyle {
  family?: string;
  weight?: number;
  italic?: boolean;
  size?: number;
  /** Extra tracking in em units (0.1 = 10% of size). */
  tracking?: number;
  fill?: string;
  upper?: boolean;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface Run extends TextStyle {
  text: string;
  /** Baseline shift in em of this run's size; negative raises the run. */
  dy?: number;
}

export type Anchor = 'start' | 'middle' | 'end';

/**
 * Serialize opentype path commands ourselves. opentype's toPathData has a
 * rounding cache that occasionally emits NaN, which silently drops glyphs.
 */
function pathData(path: { commands: { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[] }): string {
  const f = (n: number | undefined) => {
    const v = Math.round((n ?? 0) * 10) / 10;
    return Object.is(v, -0) ? '0' : String(v);
  };
  let d = '';
  for (const c of path.commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${f(c.x)} ${f(c.y)}`;
    else if (c.type === 'Q') d += `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}`;
    else if (c.type === 'C') d += `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  return d;
}

/**
 * opentype's GSUB support is partial and throws on some fonts (e.g. Playfair
 * italic). Fall back to plain cmap lookup, which is all a poster needs.
 */
type Font = ReturnType<typeof getFont>;
type Shaped = { g: ReturnType<Font['charToGlyph']>; f: Font };

/** Fonts tried, in order, for characters the requested face lacks (★, →, ✓, ⚑…). */
const FALLBACKS = ['Barlow', 'Inter', 'Noto Sans Symbols 2', 'Noto Sans Symbols'];

/**
 * Glyphs for a string, each tagged with the font it came from. Uses the
 * font's shaping (kerning, ligatures) when every character is covered, and
 * per-character fallback fonts otherwise. opentype's GSUB support is partial
 * and throws on some fonts, so that path is guarded too.
 */
function glyphsOf(font: Font, str: string, weight = 400, italic = false): Shaped[] {
  let shaped: Shaped[] | undefined;
  try {
    shaped = font.stringToGlyphs(str).map((g) => ({ g, f: font }));
  } catch {
    shaped = undefined;
  }
  if (shaped && shaped.every((s) => s.g.index !== 0)) return shaped;
  return Array.from(str).map((ch) => {
    const g = font.charToGlyph(ch);
    if (g.index !== 0 || /\s/.test(ch)) return { g, f: font };
    for (const fam of FALLBACKS) {
      const f = getFont(fam, weight, italic);
      const fg = f.charToGlyph(ch);
      if (fg.index !== 0) return { g: fg, f };
    }
    return { g, f: font };
  });
}

const DEFAULT: Required<Pick<TextStyle, 'family' | 'weight' | 'italic' | 'size' | 'tracking' | 'fill'>> = {
  family: 'Barlow',
  weight: 400,
  italic: false,
  size: 16,
  tracking: 0,
  fill: '#111',
};

function resolve(style: TextStyle) {
  return { ...DEFAULT, ...Object.fromEntries(Object.entries(style).filter(([, v]) => v !== undefined)) } as typeof DEFAULT & TextStyle;
}

function prep(text: string, s: TextStyle) {
  return s.upper ? text.toUpperCase() : text;
}

/** Width of a single-style string in px. */
export function measure(text: string, style: TextStyle = {}): number {
  const s = resolve(style);
  const str = prep(text, s);
  const font = getFont(s.family, s.weight, s.italic);
  const glyphs = glyphsOf(font, str, s.weight, s.italic);
  let w = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const { g, f } = glyphs[i];
    const scale = s.size / f.unitsPerEm;
    w += (g.advanceWidth ?? 0) * scale;
    if (i < glyphs.length - 1) w += (glyphs[i + 1].f === f ? f.getKerningValue(g, glyphs[i + 1].g) * scale : 0) + s.tracking * s.size;
  }
  return w;
}

export function measureRuns(runs: Run[], base: TextStyle = {}): number {
  return runs.reduce((w, run) => w + measure(run.text, { ...base, ...run }), 0);
}

/** Cap height in px for vertical centering. */
export function capHeight(style: TextStyle = {}): number {
  const s = resolve(style);
  const font = getFont(s.family, s.weight, s.italic);
  const os2 = font.tables.os2 as { sCapHeight?: number } | undefined;
  const cap = os2?.sCapHeight || font.ascender * 0.7;
  return (cap / font.unitsPerEm) * s.size;
}

/** Path data for one style, starting at the baseline point (x, y). */
type Ink = { x0: number; y0: number; x1: number; y1: number };

function glyphPath(text: string, s: ReturnType<typeof resolve>, x: number, y: number, ink?: Ink): { d: string; width: number } {
  const font = getFont(s.family, s.weight, s.italic);
  const glyphs = glyphsOf(font, prep(text, s), s.weight, s.italic);
  let cx = x;
  let d = '';
  for (let i = 0; i < glyphs.length; i++) {
    const { g, f } = glyphs[i];
    const scale = s.size / f.unitsPerEm;
    if (ink) {
      // Glyph outline bounds in font units (y up); empty for spaces.
      const bb = g.getBoundingBox();
      if (bb.x2 > bb.x1) {
        ink.x0 = Math.min(ink.x0, cx + bb.x1 * scale);
        ink.x1 = Math.max(ink.x1, cx + bb.x2 * scale);
        ink.y0 = Math.min(ink.y0, y - bb.y2 * scale);
        ink.y1 = Math.max(ink.y1, y - bb.y1 * scale);
      }
    }
    d += pathData(g.getPath(cx, y, s.size));
    cx += (g.advanceWidth ?? 0) * scale;
    if (i < glyphs.length - 1) cx += (glyphs[i + 1].f === f ? f.getKerningValue(g, glyphs[i + 1].g) * scale : 0) + s.tracking * s.size;
  }
  return { d, width: cx - x };
}

function paintAttrs(s: TextStyle) {
  return {
    fill: s.fill,
    opacity: s.opacity,
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    strokeLinejoin: s.stroke ? 'round' : undefined,
    paintOrder: s.stroke ? 'stroke' : undefined,
  };
}

/**
 * Draw a line of text. `y` is the baseline. Returns markup; use `measure` to
 * know the width beforehand.
 */
export function text(str: string, x: number, y: number, style: TextStyle = {}, anchor: Anchor = 'start', title = true): string {
  return runs([{ text: str }], x, y, style, anchor, title);
}

/** Draw mixed-style runs on one baseline. */
// ───────────── text layout checking ─────────────
//
// While a poster renders, every line of text records its ink box (the real
// glyph outlines, not the em box). After rendering, `textCollisions()` finds
// pairs of text that overlap and text that runs off the canvas, so layout
// bugs are caught by the renderer instead of by a human squinting at a PNG.

export interface TextBox extends Ink {
  text: string;
  owner: string;
}

let collector: TextBox[] | null = null;
let suspended = 0;
let owner = '';

export function startTextCollect() {
  collector = [];
  suspended = 0;
}
export function stopTextCollect(): TextBox[] {
  const out = collector ?? [];
  collector = null;
  return out;
}
/** Label for the element whose text is being drawn ("title", "layer 3 (treemap)"). */
export function setTextOwner(o: string) {
  owner = o;
}
/** Draw text without recording it (rotated text, decorative duplicates of an effect). */
export function untracked<T>(fn: () => T): T {
  suspended++;
  try {
    return fn();
  } finally {
    suspended--;
  }
}
/** Record a box manually (for text drawn untracked but placed in canvas space). */
export function trackBox(b: Ink, text: string) {
  if (collector && !suspended && b.x1 > b.x0) collector.push({ ...b, text, owner });
}

/** Ink bounds of runs drawn at (x, y) without drawing anything. */
export function inkBox(list: Run[], x: number, y: number, base: TextStyle = {}, anchor: Anchor = 'start'): Ink {
  const total = measureRuns(list, base);
  let cx = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  const ink: Ink = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const run of list) {
    const s = resolve({ ...base, ...Object.fromEntries(Object.entries(run).filter(([, v]) => v !== undefined)) });
    cx += glyphPath(run.text, s, cx, y + (run.dy ?? 0) * s.size, ink).width;
  }
  return ink;
}

/**
 * Overlapping text pairs and off-canvas text. Overlap must exceed `tol` px in
 * both directions, so letters that merely touch are not flagged.
 */
export function textCollisions(boxes: TextBox[], width: number, height: number, tol = 2): string[] {
  const issues: string[] = [];
  const q = (t: string) => `"${t.length > 40 ? t.slice(0, 37) + '…' : t}"`;
  for (const b of boxes) {
    if (b.x0 < -tol || b.y0 < -tol || b.x1 > width + tol || b.y1 > height + tol) issues.push(`text off canvas: ${q(b.text)} (${b.owner})`);
  }
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > tol && oy > tol) issues.push(`text overlap: ${q(a.text)} (${a.owner}) × ${q(b.text)} (${b.owner}), ${Math.round(oy)}px`);
    }
  }
  return issues;
}

export function runs(list: Run[], x: number, y: number, base: TextStyle = {}, anchor: Anchor = 'start', title = true): string {
  const total = measureRuns(list, base);
  let cx = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  const parts: string[] = [];
  const ink: Ink = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const run of list) {
    const s = resolve({ ...base, ...Object.fromEntries(Object.entries(run).filter(([, v]) => v !== undefined)) });
    const { d, width } = glyphPath(run.text, s, cx, y + (run.dy ?? 0) * s.size, ink);
    if (d) parts.push(h('path', { d, ...paintAttrs(s) }));
    cx += width;
  }
  const label = list.map((r) => r.text).join('');
  if (label.trim()) trackBox(ink, label);
  // A <title> keeps the text discoverable for accessibility and text search.
  return h('g', { class: 'vt' }, title ? `<title>${esc(label)}</title>` : '', ...parts);
}

/** Greedy word wrap into lines that fit maxWidth. */
export function wrap(str: string, maxWidth: number, style: TextStyle = {}): string[] {
  const lines: string[] = [];
  for (const para of str.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next, style) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Multi-line paragraph. Supports **bold** spans (rendered with boldWeight) so
 * annotations can emphasise the key phrase, the way editorial notes do.
 * `y` is the first baseline. Returns markup and the block height.
 */
export function paragraph(
  str: string,
  x: number,
  y: number,
  maxWidth: number,
  style: TextStyle = {},
  opts: { anchor?: Anchor; lineHeight?: number; boldWeight?: number; boldFill?: string } = {},
): { svg: string; height: number; lines: number } {
  const s = resolve(style);
  const lh = (opts.lineHeight ?? 1.3) * s.size;
  const plain = str.replace(/\*\*/g, '');
  const lines = wrap(plain, maxWidth, style);
  // Map bold ranges from the original string onto wrapped lines.
  const boldMask: boolean[] = [];
  let bold = false;
  for (let i = 0; i < str.length; i++) {
    if (str.startsWith('**', i)) {
      bold = !bold;
      i++;
      continue;
    }
    boldMask.push(bold);
  }
  let cursor = 0;
  const out: string[] = [];
  lines.forEach((line, li) => {
    const list: Run[] = [];
    let cur = '';
    let curBold = boldMask[cursor] ?? false;
    for (let i = 0; i < line.length; i++) {
      const b = boldMask[cursor + i] ?? false;
      if (b !== curBold && cur) {
        list.push(curBold ? { text: cur, weight: opts.boldWeight ?? 700, ...(opts.boldFill ? { fill: opts.boldFill } : {}) } : { text: cur });
        cur = '';
      }
      curBold = b;
      cur += line[i];
    }
    if (cur) list.push(curBold ? { text: cur, weight: opts.boldWeight ?? 700, ...(opts.boldFill ? { fill: opts.boldFill } : {}) } : { text: cur });
    cursor += line.length;
    // Skip the whitespace (or newline) that the wrap consumed between lines.
    while (cursor < plain.length && /\s/.test(plain[cursor])) cursor++;
    out.push(runs(list, x, y + li * lh, style, opts.anchor ?? 'start'));
  });
  return { svg: out.join(''), height: lines.length * lh, lines: lines.length };
}

/** Largest font size (<= max) at which `str` fits maxWidth. */
export function fitSize(str: string, maxWidth: number, style: TextStyle, max: number, min = 6): number {
  const w = measure(str, { ...style, size: 100 });
  return Math.max(min, Math.min(max, (maxWidth / w) * 100));
}

/**
 * Text along a circle. `angle` is where the text is centered, in degrees,
 * 0 = 12 o'clock, clockwise. `inside: false` reads clockwise on the outside of
 * the circle (top labels); `flip: true` reads counter-clockwise so labels on
 * the bottom half stay upright.
 */
export function arcText(str: string, cx: number, cy: number, radius: number, angle: number, style: TextStyle = {}, flip = false): string {
  const s = resolve(style);
  const font = getFont(s.family, s.weight, s.italic);
  const glyphs = glyphsOf(font, prep(str, s), s.weight, s.italic);
  const total = measure(str, style);
  const r = flip ? radius + capHeight(style) : radius;
  const dir = flip ? -1 : 1;
  let along = -total / 2;
  const parts: string[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    const { g: glyph, f } = glyphs[i];
    const scale = s.size / f.unitsPerEm;
    const adv = (glyph.advanceWidth ?? 0) * scale;
    const mid = along + adv / 2;
    const theta = ((angle * Math.PI) / 180) + (dir * mid) / r;
    const px = cx + r * Math.sin(theta);
    const py = cy - r * Math.cos(theta);
    const rot = (theta * 180) / Math.PI + (flip ? 180 : 0);
    const d = pathData(glyph.getPath(-adv / 2, 0, s.size));
    if (d) parts.push(h('path', { d, transform: `translate(${r2(px)},${r2(py)}) rotate(${r2(rot)})`, ...paintAttrs(s) }));
    along += adv;
    if (i < glyphs.length - 1) along += (glyphs[i + 1].f === f ? f.getKerningValue(glyph, glyphs[i + 1].g) * scale : 0) + s.tracking * s.size;
  }
  return h('g', { class: 'vt' }, `<title>${esc(str)}</title>`, ...parts);
}
