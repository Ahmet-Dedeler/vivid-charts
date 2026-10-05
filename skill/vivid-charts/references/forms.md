# Form catalogue

Each entry: when to use it, the layer `type`, key options, and the
composition recipe that makes it look finished. All examples live in
`examples/` and render with `vivid render examples/<name>.json`.

---

## ranked-bars — the workhorse ranking
**Use for** 8–30 ranked items with one value each.
**Variants**
- *Classic editorial* (`labels: "left"`, `axis: true`, `header`): name + sub in
  a left column, values at bar ends. Fill the dead space bottom-right with
  hero cutouts and the title lockup. → `celebrity-billionaires.json`
- *Pill + inside labels* (`bar.shape: "pill"`, `labels: "inside"`, `rank:
  true`, `flags: true`, `categories`): bright categorical rankings (cities by
  continent). Add a `legend` layer card.
- *Bleed + tip avatar* (`bleed: true`, `avatars: "tip"`, `labels: "tip"`):
  bars enter from the canvas edge, the portrait rides the bar end, value and
  name follow. Put `sub` (company, lifespan) inside the bar end.
- *Money tabs* (`bar.shape: "tab"`, `bar.fill: "guilloche"`, `avatars:
  "left"`): banknote texture. Add `bracket` via an `svg` layer to group rows.
- *Gradient / ramp* (`bar.fill: "gradient" | "ramp"`): on dark backgrounds,
  bars that brighten toward the end or step through a ramp by rank.
**Recipe** big portrait of #1 on the right when #1 dominates; one
`annotation` with an arrow on the top bar; `header` names the metric.

## bubble-chain — faces as data
**Use for** 6–14 people/brands where recognition matters more than precise
comparison.
**Options** `columns`, `firstRow` (leave room for the title), `duotone:
[dark, light]`, `icons` per item (2–4 topical doodles), `labelColor`,
`iconColor`, `valueCaption`.
**Recipe** two-color scheme (bubble color + one contrasting ink for names,
icons and title). Title in the first row's empty cells. Photos: `cutout:`
portraits look best. Pick icons that tell a story about each person.
→ `richest-music-artists.json`

## snake-timeline — who held the title
**Use for** a yearly/periodic series where the *holder* changes (richest
person, largest company, top song, champion).
**Options** `perRow`, `holders` {name, image, color, flag, logo},
`format`.
**Recipe** a distinct color per holder (the dominant holder gets the brand
color), a centered serif-italic title, one annotation about the longest
reign, let the last huge bubble spill over and annotate it.
→ `richest-person-every-year.json`

## voronoi-circle — shares of a finite whole
**Use for** 15–40 parts of a global total grouped into 3–7 groups (area,
emissions, GDP, population, market share).
**Options** `groups` {label, color, image}, `texture` (organic lighting),
`ring` (group totals on a dashed ring), `callout`, `seed` (re-roll layout),
`shape: "square"`.
**Recipe** shades of one hue per group; texture on; flags in big cells;
callout sentence in the biggest cell; a total stat bottom-right.
For photo-filled groups pass `groups.<key>.image` (e.g. an AI-generated
canopy, sand, water texture).
→ `worlds-forests.json`

## stacked-columns — counts over time with composition
**Use for** 15–40 periods, 2–4 stacked series, optionally a hatched subset
(successes within attempts) and a second metric.
**Options** `series[].part` (hatched subset), `partLabel`, `gaps` (vertical
note), `bubbles` (strip under the axis), `ticks`, `tickSuffix`.
**Recipe** a hero photo as `background.image` with `imageFade: "bottom"` so
the tallest columns rise into it; white title on the sky; dek with one bold
phrase. → `everest-overcrowding.json`

## map — geography
**Use for** values by country or U.S. state; points; flows of attention to
places.
**Options** `map: "world" | "us-states"`, `values` + `steps` + `colors`
(stepped choropleth), `categories` + `categoryColors` (two-color maps),
`labels: true` (abbr + value, auto callouts for tiny states), `legend`,
`tags` [{key, label, dx, dy}], `pins` [{lon, lat, label}], `bubbles`,
`extent` (crop), `exclude`.
**Recipe** dark background + one-hue ramp ending in white for the top step;
label every region; tag the extremes; one annotation for the surprise
("Why Sweden?"). → `us-gdp-per-capita.json`

## flow-split — X% hold Y%
**Use for** two distributions over the same groups (people vs wealth,
population vs emissions, users vs revenue).
**Options** `items` [{label, sublabel, left, right, rightExtra, color,
image}], `leftTitle`, `rightTitle`.
**Recipe** big percentages on both sides; portraits/icons; title with a
huge display word. → `net-worth-by-generation.json`

## dual-ranking — overlap between two top-N lists
**Use for** "do the richest countries also top the happiness list?"
**Options** `left`/`right` {items [{label, value, flag}], unit},
`highlight`.
**Recipe** a yellow highlighter on matches, a single-line dek explaining the
highlight, serif title "A vs B". → `wealthiest-vs-happiest.json`

## sized-tiles — objects as bars
**Use for** rankings of things with a recognizable image (albums, products,
games, cars, books).
**Options** `perRow`, `categories` (tag colors), `fit: "contain"` for
cutouts, `shelf: "wood" | "line" | "none"`, `gloss`.
**Recipe** `cutout-object:` product photos on a dark or wall-texture
background; legend row of categories under the title.
→ `best-selling-consoles.json`

## pictogram — countable units
**Use for** "1 in 5", per-1,000 counts, small integers, two-quantity
comparisons (`groups`).
**Options** `parts` (one whole) or `groups` (side-by-side blocks), `icon`,
`shape: "icon" | "square" | "dot"`, `columns`.

---

## Composition building blocks (any poster)

- `image` layer: hero photo/cutout; `filter: grayscale | duotone`, `fade`
  per edge, `shape: circle`, `shadow`.
- `annotation`: italic note with optional curved arrow (`to: [x, y]`), or a
  `tag` pill ("AI fortunes", "HIGHEST"), `info: true` for an (i) note,
  `border` for a boxed note.
- `stat`: a big editorial number + label (totals, headline figure).
- `legend`: row or column of swatches/icons, optional `panel` card.
- `text`: paragraphs with **bold** spans.
- `shape` / `svg`: anything else (brackets, rules, custom marks).

## Inventing new forms

The catalogue covers the most common stories, not all of them. When none
fits, design a custom form and draw it in an `svg` layer or a registered
renderer (`registerChart(type, (layer, box, ctx) => svgString)`). Ideas the
pros use: radial bars around a portrait, isometric stacks of coins, a
thermometer, a tree whose branches are categories, a skyline of buildings
sized by value, money piles, a race track, a clock face for time-of-day
data. Keep the twelve moves.
