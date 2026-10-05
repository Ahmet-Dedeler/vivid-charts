/**
 * Tiny string-based SVG builder. No DOM, works in Node and the browser.
 *
 * Every renderer in vivid returns plain SVG markup strings, so composing a
 * poster is just string concatenation. `h()` handles attribute escaping and
 * drops null/undefined/false attributes so call sites can stay terse.
 */

export type Attrs = Record<string, string | number | boolean | null | undefined>;

export function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Round to 2 decimals so generated markup stays compact. */
export const r2 = (n: number) => Math.round(n * 100) / 100;

/** SVG attributes that are genuinely camelCase and must not be kebab-cased. */
const CAMEL = new Set([
  'viewBox', 'preserveAspectRatio', 'maskUnits', 'maskContentUnits', 'patternUnits', 'patternContentUnits',
  'patternTransform', 'gradientUnits', 'gradientTransform', 'clipPathUnits', 'filterUnits', 'primitiveUnits',
  'stdDeviation', 'baseFrequency', 'numOctaves', 'stitchTiles', 'tableValues', 'surfaceScale', 'diffuseConstant',
  'specularExponent', 'kernelMatrix', 'textLength', 'lengthAdjust', 'startOffset', 'markerWidth', 'markerHeight',
  'refX', 'refY', 'pathLength', 'spreadMethod',
]);

function attrString(attrs: Attrs = {}): string {
  let out = '';
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    const key = CAMEL.has(k) ? k : k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).replace(/^xlink-/, 'xlink:');
    out += ` ${key}="${esc(typeof v === 'number' ? r2(v) : v === true ? '' : v)}"`;
  }
  return out;
}

/** Build an element. Children are already-rendered markup strings. */
export function h(tag: string, attrs?: Attrs, ...children: (string | false | null | undefined)[]): string {
  const inner = children.filter(Boolean).join('');
  return inner || tag === 'g' || tag === 'text'
    ? `<${tag}${attrString(attrs)}>${inner}</${tag}>`
    : `<${tag}${attrString(attrs)}/>`;
}

export const g = (attrs: Attrs | undefined, ...children: (string | false | null | undefined)[]) => h('g', attrs, ...children);

export function translate(x: number, y: number, ...children: string[]): string {
  return h('g', { transform: `translate(${r2(x)},${r2(y)})` }, ...children);
}

let uid = 0;
/** Unique ids for defs (gradients, clips, patterns). Reset per render. */
export function id(prefix = 'v'): string {
  return `${prefix}${(uid++).toString(36)}`;
}
export function resetIds() {
  uid = 0;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectPath(x: number, y: number, w: number, h: number, r: number | [number, number, number, number] = 0): string {
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(v, w / 2, h / 2)));
  return [
    `M${r2(x + tl)},${r2(y)}`,
    `H${r2(x + w - tr)}`,
    tr ? `A${r2(tr)},${r2(tr)} 0 0 1 ${r2(x + w)},${r2(y + tr)}` : '',
    `V${r2(y + h - br)}`,
    br ? `A${r2(br)},${r2(br)} 0 0 1 ${r2(x + w - br)},${r2(y + h)}` : '',
    `H${r2(x + bl)}`,
    bl ? `A${r2(bl)},${r2(bl)} 0 0 1 ${r2(x)},${r2(y + h - bl)}` : '',
    `V${r2(y + tl)}`,
    tl ? `A${r2(tl)},${r2(tl)} 0 0 1 ${r2(x + tl)},${r2(y)}` : '',
    'Z',
  ].join('');
}
