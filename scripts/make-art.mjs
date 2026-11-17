// Makes the app's pictures: one drawn picture for each emoji the app shows, taken from the
// Fluent Emoji flat set (Microsoft, MIT licence) and written to public/art/<code>.svg.
// Also writes src/visuals/artList.ts, the list of pictures that exist. Run: npm run art
// Run it again after adding a new picture to the content. An emoji the set does not have stays an emoji.
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SET = 'node_modules/@iconify-json/fluent-emoji-flat';
const chars = JSON.parse(readFileSync(`${SET}/chars.json`, 'utf8'));
const icons = JSON.parse(readFileSync(`${SET}/icons.json`, 'utf8'));

const files = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)]));
const sources = ['src/content', 'src/app', 'src/components', 'src/screens', 'src/items', 'src/visuals'].flatMap(files).filter((path) => /\.(ts|tsx|json)$/.test(path) && !path.endsWith('artList.ts'));
const emoji = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu;

// The same rule as artKey() in src/visuals/Art.tsx: the code points in hex, without the variation mark.
const keyOf = (text) => [...text].map((char) => char.codePointAt(0)).filter((code) => code !== 0xfe0f).map((code) => code.toString(16)).join('-');

const wanted = new Map();
for (const path of sources) for (const found of readFileSync(path, 'utf8').match(emoji) ?? []) wanted.set(keyOf(found), found);

rmSync('public/art', { recursive: true, force: true });
mkdirSync('public/art', { recursive: true });
const made = [];
const missing = [];
for (const [key, glyph] of [...wanted].sort()) {
  const name = chars[key] ?? chars[`${key}-fe0f`];
  const icon = name ? icons.icons[name] : undefined;
  if (!icon) {
    missing.push(glyph);
    continue;
  }
  const size = `0 0 ${icon.width ?? icons.width ?? 32} ${icon.height ?? icons.height ?? 32}`;
  writeFileSync(`public/art/${key}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${size}">${icon.body}</svg>\n`);
  made.push(key);
}
writeFileSync(
  'public/art/LICENSE.txt',
  'The pictures in this folder are from Fluent Emoji (flat style) by Microsoft Corporation, used under the MIT licence.\nhttps://github.com/microsoft/fluentui-emoji/blob/main/LICENSE\n',
);
writeFileSync(
  'src/visuals/artList.ts',
  `// Made by scripts/make-art.mjs (npm run art). Do not edit by hand.\n// The emoji that have a drawn picture in public/art, by code.\nexport const ART: ReadonlySet<string> = new Set([\n${made.map((key) => `  '${key}',`).join('\n')}\n]);\n`,
);
console.log(`${made.length} pictures made. ${missing.length} not in the set: ${missing.join(' ')}`);
