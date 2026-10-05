/**
 * Color helpers plus the curated palettes.
 *
 * Editorial infographics almost never use a rainbow. They pick ONE hue family
 * from the topic (forest greens, X blue, gold for wealth) and add ONE hot
 * accent for the thing that matters. Palettes here are built that way:
 * `bg`, `ink`, `muted`, a `ramp` (light→dark shades of the main hue), and
 * an `accent`. `cats` is a small categorical set for when you truly need it.
 */
import { color as d3color, hsl } from 'd3-color';
import { interpolateLab } from 'd3-interpolate';

export function mix(a: string, b: string, t: number): string {
  return interpolateLab(a, b)(t);
}

export function lighten(c: string, amt = 0.2): string {
  const x = hsl(c);
  x.l = Math.min(1, x.l + amt);
  return x.formatHex();
}

export function darken(c: string, amt = 0.2): string {
  const x = hsl(c);
  x.l = Math.max(0, x.l - amt);
  return x.formatHex();
}

export function alpha(c: string, a: number): string {
  const x = d3color(c);
  if (!x) return c;
  x.opacity = a;
  return x.formatRgb();
}

export function luminance(c: string): number {
  const x = d3color(c)?.rgb();
  if (!x) return 0;
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(x.r) + 0.7152 * f(x.g) + 0.0722 * f(x.b);
}

/** Black or white text, whichever reads better on `bg`. */
export function onColor(bg: string, dark = '#111111', light = '#ffffff'): string {
  return luminance(bg) > 0.42 ? dark : light;
}

export function isDark(bg: string): boolean {
  return luminance(bg) < 0.2;
}

/** n evenly spaced shades between two colors (in Lab space). */
export function ramp(from: string, to: string, n: number): string[] {
  if (n <= 1) return [to];
  return Array.from({ length: n }, (_, i) => mix(from, to, i / (n - 1)));
}

export interface Palette {
  name: string;
  bg: string;
  /** Optional second bg color for a vertical gradient. */
  bg2?: string;
  ink: string;
  muted: string;
  /** Main hue, light → dark. */
  ramp: string[];
  accent: string;
  /** Small categorical set (max ~6) for regions, sectors, generations. */
  cats: string[];
  /** Grid / rule color. */
  rule: string;
}

/**
 * Hand-tuned palettes distilled from the kind of pieces that perform best.
 * Pick by topic, not by taste: money → `gold`/`olive`, nature → `forest`,
 * tech/social → `electric`, music/culture → `pop`, geography → `atlas`.
 */
