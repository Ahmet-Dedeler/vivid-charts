# Palettes and type

## Choose the palette from the topic

| topic | palette | why |
|---|---|---|
| wealth, celebrities, history | `olive` (cream + olive gold) or `money` (deep green + cream) | old money, paper, banknotes |
| nature, climate, land | `forest` | canopy greens on parchment |
| tech, social media, AI | `electric` (navy + electric blue) | screens, X/Twitter blue |
| cities, rankings, travel | `sky` (sky gradient + saffron/cobalt) | bright, optimistic, categorical |
| music, pop culture, food | `pop` (vermilion + cobalt, riso print) | loud two-color print |
| sport, adventure, extremes | `alpine` (mountain blue + saffron + magenta) | outdoor gear colors |
| economics maps, serious data | `atlas` (black + one blue ramp to white) | max contrast, sober |
| inequality, politics, protest | `poster` (cream + red + black) | propaganda-poster energy |
| demographics, shares | `civic` (warm neutral + 6 distinct cats) | categories are the story |
| comparisons, tables | `highlighter` (newsprint + yellow) | marker-pen emphasis |

Override any field: `"palette": { "name": "pop", "accent": "#00a36c" }`.

**Rules**
- One dominant hue family. Use its `ramp` for magnitude, its `accent` for
  emphasis. Add a second hue only for a second *meaning*.
- Background is never pure white. Light: cream/parchment/pale gradient. Dark:
  a themed near-black (navy, money green, charcoal).
- Categorical sets max 6. If you need more, group into "Other".
- Highlight = accent at full saturation, everything else 20–40% weaker.
- Photos: grayscale on colored backgrounds, duotone when the photo should
  take the palette color.
- Check contrast of labels on fills: the engine picks black/white
  automatically for in-bar text.

## Type presets

| preset | display | numbers | labels | use for |
|---|---|---|---|---|
| `editorial` | Playfair Display 900 | Barlow Condensed 700 italic | Barlow | wealth, celebrity, history |
| `impact` | Anton | Barlow Condensed 800 | Barlow Condensed | news, sport, maps |
| `retro` | Shrikhand | DM Serif Display | Barlow | music, food, pop culture |
| `slab` | Zilla Slab 700 | Zilla Slab 700 | Zilla Slab | finance ledgers, startups |
| `modern` | Archivo Black | Oswald 700 | Oswald | tech, consumer products |
| `classic` | DM Serif Display | DM Serif Display | Barlow | nature, science, culture |

**Title lockup patterns**
- Kicker / GIANT / small: `WORLD'S RICHEST` (letter-spaced caps, 26px) →
  `Celebrity Billionaires` (88–120px display) → `2026` (with `rules`).
- Phrase with inline small word: runs `[{text:"OVERCROWDING"},{text:" on",
  size: 34}]` then `EVEREST` at 150px.
- Elegant + brutal: italic serif line (Libre Caslon italic 56px) above an
  Anton all-caps line (120px).
- Centered serif italic caps for timelines (`Playfair Display 900 italic`).
- Retro stack: three lines of Shrikhand in the accent color, fitted.

**Numbers**: condensed bold, values at bar ends ~50% of row height, raised
small currency (automatic). Keep decimals consistent across a chart.

**Notes**: italic, 20–24px, muted ink or the accent, max ~10 words per line.
