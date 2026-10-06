/**
 * Drawing primitives shared by every chart: photos, avatars, flags, icons,
 * callout arrows, brackets, metaball connectors.
 */
import { asset, headBox, iconBody } from './assets.js';
import type { Defs } from './defs.js';
import { h, r2 } from './svg.js';
import { capHeight, text } from './text.js';

export interface ImageOpts {
  /** cover (default) crops to fill; contain fits inside. */
  fit?: 'cover' | 'contain';
  /** Where to anchor the crop. Portraits look best with 'top'. */
  focus?: 'top' | 'center' | 'bottom';
  clip?: string; // url(#...)
  filter?: string; // url(#...)
  opacity?: number;
  mask?: string;
}

export function image(ref: string | undefined, x: number, y: number, w: number, hgt: number, opts: ImageOpts = {}): string {
  const href = asset(ref);
  if (!href) return '';
  const align = opts.focus === 'top' ? 'xMidYMin' : opts.focus === 'bottom' ? 'xMidYMax' : 'xMidYMid';
  return h('image', {
    href,
    x,
    y,
    width: w,
    height: hgt,
    preserveAspectRatio: `${align} ${opts.fit === 'contain' ? 'meet' : 'slice'}`,
    clipPath: opts.clip,
    filter: opts.filter,
    opacity: opts.opacity,
    mask: opts.mask,
  });
}

/** Circular photo with an optional ring. Falls back to a colored disc with initials. */
export function avatar(
  defs: Defs,
  ref: string | undefined,
  cx: number,
  cy: number,
  r: number,
  opts: { ring?: string; ringWidth?: number; filter?: string; bg?: string; focus?: 'top' | 'center'; zoom?: number; initials?: string; shadow?: boolean } = {},
): string {
  const { ring, ringWidth = Math.max(1.5, r * 0.08), filter, bg = '#ddd', focus = 'top', zoom = 1 } = opts;
  const clip = defs.clipCircle(cx, cy, r);
  const s = r * 2 * zoom;
  const img = asset(ref)
    ? image(ref, cx - s / 2, cy - r * (focus === 'top' ? 1 : zoom), s, s, { clip, filter, focus })
    : opts.initials
      ? text(opts.initials, cx, cy + capHeight({ family: 'Barlow', weight: 700, size: r * 0.7 }) / 2, { family: 'Barlow', weight: 700, size: r * 0.7, fill: '#fff' }, 'middle')
      : '';
  return h(
    'g',
    { filter: opts.shadow ? defs.shadow({ dy: r * 0.08, blur: r * 0.25, opacity: 0.3 }) : undefined },
    h('circle', { cx, cy, r, fill: bg }),
    img,
    ring ? h('circle', { cx, cy, r: r - ringWidth / 2, fill: 'none', stroke: ring, strokeWidth: ringWidth }) : '',
  );
}

/** Circular flag (flag:xx) with a thin outline so white flags don't vanish. */
export function flag(defs: Defs, code: string | undefined, cx: number, cy: number, r: number, outline = 'rgba(0,0,0,0.15)'): string {
  if (!code) return '';
  const ref = code.startsWith('flag:') ? code : `flag:${code.toLowerCase()}`;
  const clip = defs.clipCircle(cx, cy, r);
  return h('g', {}, image(ref, cx - r, cy - r, r * 2, r * 2, { clip }), h('circle', { cx, cy, r: r - 0.5, fill: 'none', stroke: outline, strokeWidth: 1 }));
}

/** Inline icon (icon:set:name) tinted with `color`. */
export function icon(ref: string, x: number, y: number, size: number, color = 'currentColor', rotate = 0, opacity?: number): string {
  try {
    const { body, w, h: ih } = iconBody(ref);
    const t = rotate ? ` rotate(${r2(rotate)} ${r2(size / 2)} ${r2(size / 2)})` : '';
    return h(
      'g',
      { transform: `translate(${r2(x)},${r2(y)})${t}`, color, fill: color, opacity },
      `<svg width="${r2(size)}" height="${r2(size)}" viewBox="0 0 ${w} ${ih}" color="${color}">${body.replace(/currentColor/g, color)}</svg>`,
    );
  } catch (e) {
    console.warn(String(e));
    return '';
  }
}