export const PALETTES: Record<string, Palette> = {
  /** Cream paper + olive/gold. Wealth, celebrities, history. */
  olive: {
    name: 'olive',
    bg: '#f1efe6',
    ink: '#141414',
    muted: '#5b5a52',
    ramp: ['#e3e2b8', '#c9c66f', '#a5a12a', '#8a8a1f', '#5f5f12'],
    accent: '#8a8a1f',
    cats: ['#8a8a1f', '#c08a1e', '#2f5d50', '#7a3b2e', '#3b4a6b'],
    rule: '#d9d6c8',
  },
  /** Deep green money / banknote feel. */
  money: {
    name: 'money',
    bg: '#16372a',
    bg2: '#0d2219',
    ink: '#f3efe2',
    muted: '#b7c2b5',
    ramp: ['#2c5a45', '#3f7a5c', '#6aa37f', '#a8cfa9', '#e9e3cf'],
    accent: '#e9e3cf',
    cats: ['#e9e3cf', '#c9b37a', '#6aa37f', '#e07a5f', '#9fb4c7'],
    rule: '#2a4d3d',
  },
  /** Nature / forests / climate. */
  forest: {
    name: 'forest',
    bg: '#ece6d6',
    ink: '#2e2a1f',
    muted: '#6b6450',
    ramp: ['#9cc46a', '#57a338', '#2f7d2a', '#1f5a22', '#123d17'],
    accent: '#2f7d2a',
    cats: ['#3f9a2f', '#7a8a3a', '#1f5a22', '#8fae4f', '#56702e'],
    rule: '#d4ccb6',
  },
  /** Dark navy + electric blue. Tech, social media, X. */
  electric: {
    name: 'electric',
    bg: '#0b0f17',
    bg2: '#121a2a',
    ink: '#ffffff',
    muted: '#9aa6b8',
    ramp: ['#0b3a75', '#0e5ec4', '#1d8ff0', '#58b3ff', '#c4e3ff'],
    accent: '#1d9bf0',
    cats: ['#1d9bf0', '#7c5cff', '#ff4d6d', '#ffc233', '#2ee6a6'],
    rule: '#1d2638',
  },
  /** Sky gradient + bold cobalt and saffron. Rankings, cities. */
  sky: {
    name: 'sky',
    bg: '#bfe9ff',
    bg2: '#7fd3fb',
    ink: '#0d0d0d',
    muted: '#2b4a5c',
    ramp: ['#c9e6ff', '#7cbcff', '#2e7cf6', '#1c46c9', '#11268a'],
    accent: '#ffb000',
    cats: ['#ffb000', '#1f44d1', '#b000c9', '#d62020', '#00a39a', '#ff6a00'],
    rule: '#a4d8f2',
  },
  /** Riso-print pop: vermilion + cobalt on warm paper. Music, culture. */
  pop: {
    name: 'pop',
    bg: '#eef0f2',
    bg2: '#dce9f2',
    ink: '#1a22d6',
    muted: '#4a54c9',
    ramp: ['#ffb199', '#ff7a52', '#f2542d', '#d43d18', '#9e2a0e'],
    accent: '#1a22d6',
    cats: ['#f2542d', '#1a22d6', '#f0a020', '#14a37f', '#c42f8a'],
    rule: '#c9d3dc',
  },
  /** Mountain blue + saffron. Sports, adventure, stacked categories. */
  alpine: {
    name: 'alpine',
    bg: '#1f5fc4',
    bg2: '#e9f1fb',
    ink: '#0e2a5c',
    muted: '#3d5a8a',
    ramp: ['#bcd9ff', '#5fb0ff', '#1e88f0', '#1560c8', '#0d3f8f'],
    accent: '#f5b700',
    cats: ['#1e90ff', '#f5b700', '#e0105a', '#13b38b', '#7b4dff'],
    rule: '#c7d8ef',
  },
  /** Black + white + one blue. Maps and serious economics. */
  atlas: {
    name: 'atlas',
    bg: '#111111',
    ink: '#f5f5f0',
    muted: '#a7a7a0',
    ramp: ['#ffffff', '#c3d6fb', '#82a9f2', '#3f78e8', '#0b52e3'],
    accent: '#ffffff',
    cats: ['#3f78e8', '#f5f5f0', '#ffcc00', '#ff4d4d', '#2ec4b6'],
    rule: '#2a2a2a',
  },
  /** Cream + red/black. Inequality, politics, protest-poster energy. */
  poster: {
    name: 'poster',
    bg: '#f4ecd8',
    ink: '#111111',
    muted: '#5c564a',
    ramp: ['#f6c7bd', '#ef8a74', '#e44d2e', '#c22a12', '#7d1708'],
    accent: '#e0301e',
    cats: ['#e0301e', '#cfcac0', '#111111', '#f0a500', '#2a6f97'],
    rule: '#ddd3bd',
  },
  /** Warm neutral + generational set. Demographics, shares. */
  civic: {
    name: 'civic',
    bg: '#efece6',
    ink: '#1b1b1b',
    muted: '#6a6660',
    ramp: ['#d8e9e0', '#9fd0b8', '#4fae8a', '#2a8a66', '#1d6b4d'],
    accent: '#2a7d2e',
    cats: ['#7d8794', '#2a7d2e', '#25a7c4', '#d9534f', '#e6a23c', '#6f42c1'],
    rule: '#d6d1c7',
  },
  /** Newsprint mono + yellow highlighter. Comparisons, tables. */
  highlighter: {
    name: 'highlighter',
    bg: '#f2f2f2',
    ink: '#151515',
    muted: '#6d6d6d',
    ramp: ['#ffffff', '#f7f7f7', '#ececec', '#dcdcdc', '#bdbdbd'],
    accent: '#ffd400',
    cats: ['#ffd400', '#151515', '#e63946', '#1d3557', '#2a9d8f'],
    rule: '#d9d9d9',
  },
};

export function palette(p: string | Partial<Palette> | undefined): Palette {
  if (!p) return PALETTES.olive;
  if (typeof p === 'string') {
    const found = PALETTES[p];
    if (!found) throw new Error(`vivid: unknown palette "${p}". Options: ${Object.keys(PALETTES).join(', ')}`);
    return found;
  }
  const base = PALETTES[(p as Palette).name] ?? PALETTES.olive;
  return { ...base, ...p } as Palette;
}
