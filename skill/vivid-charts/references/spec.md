# Spec reference

Coordinates are canvas pixels. Default canvas 1200×1500. Every layer takes
`box: {x, y, w, h}`, optional `opacity`, `rotate` (degrees) and `clipPath` (an SVG
path in canvas coordinates; clip any chart to the shape of an object).

## Top level

| field | type | notes |
|---|---|---|
| `width`, `height` | number | default 1200 × 1500 |
| `palette` | string \| object | `olive money forest electric sky pop alpine atlas poster civic highlighter`, or an object overriding fields (`{ "name": "olive", "accent": "#c00" }`) |
| `type` | string \| object | `editorial impact retro slab modern classic`, or `{ "preset": "impact", "display": { "family": "Anton" } }` |
| `background` | object | see below |
| `title` | object | see below |
| `layers` | array | drawn in order, first = back |
| `footer` | object | see below |
| `baseDir` | string | resolve relative image paths (CLI sets it to the spec's folder) |
| `lint` | `warn` \| `error` \| `off` | overlapping / off-canvas text: warn (default), throw, or ignore. `vivid check` and `--strict` use the same check |

### background
`color`, `gradient: [c1, c2, ...]` (top→bottom), `glow` + `glowAt: [x, y]`
(0..1), `grain` (0–0.3), `pattern: dots | hatch | guilloche`,
`patternColor`, `image` + `imageBox` + `imageOpacity` + `imageFilter:
grayscale | duotone` + `imageFade: top | bottom`.

### title
`box`, `align: start | middle | end`, `lines: TitleLine[]`, `dek` (supports
`**bold**`), `dekWidth`, `dekSize`, `dekColor`, `frame: ornate | box | rule`,
`frameColor`, `panel` (fill color behind the lockup), `shadow` (soft shadow
behind title text over photos), `dekPanel` (translucent box behind the dek),
`dekRule` (rule color between title and dek).

`TitleLine`: `text` or `runs` (mixed styles), `role: display | kicker |
label | body | note | number`, `size`, `family`, `weight`, `italic`,
`fill`, `tracking` (em), `upper`, `fit` (scale to box width), `align`,
`rules` (lines either side), `effect: { type: neon | extrude | outline |
gradient | image | shadow, color, colors, depth, image }`, `flank: sparkle | dot` + `flankColor` (ornaments
either side), `highlight` (color behind), `gap` (px after),
`stretch` (horizontal scale, e.g. 0.8 to condense Bodoni Moda into a tight editorial title).
Lines auto-shrink to the box width, and each line keeps a minimum clearance
from the line above based on real glyph outlines (a small or negative `gap`
can never make lines touch).

### footer
`source`, `note`, `brand` (text wordmark), `brandColor`, `logo` (image ref),
`color`, `strip: { color, text, textColor }`. Bottom-anchored: long notes grow upward.

## Text styles
`{ family, weight, italic, size, tracking, fill, upper, opacity, stroke,
strokeWidth }`. Bundled families: Bodoni Moda, Rozha One, Barlow, Barlow Condensed, Oswald, Anton,
Bebas Neue, Archivo Black, Inter, Playfair Display, DM Serif Display, Abril
Fatface, Libre Caslon Text, Zilla Slab, Shrikhand, Bungee, Caveat. Add more
with `registerFont(family, file, weight, italic)`.

## Number formats
`format: { prefix, suffix, decimals, compact (default true), scale }`.
Pass raw values (7100000000) and `prefix: "$"` → "$7.1B". Or pass `display:
"$7.1B"` per item. Values are drawn editorially (small raised currency,
smaller unit) unless `value.style: "plain"`.

## Image references
`wiki:Article_Title` · `commons:File_Name.jpg` (1600px) · `cutout:<ref>` (people) ·
`cutout-object:<ref>` (objects) · `flag:xx` (ISO-2) · `icon:<set>:<name>`
(sets: `ph`, `simple-icons` (brand logos), `game-icons`, `fluent-emoji-flat`) · `https://…` · `./local.png`.

## Built-in layers

### image
`src`, `head: { x, y, size }` (place a cutout by its detected head instead of
`box`, great for photo collages), `until` + `untilFade` (fade out toward a canvas y),
`fit: cover | contain`, `focus: top | center | bottom`, `filter:
grayscale | duotone | none`, `duotone: [dark, light]`, `fade: { left, right,
top, bottom }` (fractions), `shape: rect | circle`, `radius`, `shadow`.

### text
`text` (supports `**bold**`), `role`, `style`, `align`, `lineHeight`,
`boldFill`.

### annotation
`text`, `to: [x, y]` (arrow target), `from`, `bend` (curve, default 0.25),
`style`, `align`, `color`, `arrowColor`, `tag` (pill), `tagFill`, `info`,
`border`.

### stat
`value` (number or string), `format`, `label`, `sublabel`, `color`, `size`,
`align`.

### legend
`items: [{ label, color, pattern: hatch | dots, icon }]`, `direction: row |
column`, `swatch: circle | square | pill`, `size`, `panel`, `title`.

### shape
`shape: rect | circle | line | path`, `d` (path, box-relative), `fill`,
`stroke`, `strokeWidth`, `radius`, `dash`.

### svg
`markup`: raw SVG drawn with the box's top-left as origin.

## Charts

### ranked-bars
`items: [{ label, sub, value, display, color, category, image, flag, icon,
logo, highlight, note }]`, `sort: desc | asc | none`, `max`, `format`,
`labels: left | inside | tip`, `labelAlign`, `rank`, `flags`, `avatars: left
| tip | none`, `avatarRing`, `avatarFilter: grayscale | duotone`, `bar: {
shape: rounded | pill | flat | tab, thickness (0–1), fill: solid | gradient |
ramp | hatch | guilloche | glass, color, track, shadow, zebra }`, `value: {
position: outside | inside, size, color, style, family, grow }` (`grow`: label
size scales with value), `header`, `axis: true | 'shadow'`,
`bleed`, `categories: {name: color}`, `labelSize`, `labelColor`, `subColor`,
`highlightColor`.

### bubble-chain
`items: [{ label, value, display, image, icons[], color, sublabel }]` (icons are
refs or `{ icon, angle, size, distance, rotate }`; they straddle the rim),
`columns`, `firstRow`, `format`, `color`, `photo: duotone | grayscale |
color`, `duotone: [dark, light]`, `connector: metaball | capsule | none`,
`iconColor`, `iconCount`, `labelColor`, `valueColor`, `valueCaption`,
`minRadius`, `sort`.

### snake-timeline
`items: [{ label, value, holder, display }]`, `holders: { key: { name,
image, color, flag, logo, source } }`, `perRow`, `format`, `portraits`,
`refValue` (value that fills a column; default 90th percentile, outliers
overflow), `sourceNote`. Use `cutout:` images: heads are auto-detected from
the silhouette and drawn as white-outlined stickers. Give it a tall canvas
(~2000px for 40 periods).

### voronoi-circle
`items: [{ label, value, group, flag, short, display }]`, `groups: { key:
{ label, color, image } }`, `format`, `ring`, `texture`, `border`,
`borderWidth`, `groupGap`, `seed`, `callout`, `shape: circle | square | barrel |
polygon` (+ `polygon: [[u, v]…]` in box fractions), `labelColor`,
`texture: 'canopy' (default, aerial tree crowns) | 'lighting' | false`.

### stacked-columns
`categories[]`, `series: [{ label, sublabel, color, values[], part[] }]`,
`labelEvery`, `max`, `ticks`, `tickSuffix`, `partLabel`, `gaps: [{ index,
label }]`, `bubbles: { label, sublabel, values[], color, height }`,
`format`, `barGap`, `radius`, `panel`, `tickColor` (white over dark photos),
`bubbles.panel`.

### map
`map: world | us-states | us-canada`, `projection: equal-earth | natural-earth |
mercator | albers-usa | conic`, `fit: [keys]` (fit the view to these regions),
`insets: [{ key, x, y, r, label }]` (region in its own circle, e.g. HI, DC),
`clip` (canvas rect), `values: { key: number }`, `categories: { key:
name }`, `categoryColors`, `steps[]`, `colors[]`, `empty`, `stroke`,
`strokeWidth`, `labels`, `format`, `legend: { title, x, y, w, h,
orientation } | false`, `tags: [{ key, label, text ('Name\n$41K'), dx, dy }]`, `pins: [{
lon, lat, label, color, size }]`, `bubbles: [{ lon, lat, value, label, color
}]`, `extent`, `exclude`, `shadow`. World keys: ISO-2, ISO-3, numeric or
English name. US keys: postal code or name.

### flow-split
`items: [{ label, sublabel, left, right, rightExtra, color, image }]`,
`leftTitle`, `rightTitle`, `total: { label, value }`, `gap`, `columnWidth`, `flowWidth`.

### dual-ranking
`left`/`right: { items: [{ label, value, flag, note }], unit }`,
`highlight`, `matchKeys`.

### sized-tiles
`items: [{ label, sub, value, display, image, category, tag, color }]`,
`perRow`, `format`, `categories`, `shelf: wood | line | none`,
`shelfColor`, `gloss`, `fit: cover | contain`, `pack` (pack by real width),
`overlap`, `rows: [4, 3, 3]` (items per shelf). Object AREA ∝ value for any
aspect ratio; shelves size to their content.

### treemap
`items: [{ label, value, group, short, flag, logo, display, sub, color, image,
note, muted, place }]`, `groups: { key: { label, color, image, texture } }`,
`format`, `gap`, `groupGap`, `edgeLabels`, `numberRole`, `textColor`, `shade`.

### area-time
`x: []`, `series: [{ label, values, color, icon, labelAt }]`, `offset: none |
wiggle | expand`, `order`, `format`, `events: [{ at, label, text }]`, `yTitle`,
`ticks`, `endValues`, `startValues`, `labelEvery`, `outline`, `notes: [{ at,
y, text, width, color }]`, `glow`.

### bubble-pack
`items: [{ label, value, group, flag, logo, display, caption, note, color,
rank }]`, `groups`, `format`, `padding`, `shading`, `ring`.

### slope
`items: [{ label, left, right, group, flag, color }]`, `leftTitle`,
`rightTitle`, `groups`, `format`, `axes: [0.3, 0.7]`, `min`, `max`,
`titleSize`, `lineWidth`, `note: { text, x, y, width }`.

### bump
`periods: []`, `ranks: [[key…]…]`, `entities: { key: { label, color, logo,
short } }`, `values: [{ key: '$648B' }…]`, `sideLabels`, `badge`.

### radial-bars
`items: [{ label, value, category, color, display }]`, `categories`,
`format`, `startAngle`, `endAngle`, `inner`, `sort`, `scale: linear | sqrt`,
`cap`, `center`, `cx`, `cy`.

### dumbbell
`items: [{ label, a, b }]`, `aLabel`, `bLabel`, `aColor`, `bColor`,
`orientation: vertical | horizontal`, `format`, `max`, `ticks`, `xTitle`,
`yTitle`, `note`.

### stacked-bars
`series: [{ label, color }]`, `rows: [{ label, sub, icon, flag, values }]`,
`normalize`, `format`, `labelWidth`, `thickness`, `radius`, `sortBy`.

### tile-map
`values: { key: number }`, `layout: 'us' | { key: [col, row] }`, `format`,
`positive`, `negative`, `refValue`, `cells`, `cellColor`, `labelSize`.

### pictogram
`parts: [{ label, value, color }]` or `groups: [{ label, value, color, icon
}]`, `total`, `columns`, `icon`, `shape: icon | square | dot`, `rest`,
`showLabels`.

## TypeScript API

```ts
import { checkLayout } from 'vivid-charts';
const issues = await checkLayout(spec); // [] when the layout is clean
import { renderPNG, renderSVG, registerChart, Defs, text, runs, arcText, avatar, metaball, editorial } from 'vivid-charts';
const png = await renderPNG(spec, { scale: 2 });
registerChart('radial-bars', (layer, box, ctx) => '<g>…</g>');
```
