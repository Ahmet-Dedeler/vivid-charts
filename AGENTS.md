# AGENTS.md

vivid-charts: a poster-grade dataviz engine (TypeScript, string SVG, opentype text-to-paths, resvg PNG)
plus an agent skill in `skill/vivid-charts`.

## Rules

- Use `pnpm`. Run `pnpm typecheck` and `pnpm build` before committing.
- When the work is done and both pass, commit and push to `main` without asking.
- After changing a chart, re-render its example (`pnpm examples <name>`) and look at the image in
  `docs/gallery/` before calling it done. Visual regressions are the main failure mode.
- Every chart lives in `src/charts/<type>.ts`, self-registers with `registerChart`, and is imported in
  `src/charts/index.ts`. Document options in `skill/vivid-charts/references/spec.md` and add the form to
  `references/forms.md`.
- Text is always drawn through `src/core/text.ts` (never raw `<text>`), so output is identical everywhere.
- SVG attributes go through `h()`; genuinely camelCase SVG attributes must be listed in `CAMEL` in
  `src/core/svg.ts`.
- Never commit fetched photos. Images resolve at render time (`wiki:`, `commons:`, `cutout:`).
  AI-generated illustrations (fictional people, props) may live in `examples/assets/`; disclose them in the footer.
- `data/` holds bundled geodata (Natural Earth, public domain). Keep it simplified and small.
- Compare each example against its reference piece side by side after changes (`out/cmp/`).
- Example data must be real and sourced in the footer; say so when values are approximate.
