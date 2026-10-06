/**
 * Honest size encodings.
 *
 * When a circle or tile encodes a value, its AREA must be proportional to the
 * value: r = refR * sqrt(v / ref). No minimum-radius clamps (they make $19B and
 * $75B look identical, which is a lie). Outliers are allowed to be bigger than
 * the layout cell; that overflow IS the story (a $923B fortune should spill
 * off the track).
 *
 * `ref` defaults to the 90th-percentile value so one outlier doesn't shrink
 * everything else into dots. Pass ref: 'max' when nothing may exceed refR.
 */
export interface AreaScaleOptions {
  /** Value that maps to refR. 'p90' (default), 'max', or a number. */
  ref?: 'p90' | 'max' | number;
  /** Smallest drawn radius in px, only so a tiny value stays visible. Keep it tiny. */
  floor?: number;
}

export function areaScale(values: number[], refR: number, opts: AreaScaleOptions = {}) {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  const max = sorted[sorted.length - 1] ?? 1;
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] ?? max;
  const ref = typeof opts.ref === 'number' ? opts.ref : opts.ref === 'max' ? max : p90;
  const floor = opts.floor ?? 2;
  return (v: number) => Math.max(floor, refR * Math.sqrt(Math.max(0, v) / ref));
}
