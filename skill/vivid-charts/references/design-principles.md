# Why Visual Capitalist's graphics work

This is a teardown of 16 recent pieces (2026), focused on the moves you can
repeat. Each section names the piece, what it does, and the principle.

## The pieces

### Ranked: The World's Richest Celebrity Billionaires
Olive bars on cream paper, name (bold) + role (light) right-aligned in a left
column, a thin black baseline, values in condensed italic with a tiny raised
"$". The bars get short fast, which leaves a big empty triangle bottom-right.
They fill it with **grayscale cutouts of the top five, overlapping, fading
into the paper**, and a **Victorian-label title frame** ("— WORLD'S RICHEST —
/ Celebrity / Billionaires / — 2026 —").
→ *Ranking shapes leave dead space. Spend it on faces and the title.*

### Ranked: The World's Richest Music Artists
No bars at all. Each artist is a **circle sized by net worth**, filled with a
**duotone (black→vermilion) photo**, joined to the next by **gooey metaball
necks** in a snake. Names run **along the circle's edge**. Each bubble has
**cobalt doodles about that artist** (diamonds, butterflies, stars, lemons, a
sinking ship for Céline Dion). Title in a groovy display face, same cobalt.
→ *Two colors (vermilion + cobalt) on a pale ground feel louder than ten.*
→ *Icons as personality, not decoration.*

### The Rise of Overcrowding on Everest
Stacked columns (visitors blue, workers saffron) with **hatched summits**
inside each segment, **rising into a photo of the mountain** whose summit
ridge shows the actual queue of climbers. Series labels live inside the
chart ("WORKER ▸ attempts"). A **red bubble strip** under the axis carries
deaths. A vertical "CLOSED FOR COVID" sits in the 2020 gap. A one-line dek:
"used to be a two-season mountain. Now it's a two-week one."
→ *The background photo is the metaphor; the chart grows into it.*
→ *A second metric gets its own strip instead of a second axis.*

### The World's Forests
A **Voronoi treemap inside a circle**, grouped by region, every cell filled
with **real canopy texture** in that region's green. A **dashed outer ring**
carries "AMERICAS · 38.9%". Flags + names + big serif numbers in cells; tiny
cells get ISO codes. An italic insight inside the biggest cell: "Over half of
the world's forest area is held in just five countries."
→ *Part-to-whole as a material, not a pie.*

### Cities with the Most Tree Coverage
Dark green poster. A **dark world map with zoom-circle insets** (North
America, Europe, Australia) and **numbered teardrop pins**, then a **gradient
bar ranking** below with rank + city + flag inline. An italic note with a
leader line explains #1.
→ *Map for "where", bars for "how much"; one poster can hold both.*

### Best-Selling Albums by Year
**Album covers sized by copies sold** standing on **wooden shelves**, one
shelf per five years, with a **genre-colored year tag** on the shelf, value
above, artist + album below. A shrink-wrap gloss on covers.
→ *Objects as data. The thing itself is the bar.*

### Where GDP Per Capita is Highest (USA + Canada)
Black background, blue stepped choropleth, **every region labelled with
abbreviation + value**, small north-eastern states pulled out to a **callout
column with leader lines**, a vertical stepped legend, **"LOWEST" and
"HIGHEST" tags**, an inset circle for D.C. Title mixes an elegant italic
serif with a massive condensed all-caps line (with a star and a maple leaf
inside the letters).
→ *Label everything you can; call out what you can't.*

### Most Followed People on X
Electric-blue pill bars with a gradient, a **huge grayscale portrait of #1**
filling the right side, the X logo as a giant letterform in the title, and
one annotation with an arrow on the top bar.
→ *When #1 dominates, make #1 the image.*

### Top 40 Cities by GDP per Person
Bright sky-gradient background, **pill bars colored by continent with the
rank and name inside the bar**, round flags at the left edge, a white legend
card, one sentence of insight ("The U.S. claims 27 of the top 40").
→ *Saturated categorical color works when the categories ARE the story.*

### America's Net Worth by Generation
Two stacked 100% columns ("share of households" | "share of net worth")
**joined by smooth ribbons**, portraits on each side, big colored
percentages. The ribbon for Boomers swells, Millennials' shrinks.
→ *Mismatch between two shares is the most persuasive chart there is.*

### Richest Americans of All Time
Bars **bleed in from the left edge** on a dark green leather-texture
background, a **portrait rides the tip of every bar**, value + name follow
the portrait, lifespan or company sits inside the bar end. A Monopoly-man
illustration and a big serif title fill the dead space.
→ *Bars can enter from the edge; the label can follow the tip.*

### The World's Richest Person, Every Year Since 1987
A **winding track** with a bubble per year sized by inflation-adjusted
fortune; the track's **color changes with the holder**; a **portrait with a
flag** appears at each change of hands; company logos sit under each reign.
Final bubble (2026, $923B) is enormous and spills off the track, with a
note: "within reach of the first trillion-dollar individual fortune."
→ *Continuity (a single path) + identity (color per holder) + one outlier
called out in words.*

### Wealthiest vs Happiest Countries
Two top-20 tables side by side; every country on **both** lists gets a
**yellow highlighter band** that runs across the whole row. A piggy bank full
of smiley coins as the hero icon.
→ *Sometimes a table with one highlight beats any chart.*

### Top 10 Youngest Billionaires
Tabs with **banknote guilloche fills** (green-teal for AI fortunes, gray for
inherited), portraits on the tab's left, company logos as labels, a bracket
grouping the four Anthropic co-founders with one shared value, and an
**engraved Ben Franklin in a baseball cap** next to a slab-serif title.
→ *Texture says "money" faster than any icon.*

### Wealth Inequality (map)
A two-color world map (red = top 0.1% hold more than the bottom 80%), cream
background, a scale balance drawn into the title, and a hand-lettered
"WHY SWEDEN?" with a curved arrow.
→ *A categorical map with one provocative question.*

## Patterns across all of them

**Canvas.** 1200×1500 portrait (4:5), sometimes taller for long lists. Generous
outer margin (~60px), source + logo bottom, optional app banner strip.

**Background.** Never flat white: cream paper (#f1efe6 / #ece6d6), deep themed
darks (navy #0b0f17, money green #16372a, near-black #111), or a soft
gradient sky. Grain/texture at low opacity.

**Color.** One family + one accent, chosen from the topic: forest greens,
X blue, saffron + mountain blue, vermilion + cobalt, olive gold. Categorical
palettes only when categories are the story (continents, genres,
generations), and even then 4–6 colors max.

**Typography.** Three voices: a characterful display face for the lockup
(high-contrast serif, heavy condensed grotesk, groovy retro, slab), condensed
bold (often italic) for numbers, a clean sans for names. Kickers in letter-
spaced caps. Mixed sizes inside one title.

**Numbers.** Currency symbol ~55% size and raised; unit letter ~70% size;
consistent decimals within a chart; value at the bar end, never in a tooltip.

**Imagery.** Real photos, unified by grayscale or duotone, often cut out and
faded at the edges. Faces are cropped from the top (forehead) so they read at
small sizes. Flags are round. Logos are gray/monochrome so they don't fight.

**Annotation.** 1–3 notes per piece, italic, in the accent or muted ink, with
a thin curved arrow or a bracket. They state the insight, not the method.

**Hierarchy check.** Squint: you should see (1) the title word, (2) the hero
image / biggest mark, (3) the top value, in that order.


## Round two: 106 more pieces (net worth, billionaires, energy, trade, maps)

A second pass over ~106 recent graphics (search results for net worth,
billionaires, richest, ranked, mapped, charted, energy, population). What
kept showing up, roughly by frequency:

**Forms**
1. **Treemaps** for part-to-whole with real numbers: billionaires by country,
   diesel and fertilizer exporters, vehicle producers, airlines, a country's
   top companies. Big serif number top-left, name in caps, flag, a second
   value at the tile bottom, region labels rotated on the outer edges, a
   muted "Other" tile. The title often sits *inside* the biggest tile.
2. **Streamgraphs / stacked areas** for history: 250 years of energy,
   equity markets since 2011, two centuries of economic power. Event pins
   on the top edge ("1973 / First Oil Shock"), icons in discs inside layers,
   start/end values outside with colored pointers.
3. **Packed bubbles** with logos or flags: household net worth, revenue per
   employee, international investors, ultra-wealthy by country.
4. **Ranked bars dressed up**: portraits riding bars, rank circles, flags,
   logos instead of names, gradient bars on dark backgrounds, neon for
   energy/tech.
5. **Slope and bump charts** for change: gold producers 2010→2025, top 10
   companies year by year with logo badges and S-curves.
6. **Fans and rings**: radial bars for price changes, a 30-city fan, donut
   rings per country for energy shares.
7. **Maps**: labelled choropleths with HIGHEST/LOWEST tags and inset
   circles, tile-grid cartograms with squares sized by value, spike maps for
   counts, numbered pins, zoom circles over Europe.
8. **Mean vs median**: dumbbells and twin columns, because skew is the story
   in any wealth data.
9. **100% stacked rows** for survey splits and energy mixes per country.

**Moves**
- **The title is an illustration.** FERTILIZER in soil texture, ELECTRICITY in
  neon, MINERAL in brushed metal, GAS PRICES as a retro sign, ice-cream script,
  flags inside letters. Use `effect` on title lines (neon, extrude, image,
  gradient, outline, shadow).
- **The chart lives inside an object.** Oil exporters as Voronoi cells inside
  an oil barrel; Big Tech market caps inside a Bitcoin; turnout as filling
  ballot boxes; ultra-rich growth as skyscrapers; drones over a pie.
- **Logos replace names** whenever the items are brands (bundled Simple
  Icons: `icon:simple-icons:<brand>`).
- **One average/benchmark marker**: "U.S. Avg. $4.48" gauge, "OECD average
  461" line, "U.S. Average $9.7K" box.
- **Palette by mood**: dark + neon for tech/energy/AI; cream paper and serif
  for history/wealth/finance; bright sky/pink gradients for consumer topics;
  earthy browns for commodities.
- **Rank discs, flags, logos, portraits** turn a list into a cast of
  characters. Every row has an identity mark.
- **Everything labelled**, including tiny map regions (callout columns,
  inset circles). Legends only for categories, as a small row of chips.
