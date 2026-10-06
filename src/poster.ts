/**
 * Poster composition: background → layers → title → footer.
 *
 * The poster is the unit of design. Charts are just one layer among the title
 * lockup, hero imagery, annotations, legend and footer, which is the main
 * thing generic chart libraries get wrong.
 */
import { palette } from './core/color.js';
import { isDark, alpha, mix, darken, lighten } from './core/color.js';
import { Defs } from './core/defs.js';
import { arrow, image, icon } from './core/draw.js';
import { headBox } from './core/assets.js';
import { editorial } from './core/format.js';
import { h, g, resetIds, rectPath, type Box } from './core/svg.js';
import { measure, measureRuns, paragraph, runs, text, capHeight, wrap, type Run, type TextStyle } from './core/text.js';
import { typeSet } from './core/theme.js';
import { getRenderer } from './registry.js';
import type {
  AnnotationLayer,
  BackgroundSpec,
  Ctx,
  FooterSpec,
  ImageLayer,
  Layer,
  LegendLayer,
  PosterSpec,
  ShapeLayer,
  StatLayer,
  SvgLayer,
  TextLayer,
  TitleSpec,
} from './types.js';

export function renderPosterSVG(spec: PosterSpec): string {
  resetIds();
  const width = spec.width ?? 1200;
  const height = spec.height ?? 1500;
  const ctx: Ctx = { defs: new Defs(), pal: palette(spec.palette), type: typeSet(spec.type), width, height };

  const bg = background(spec.background ?? {}, ctx);
  const layers = (spec.layers ?? []).map((l) => layer(l, ctx)).join('');
  const title = spec.title ? titleLockup(spec.title, ctx) : '';
  const footer = spec.footer ? footerBlock(spec.footer, ctx) : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    ctx.defs.toString() +
    (textMasks.length ? `<defs>${textMasks.splice(0).join('')}</defs>` : '') +
    bg +
    layers +
    title +
    footer +
    `</svg>`
  );
}

// ───────────────────────────── background ─────────────────────────────

function background(b: BackgroundSpec, ctx: Ctx): string {
  const { width: W, height: H, defs, pal } = ctx;
  const parts: string[] = [];
  const base = b.color ?? pal.bg;
  const grad = b.gradient ?? (pal.bg2 ? [pal.bg, pal.bg2] : undefined);
  const fill = grad ? defs.linear(grad.map((c, i) => [i / (grad.length - 1), c]), 90) : base;
  parts.push(h('rect', { width: W, height: H, fill }));

  if (b.glow) {
    const [gx, gy] = b.glowAt ?? [0.7, 0.25];
    parts.push(h('rect', { width: W, height: H, fill: defs.radial([[0, b.glow, 0.9], [1, b.glow, 0]], gx, gy, 0.6) }));
  }

  if (b.pattern && b.pattern !== 'none') {
    const c = b.patternColor ?? alpha(pal.ink, 0.06);
    const pf = b.pattern === 'dots' ? defs.dots(c, { gap: 14, r: 1.2 }) : b.pattern === 'hatch' ? defs.hatch(c, { gap: 10, width: 1 }) : defs.guilloche(c, { scale: 2 });
    parts.push(h('rect', { width: W, height: H, fill: pf }));
  }

  if (b.image) {
    const box = b.imageBox ?? { x: 0, y: 0, w: W, h: H };
    const filter = b.imageFilter === 'grayscale' ? defs.grayscale() : b.imageFilter === 'duotone' ? defs.duotone(pal.ramp[pal.ramp.length - 1], pal.ramp[0]) : undefined;
    const mask =
      b.imageFade === 'bottom'
        ? defs.fadeMask(box, [[0, 1], [0.6, 1], [1, 0]])
        : b.imageFade === 'top'
          ? defs.fadeMask(box, [[0, 0], [0.4, 1], [1, 1]])
          : undefined;
    parts.push(image(b.image, box.x, box.y, box.w, box.h, { filter, opacity: b.imageOpacity ?? 1, mask }));
  }

  const grain = b.grain ?? (isDark(base) ? 0.04 : 0.06);
  if (grain > 0) parts.push(h('rect', { width: W, height: H, filter: defs.grain(grain), fill: '#808080', opacity: 1, style: 'mix-blend-mode:multiply' }));
  return h('g', { class: 'bg' }, ...parts);
}

