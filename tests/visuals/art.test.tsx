import { render } from '@testing-library/react';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AVATARS } from '../../src/content/data/avatars';
import { COUNTABLES } from '../../src/content/data/countables';
import Art, { artKey } from '../../src/visuals/Art';
import { ART } from '../../src/visuals/artList';

// The app's own pictures: one drawn picture for each emoji, bundled with the app.

describe('Art', () => {
  it('names a picture by its code, without the variation mark', () => {
    expect(artKey('🍎')).toBe('1f34e');
    expect(artKey('⭐')).toBe('2b50');
    expect(artKey('☀️')).toBe('2600');
  });

  it('draws the bundled picture, and leaves an emoji it has no picture for as it is', () => {
    const apple = render(<Art emoji="🍎" />).container;
    expect(apple.querySelector('img')?.getAttribute('src')).toBe('/art/1f34e.svg');
    expect(apple.querySelector('img')?.getAttribute('alt')).toBe('');
    const unknown = render(<Art emoji="§" />).container;
    expect(unknown.querySelector('img')).toBeNull();
    expect(unknown.textContent).toBe('§');
  });

  it('every listed picture has its file, and every file is listed', () => {
    const files = readdirSync('public/art').filter((name) => name.endsWith('.svg')).map((name) => name.replace('.svg', ''));
    expect(files.sort()).toEqual([...ART].sort());
    for (const key of ART) expect(readFileSync(`public/art/${key}.svg`, 'utf8')).toContain('<svg');
    expect(existsSync('public/art/LICENSE.txt')).toBe(true);
  });

  it('has a picture for every avatar and every thing a child counts', () => {
    const wanted = [...AVATARS.map((each) => each.emoji), ...COUNTABLES.map((each) => each.emoji)];
    expect(wanted.length).toBeGreaterThan(20);
    for (const emoji of wanted) expect(ART.has(artKey(emoji)), emoji).toBe(true);
  });
});
