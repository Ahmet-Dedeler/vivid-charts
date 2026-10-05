# Render → look → fix

Render to PNG and open it (read the image file). Then go through this list.
Fix, re-render, repeat. Two to four rounds is normal.

## 3-second test
- [ ] Squinting, I see the title word, then the hero mark/image, then the top
      number. Nothing else competes.
- [ ] The one-sentence insight is stated in words somewhere (dek or note).

## Layout
- [ ] No text overlaps another text or crosses a mark it doesn't belong to.
- [ ] No text is clipped at the canvas edge (60px margin).
- [ ] No large empty quadrant. Dead space is filled by the title, a hero image
      or a note, on purpose.
- [ ] Title lockup lines have room for descenders and ascenders.
- [ ] Footer doesn't collide with the chart.

## Data
- [ ] Numbers match the source. Units and the year are stated.
- [ ] Bars start at zero; circle/tile *areas* (not radii) encode value.
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
| bubbles too similar | lower `minRadius` |
| wrong face crop | `focus: "top"`, or a `commons:` file with a tighter portrait |