// ───────────────────────────── title ─────────────────────────────

function titleLockup(t: TitleSpec, ctx: Ctx): string {
  const { pal, type, width: W } = ctx;
  const box = t.box ?? { x: 64, y: 56, w: W - 128, h: 300 };
  const align = t.align ?? 'start';
  const ax = align === 'middle' ? box.x + box.w / 2 : align === 'end' ? box.x + box.w : box.x;
  const parts: string[] = [];
  let y = box.y;

  t.lines.forEach((line, i) => {
    const role = line.role ?? (i === 0 && t.lines.length === 1 ? 'display' : line.size && line.size >= 60 ? 'display' : 'kicker');
    const base: TextStyle = { ...type[role], fill: pal.ink, ...stripLine(line) };
    let list: Run[] = line.runs ? line.runs : [{ text: line.text ?? '' }];
    let size = base.size ?? (role === 'display' ? 96 : 28);
    if (line.fit) {
      const w100 = measureRuns(list.map((r) => ({ ...r, size: r.size ? (r.size / size) * 100 : 100 })), { ...base, size: 100 });
      size = (box.w / w100) * 100;
      list = list.map((r) => (r.size ? { ...r, size: (r.size / (base.size ?? size)) * size } : r));
    }
    // Never overflow the title box: shrink the line to fit.
    const stretch = line.stretch ?? 1;
    const natural = measureRuns(list, { ...base, size }) * stretch;
    if (natural > box.w) {
      const k = box.w / natural;
      size *= k;
      list = list.map((r) => (r.size ? { ...r, size: r.size * k } : r));
    }
    const style = { ...base, size };
    const lineAlign = line.align ?? align;
    const lx = lineAlign === 'middle' ? box.x + box.w / 2 : lineAlign === 'end' ? box.x + box.w : box.x;
    const cap = capHeight(style);
    y += cap;
    const w = measureRuns(list, style) * stretch;
    if (line.highlight) {
      const x0 = lineAlign === 'middle' ? lx - w / 2 : lineAlign === 'end' ? lx - w : lx;
      parts.push(h('rect', { x: x0 - size * 0.15, y: y - cap - size * 0.12, width: w + size * 0.3, height: cap + size * 0.28, fill: line.highlight, rx: size * 0.08 }));
    }
    let lineSvg = runs(list, lx, y, style, lineAlign);
    if (line.effect) lineSvg = letterEffect(line.effect, list, lx, y, style, lineAlign, w / stretch, cap, ctx);
    // Condense around the anchor point so alignment is preserved.
    parts.push(stretch === 1 ? lineSvg : h('g', { transform: `translate(${lx},0) scale(${stretch},1) translate(${-lx},0)` }, lineSvg));
    if (line.flank) {
      const fs = size * 0.11;
      const fx0 = lx - w / 2 - size * 0.32;
      const fx1 = lx + w / 2 + size * 0.32;
      const fy = y - cap * 0.5;
      const star = (x: number) =>
        line.flank === 'dot'
          ? h('circle', { cx: x, cy: fy, r: fs * 0.5, fill: line.flankColor ?? pal.accent })
          : h('path', { d: `M${x},${fy - fs * 1.4}Q${x},${fy} ${x + fs * 1.4},${fy}Q${x},${fy} ${x},${fy + fs * 1.4}Q${x},${fy} ${x - fs * 1.4},${fy}Q${x},${fy} ${x},${fy - fs * 1.4}Z`, fill: line.flankColor ?? pal.accent });
      parts.push(star(fx0), star(fx1));
    }
    if (line.rules) {
      const x0 = lx - w / 2 - size * 0.6;
      const x1 = lx + w / 2 + size * 0.6;
      const ry = y - cap / 2;
      parts.push(h('path', { d: `M${box.x + box.w * 0.08},${ry}H${x0}M${x1},${ry}H${box.x + box.w * 0.92}`, stroke: style.fill, strokeWidth: 1.5 }));
    }
    // Display faces need room for descenders; small kicker lines less so.
    y += line.gap ?? size * (role === 'display' ? 0.42 : 0.5);
  });

  if (t.dek) {
    const dekStyle: TextStyle = { ...type.body, size: t.dekSize ?? 24, fill: t.dekColor ?? pal.ink };
    if (t.dekRule) {
      y += 8;
      parts.push(h('rect', { x: box.x, y, width: box.w, height: 2.5, fill: t.dekRule }));
      y += 14;
    }
    y += 18;
    const dw = t.dekWidth ?? box.w;
    const p = paragraph(t.dek, ax, y + (dekStyle.size ?? 24), dw, dekStyle, { anchor: align, lineHeight: 1.32, boldWeight: 700 });
    if (t.dekPanel) {
      const px = align === 'middle' ? ax - dw / 2 : align === 'end' ? ax - dw : ax;
      parts.push(h('path', { d: rectPath(px - 18, y - 4, dw + 36, p.height + 26, 10), fill: t.dekPanel }));
    }
    parts.push(p.svg);
    y += p.height;
  }

  const frameColor = t.frameColor ?? pal.accent;
  const bottom = t.box?.h && !t.frame ? Math.max(y, box.y + box.h) : y + 8;
  let frame = '';
  if (t.panel) frame += h('path', { d: rectPath(box.x - 32, box.y - 36, box.w + 64, bottom - box.y + 48, 18), fill: t.panel });
  if (t.frame === 'ornate') frame += ornateFrame({ x: box.x - 40, y: box.y - 48, w: box.w + 80, h: bottom - box.y + 72 }, frameColor, t.panel ?? pal.bg);
  if (t.frame === 'box') frame += h('path', { d: rectPath(box.x - 28, box.y - 32, box.w + 56, bottom - box.y + 44, 16), fill: 'none', stroke: frameColor, strokeWidth: 3 });
  if (t.frame === 'rule') frame += h('path', { d: `M${box.x},${bottom}H${box.x + box.w}`, stroke: frameColor, strokeWidth: 3 });
  const textGroup = t.shadow ? g({ filter: ctx.defs.shadow({ dy: 2, blur: 14, color: '#000', opacity: 0.6 }) }, ...parts) : parts.join('');
  return g({ class: 'title' }, frame, textGroup);
}

