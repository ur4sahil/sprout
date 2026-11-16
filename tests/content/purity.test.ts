// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// engine/ and content/ must run in plain Node, and every question must be replayable.
describe('engine and content code', () => {
  const sources = [...files('src/engine'), ...files('src/content')].filter((path) => /\.tsx?$/.test(path));

  it('exists', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it.each(sources)('%s is pure', (path) => {
    const code = readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code, 'imports React').not.toMatch(/from\s+['"]react/);
    expect(code, 'touches the browser').not.toMatch(/\b(window|document|localStorage|navigator)\s*[.[]/);
    expect(code, 'calls Math.random').not.toMatch(/Math\s*\.\s*random/);
    expect(code, 'reads the clock').not.toMatch(/\bnew\s+Date\b|Date\s*\.\s*now/);
    expect(code, 'imports an oracle').not.toMatch(/tests\/oracles|\/oracles\//);
    expect(path.endsWith('.tsx'), 'is a React file').toBe(false);
  });

  // A word-list oracle reads the section 9 lists in src/content/data. Nothing else in content is allowed.
  it('oracles never import generators or templates', () => {
    for (const path of files('tests/oracles').filter((name) => !name.endsWith('.test.ts'))) {
      const code = readFileSync(path, 'utf8');
      expect(code, path).not.toMatch(/src\/content\/(?!data\/)/);
      expect(code, path).not.toMatch(/from\s+['"][^'"]*(generators|registry|catalogue)/);
    }
  });
});