/**
 * Curved callout arrow from (x1,y1) to (x2,y2). `bend` > 0 curves clockwise.
 * Editorial notes use a thin hand-drawn-ish curve with a small open head.
 */
export function arrow(x1: number, y1: number, x2: number, y2: number, opts: { color?: string; width?: number; bend?: number; head?: number; dash?: string } = {}): string {
  const { color = '#111', width = 1.6, bend = 0.25, head = 7, dash } = opts;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  // Tangent at the end of a quadratic: direction from control to end.
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const a1 = ang + Math.PI * 0.82;
  const a2 = ang - Math.PI * 0.82;
  const headD = `M${r2(x2 + head * Math.cos(a1))},${r2(y2 + head * Math.sin(a1))}L${r2(x2)},${r2(y2)}L${r2(x2 + head * Math.cos(a2))},${r2(y2 + head * Math.sin(a2))}`;
  return h(
    'g',
    { fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('path', { d: `M${r2(x1)},${r2(y1)}Q${r2(cx)},${r2(cy)} ${r2(x2)},${r2(y2)}`, strokeDasharray: dash }),
    h('path', { d: headD }),
  );
}

/** Square bracket grouping rows/items; `side` is where the bracket opens toward. */
export function bracket(x: number, y1: number, y2: number, opts: { color?: string; width?: number; depth?: number; side?: 'left' | 'right'; radius?: number } = {}): string {
  const { color = '#111', width = 2, depth = 10, side = 'right', radius = 6 } = opts;
  const d = side === 'right' ? -depth : depth;
  const rr = Math.min(radius, depth, (y2 - y1) / 2);
  const s = Math.sign(d);
  return h('path', {
    d: `M${r2(x + d)},${r2(y1)}H${r2(x - s * rr)}Q${r2(x)},${r2(y1)} ${r2(x)},${r2(y1 + rr)}V${r2(y2 - rr)}Q${r2(x)},${r2(y2)} ${r2(x - s * rr)},${r2(y2)}H${r2(x + d)}`,
    fill: 'none',
    stroke: color,
    strokeWidth: width,
    strokeLinecap: 'round',
  });
}

/**
 * Metaball bridge between two circles, the gooey "connected bubbles" look.
 * Based on the classic Hiroyuki Sato metaball construction.
 * Returns path data for the neck only; draw circles separately with the same fill.
 */
export function metaball(c1: [number, number], r1: number, c2: [number, number], r2_: number, v = 0.5, handleSize = 2.4, maxDist?: number): string {
  const HALF = Math.PI / 2;
  const d = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  const maxD = maxDist ?? (r1 + r2_) * 2.5;
  if (r1 === 0 || r2_ === 0 || d > maxD || d <= Math.abs(r1 - r2_)) return '';
  let u1 = 0;
  let u2 = 0;
  if (d < r1 + r2_) {
    u1 = Math.acos((r1 * r1 + d * d - r2_ * r2_) / (2 * r1 * d));
    u2 = Math.acos((r2_ * r2_ + d * d - r1 * r1) / (2 * r2_ * d));
  }
  const angleBetween = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);
  const maxSpread = Math.acos((r1 - r2_) / d);
  const a1 = angleBetween + u1 + (maxSpread - u1) * v;
  const a2 = angleBetween - u1 - (maxSpread - u1) * v;
  const a3 = angleBetween + Math.PI - u2 - (Math.PI - u2 - maxSpread) * v;
  const a4 = angleBetween - Math.PI + u2 + (Math.PI - u2 - maxSpread) * v;
  const pt = (c: [number, number], a: number, r: number): [number, number] => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const p1 = pt(c1, a1, r1);
  const p2 = pt(c1, a2, r1);
  const p3 = pt(c2, a3, r2_);
  const p4 = pt(c2, a4, r2_);
  const totalRadius = r1 + r2_;
  const d2Base = Math.min(v * handleSize, Math.hypot(p1[0] - p3[0], p1[1] - p3[1]) / totalRadius);
  const d2 = d2Base * Math.min(1, (d * 2) / (r1 + r2_));
  const hr1 = r1 * d2;
  const hr2 = r2_ * d2;
  const h1 = pt(p1, a1 - HALF, hr1);
  const h2 = pt(p2, a2 + HALF, hr1);
  const h3 = pt(p3, a3 + HALF, hr2);
  const h4 = pt(p4, a4 - HALF, hr2);
  const f = (p: [number, number]) => `${r2(p[0])},${r2(p[1])}`;
  return `M${f(p1)}C${f(h1)} ${f(h3)} ${f(p3)}L${f(p4)}C${f(h4)} ${f(h2)} ${f(p2)}Z`;
}

