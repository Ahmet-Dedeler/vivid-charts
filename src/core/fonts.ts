/**
 * Font registry.
 *
 * vivid converts all text to SVG paths with opentype.js. That gives exact
 * measurement for layout, identical output in every renderer (browser, resvg,
 * Figma import), and no font embedding headaches. The cost is that text in
 * the SVG is not selectable, which is fine for posters.
 *
 * Bundled fonts live in /fonts as `FamilyStem-<weight>[i].ttf`. You can add
 * your own with `registerFont()`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

type OTFont = opentype.Font;

interface Face {
  weight: number;
  italic: boolean;
  file?: string;
  font?: OTFont;
}

const families = new Map<string, Face[]>();
const displayNames = new Map<string, string>();

/** Filename stem → family name used in specs. */
const STEM_TO_FAMILY: Record<string, string> = {
  AbrilFatface: 'Abril Fatface',
  Anton: 'Anton',
  ArchivoBlack: 'Archivo Black',
  Barlow: 'Barlow',
  BarlowCondensed: 'Barlow Condensed',
  BebasNeue: 'Bebas Neue',
  BodoniModa: 'Bodoni Moda',
  Bungee: 'Bungee',
  Caveat: 'Caveat',
  DMSerifDisplay: 'DM Serif Display',
  Inter: 'Inter',
  LibreCaslonText: 'Libre Caslon Text',
  Oswald: 'Oswald',
  PlayfairDisplay: 'Playfair Display',
  RozhaOne: 'Rozha One',
  Shrikhand: 'Shrikhand',
  NotoSansSymbols: 'Noto Sans Symbols',
  NotoSansSymbols2: 'Noto Sans Symbols 2',
  ZillaSlab: 'Zilla Slab',
};

function findFontsDir(): string | undefined {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'fonts');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return undefined;
}

let loaded = false;
function ensureBundled() {
  if (loaded) return;
  loaded = true;
  const dir = findFontsDir();
  if (!dir) return;
  for (const file of fs.readdirSync(dir)) {
    const m = file.match(/^([A-Za-z0-9]+)-(\d{3})(i?)\.(ttf|otf)$/);
    if (!m) continue;
    const family = STEM_TO_FAMILY[m[1]] ?? m[1];
    addFace(family, { weight: Number(m[2]), italic: m[3] === 'i', file: path.join(dir, file) });
  }
}

function addFace(family: string, face: Face) {
  const key = family.toLowerCase();
  displayNames.set(key, family);
  const list = families.get(key) ?? [];
  list.push(face);
  families.set(key, list);
}

/** Register a custom TTF/OTF file under a family name. */
export function registerFont(family: string, file: string, weight = 400, italic = false) {
  ensureBundled();
  addFace(family, { weight, italic, file });
}

export function listFamilies(): string[] {
  ensureBundled();
  return [...families.entries()].map(
    ([key, faces]) =>
      `${displayNames.get(key)}: ${faces
        .map((x) => x.weight + (x.italic ? 'i' : ''))
        .sort()
        .join(', ')}`,
  );
}

function parse(file: string): OTFont {
  const buf = fs.readFileSync(file);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/**
 * Resolve the closest face. Falls back to Barlow if the family is unknown so a
 * typo in a spec degrades gracefully instead of crashing the render.
 */
export function getFont(family: string, weight = 400, italic = false): OTFont {
  ensureBundled();
  let faces = families.get(family.toLowerCase());
  if (!faces?.length) faces = families.get('barlow');
  if (!faces?.length) throw new Error(`vivid: no fonts available (looked for "${family}")`);
  const sameStyle = faces.filter((f) => f.italic === italic);
  const pool = sameStyle.length ? sameStyle : faces;
  const best = pool.reduce((a, b) => (Math.abs(b.weight - weight) < Math.abs(a.weight - weight) ? b : a));
  if (!best.font) best.font = parse(best.file!);
  return best.font;
}
