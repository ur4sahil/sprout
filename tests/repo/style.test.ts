// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../src/visuals/palette';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const SOURCES = files('src');
const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const token = (name: string): string => new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim().toLowerCase() ?? '';
const noComments = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// Colours and sizes are named once and used by name. These tests keep it that way.
describe('one place for colours and sizes', () => {
  it('no colour is written into a component or a style file: only tokens.css, the colour list and the picture palette hold them', () => {
    const allowed = ['src/styles/tokens.css', 'src/content/data/colors.ts', 'src/visuals/palette.ts'];
    const found: string[] = [];
    for (const path of SOURCES) {
      if (allowed.includes(path)) continue;
      const text = noComments(readFileSync(path, 'utf8'));
      for (const match of text.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\brgba?\(|\bhsla?\(/g) ?? []) found.push(`${path}: ${match}`);
    }
    expect(found).toEqual([]);
  });

  it('no component style file holds a pixel or rem size: sizes come from tokens', () => {
    const found: string[] = [];
    for (const path of SOURCES.filter((name) => name.endsWith('.module.css'))) {
      const text = noComments(readFileSync(path, 'utf8'));
      for (const match of text.match(/\b\d*\.?\d+(px|rem)\b/g) ?? []) found.push(`${path}: ${match}`);
    }
    expect(found).toEqual([]);
  });

  it('every token a style file uses is defined', () => {
    const defined = new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const missing: string[] = [];
    for (const path of SOURCES.filter((name) => name.endsWith('.css'))) {
      const text = readFileSync(path, 'utf8');
      // A name the file itself gives a value to is defined there.
      const own = new Set([...text.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
      for (const match of text.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const name = match[1] as string;
        // --visual-emoji is set by a parent to resize a picture, and --ems by an equation to say how
        // wide it is. Both are numbers set in code, and both always have a fallback.
        // A name starting --set- is a number the component sets on the element itself, such as a piece's place.
        if (!defined.has(name) && !own.has(name) && !name.startsWith('--set-') && name !== '--visual-emoji' && name !== '--ems') missing.push(`${path}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the few colours needed in both drawings and styles agree', () => {
    expect(PALETTE.ink.toLowerCase()).toBe(token('--color-ink'));
    expect(PALETTE.cross.toLowerCase()).toBe(token('--color-cross'));
  });

  it('the install colours match the app colours', () => {
    const html = readFileSync('index.html', 'utf8');
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as { theme_color: string; background_color: string };
    expect(/name="theme-color" content="([^"]+)"/.exec(html)?.[1]?.toLowerCase()).toBe(token('--color-brand'));
    expect(manifest.theme_color.toLowerCase()).toBe(token('--color-brand'));
    expect(manifest.background_color.toLowerCase()).toBe(token('--color-bg'));
  });

  it('no two style files repeat the same block of rules', () => {
    const blocks = new Map<string, string>();
    const repeats: string[] = [];
    for (const path of SOURCES.filter((name) => name.endsWith('.module.css'))) {
      for (const match of noComments(readFileSync(path, 'utf8')).matchAll(/\{([^{}]+)\}/g)) {
        const rules = (match[1] as string).split(';').map((rule) => rule.trim()).filter((rule) => rule.length > 0).sort();
        if (rules.length < 5) continue; // small blocks repeat by chance
        const key = rules.join(';');
        const first = blocks.get(key);
        if (first && first !== path) repeats.push(`${path} repeats a block from ${first}`);
        else blocks.set(key, path);
      }
    }
    expect(repeats).toEqual([]);
  });

  it('screens use the shared button, field and notice, not their own', () => {
    const offenders: string[] = [];
    for (const path of SOURCES.filter((name) => name.startsWith('src/screens/') && name.endsWith('.tsx'))) {
      const text = noComments(readFileSync(path, 'utf8'));
      if (/<button\b/.test(text)) offenders.push(`${path}: a raw <button>`);
      if (/<label\b/.test(text)) offenders.push(`${path}: a raw <label>`);
      if (/role="alert"/.test(text) && !/Notice/.test(text)) offenders.push(`${path}: its own alert`);
    }
    expect(offenders).toEqual([]);
  });
});