/** Simple straight capsule bridge (fallback when circles are far apart). */
export function capsule(c1: [number, number], c2: [number, number], width: number): string {
  const ang = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);
  const ox = (Math.sin(ang) * width) / 2;
  const oy = (-Math.cos(ang) * width) / 2;
  return `M${r2(c1[0] + ox)},${r2(c1[1] + oy)}L${r2(c2[0] + ox)},${r2(c2[1] + oy)}L${r2(c2[0] - ox)},${r2(c2[1] - oy)}L${r2(c1[0] - ox)},${r2(c1[1] - oy)}Z`;
}

/**
 * Cut-out head sticker: a (background-removed) portrait cropped to the head,
 * hair allowed to break out above, a rounded bottom at the neck, and a white
 * outline that follows the silhouette. The editorial "floating heads" look.
 * (cx, cy) is the face center; `size` the head width.
 */
export function headSticker(defs: Defs, ref: string | undefined, cx: number, cy: number, size: number, opts: { outline?: string; fallback?: string; initials?: string } = {}): string {
  const outline = defs.sticker(opts.outline ?? '#ffffff', Math.max(3, size * 0.035));
  if (!asset(ref)) {
    const fill = opts.fallback ?? '#888';
    const ts = { family: 'Barlow', weight: 800, size: size * 0.32, fill: '#fff' };
    return h('g', { filter: outline }, h('circle', { cx, cy, r: size * 0.44, fill }), opts.initials ? text(opts.initials, cx, cy + capHeight(ts) / 2, ts, 'middle') : '');
  }
  const hb = headBox(ref);
  if (hb) {
    // Scale the cutout so the detected head is `size` wide, centered on (cx, cy),
    // and clip just below the neck with a rounded edge.
    const imgW = size / hb.width;
    const imgH = imgW * hb.aspect;
    const headTop = hb.top * imgH;
    const neck = hb.neck * imgH;
    const ix = cx - hb.cx * imgW;
    const iy = cy - (headTop + neck) / 2;
    const neckY = iy + neck;
    const clip = defs.clipPath(
      `M${r2(ix)},${r2(iy - 10)}H${r2(ix + imgW)}V${r2(neckY - size * 0.18)}` +
        `Q${r2(cx + size * 0.5)},${r2(neckY + size * 0.12)} ${r2(cx)},${r2(neckY + size * 0.14)}` +
        `Q${r2(cx - size * 0.5)},${r2(neckY + size * 0.12)} ${r2(ix)},${r2(neckY - size * 0.18)}Z`,
    );
    return h('g', { filter: outline }, h('g', { clipPath: clip }, image(ref, ix, iy, imgW, imgH, { fit: 'contain' })));
  }
  // Opaque photo: crop to a circle-ish head region instead.
  const S = size * 2.05;
  const top = cy - S * 0.36;
  const neckR = size * 0.5;
  const clip = defs.clipPath(
    `M${r2(cx - size * 0.62)},${r2(top)}H${r2(cx + size * 0.62)}V${r2(cy)}` +
      `A${r2(neckR * 1.24)},${r2(neckR)} 0 0 1 ${r2(cx)},${r2(cy + neckR * 1.15)}` +
      `A${r2(neckR * 1.24)},${r2(neckR)} 0 0 1 ${r2(cx - size * 0.62)},${r2(cy)}Z`,
  );
  return h('g', { filter: outline }, h('g', { clipPath: clip }, image(ref, cx - S / 2, top, S, S, { focus: 'top' })));
}
