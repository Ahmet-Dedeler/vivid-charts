#!/usr/bin/env node
/**
 * vivid CLI
 *   vivid render spec.json -o out.png [--scale 2]
 *   vivid render spec.json -o out.svg
 *   vivid charts            list chart types
 *   vivid palettes          list palettes
 *   vivid fonts             list bundled font families
 *   vivid icons <query>     search bundled icons
 */
import { renderFile } from './render.js';
import { listCharts } from './registry.js';
import { PALETTES } from './core/color.js';
import { TYPE_PRESETS } from './core/theme.js';
import { listFamilies } from './core/fonts.js';
import { searchIcons } from './core/assets.js';

const [cmd, ...args] = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  switch (cmd) {
    case 'render': {
      const spec = args.find((a) => !a.startsWith('-') && a !== flag('-o') && a !== flag('--scale'));
      const out = flag('-o') ?? spec?.replace(/\.json$/, '.png');
      if (!spec || !out) throw new Error('usage: vivid render spec.json -o out.png');
      const t = Date.now();
      await renderFile(spec, out, { scale: Number(flag('--scale') ?? 1) });
      console.log(`${out} (${Date.now() - t}ms)`);
      break;
    }
    case 'charts':
      console.log(listCharts().join('\n'));
      break;
    case 'palettes':
      for (const p of Object.values(PALETTES)) console.log(`${p.name.padEnd(12)} bg ${p.bg}  accent ${p.accent}  ramp ${p.ramp.join(' ')}`);
      console.log('\ntype presets: ' + Object.keys(TYPE_PRESETS).join(', '));
      break;
    case 'fonts':
      console.log(listFamilies().join('\n'));
      break;
    case 'icons':
      console.log(searchIcons(args[0] ?? '', Number(flag('--limit') ?? 60)).join('\n'));
      break;
    default:
      console.log('vivid render <spec.json> -o <out.png|out.svg> [--scale 2]\nvivid charts | palettes | fonts | icons <query>');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
