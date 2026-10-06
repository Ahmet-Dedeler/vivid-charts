# Render → look → fix

Render to PNG and open it (read the image file). Then go through this list.
Fix, re-render, repeat. Two to four rounds is normal.

## 3-second test
- [ ] Squinting, I see the title word, then the hero mark/image, then the top
      number. Nothing else competes.
- [ ] The one-sentence insight is stated in words somewhere (dek or note).

## Layout
- [ ] `vivid check spec.json` prints "no layout issues" (overlapping text and
      off-canvas text are detected automatically from glyph outlines).
- [ ] No text overlaps another text or crosses a mark it doesn't belong to.
- [ ] No text is clipped at the canvas edge (60px margin).
- [ ] No large empty quadrant. Dead space is filled by the title, a hero image
      or a note, on purpose.
- [ ] Title lockup lines have room for descenders and ascenders.
- [ ] Footer doesn't collide with the chart.

## Data
- [ ] Numbers match the source. Units and the year are stated.
- [ ] Bars start at zero; circle/tile *areas* (not radii) encode value.
- [ ] Size audit: take the two most different values (e.g. $19B vs $178B).
      Is the area ratio about the same as the value ratio? Two different
      values must never render at the same size because of a minimum clamp.
- [ ] If there is a reference piece, list every visible difference between
      it and your render, and fix each one.
- [ ] Decimals are consistent; values are rounded sensibly.
- [ ] Source line present; approximations and exclusions disclosed.

## Craft
- [ ] Palette = one hue family + one accent; background not pure white.
- [ ] Photos unified (same filter), faces not cropped at the eyes.
- [ ] `wiki:` images are actually photos (not signatures, logos, maps).
- [ ] Labels read on their fills (contrast).
- [ ] At least three of the twelve moves (photos, texture, title lockup,
      annotation with arrow, identity marks, direct labels…) are present.

## Common fixes
| symptom | fix |
|---|---|
| poster feels empty | add hero cutout layer, raise title size, add a stat or note |
| poster feels busy | remove legend (label directly), drop to one accent, cut a note |
| chart looks "default" | change the bar shape/fill, add texture, swap the type preset, put a photo in |
| labels overlap in a map | `tags[].dx/dy`, shrink `box`, or rely on callouts |
| title too wide | it auto-shrinks; use more lines or `fit: true` per line |
| `text overlap` between title lines | they're spaced automatically; if two *layers* collide, merge them into one `title` with several `lines` |
| `text overlap` on a map | add `tags[].dx/dy`, move insets out of the callout column, or enlarge the map box |
| bubbles too similar | they may genuinely be similar; never fake contrast. If one outlier shrinks the rest, the default ref (90th percentile) lets it overflow instead |
| wrong face crop | `focus: "top"`, or a `commons:` file with a tighter portrait |