function stripLine(line: TitleSpec["lines"][number]): TextStyle {
  const { text: _t, runs: _r, role: _ro, fit: _f, gap: _g, align: _a, rules: _ru, highlight: _h, stretch: _s, flank: _fl, flankColor: _fc, effect: _ef, ...rest } = line;
  return rest as TextStyle;
}

/** Lettering effects for title lines. Text is already vector paths, so every effect is plain SVG. */
function letterEffect(
  e: NonNullable<TitleSpec['lines'][number]['effect']>,
  list: Run[],
  x: number,
  y: number,
  style: TextStyle,
  anchor: 'start' | 'middle' | 'end',
  w: number,
  cap: number,
  ctx: Ctx,
): string {
  const { defs } = ctx;
  const base = runs(list, x, y, style, anchor);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const size = style.size ?? 60;
  const recolor = (fill: string, extra: TextStyle = {}) => runs(list.map((r) => ({ ...r, fill })), x, y, { ...style, fill, ...extra }, anchor);
  switch (e.type) {
    case 'neon': {
      const glow = e.color ?? '#ff3df2';
      const blur = defs.glow(glow, size * 0.18);
      return h('g', {}, h('g', { filter: blur }, recolor(glow, { stroke: glow, strokeWidth: size * 0.05 })), recolor('#ffffff', { stroke: glow, strokeWidth: size * 0.02 }));
    }
    case 'extrude': {
      const depth = e.depth ?? Math.round(size * 0.08);
      const side = e.color ?? darken(style.fill ?? '#000', 0.35);
      const layers: string[] = [];
      for (let d = depth; d > 0; d--) layers.push(h('g', { transform: `translate(${d * 0.7},${d})` }, recolor(side)));
      return h('g', {}, ...layers, base);
    }
    case 'shadow': {
      const depth = e.depth ?? Math.round(size * 0.06);
      return h('g', {}, h('g', { transform: `translate(${depth},${depth})` }, recolor(e.color ?? '#000000')), base);
    }
    case 'outline':
      return recolor('none', { stroke: e.color ?? style.fill, strokeWidth: Math.max(1.5, size * 0.03) });
    case 'gradient': {
      const cs = e.colors ?? [lighten(style.fill ?? '#888', 0.25), darken(style.fill ?? '#888', 0.2)];
      const g = defs.linear(cs.map((c, i) => [i / (cs.length - 1), c]), e.angle ?? 90);
      // Gradient in user space across the line's box.
      return h('g', { mask: textMask(base, ctx, x0, y - cap, w, cap * 1.35) }, h('rect', { x: x0 - 4, y: y - cap - size * 0.12, width: w + 8, height: cap + size * 0.35, fill: g }));
    }
    case 'image': {
      const mk = textMask(recolor('#ffffff'), ctx, x0, y - cap, w, cap * 1.35);
      return h('g', {}, h('g', { filter: defs.shadow({ dy: size * 0.04, blur: size * 0.06, opacity: 0.45 }) }, h('g', { mask: mk }, image(e.image, x0 - 6, y - cap - size * 0.15, w + 12, cap + size * 0.4))));
    }
  }
  return base;
}

