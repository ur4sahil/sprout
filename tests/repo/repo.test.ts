// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

function trackedFiles(): string[] {
  // Tracked files plus new ones not yet committed, minus anything git ignores.
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .filter((name) => name.length > 0 && name !== 'package-lock.json' && existsSync(name));
}

describe('the public repo', () => {
  it('holds no email address other than example.com ones', () => {
    const pattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
    const found: string[] = [];
    for (const name of trackedFiles()) {
      const text = readFileSync(name).toString('latin1');
      for (const match of text.match(pattern) ?? []) {
        if (!match.toLowerCase().endsWith('@example.com')) found.push(`${name}: ${match}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('holds no audio file: the voice pack lives in private storage only', () => {
    const audio = trackedFiles().filter((name) => /\.(m4a|mp3|aac|wav|aiff?|ogg|caf|opus)$/i.test(name) || /voice-pack\.json$/i.test(name));
    expect(audio).toEqual([]);
  });

  it('does not track local secrets', () => {
    const files = trackedFiles();
    expect(files).not.toContain('.dev.vars');
    expect(files).toContain('.dev.vars.example');
    expect(files.some((name) => name.startsWith('.github/'))).toBe(false);
  });
});

describe('the build output', () => {
  it('contains the manifest, the icons and the Apple tags', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'sprout-build-'));
    try {
      await build({ logLevel: 'silent', build: { outDir, emptyOutDir: true } });
      const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.webmanifest'), 'utf8')) as {
        display: string;
        start_url: string;
        icons: { src: string; sizes: string }[];
      };
      expect(manifest.display).toBe('standalone');
      expect(manifest.start_url).toBe('/');
      expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512', '512x512']);
      for (const icon of manifest.icons) {
        const bytes = readFileSync(join(outDir, icon.src));
        expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
        const side = Number(icon.sizes.split('x')[0]);
        expect(bytes.readUInt32BE(16)).toBe(side);
        expect(bytes.readUInt32BE(20)).toBe(side);
      }
      expect(readFileSync(join(outDir, 'icons/apple-touch-icon.png')).readUInt32BE(16)).toBe(180);

      const html = readFileSync(join(outDir, 'index.html'), 'utf8');
      expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
      expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
      expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
      expect(html).toContain('name="apple-mobile-web-app-title" content="Sprout"');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('tokens.css', () => {
  it('defines exactly six stage colours', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    const names = [...css.matchAll(/--stage-([a-z-]+):/g)].map((m) => m[1]);
    expect(names).toEqual([
      'not-started',
      'getting-started',
      'practising',
      'proficient',
      'challenge',
      'mastered',
    ]);
  });
});
