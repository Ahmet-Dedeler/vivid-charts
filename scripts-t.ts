import { arcText, paragraph } from '/Users/ahmet/Code/visual-capitalist-style/src/core/text.ts';
const a = arcText('Taylor Swift', 100, 100, 50, 30, { family: 'Barlow', weight: 600, size: 20 });
console.log((a.match(/<path/g)||[]).length, a.match(/d=""/g)?.length);
console.log(a.slice(0, 600));
const p = paragraph('**Source:** Forbes. Data as of 2026.', 0, 20, 800, { size: 16 });
console.log(p.lines, (p.svg.match(/<title>[^<]*/g)));