let maskSeq = 0;
function textMask(markup: string, ctx: Ctx, x: number, y: number, w: number, hh: number): string {
  void ctx;
  void x;
  void y;
  void w;
  void hh;
  const id = `tm${maskSeq++}`;
  // White text on black = visible where the letters are.
  textMasks.push(`<mask id="${id}" maskUnits="userSpaceOnUse">${markup.replace(/fill="[^"]*"/g, 'fill="#ffffff"')}</mask>`);
  return `url(#${id})`;
}
const textMasks: string[] = [];

/** Victorian-label frame: double line with notched, scalloped corners. */
function ornateFrame(b: Box, color: string, fill: string): string {
  const notch = 34;
  const shape = (inset: number) => {
    const x0 = b.x + inset;
    const y0 = b.y + inset;
    const x1 = b.x + b.w - inset;
    const y1 = b.y + b.h - inset;
    const n = notch - inset * 0.4;
    const midX = (x0 + x1) / 2;
    const peak = 26 - inset * 0.3;
    return [
      `M${x0 + n},${y0}`,
      `L${midX - 60},${y0}L${midX},${y0 - peak}L${midX + 60},${y0}`,
      `L${x1 - n},${y0}Q${x1 - n},${y0 + n} ${x1},${y0 + n}`,
      `L${x1},${y1 - n}Q${x1 - n},${y1 - n} ${x1 - n},${y1}`,
      `L${midX + 60},${y1}L${midX},${y1 + peak}L${midX - 60},${y1}`,
      `L${x0 + n},${y1}Q${x0 + n},${y1 - n} ${x0},${y1 - n}`,
      `L${x0},${y0 + n}Q${x0 + n},${y0 + n} ${x0 + n},${y0}Z`,
    ].join('');
  };
  return g(
    {},
    h('path', { d: shape(0), fill, stroke: color, strokeWidth: 7 }),
    h('path', { d: shape(14), fill: 'none', stroke: color, strokeWidth: 2.5 }),
  );
}

// ───────────────────────────── footer ─────────────────────────────

function footerBlock(f: FooterSpec, ctx: Ctx): string {
  const { pal, type, width: W, height: H } = ctx;
  const stripH = f.strip ? 64 : 0;
  const color = f.color ?? alpha(pal.ink, 0.62);
  const parts: string[] = [];
  const noteStyle: TextStyle = { ...type.note, size: 16, fill: color };
  const lh = 16 * 1.3;
  const brandW = f.brand || f.logo ? 250 : 0;
  const textW = W - 60 * 2 - brandW - 24;
  // Bottom-anchored: measure first so long sources grow upward instead of off-canvas.
  const srcLines = f.source ? wrap(`Source: ${f.source}`, textW, noteStyle).length : 0;
  const noteLines = f.note ? wrap(f.note, textW, noteStyle).length : 0;
  const bottom = H - stripH - 28;
  let y = bottom - (srcLines + noteLines - 1) * lh;
  if (f.note) {
    const p = paragraph(f.note, 60, y, textW, noteStyle, { lineHeight: 1.3 });
    parts.push(p.svg);
    y += p.height;
  }
  if (f.source) parts.push(paragraph(`**Source:** ${f.source}`, 60, y, textW, noteStyle, { lineHeight: 1.3, boldWeight: 600 }).svg);

  if (f.logo) parts.push(image(f.logo, W - 60 - 200, bottom - 36, 200, 46, { fit: 'contain' }));
  else if (f.brand) {
    const bs: TextStyle = { family: 'Barlow', weight: 800, size: 22, tracking: 0.16, upper: true, fill: f.brandColor ?? pal.ink };
    const bw = measure(f.brand, bs);
    parts.push(h('circle', { cx: W - 60 - bw - 22, cy: bottom - 8, r: 12, fill: 'none', stroke: bs.fill, strokeWidth: 4 }));
    parts.push(text(f.brand, W - 60, bottom, bs, 'end'));
  }
  if (f.strip) {
    parts.push(h('rect', { x: 0, y: H - stripH, width: W, height: stripH, fill: f.strip.color }));
    if (f.strip.text) parts.push(text(f.strip.text, 60, H - stripH / 2 + 8, { ...type.label, size: 22, fill: f.strip.textColor ?? '#fff' }));
  }
  return g({ class: 'footer' }, ...parts);
}

