/**
 * Reusable <defs>: gradients, hatch and guilloche patterns, paper grain,
 * duotone photo filters, soft shadows and clip paths.
 *
 * A Defs instance lives for one render. Each helper de-duplicates by key and
 * returns a `url(#id)` (or id) you can drop into fill/filter/clip-path.
 */
import { color as d3color } from 'd3-color';
import { h, id, r2 } from './svg.js';

export class Defs {
  private items = new Map<string, { id: string; markup: string }>();

  private add(key: string, build: (id: string) => string, prefix = 'd'): string {
    const hit = this.items.get(key);
    if (hit) return hit.id;
    const newId = id(prefix);
    this.items.set(key, { id: newId, markup: build(newId) });
    return newId;
  }

  toString(): string {
    return this.items.size ? `<defs>${[...this.items.values()].map((i) => i.markup).join('')}</defs>` : '';
  }

  /** Linear gradient. angle 0 = left→right, 90 = top→bottom. */
  linear(stops: [number, string, number?][], angle = 0): string {
    const key = `lin:${angle}:${JSON.stringify(stops)}`;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) / 2;
    const y = Math.sin(rad) / 2;
    const gid = this.add(key, (gid) =>
      h(
        'linearGradient',
        { id: gid, x1: r2(0.5 - x), y1: r2(0.5 - y), x2: r2(0.5 + x), y2: r2(0.5 + y) },
        ...stops.map(([o, c, a]) => h('stop', { offset: o, stopColor: c, stopOpacity: a ?? 1 })),
      ),
    );
    return `url(#${gid})`;
  }

  radial(stops: [number, string, number?][], cx = 0.5, cy = 0.5, rr = 0.5): string {
    const key = `rad:${cx}:${cy}:${rr}:${JSON.stringify(stops)}`;
    const gid = this.add(key, (gid) =>
      h('radialGradient', { id: gid, cx, cy, r: rr }, ...stops.map(([o, c, a]) => h('stop', { offset: o, stopColor: c, stopOpacity: a ?? 1 }))),
    );
    return `url(#${gid})`;
  }

  /** Diagonal hatch lines over a transparent (or `bg`) base. */
  hatch(colorStr: string, opts: { angle?: number; gap?: number; width?: number; bg?: string; opacity?: number } = {}): string {
    const { angle = 45, gap = 6, width = 2, bg, opacity = 1 } = opts;
    const key = `hatch:${colorStr}:${angle}:${gap}:${width}:${bg}:${opacity}`;
    const pid = this.add(
      key,
      (pid) =>
        h(
          'pattern',
          { id: pid, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${angle})` },
          bg ? h('rect', { width: gap, height: gap, fill: bg }) : '',
          h('rect', { width, height: gap, fill: colorStr, opacity }),
        ),
      'p',
    );
    return `url(#${pid})`;
  }

  dots(colorStr: string, opts: { gap?: number; r?: number; bg?: string } = {}): string {
    const { gap = 8, r = 1.4, bg } = opts;
    const key = `dots:${colorStr}:${gap}:${r}:${bg}`;
    const pid = this.add(
      key,
      (pid) =>
        h(
          'pattern',
          { id: pid, width: gap, height: gap, patternUnits: 'userSpaceOnUse' },
          bg ? h('rect', { width: gap, height: gap, fill: bg }) : '',
          h('circle', { cx: gap / 2, cy: gap / 2, r, fill: colorStr }),
        ),
      'p',
    );
    return `url(#${pid})`;
  }

  /**
   * Banknote-style guilloche: interlaced sine waves. Instantly signals
   * "money" when used as a bar fill.
   */
  guilloche(colorStr: string, opts: { bg?: string; scale?: number; opacity?: number } = {}): string {
    const { bg, scale = 1, opacity = 0.9 } = opts;
    const key = `guil:${colorStr}:${bg}:${scale}:${opacity}`;
    const w = 48 * scale;
    const hh = 16 * scale;
    const wave = (phase: number, amp: number) => {
      let d = '';
      for (let x = 0; x <= w; x += 2) {
        const y = hh / 2 + amp * Math.sin((x / w) * Math.PI * 2 + phase);
        d += `${x === 0 ? 'M' : 'L'}${r2(x)},${r2(y)}`;
      }
      return d;
    };
    const pid = this.add(
      key,
      (pid) =>
        h(
          'pattern',
          { id: pid, width: w, height: hh, patternUnits: 'userSpaceOnUse' },
          bg ? h('rect', { width: w, height: hh, fill: bg }) : '',
          ...[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ph) =>
            h('path', { d: wave(ph, hh * 0.42), fill: 'none', stroke: colorStr, strokeWidth: 0.7 * scale, opacity }),
          ),
        ),
      'p',
    );
    return `url(#${pid})`;
  }

  /** Paper grain / noise overlay filter. Apply to a full-canvas rect. */
  grain(amount = 0.08, freq = 0.9): string {
    const key = `grain:${amount}:${freq}`;
    const fid = this.add(
      key,
      (fid) =>
        h(
          'filter',
          { id: fid, x: 0, y: 0, width: '100%', height: '100%' },
          h('feTurbulence', { type: 'fractalNoise', baseFrequency: freq, numOctaves: 3, stitchTiles: 'stitch', result: 'n' }),
          h('feColorMatrix', { type: 'saturate', values: 0, in: 'n', result: 'g' }),
          h('feComponentTransfer', { in: 'g' }, h('feFuncA', { type: 'linear', slope: amount * 2.5, intercept: 0 })),
        ),
      'f',
    );
    return `url(#${fid})`;
  }

  /**
   * Organic texture for big shapes (canopy, terrain): turbulence-driven light
   * and shadow over the shape's own fill. Gives flat vectors a photographic feel.
   */
  texture(strength = 0.35, freq = 0.035): string {
    const key = `tex:${strength}:${freq}`;
    const fid = this.add(
      key,
      (fid) =>
        h(
          'filter',
          { id: fid, x: 0, y: 0, width: '100%', height: '100%', colorInterpolationFilters: 'sRGB' },
          h('feTurbulence', { type: 'fractalNoise', baseFrequency: freq, numOctaves: 4, seed: 7, result: 'noise' }),
          h('feDiffuseLighting', { in: 'noise', lightingColor: '#ffffff', surfaceScale: 3.2, result: 'light' }, h('feDistantLight', { azimuth: 225, elevation: 48 })),
          // Multiply-style lighting: shadows darken, highlights barely lift, so colors stay saturated.
          h('feComposite', { in: 'light', in2: 'SourceGraphic', operator: 'arithmetic', k1: strength * 1.6, k2: 1 - strength, k3: 0, k4: -strength * 0.5, result: 'lit' }),
          h('feComposite', { in: 'lit', in2: 'SourceAlpha', operator: 'in' }),
        ),
      'f',
    );
    return `url(#${fid})`;
  }

  /** Soft drop shadow. */
  shadow(opts: { dx?: number; dy?: number; blur?: number; color?: string; opacity?: number } = {}): string {
    const { dx = 0, dy = 4, blur = 8, color = '#000', opacity = 0.25 } = opts;
    const key = `shadow:${dx}:${dy}:${blur}:${color}:${opacity}`;
    const fid = this.add(
      key,
      (fid) =>
        h(
          'filter',
          { id: fid, x: '-30%', y: '-30%', width: '160%', height: '160%' },
          h('feDropShadow', { dx, dy, stdDeviation: blur / 2, floodColor: color, floodOpacity: opacity }),
        ),
      'f',
    );
    return `url(#${fid})`;
  }

  /**
   * Duotone: maps photo luminance onto a dark→light color pair. This is the
   * riso/print look that makes mismatched press photos feel like one set.
   * Pass the same colors for every photo in a piece.
   */
  duotone(dark: string, light: string, contrast = 1.15): string {
    const key = `duo:${dark}:${light}:${contrast}`;
    const a = d3color(dark)!.rgb();
    const b = d3color(light)!.rgb();
    const table = (x: number, y: number) => `${r2(x / 255)} ${r2(y / 255)}`;
    const fid = this.add(
      key,
      (fid) =>
        h(
          'filter',
          { id: fid, colorInterpolationFilters: 'sRGB' },
          h('feColorMatrix', { type: 'matrix', values: '0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0' }),
          h(
            'feComponentTransfer',
            {},
            h('feFuncR', { type: 'linear', slope: contrast, intercept: (1 - contrast) / 2 }),
            h('feFuncG', { type: 'linear', slope: contrast, intercept: (1 - contrast) / 2 }),
            h('feFuncB', { type: 'linear', slope: contrast, intercept: (1 - contrast) / 2 }),
          ),
          h(
            'feComponentTransfer',
            {},
            h('feFuncR', { type: 'table', tableValues: table(a.r, b.r) }),
            h('feFuncG', { type: 'table', tableValues: table(a.g, b.g) }),
            h('feFuncB', { type: 'table', tableValues: table(a.b, b.b) }),
          ),
        ),
      'f',
    );
    return `url(#${fid})`;
  }

  /** Black & white photo with a little extra contrast. */
  grayscale(contrast = 1.1): string {
    const key = `gray:${contrast}`;
    const fid = this.add(
      key,
      (fid) =>
        h(
          'filter',
          { id: fid, colorInterpolationFilters: 'sRGB' },
          h('feColorMatrix', { type: 'saturate', values: 0 }),
          h(
            'feComponentTransfer',
            {},
            ...['R', 'G', 'B'].map((c) => h(`feFunc${c}`, { type: 'linear', slope: contrast, intercept: (1 - contrast) / 2 })),
          ),
        ),
      'f',
    );
    return `url(#${fid})`;
  }

  /**
   * Sticker outline: a solid outline that follows the image's alpha (works on
   * cutouts), plus a soft shadow. The "cut-out head" look.
   */
  sticker(color = '#ffffff', width = 4, shadow = 0.28): string {
    const key = `sticker:${color}:${width}:${shadow}`;
    const fid = this.add(
      key,
      (fid) =>
        h(
          'filter',
          { id: fid, x: '-20%', y: '-20%', width: '140%', height: '140%' },
          h('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: width, result: 'grown' }),
          h('feFlood', { floodColor: color, result: 'fill' }),
          h('feComposite', { in: 'fill', in2: 'grown', operator: 'in', result: 'outline' }),
          h('feGaussianBlur', { in: 'grown', stdDeviation: width * 1.2, result: 'blur' }),
          h('feOffset', { in: 'blur', dy: width * 0.8, result: 'off' }),
          h('feComponentTransfer', { in: 'off', result: 'shadow' }, h('feFuncA', { type: 'linear', slope: shadow })),
          h('feMerge', {}, h('feMergeNode', { in: 'shadow' }), h('feMergeNode', { in: 'outline' }), h('feMergeNode', { in: 'SourceGraphic' })),
        ),
      'f',
    );
    return `url(#${fid})`;
  }

  clipCircle(cx: number, cy: number, r: number): string {
    const key = `cc:${r2(cx)}:${r2(cy)}:${r2(r)}`;
    const cid = this.add(key, (cid) => h('clipPath', { id: cid }, h('circle', { cx, cy, r })), 'c');
    return `url(#${cid})`;
  }

  clipPath(d: string): string {
    const key = `cp:${d}`;
    const cid = this.add(key, (cid) => h('clipPath', { id: cid }, h('path', { d })), 'c');
    return `url(#${cid})`;
  }

  /** Alpha mask from a linear gradient, used to fade hero photos into the bg. */
  fadeMask(box: { x: number; y: number; w: number; h: number }, stops: [number, number][], angle = 90): string {
    const key = `fm:${JSON.stringify(box)}:${JSON.stringify(stops)}:${angle}`;
    const grad = this.linear(
      stops.map(([o, a]) => [o, '#fff', a]),
      angle,
    );
    const mid = this.add(key, (mid) => h('mask', { id: mid, maskUnits: 'userSpaceOnUse' }, h('rect', { x: box.x, y: box.y, width: box.w, height: box.h, fill: grad })), 'm');
    return `url(#${mid})`;
  }
}
