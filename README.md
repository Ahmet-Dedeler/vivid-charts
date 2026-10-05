# vivid-charts

Poster-grade data visualization for humans and AI agents. You write a JSON spec, you get a finished infographic (PNG or SVG) in the style of Visual Capitalist: real photos, topic-matched colors, a designed title, direct labels, notes that say the point.

![gallery](docs/contact-sheet.jpg)

Every poster above is one JSON file in [`examples/`](examples) rendered with one command. No Figma, no hand editing.

## Why

Most charts on the internet look like the same demo. Recharts default, a legend nobody reads, a white background, 7 random colors. They're technically fine and nobody remembers them.

Visual Capitalist keeps doing the opposite. They've drawn "the richest person in the world" like 50 different ways and almost every one works. I went through a bunch of their recent pieces to figure out why (the teardown is in [`skill/vivid-charts/references/design-principles.md`](skill/vivid-charts/references/design-principles.md)). The short version: each one is a poster about one idea, not a chart. The photos carry data, the palette comes from the topic, and the title is designed instead of typed.

There was nothing that let an AI agent do that. There are chart libraries (generic), infographic template tools (concept cards, not data), and image-gen skills (pretty, but the numbers are made up). So this is two things:

1. **An engine.** TypeScript, renders straight to SVG/PNG, no browser. Ten chart forms that cover most "Ranked:" and "Mapped:" stories, plus the poster parts around them (title lockups, hero photo cutouts, annotations, legends, footers).
2. **An agent skill.** [`skill/vivid-charts`](skill/vivid-charts) teaches the method (story → metaphor → form → palette → type → annotate → render → look → fix) so Claude, Codex, Cursor etc. make good decisions and not just valid JSON.

## Quick start

```bash
git clone https://github.com/Ahmet-Dedeler/vivid-charts && cd vivid-charts
pnpm install && pnpm build
node dist/cli.js render examples/worlds-forests.json -o forests.png
```

Other commands:

```bash
node dist/cli.js charts          # chart types
node dist/cli.js palettes        # palettes + type presets
node dist/cli.js icons diamond   # search ~10k bundled icons
node dist/cli.js render spec.json -o out.svg
node dist/cli.js render spec.json -o out@2x.png --scale 2
```

Photo cutouts (`cutout:wiki:Taylor_Swift`) use [rembg](https://github.com/danielgatis/rembg) through `uvx`, so you need [uv](https://docs.astral.sh/uv/). The first cutout downloads a ~170 MB model, after that everything is cached in `~/.cache/vivid-charts`.

## Use it as an agent skill

Copy or symlink the skill folder wherever your agent reads skills:

```bash
cp -r skill/vivid-charts ~/.claude/skills/        # Claude Code
cp -r skill/vivid-charts ~/.agents/skills/        # Codex / OpenCode style
```

Then ask for things like "make a Visual Capitalist style poster of the 15 biggest companies by market cap" and it'll pick a form, write the spec, render it, look at the PNG and fix what's off.

## A spec

```json
{
  "palette": "forest",
  "type": "classic",
  "title": { "align": "middle", "lines": [
    { "text": "The World's Forests", "role": "display", "size": 112, "family": "Abril Fatface" },
    { "text": "Share of global forest area, 2025", "role": "kicker", "size": 30 } ] },
  "layers": [
    { "type": "voronoi-circle", "box": { "x": 40, "y": 270, "w": 1120, "h": 1080 },
      "callout": "Over half of the world's forest area is held in just five countries.",
      "groups": { "am": { "label": "Americas", "color": "#3f9a2f" } },
      "items": [ { "label": "Brazil", "value": 11.7, "group": "am", "flag": "br" } ] }
  ],
  "footer": { "source": "UN FAO via Our World in Data", "brand": "your brand" }
}
```

Images are just strings: `wiki:Article_Title`, `commons:File.jpg`, `cutout:<ref>`, `cutout-object:<ref>`, `flag:us`, `icon:ph:diamond-fill`, URLs, local files.

Full reference: [`skill/vivid-charts/references/spec.md`](skill/vivid-charts/references/spec.md).

## Chart forms

| type | story | example |
|---|---|---|
| `ranked-bars` | ranking with faces, flags, categories, banknote fills, bars from the edge | [celebrity billionaires](examples/celebrity-billionaires.json) |
| `bubble-chain` | short ranking where faces matter, gooey connected bubbles + doodles | [richest music artists](examples/richest-music-artists.json) |
| `snake-timeline` | who held #1 every year | [richest person since 1987](examples/richest-person-every-year.json) |
| `voronoi-circle` | shares of a global total, grouped | [world's forests](examples/worlds-forests.json) |
| `stacked-columns` | counts over time + subset + second metric, rising into a photo | [Everest](examples/everest-overcrowding.json) |
| `map` | choropleth with labels, callouts, tags, pins, bubbles | [GDP per capita by state](examples/us-gdp-per-capita.json) |
| `flow-split` | X% of people hold Y% of the thing | [net worth by generation](examples/net-worth-by-generation.json) |
| `dual-ranking` | overlap between two top-N lists | [wealthiest vs happiest](examples/wealthiest-vs-happiest.json) |
| `sized-tiles` | objects as bars, on shelves | [best-selling consoles](examples/best-selling-consoles.json) |
| `pictogram` | countable units, "1 in N" | |

When none of them fit, draw your own with an `svg` layer or `registerChart()`. The catalogue is a starting point.

## How it works (for contributors)

- Everything is plain SVG strings, so it runs in Node and the browser. PNG comes from [resvg](https://github.com/yisibl/resvg-js).
- All text becomes vector paths through opentype.js, so measurement is exact and the output looks the same everywhere (no font embedding, no "why is my font different in Figma").
- Layout math: d3-scale, d3-geo, d3-hierarchy, d3-voronoi-treemap.
- Re-render the gallery with `pnpm examples` (or `pnpm examples forests` for one).

See [`AGENTS.md`](AGENTS.md) for repo rules and [`NOTICE.md`](NOTICE.md) for font, icon and map licenses.

Not affiliated with Visual Capitalist. They're just the best at this, so that's who I learned from.

MIT