// ───────────────────────────── layers ─────────────────────────────

function layer(l: Layer, ctx: Ctx): string {
  const box = l.box ?? { x: 64, y: 360, w: ctx.width - 128, h: ctx.height - 360 - 120 };
  let out = '';
  switch (l.type) {
    case 'text':
      out = textLayer(l as TextLayer, box, ctx);
      break;
    case 'image':
      out = imageLayer(l as ImageLayer, box, ctx);
      break;
    case 'stat':
      out = statLayer(l as StatLayer, box, ctx);
      break;
    case 'annotation':
      out = annotationLayer(l as AnnotationLayer, box, ctx);
      break;
    case 'shape':
      out = shapeLayer(l as ShapeLayer, box);
      break;
    case 'svg':
      out = h('g', { transform: `translate(${box.x},${box.y})` }, (l as SvgLayer).markup);
      break;
    case 'legend':
      out = legendLayer(l as LegendLayer, box, ctx);
      break;
    default: {
      const r = getRenderer(l.type);
      if (!r) throw new Error(`vivid: unknown layer type "${l.type}"`);
      out = r(l, box, ctx);
    }
  }
  const t = l.rotate ? `rotate(${l.rotate} ${box.x + box.w / 2} ${box.y + box.h / 2})` : undefined;
  return h('g', { class: `layer ${l.type}`, opacity: l.opacity, transform: t }, out);
}

function textLayer(l: TextLayer, box: Box, ctx: Ctx): string {
  const style: TextStyle = { ...ctx.type[l.role ?? 'body'], size: 22, fill: ctx.pal.ink, ...l.style };
  const ax = l.align === 'middle' ? box.x + box.w / 2 : l.align === 'end' ? box.x + box.w : box.x;
  return paragraph(l.text, ax, box.y + capHeight(style), box.w, style, { anchor: l.align, lineHeight: l.lineHeight ?? 1.3, boldWeight: 700, boldFill: l.boldFill }).svg;
}

