/**
 * Type systems. An editorial poster usually uses three voices:
 *   display  – the title lockup (big, characterful, topic-matched)
 *   number   – data labels (condensed, bold, often italic)
 *   label/body/note – names, captions, footnotes (clean sans or matching serif)
 *
 * Pick a preset that matches the topic's tone, then override per spec.
 */
import type { TextStyle } from './text.js';

export interface TypeSet {
  display: TextStyle;
  kicker: TextStyle;
  number: TextStyle;
  label: TextStyle;
  body: TextStyle;
  note: TextStyle;
}

export const TYPE_PRESETS: Record<string, TypeSet> = {
  /** High-contrast serif title + condensed italic numbers. Wealth, celebrity, history. */
  editorial: {
    display: { family: 'Playfair Display', weight: 900 },
    kicker: { family: 'Barlow', weight: 500, tracking: 0.18, upper: true },
    number: { family: 'Barlow Condensed', weight: 700, italic: true },
    label: { family: 'Barlow', weight: 700 },
    body: { family: 'Barlow', weight: 400 },
    note: { family: 'Barlow', weight: 400, italic: true },
  },
  /** Heavy condensed grotesk. News, sport, adventure, maps. */
  impact: {
    display: { family: 'Anton', weight: 400 },
    kicker: { family: 'Barlow Condensed', weight: 700, tracking: 0.12, upper: true },
    number: { family: 'Barlow Condensed', weight: 800 },
    label: { family: 'Barlow Condensed', weight: 700 },
    body: { family: 'Barlow', weight: 500 },
    note: { family: 'Barlow Condensed', weight: 600, italic: true },
  },
  /** Groovy display + serif numbers. Music, food, pop culture. */
  retro: {
    display: { family: 'Shrikhand', weight: 400 },
    kicker: { family: 'Barlow Condensed', weight: 700, tracking: 0.12, upper: true },
    number: { family: 'DM Serif Display', weight: 400 },
    label: { family: 'Barlow', weight: 600 },
    body: { family: 'Barlow', weight: 500 },
    note: { family: 'Barlow Condensed', weight: 600, italic: true },
  },
  /** Typewriter-ish slab. Finance, startups, "the ledger". */
  slab: {
    display: { family: 'Zilla Slab', weight: 700 },
    kicker: { family: 'Zilla Slab', weight: 700, tracking: 0.06 },
    number: { family: 'Zilla Slab', weight: 700 },
    label: { family: 'Zilla Slab', weight: 500 },
    body: { family: 'Zilla Slab', weight: 500 },
    note: { family: 'Zilla Slab', weight: 500, italic: true },
  },
  /** Bold geometric sans. Rankings, tech, cities. */
  modern: {
    display: { family: 'Archivo Black', weight: 400 },
    kicker: { family: 'Oswald', weight: 500, tracking: 0.08, upper: true },
    number: { family: 'Oswald', weight: 700 },
    label: { family: 'Oswald', weight: 500 },
    body: { family: 'Inter', weight: 400 },
    note: { family: 'Inter', weight: 500, italic: false },
  },
  /** Classic serif display + clean sans. Nature, science, culture. */
  classic: {
    display: { family: 'DM Serif Display', weight: 400 },
    kicker: { family: 'Barlow', weight: 500, tracking: 0.14, upper: true },
    number: { family: 'DM Serif Display', weight: 400 },
    label: { family: 'Barlow', weight: 600 },
    body: { family: 'Barlow', weight: 400 },
    note: { family: 'Barlow', weight: 500, italic: true },
  },
};

export function typeSet(t: string | Partial<TypeSet> | undefined): TypeSet {
  if (!t) return TYPE_PRESETS.editorial;
  if (typeof t === 'string') {
    const found = TYPE_PRESETS[t];
    if (!found) throw new Error(`vivid: unknown type preset "${t}". Options: ${Object.keys(TYPE_PRESETS).join(', ')}`);
    return found;
  }
  const base = TYPE_PRESETS[(t as { preset?: string }).preset ?? 'editorial'] ?? TYPE_PRESETS.editorial;
  const out = { ...base } as TypeSet;
  for (const k of Object.keys(base) as (keyof TypeSet)[]) if (t[k]) out[k] = { ...base[k], ...t[k] };
  return out;
}
