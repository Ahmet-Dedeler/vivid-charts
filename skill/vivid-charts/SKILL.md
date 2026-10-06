---
name: vivid-charts
description: Make poster-grade, editorial data visualizations in the style of Visual Capitalist — vibrant, photo-rich, metaphor-driven infographics instead of generic dashboard charts. Use whenever someone asks for an infographic, a "Visual Capitalist style" chart, a shareable/social chart, a ranking poster, a "Mapped:" or "Ranked:" graphic, or says their charts look boring, generic, or like a demo. Covers the design method (story → metaphor → form → palette → type → annotation → QA) and renders finished PNG/SVG posters from a JSON spec with the vivid-charts engine (ranked bars with photos, bubble chains, snake timelines, Voronoi circles, stacked columns over photos, choropleth maps, flow splits, dual rankings, sized object tiles, pictograms).
---

# vivid-charts

Generic chart libraries produce *charts*. Visual Capitalist produces *posters
about one idea*. This skill is the difference, written down, plus an engine
that renders the result.

You will: find the one story, pick a metaphor and a form that make that story
physical, compose a full poster (title lockup, hero imagery, chart, notes,
source), render it, **look at it**, and iterate until it is good.

## 0. Setup (once)

```bash
npx vivid-charts charts             # list chart types (or: npm i -g vivid-charts → `vivid …`)
npx vivid-charts render spec.json -o out.png [--scale 2]
# from source: git clone github.com/Ahmet-Dedeler/vivid-charts && pnpm install && pnpm build
node dist/cli.js charts             # list chart types
node dist/cli.js palettes           # palettes + type presets
node dist/cli.js icons diamond      # search ~10k bundled icons
node dist/cli.js render spec.json -o out.png [--scale 2]
```

Background removal for photo cutouts uses `uvx rembg` (needs `uv`). The first
run downloads a model (~170 MB); results are cached in `~/.cache/vivid-charts`.

## 1. The method (do these in order, write the answers down)

1. **The one sentence.** What should a stranger remember after 3 seconds?
   "Musk's fortune is nearly 3× the next person's." "Five countries hold half
   the world's forests." If you cannot write it, you are not ready to draw.
2. **The comparison that proves it.** Rank? Share of a whole? Change over
   time? Mismatch between two shares? Geography? This picks the form family
   (see `references/forms.md`).
3. **The metaphor.** What does the topic *look like* in the real world?
   Forests → canopy texture. Money → banknote guilloche, gold, green.
   Mountains → the columns rise into a photo of the peak. Music → a gooey
   chain of records/bubbles with doodles. Albums → covers on a shelf, sized by
   sales. Pick one. Commit.
4. **The form.** Choose the chart from the catalogue. Prefer the form whose
   *shape* carries the metaphor (bubbles for people, Voronoi for a finite
   area, a winding track for "every year", shelves for objects).
5. **Palette from the topic, not from taste.** One dominant hue family + one
   accent. Never a rainbow. Cream/paper or a deep themed dark background, never
   flat white. (`references/palettes-and-type.md`)
6. **Type with a voice.** A characterful display face for the title lockup
   (serif for wealth/history, heavy condensed for news/sport, groovy for
   music), condensed bold numbers, a clean sans for labels.
7. **Compose the poster** at 1200×1500 (4:5): title lockup in the chart's dead
   space (where short bars leave room), hero image fading into the background,
   chart, 1–3 annotations that say the insight in words, source + brand footer.
8. **Render, check, look, fix.** `vivid check spec.json` must say "no layout
   issues". Then open the PNG. Run the QA checklist
   (`references/qa-checklist.md`). Expect 2–4 iterations. This is where
   "fine" becomes "great".

## 2. The thirteen moves that make it look alive

These are distilled from studying dozens of Visual Capitalist pieces. Use as
many as fit; the best pieces use 6–8.

1. **The poster is the unit.** Title, imagery, chart, notes and source are
   designed together. The chart rarely fills the canvas; it shares it.
2. **Photos are data carriers.** Faces in the bubbles, the person growing out
   of the top bar, album covers sized by sales. Grayscale or duotone them so
   mismatched press photos look like one set. Cut people out (`cutout:`).