function imageLayer(l: ImageLayer, box: Box, ctx: Ctx): string {
  const { defs, pal } = ctx;
  if (l.head) {
    const hb = headBox(l.src);
    if (hb) {
      const w = l.head.size / hb.width;
      const hgt = w * hb.aspect;
      const headMidY = ((hb.top + hb.neck) / 2) * hgt;
      box = { x: l.head.x - hb.cx * w, y: l.head.y - headMidY, w, h: hgt };
    } else {
      // No silhouette: treat the photo as a head-and-shoulders crop.
      const s = l.head.size * 2.2;
      box = { x: l.head.x - s / 2, y: l.head.y - s * 0.32, w: s, h: s };
    }
  }
  const filter = l.filter === 'grayscale' ? defs.grayscale(1.15) : l.filter === 'duotone' ? defs.duotone(...(l.duotone ?? [pal.ramp[pal.ramp.length - 1], pal.ramp[0]])) : undefined;
  const clip = l.shape === 'circle' ? defs.clipCircle(box.x + box.w / 2, box.y + box.h / 2, Math.min(box.w, box.h) / 2) : l.radius ? defs.clipPath(rectPath(box.x, box.y, box.w, box.h, l.radius)) : undefined;
  let img = image(l.src, box.x, box.y, box.w, box.h, { fit: l.head ? 'contain' : l.fit, focus: l.focus ?? 'top', filter, clip });
  if (l.fade) {
    // Each axis gets its own gradient mask; nesting the groups multiplies them.
    const { left = 0, right = 0, top = 0, bottom = 0 } = l.fade;
    const e = 0.0001;
    if (left || right) img = h('g', { mask: defs.fadeMask(box, [[0, left ? 0 : 1], [left || e, 1], [1 - (right || e), 1], [1, right ? 0 : 1]], 0) }, img);
    if (top || bottom) img = h('g', { mask: defs.fadeMask(box, [[0, top ? 0 : 1], [top || e, 1], [1 - (bottom || e), 1], [1, bottom ? 0 : 1]], 90) }, img);
  }
  if (l.until !== undefined || l.head) {
    // Head-placed cutouts always get a soft bottom so no hard photo edge shows.
    const until = Math.min(l.until ?? Infinity, box.y + box.h);
    const len = Math.min(l.untilFade ?? 140, (until - box.y) * 0.5);
    const fb = { x: box.x - 2, y: box.y, w: box.w + 4, h: Math.max(1, until - box.y) };
    const start = Math.max(0, (fb.h - len) / fb.h);
    img = h('g', { mask: defs.fadeMask(fb, [[0, 1], [start, 1], [1, 0]], 90) }, img);
  }
  return h('g', { filter: l.shadow ? defs.shadow({ dy: 10, blur: 30, opacity: 0.35 }) : undefined }, img);
}

function statLayer(l: StatLayer, box: Box, ctx: Ctx): string {
  const size = l.size ?? 96;
  const style: TextStyle = { ...ctx.type.number, size, fill: l.color ?? ctx.pal.accent };
  const align = l.align ?? 'start';
  const ax = align === 'middle' ? box.x + box.w / 2 : align === 'end' ? box.x + box.w : box.x;
  const cap = capHeight(style);
  const parts = [runs(editorial(l.value, style, l.format), ax, box.y + cap, style, align)];
  let y = box.y + cap + size * 0.18;
  if (l.label) {
    const ls: TextStyle = { ...ctx.type.label, size: size * 0.24, fill: ctx.pal.ink };
    y += capHeight(ls) + 4;
    parts.push(text(l.label, ax, y, ls, align));
  }
  if (l.sublabel) {
    const ss: TextStyle = { ...ctx.type.body, size: size * 0.19, fill: ctx.pal.muted };
    y += capHeight(ss) + 10;
    parts.push(paragraph(l.sublabel, ax, y, box.w, ss, { anchor: align }).svg);
  }
  return parts.join('');
}

function annotationLayer(l: AnnotationLayer, box: Box, ctx: Ctx): string {
  const { pal, type } = ctx;
  const color = l.color ?? pal.ink;
  const style: TextStyle = { ...type.note, size: 22, fill: color, ...l.style };
  const align = l.align ?? 'start';
  const parts: string[] = [];
  if (l.tag) {
    const ts: TextStyle = { ...type.label, size: style.size, fill: l.tagFill ? (isDark(l.tagFill) ? '#fff' : '#111') : pal.bg, upper: true, ...l.style, italic: false };
    const w = measure(l.text, ts);
    const padX = (ts.size ?? 20) * 0.5;
    const hh = (ts.size ?? 20) * 1.5;
    const x0 = align === 'middle' ? box.x + box.w / 2 - w / 2 - padX : align === 'end' ? box.x + box.w - w - padX * 2 : box.x;
    parts.push(h('path', { d: rectPath(x0, box.y, w + padX * 2, hh, hh * 0.18), fill: l.tagFill ?? pal.ink, stroke: l.border, strokeWidth: l.border ? 2 : undefined }));
    parts.push(text(l.text, x0 + padX, box.y + hh / 2 + capHeight(ts) / 2, ts));
  } else {
    let x = align === 'middle' ? box.x + box.w / 2 : align === 'end' ? box.x + box.w : box.x;
    let w = box.w;
    if (l.info) {
      const s = style.size ?? 22;
      parts.push(icon('icon:ph:info', box.x, box.y - 2, s * 1.4, color));
      if (align === 'start') {
        x += s * 1.7;
        w -= s * 1.7;
      }
    }
    const p = paragraph(l.text, x, box.y + capHeight(style), w, style, { anchor: align, lineHeight: 1.28, boldWeight: (style.weight ?? 400) + 300 > 900 ? 900 : (style.weight ?? 400) + 300 });
    if (l.border) parts.push(h('path', { d: rectPath(box.x - 16, box.y - 16, box.w + 32, p.height + 32, 10), fill: 'none', stroke: l.border, strokeWidth: 1.5 }));
    parts.push(p.svg);
  }
  if (l.to) {
    const [tx, ty] = l.to;
    const from = l.from ?? nearestEdge(box, tx, ty);
    parts.push(arrow(from[0], from[1], tx, ty, { color: l.arrowColor ?? color, bend: l.bend ?? 0.25 }));
  }
  return parts.join('');
}

