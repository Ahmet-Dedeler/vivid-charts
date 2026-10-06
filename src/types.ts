/**
 * The poster spec: what an agent (or a human) writes to get a finished graphic.
 *
 * A poster is a canvas with a background, a title lockup, any number of
 * absolutely positioned layers (charts, text, images, stats, annotations,
 * raw SVG) and a footer with source + brand. Positions are in px on the
 * canvas (default 1200×1500, the 4:5 ratio social feeds favour).
 */
import type { Defs } from './core/defs.js';
import type { Palette } from './core/color.js';
import type { Run, TextStyle, Anchor } from './core/text.js';
import type { TypeSet } from './core/theme.js';
import type { Box } from './core/svg.js';

export type { Box, Run, TextStyle, Anchor, Palette, TypeSet };

export interface Ctx {
  defs: Defs;
  pal: Palette;
  type: TypeSet;
  width: number;
  height: number;
}

export interface BackgroundSpec {
  color?: string;
  /** Vertical gradient top → bottom. */
  gradient?: string[];
  /** Radial glow color placed at `glowAt` (0..1 coords). */
  glow?: string;
  glowAt?: [number, number];
  /** Paper grain amount 0..0.3. Default 0.06 on light, 0.04 on dark bgs. */
  grain?: number;
  image?: string;
  imageOpacity?: number;
  imageFilter?: 'grayscale' | 'duotone' | 'none';
  /** Fade the bg image out toward this edge. */
  imageFade?: 'top' | 'bottom' | 'none';
  imageBox?: Box;
  /** Faint full-canvas pattern. */
  pattern?: 'dots' | 'hatch' | 'guilloche' | 'none';
  patternColor?: string;
}

export interface TitleLine extends TextStyle {
  text?: string;
  runs?: Run[];
  /** Use the display face (default true for the first big line). */
  role?: keyof TypeSet;
  /** Scale this line to fill the title box width. */
  fit?: boolean;
  /** Space after this line in px (default 0.1 × size). */
  gap?: number;
  align?: Anchor;
  /** Draw a rule through the line's whitespace on either side ("— WORLD'S RICHEST —"). */
  rules?: boolean;
  /** Highlighter behind the text. */
  highlight?: string;
  /** Horizontal scale, e.g. 0.82 to condense a wide display face. */
  stretch?: number;
  /** Small ornament on both sides of the line (sparkle ✦ or dot). Centered lines only. */
  flank?: 'sparkle' | 'dot';
  flankColor?: string;
}

export interface TitleSpec {
  box?: Box;
  lines: TitleLine[];
  align?: Anchor;
  /** Optional dek/standfirst paragraph under the title. Supports **bold**. */
  dek?: string;
  dekWidth?: number;
  dekSize?: number;
  dekColor?: string;
  /** Draw a rule (this color) between the title lines and the dek. */
  dekRule?: string;
  /** Translucent panel behind the dek (e.g. "rgba(10,30,70,0.55)") for busy photo backgrounds. */
  dekPanel?: string;
  /** Draw an ornamental frame around the lockup. */
  frame?: 'none' | 'ornate' | 'box' | 'rule';
  frameColor?: string;
  /** Solid panel behind the lockup. */
  panel?: string;
  /** Soft dark shadow behind all title text, for legibility over photos. */
  shadow?: boolean;
}

export interface FooterSpec {
  source?: string;
  note?: string;
  /** Text wordmark drawn bottom-right (your publication / handle). */
  brand?: string;
  logo?: string;
  /** Unused (footer is bottom-anchored and sizes itself). */
  height?: number;
  brandColor?: string;
  color?: string;
  /** A solid strip at the very bottom (app-store style banner). */
  strip?: { color: string; text?: string; textColor?: string };
}

export interface LayerBase {
  type: string;
  box?: Box;
  /** Optional id for debugging; ignored by renderers. */
  id?: string;
  opacity?: number;
  /** Rotate the whole layer (deg) around its box center. */
  rotate?: number;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  role?: keyof TypeSet;
  style?: TextStyle;
  align?: Anchor;
  lineHeight?: number;
  /** Color for **bold** spans. */
  boldFill?: string;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string;
  fit?: 'cover' | 'contain';
  focus?: 'top' | 'center' | 'bottom';
  filter?: 'grayscale' | 'duotone' | 'none';
  duotone?: [string, string];
  /** Fade edges into the background: e.g. { left: 0.3, bottom: 0.2 } fractions of the box. */
  fade?: { left?: number; right?: number; top?: number; bottom?: number };
  shape?: 'rect' | 'circle';
  radius?: number;
  shadow?: boolean;
  /**
   * Place a cutout by its head instead of by box: the detected head is centered
   * on (x, y) at `size` px wide. Ideal for photo collages. `box` is ignored.
   */
  head?: { x: number; y: number; size: number };
  /** Fade the image out to transparent, finishing at this canvas y (soft bottom edge for collages). */
  until?: number;
  /** Fade length in px for `until` (default 140). */
  untilFade?: number;
}

export interface StatLayer extends LayerBase {
  type: 'stat';
  value: number | string;
  format?: import('./core/format.js').FormatOptions;
  label?: string;
  sublabel?: string;
  color?: string;
  size?: number;
  align?: Anchor;
}

export interface AnnotationLayer extends LayerBase {
  type: 'annotation';
  text: string;
  /** Point the arrow at this canvas coordinate. */
  to?: [number, number];
  /** Arrow start relative to the text block: auto picks the nearest edge. */
  from?: [number, number];
  bend?: number;
  style?: TextStyle;
  align?: Anchor;
  color?: string;
  arrowColor?: string;
  /** Badge style: a pill/tag like "HIGHEST" or "AI fortunes". */
  tag?: boolean;
  tagFill?: string;
  /** Info icon (i) before the text. */
  info?: boolean;
  border?: string;
}

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shape: 'rect' | 'circle' | 'line' | 'path';
  d?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  dash?: string;
}

export interface SvgLayer extends LayerBase {
  type: 'svg';
  /** Raw SVG markup, drawn in the layer box's coordinate space (0,0 = box top-left). */
  markup: string;
}

export interface LegendLayer extends LayerBase {
  type: 'legend';
  items: { label: string; color?: string; pattern?: 'hatch' | 'dots'; icon?: string }[];
  direction?: 'row' | 'column';
  swatch?: 'circle' | 'square' | 'pill';
  size?: number;
  panel?: string;
  title?: string;
}

/** Charts register themselves by `type`. See src/charts. */
export interface ChartLayer extends LayerBase {
  [key: string]: unknown;
}

export type Layer = TextLayer | ImageLayer | StatLayer | AnnotationLayer | ShapeLayer | SvgLayer | LegendLayer | ChartLayer;

export interface PosterSpec {
  width?: number;
  height?: number;
  palette?: string | Partial<Palette>;
  type?: string | Partial<TypeSet>;
  background?: BackgroundSpec;
  title?: TitleSpec;
  layers?: Layer[];
  footer?: FooterSpec;
  /** Directory to resolve relative asset paths against. */
  baseDir?: string;
}

export type Renderer<L extends LayerBase = any> = (layer: L, box: Box, ctx: Ctx) => string;