3. **Topic-native texture.** Canopy lighting on forest cells, guilloche on
   money bars, hatch for a subset, paper grain everywhere.
4. **One hue family, one hot accent.** Highlight = the accent. Everything else
   steps down in saturation.
5. **Direct labels, no legends.** Values sit at bar ends; series names sit
   inside the chart beside the first column ("WORKER ▸ attempts").
6. **Editorial numbers.** Condensed bold, the currency symbol small and raised
   ("ˢ7.1ʙ"), the unit smaller than the digits. The engine does this for you.
7. **A title lockup, not a title.** Mixed sizes and weights in one block:
   kicker / GIANT WORD / small year, or "The Rise of / OVERCROWDING on /
   EVEREST". Sometimes framed (ornate label, rule, panel). The lettering can
   carry the topic: `effect` neon for energy/tech, `image` fill (soil, gold,
   metal), `extrude` 3D, `gradient`.
8. **Say the insight in words.** One italic note with a curved arrow ("Five
   months after buying Twitter, Musk became the most-followed person"), a
   bracket grouping related rows, a "LOWEST/HIGHEST" tag.
9. **Shape carries meaning.** Area = value (sqrt-scaled circles/tiles), a
   snake for continuity, a split column for mismatch, a ring for a whole.
10. **Identity marks.** Flags, logos (`icon:simple-icons:<brand>`), rank
    discs, small topical icons orbiting a portrait (diamonds for Jay-Z,
    butterflies for Taylor Swift). Brands get logos, not names.
11. **Put the chart inside an object** when the topic has one: Voronoi cells
    in an oil barrel (`voronoi-circle` with `shape: 'barrel'` or any
    `polygon`), a donut behind a coin, bars as skyscrapers or filling ballot
    boxes (`clipPath` on any layer, plus an `svg`/`image` layer for the object).
12. **Depth, lightly.** Soft shadows under objects, a glow behind the title,
    columns that rise *into* a photo. Never 3D charts.
13. **Respect the reader.** Source line, notes on methodology, honest scales
    (bars start at zero; circle *area* encodes value).

## 3. Writing the spec

A poster is JSON (`references/spec.md` has every field):

```json
{
  "palette": "olive", "type": "editorial",
  "background": { "grain": 0.06 },
  "title": { "box": {"x": 700, "y": 1075, "w": 420, "h": 0}, "align": "middle", "frame": "ornate",
    "lines": [ {"text": "World's Richest", "role": "kicker", "size": 26, "rules": true},
               {"text": "Celebrity", "size": 88, "role": "display"},
               {"text": "Billionaires", "size": 88, "role": "display"} ] },
  "layers": [
    { "type": "image", "src": "cutout:wiki:Steven_Spielberg", "box": {"x": 780, "y": 120, "w": 440, "h": 640},
      "filter": "grayscale", "fade": {"bottom": 0.25} },
    { "type": "ranked-bars", "box": {"x": 40, "y": 40, "w": 1020, "h": 1340}, "header": "2026 Net Worth",
      "axis": true, "format": {"prefix": "$"},
      "items": [ {"label": "Steven Spielberg", "sub": "Director/Producer", "value": 7.1e9} ] }
  ],
  "footer": { "source": "Forbes", "brand": "your brand" }
}
```

Layers draw in order (first = back). Title and footer draw on top.

**Images** are strings: `wiki:Article_Title` (lead image, **check it**: some
are signatures or logos), `commons:File_name.jpg`, `cutout:<ref>` (people),
`cutout-object:<ref>` (products), `flag:us`, `icon:ph:diamond-fill`, URLs, or
local paths. Only use images you have the right to use; Wikimedia photos need
attribution in the footer note.

**Escape hatch:** anything the built-in charts can't do, draw yourself with an
`svg` layer (raw markup in the layer box's coordinates) or by importing the
library in TypeScript (`renderPosterSVG`, `Defs`, `text`, `arcText`,
`avatar`, `metaball`, `editorial` …). Custom forms are encouraged: the
catalogue is a starting point, not a cage.

## 4. Picking a form (short version)

| Story | Form (`type`) | Exemplar |
|---|---|---|
| Ranking of people/things, 10–30 items | `ranked-bars` (+ hero cutouts, title in the dead space) | Celebrity billionaires, Most-followed on X |
| Short ranking where faces matter, 6–14 | `bubble-chain` | Richest music artists |
| Who held #1 each year | `snake-timeline` | World's richest person since 1987 |
| Shares of a global total, 15–40 parts in groups | `voronoi-circle` | World's forests |
| Counts over time with categories + a subset | `stacked-columns` (+ photo bg, bubble strip) | Everest overcrowding |
| Geography | `map` (choropleth, labels, callouts, pins, bubbles) | GDP per capita by state |
| X% of people hold Y% of the thing | `flow-split` | Net worth by generation |
| Does A track B? Two top-N lists | `dual-ranking` | Wealthiest vs happiest |
| Ranking of objects/brands | `sized-tiles` | Best-selling albums, consoles |
| "1 in N", small counts | `pictogram` | Child deaths per 1,000 |
| Part-to-whole with exact numbers, 10–60 parts | `treemap` | Billionaires by country |
| A mix changing over decades | `area-time` (stacked or `wiggle` stream) | 40 years of U.S. electricity |
| Big-vs-small countries/brands | `bubble-pack` | Household net worth by country |
| Before → after, two years | `slope` | Gold producers 2010 vs 2025 |
| Who overtook whom, year by year | `bump` | Top 10 companies by revenue |
| Dramatic range with outliers | `radial-bars` | Critical mineral price changes |
| Mean vs median, A vs B per category | `dumbbell` | Net worth by age |
| Survey splits, mixes per row | `stacked-bars` | How billionaires plan to invest |
| State values where area misleads | `tile-map` | U.S. population change to 2040 |
| Shares inside a topical object | `voronoi-circle` + `shape: 'barrel'`/`polygon` | Oil exporters in a barrel |

Full catalogue with when-to-use, variations and composition notes:
`references/forms.md`.

## 5. Non-negotiables

- **Zero layout issues.** Run `vivid check spec.json` (or render with
  `--strict`) before you deliver. It reports every pair of overlapping text
  and any text off the canvas, from the real glyph outlines. The renderer also
  prints these as `vivid: text overlap …` warnings: never ignore one, fix the
  layout (move a box, shrink a size, add space) and check again. Don't stack a
  big number and a headline as two separate layers; put them in one `title`
  with several `lines`, where line spacing is enforced automatically.

- **Size encodings are proportional, always.** If a circle/tile/icon size
  means a value, its *area* is proportional to that value (r ∝ √v). Never
  clamp small values up to a minimum size to "even things out": then $39B and
  $75B look identical and the chart lies. Let outliers overflow their cell
  (that is the story). The engine's `areaScale` does this; don't fight it.
  Check it yourself: pick the biggest and smallest marks, compare their
  areas to their values.
- **Fill the canvas with content, not air.** Size marks to the space (shelves,
  rows and chains should pack tight), push photos large, and crop the map to
  where the data is. Large empty bands are the most common amateur tell.
- **Generated imagery is fine when real photos aren't.** For "typical person"
  portraits, props (a piggy bank of smiley coins) or textures, generate them
  (any image model), save under the project, cut them out with `cutout:`, and
  disclose "AI-generated illustration" in the footer. Never generate images of
  real, named people.
- **When working from a reference, diff against it.** Put the reference and
  your render side by side and list every difference (sizing, crop, label
  placement, arrows, logos, type, spacing, canvas height). Fix them all, not
  just the first one you notice.

- Real data with a cited source. Never invent numbers to fill a layout. If
  values are approximate, say so in the footer.
- Render and **look at the PNG** before you call it done. Overlaps, clipped
  text and empty quadrants are invisible in JSON.
- No legends when direct labels fit. No rainbow palettes. No pure-white
  background. No 3D.
- 1200×1500 unless the destination needs otherwise (1200×675 for X/links,
  1080×1920 for stories).

## References

- `references/design-principles.md` — the full teardown of why these pieces work, with examples
- `references/forms.md` — form catalogue: story → chart → composition recipe
- `references/spec.md` — every layer and option
- `references/palettes-and-type.md` — palettes, type presets, pairing rules
- `references/qa-checklist.md` — the render-look-fix loop
- `examples/` in the repo — complete specs that reproduce the gallery