function nearestEdge(b: Box, tx: number, ty: number): [number, number] {
  const cx = b.x + b.w / 2;
  const cy = b.y + 14;
  if (tx < b.x) return [b.x - 8, cy];
  if (tx > b.x + b.w) return [b.x + b.w + 8, cy];
  if (ty < b.y) return [cx, b.y - 8];
  return [cx, b.y + b.h + 8];
}

function shapeLayer(l: ShapeLayer, b: Box): string {
  const common = { fill: l.fill ?? 'none', stroke: l.stroke, strokeWidth: l.strokeWidth, strokeDasharray: l.dash };
  if (l.shape === 'circle') return h('circle', { cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: Math.min(b.w, b.h) / 2, ...common });
  if (l.shape === 'line') return h('path', { d: `M${b.x},${b.y}L${b.x + b.w},${b.y + b.h}`, ...common, fill: 'none', stroke: l.stroke ?? '#000' });
  if (l.shape === 'path') return h('path', { d: l.d ?? '', transform: `translate(${b.x},${b.y})`, ...common });
  return h('path', { d: rectPath(b.x, b.y, b.w, b.h, l.radius ?? 0), ...common });
}

function legendLayer(l: LegendLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const size = l.size ?? 22;
  const ls: TextStyle = { ...type.label, size, fill: pal.ink };
  const parts: string[] = [];
  const dir = l.direction ?? 'column';
  let x = box.x + (l.panel ? 28 : 0);
  let y = box.y + (l.panel ? 28 : 0);
  if (l.title) {
    parts.push(text(l.title, x, y + capHeight({ ...ls, weight: 800 }), { ...ls, weight: 800, upper: true }));
    y += size * 1.6;
  }
  const rowH = size * 1.8;
  for (const it of l.items) {
    const c = it.color ?? pal.accent;
    const sw = size * 1.1;
    const cy = y + rowH / 2;
    const fill = it.pattern === 'hatch' ? defs.hatch(c, { gap: 5, width: 2, bg: mix(c, '#fff', 0.6) }) : it.pattern === 'dots' ? defs.dots(c) : c;
    if (it.icon) parts.push(icon(it.icon, x, cy - sw / 2, sw, c));
    else if ((l.swatch ?? 'circle') === 'circle') parts.push(h('circle', { cx: x + sw / 2, cy, r: sw / 2, fill }));
    else if (l.swatch === 'pill') parts.push(h('path', { d: rectPath(x, cy - sw * 0.35, sw * 1.6, sw * 0.7, sw * 0.35), fill }));
    else parts.push(h('rect', { x, y: cy - sw / 2, width: sw, height: sw, fill, rx: 3 }));
    const tx = x + (l.swatch === 'pill' ? sw * 1.6 : sw) + size * 0.5;
    parts.push(text(it.label, tx, cy + capHeight(ls) / 2, ls));
    if (dir === 'row') x = tx + measure(it.label, ls) + size * 1.4;
    else y += rowH;
  }
  if (l.panel) {
    const hgt = dir === 'row' ? rowH + 56 : y - box.y + 28;
    parts.unshift(h('path', { d: rectPath(box.x, box.y, box.w, hgt, 18), fill: l.panel }));
  }
  return parts.join('');
}
