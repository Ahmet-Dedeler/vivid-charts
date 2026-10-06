/**
 * bubble-pack: packed circles, area ∝ value, colored by group, each bubble
 * labelled inside (flag/logo, name, value) with the label scaled to the
 * bubble. Small bubbles get their label underneath. One hero bubble can carry
 * a short note.
 *
 * The "Household Net Worth by Country", "Revenue per Employee" and
 * "Biggest International Investors" form: a ranking where the big-vs-small
 * contrast is the story and exact order matters less.
 */
import { hierarchy, pack } from 'd3-hierarchy';
import { alpha, darken, lighten, onColor } from '../core/color.js';
import { flag, icon, image } from '../core/draw.js';
import { editorial, type FormatOptions } from '../core/format.js';
import { h } from '../core/svg.js';
import { untracked, capHeight, measure, paragraph, runs, text, type TextStyle } from '../core/text.js';
import { registerChart } from '../registry.js';
import type { Box, Ctx, LayerBase } from '../types.js';

export interface PackItem {
  label: string;
  value: number;
  group?: string;
  flag?: string;
  /** Logo: icon ref (icon:simple-icons:nvidia) or image ref. */
  logo?: string;
  display?: string;
  /** Small caption under the value ("2025 household net worth"). */
  caption?: string;
  note?: string;
  color?: string;
  /** Rank badge number. */
  rank?: number;
}

export interface BubblePackLayer extends LayerBase {
  type: 'bubble-pack';
  items: PackItem[];
  groups?: Record<string, { label?: string; color?: string }>;
  format?: FormatOptions;
  /** Space between bubbles. */
  padding?: number;
  /** 3D-ish sphere shading. */
  shading?: boolean;
  /** Ring outline in the bg color. */
  ring?: boolean;
}

function render(l: BubblePackLayer, box: Box, ctx: Ctx): string {
  const { pal, type, defs } = ctx;
  const groups = [...new Set(l.items.map((i) => i.group ?? '_'))];
  const colorOf = (it: PackItem) => it.color ?? l.groups?.[it.group ?? '_']?.color ?? pal.cats[groups.indexOf(it.group ?? '_') % pal.cats.length];
  // Area ∝ value is d3.pack's default (radius ∝ √value).
  const root = hierarchy<any>({ children: l.items }).sum((d) => d.value ?? 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  pack<any>().size([box.w, box.h]).padding(l.padding ?? 6)(root);
  const parts: string[] = [];
  const labels: string[] = [];
  for (const leaf of root.leaves() as any[]) {
    const it = leaf.data as PackItem;
    const cx = box.x + leaf.x;
    const cy = box.y + leaf.y;
    const r = leaf.r;
    const c = colorOf(it);
    const fill = l.shading === false ? c : defs.radial([[0, lighten(c, 0.1)], [0.7, c], [1, darken(c, 0.08)]], 0.38, 0.32, 0.75);
    parts.push(h('circle', { cx, cy, r, fill, stroke: l.ring ? pal.bg : undefined, strokeWidth: l.ring ? 3 : undefined, filter: defs.shadow({ dy: r * 0.03, blur: r * 0.08, opacity: 0.18 }) }));
    const ink = onColor(c, '#111111', '#ffffff');
    const vs: TextStyle = { ...type.number, size: Math.max(10, r * 0.38), fill: ink, italic: false };
    const vr = editorial(it.display ?? it.value, vs, l.format);
    const name = it.label;
    const ns: TextStyle = { ...type.label, size: Math.max(9, r * 0.2), fill: ink, weight: 600 };
    if (r >= 30) {
      // Fit name and value to ~1.6r width.
      const maxW = r * 1.6;
      const nw = measure(name, ns);
      if (nw > maxW) ns.size = (ns.size! * maxW) / nw;
      const vw = measure(vr.map((x) => x.text).join(''), vs);
      if (vw > maxW) {
        const k = maxW / vw;
        vs.size = vs.size! * k;
      }
      const mark = it.logo || it.flag ? r * 0.36 : 0;
      const noteS: TextStyle = { ...type.body, size: Math.max(12, r * 0.07), fill: ink };
      // Measure only (untracked so the layout check doesn't see a phantom copy at y=0).
      const noteP = it.note && r > 120 ? untracked(() => paragraph(it.note!, cx, 0, r * 1.3, noteS, { anchor: 'middle', boldWeight: 700, lineHeight: 1.25 })) : null;
      const blockH = mark + (mark ? r * 0.08 : 0) + capHeight(ns) + r * 0.1 + capHeight(vs) + (it.caption ? r * 0.2 : 0) + (noteP ? noteP.height + r * 0.12 : 0);
      let y = cy - blockH / 2;
      if (it.logo) {
        if (it.logo.startsWith('icon:')) labels.push(icon(it.logo, cx - mark / 2, y, mark, ink));
        else labels.push(image(it.logo, cx - mark, y, mark * 2, mark, { fit: 'contain' }));
        y += mark + r * 0.08;
      } else if (it.flag) {
        labels.push(flag(defs, it.flag, cx, y + mark / 2, mark / 2, alpha('#fff', 0.7)));
        y += mark + r * 0.08;
      }
      y += capHeight(ns);
      labels.push(text(name, cx, y, ns, 'middle'));
      y += r * 0.1 + capHeight(vs);
      labels.push(runs(editorial(it.display ?? it.value, vs, l.format), cx, y, vs, 'middle'));
      if (it.caption) labels.push(paragraph(it.caption, cx, y + r * 0.16, r * 1.3, { ...type.label, size: Math.max(9, r * 0.075), fill: ink, upper: true, weight: 600 }, { anchor: 'middle', lineHeight: 1.15 }).svg);
      if (noteP) labels.push(paragraph(it.note!, cx, y + (it.caption ? r * 0.2 : 0) + r * 0.12 + noteS.size!, r * 1.3, noteS, { anchor: 'middle', boldWeight: 700, lineHeight: 1.25 }).svg);
    } else {
      // Small: flag inside, label + value beneath.
      if (it.flag) labels.push(flag(defs, it.flag, cx, cy, r * 0.62, alpha('#fff', 0.7)));
      else if (it.logo?.startsWith('icon:')) labels.push(icon(it.logo, cx - r * 0.6, cy - r * 0.6, r * 1.2, ink));
      const ss: TextStyle = { ...type.label, size: 13, fill: pal.ink, weight: 600 };
      labels.push(text(name, cx, cy + r + 15, ss, 'middle'));
      labels.push(runs(editorial(it.display ?? it.value, { ...ss, weight: 800 }, l.format), cx, cy + r + 31, { ...ss, weight: 800 }, 'middle'));
    }
    if (it.rank !== undefined) {
      const br = Math.max(11, r * 0.12);
      const bx = cx;
      const by = cy - r;
      labels.push(h('circle', { cx: bx, cy: by, r: br, fill: pal.bg, stroke: pal.ink, strokeWidth: 1.5 }));
      labels.push(text(String(it.rank), bx, by + capHeight({ ...type.label, size: br }) / 2, { ...type.label, size: br, fill: pal.ink, weight: 700 }, 'middle'));
    }
  }
  return parts.join('') + labels.join('');
}

registerChart('bubble-pack', render as never);
