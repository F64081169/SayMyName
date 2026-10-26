// Bundles index.html + css + js into self-contained HTML.
//   node tools/build.mjs            -> dist/index.html (standalone page with Three.js inlined; host anywhere)
//   node tools/build.mjs --fragment -> also dist/fragment.html (body-only page for hosts that supply <head>;
//                                      loads Three.js from the jsDelivr CDN instead of inlining it)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'css/style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
const bundle = (list) => list.map((src) => `// ---- ${src}\n${readFileSync(join(root, src), 'utf8')}`).join('\n').replace(/<\/script/gi, '<\\/script');

// function replacers: the code contains `$'`-like sequences that string replacements would expand
let out = html.replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${css}\n</style>`);
out = out.replace(/(<script src="[^"]+"><\/script>\n?)+/, () => `<script>\n${bundle(scripts)}\n</script>\n`);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/index.html'), out);
console.log(`dist/index.html  ${(out.length / 1024).toFixed(0)} KB, ${scripts.length} scripts inlined`);

if (process.argv.includes('--fragment')) {
  const font = (html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/) || [''])[0];
  const own = scripts.filter((s) => !s.startsWith('vendor/'));
  const bodyHtml = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script src='));
  const frag = `<title>Shannon's World</title>\n${font}\n<style>\n${css}\n</style>\n${bodyHtml}<script src="${THREE_CDN}"></script>\n<script>\n${bundle(own)}\n</script>\n`;
  writeFileSync(join(root, 'dist/fragment.html'), frag);
  console.log(`dist/fragment.html  ${(frag.length / 1024).toFixed(0)} KB (Three.js from CDN)`);
}
