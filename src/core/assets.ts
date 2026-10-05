/**
 * Asset resolution: photos, flags, icons, logos.
 *
 * References are plain strings so an agent can write them straight into a
 * JSON spec:
 *
 *   "flag:us"              circular-ready square flag (flag-icons, MIT)
 *   "icon:ph:diamond-fill" any Iconify icon from bundled sets (ph, game-icons, fluent-emoji-flat)
 *   "wiki:Taylor_Swift"    lead image of a Wikipedia article (fetched + cached).
 *                          Check it: some articles lead with a signature or logo.
 *   "commons:File.jpg"     a specific Wikimedia Commons file
 *   "cutout:<any ref>"     the same image with the background removed (rembg via uvx)
 *   "https://..."          any remote image (fetched + cached, inlined as data URI)
 *   "./photo.jpg"          local file relative to the spec
 *
 * Remote images are inlined so the output SVG is self-contained and renders
 * identically in resvg and browsers.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);

const cache = new Map<string, string>(); // ref → data URI
let baseDir = process.cwd();
const cacheDir = process.env.VIVID_CACHE ?? path.join(os.homedir(), '.cache', 'vivid-charts');

export function setAssetBaseDir(dir: string) {
  baseDir = dir;
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export function isAssetRef(s: unknown): s is string {
  return typeof s === 'string' && /^(cutout:|commons:|flag:|icon:|wiki:|https?:\/\/|\.{0,2}\/|file:|data:image)/.test(s) && !/\s/.test(s.slice(0, 8));
}

function toDataUri(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function sniffMime(buf: Buffer, fallback = 'image/jpeg'): string {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 5).toString().includes('<svg') || buf.slice(0, 100).toString().includes('<svg')) return 'image/svg+xml';
  return fallback;
}

async function fetchCached(url: string): Promise<Buffer> {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, crypto.createHash('sha1').update(url).digest('hex'));
  if (fs.existsSync(file)) return fs.readFileSync(file);
  const res = await fetch(url, { headers: { 'User-Agent': 'vivid-charts/0.1 (https://github.com/Ahmet-Dedeler/vivid-charts)' } });
  if (!res.ok) throw new Error(`vivid: failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf;
}

/** Resolve the lead image URL of a Wikipedia article. */
async function wikiImageUrl(title: string, width = 600): Promise<string> {
  const lang = title.includes(':') && title.split(':')[0].length === 2 ? title.split(':')[0] : 'en';
  const page = lang === 'en' ? title : title.slice(3);
  const api = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=${width}&redirects=1&titles=${encodeURIComponent(page)}`;
  const json = JSON.parse((await fetchCached(api)).toString());
  const pages = Object.values(json.query?.pages ?? {}) as { thumbnail?: { source: string } }[];
  const src = pages[0]?.thumbnail?.source;
  if (!src) throw new Error(`vivid: no lead image for wiki:${title}`);
  return src;
}

function flagSvg(code: string, square = true): string {
  const file = require.resolve(`flag-icons/flags/${square ? '1x1' : '4x3'}/${code.toLowerCase()}.svg`);
  return fs.readFileSync(file, 'utf8');
}

type IconSet = { icons: Record<string, { body: string; width?: number; height?: number }>; aliases?: Record<string, { parent: string }>; width?: number; height?: number };
const iconSets = new Map<string, IconSet>();

function loadIconSet(prefix: string): IconSet {
  let set = iconSets.get(prefix);
  if (!set) {
    set = require(`@iconify-json/${prefix}/icons.json`) as IconSet;
    iconSets.set(prefix, set);
  }
  return set;
}

/** Raw icon: inner SVG body + viewBox size. Body uses currentColor for mono icons. */
export function iconBody(ref: string): { body: string; w: number; h: number } {
  const [prefix, name] = ref.replace(/^icon:/, '').split(':');
  const set = loadIconSet(prefix);
  let icon = set.icons[name];
  if (!icon && set.aliases?.[name]) icon = set.icons[set.aliases[name].parent];
  if (!icon) throw new Error(`vivid: icon not found: ${ref}`);
  return { body: icon.body, w: icon.width ?? set.width ?? 16, h: icon.height ?? set.height ?? 16 };
}

/** Search icon names in the bundled sets. Handy for agents choosing symbols. */
export function searchIcons(query: string, limit = 40): string[] {
  const out: string[] = [];
  const q = query.toLowerCase();
  for (const prefix of ['ph', 'game-icons', 'fluent-emoji-flat']) {
    const set = loadIconSet(prefix);
    for (const name of Object.keys(set.icons)) {
      if (name.includes(q)) out.push(`icon:${prefix}:${name}`);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Background removal for "cutout:<ref>" — the press-photo cutout look.
 * Uses rembg through uvx (no global install needed). Results are cached, so
 * the ~20s model run only happens once per image. Set VIVID_REMBG_MODEL to
 * pick a model (default u2net_human_seg, best for people; use isnet-general-use
 * for objects).
 */
async function cutout(inner: string): Promise<Buffer> {
  const src = await loadAsset(inner);
  const buf = Buffer.from(src.split(',')[1], 'base64');
  const model = process.env.VIVID_REMBG_MODEL ?? 'u2net_human_seg';
  fs.mkdirSync(cacheDir, { recursive: true });
  const key = crypto.createHash('sha1').update(`${model}:`).update(buf).digest('hex');
  const out = path.join(cacheDir, `cutout-${key}.png`);
  if (fs.existsSync(out)) return fs.readFileSync(out);
  const tmp = path.join(cacheDir, `in-${key}`);
  fs.writeFileSync(tmp, buf);
  try {
    execFileSync('uvx', ['--from', 'rembg[cpu,cli]', 'rembg', 'i', '-m', model, tmp, out], { stdio: 'pipe' });
  } catch (e) {
    throw new Error(`vivid: cutout failed for ${inner}. Needs uv (https://docs.astral.sh/uv). ${String(e).slice(0, 200)}`);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return fs.readFileSync(out);
}

/** Refs that resolve without I/O beyond bundled packages. */
function resolveSync(ref: string): string | undefined {
  if (ref.startsWith('data:')) return ref;
  if (ref.startsWith('flag:')) return toDataUri(Buffer.from(flagSvg(ref.slice(5), true)), 'image/svg+xml');
  if (ref.startsWith('flag43:')) return toDataUri(Buffer.from(flagSvg(ref.slice(7), false)), 'image/svg+xml');
  if (ref.startsWith('icon:')) {
    const { body, w, h } = iconBody(ref);
    return toDataUri(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`), 'image/svg+xml');
  }
  return undefined;
}

/** Preload a single reference into the cache. */
export async function loadAsset(ref: string): Promise<string> {
  const hit = cache.get(ref);
  if (hit) return hit;
  let uri = resolveSync(ref);
  if (uri) {
    // already resolved
  } else if (ref.startsWith('cutout:')) {
    uri = toDataUri(await cutout(ref.slice(7)), 'image/png');
  } else if (ref.startsWith('commons:')) {
    // Any Wikimedia Commons file by name, e.g. commons:Dr._Dre_2013.jpg
    const name = ref.slice(8).replace(/^File:/, '');
    const buf = await fetchCached(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=800`);
    uri = toDataUri(buf, sniffMime(buf));
  } else if (ref.startsWith('wiki:')) {
    const url = await wikiImageUrl(ref.slice(5));
    const buf = await fetchCached(url);
    uri = toDataUri(buf, sniffMime(buf));
  } else if (/^https?:\/\//.test(ref)) {
    const buf = await fetchCached(ref);
    uri = toDataUri(buf, sniffMime(buf));
  } else {
    const file = path.resolve(baseDir, ref.replace(/^file:\/\//, ''));
    const buf = fs.readFileSync(file);
    uri = toDataUri(buf, MIME[path.extname(file).toLowerCase()] ?? sniffMime(buf));
  }
  cache.set(ref, uri);
  return uri;
}

/** Walk any JSON value and preload every asset reference found. */
export async function preloadAssets(spec: unknown): Promise<void> {
  const refs = new Set<string>();
  const walk = (v: unknown) => {
    if (isAssetRef(v) || (typeof v === 'string' && v.startsWith('flag43:'))) refs.add(v as string);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'baseDir') walk(x);
  };
  walk(spec);
  const results = await Promise.allSettled([...refs].filter((r) => !r.startsWith('icon:')).map(loadAsset));
  for (const r of results) if (r.status === 'rejected') console.warn(String(r.reason));
}

/** Synchronous lookup after preload. Flags and icons resolve on demand. */
export function asset(ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  const hit = cache.get(ref);
  if (hit) return hit;
  try {
    const uri = resolveSync(ref);
    if (uri) cache.set(ref, uri);
    return uri;
  } catch (e) {
    console.warn(String(e));
    return undefined;
  }
}
