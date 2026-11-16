// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { skillById } from '../src/content/catalogue';
import { allGenerators, exampleQuestion, generateFrom } from '../src/content/registry';
import type { Level, Question } from '../src/engine/types';

// Golden files pin what every seed produces, so an edit to a generator cannot
// quietly rewrite a child's question history. To change output on purpose:
// bump the skill's version in the catalogue, then run `npm run golden`.
const UPDATE = process.env.UPDATE_GOLDEN === '1';

interface Golden {
  skillId: string;
  version: number;
  example: Question;
  levels: Record<string, Question[]>; // seeds 1 to 10 at each level
}

function current(skillId: string): Golden {
  const generator = allGenerators().find((g) => g.skillId === skillId);
  const skill = skillById(skillId);
  if (!generator || !skill) throw new Error(`unknown skill ${skillId}`);
  const levels: Record<string, Question[]> = {};
  for (let level = 1 as Level; level <= generator.maxLevel; level = (level + 1) as Level) {
    levels[String(level)] = Array.from({ length: 10 }, (_, i) => generateFrom(generator, level, i + 1));
  }
  return { skillId, version: skill.version, example: exampleQuestion(skillId), levels };
}

function text(golden: Golden): string {
  return `${JSON.stringify(golden, null, 1)}\n`;
}

function listHash(name: string): string {
  return createHash('sha256').update(readFileSync(`src/content/data/${name}.ts`)).digest('hex').slice(0, 16);
}

describe('golden files', () => {
  it.each(allGenerators().map((g) => g.skillId))('%s still produces what its golden file holds', (skillId) => {
    const file = `tests/golden/${skillId}.json`;
    const now = current(skillId);
    if (!existsSync(file)) {
      if (UPDATE) {
        writeFileSync(file, text(now));
        return;
      }
      throw new Error(`${file} is missing. Run: npm run golden`);
    }
    const saved = JSON.parse(readFileSync(file, 'utf8')) as Golden;
    const same = text(saved) === text(now);
    if (same) return;
    const outputChanged = text({ ...saved, version: now.version }) !== text(now);
    if (outputChanged && saved.version === now.version) {
      throw new Error(
        `${skillId} now produces different questions for the same seeds. ` +
          `If that is intended, raise its version in the catalogue (it is ${now.version}) and run: npm run golden`,
      );
    }
    if (UPDATE) {
      writeFileSync(file, text(now));
      return;
    }
    throw new Error(`${skillId} is at version ${now.version} but its golden file is at ${saved.version}. Run: npm run golden`);
  });

  it('there is no golden file for a skill that no longer exists', () => {
    const known = new Set(allGenerators().map((g) => `${g.skillId}.json`));
    const stray = readdirSync('tests/golden').filter((name) => name !== 'lists.json' && !known.has(name));
    expect(stray).toEqual([]);
  });
});

describe('word and picture lists', () => {
  const file = 'tests/golden/lists.json';
  const names = [...new Set(allGenerators().flatMap((g) => g.lists))].sort();

  it('every list a generator names is a data file', () => {
    for (const name of names) expect(existsSync(`src/content/data/${name}.ts`), name).toBe(true);
  });

  it('no list has changed without its skills being bumped', () => {
    const now = Object.fromEntries(names.map((name) => [name, listHash(name)]));
    if (!existsSync(file)) {
      if (UPDATE) {
        writeFileSync(file, `${JSON.stringify(now, null, 1)}\n`);
        return;
      }
      throw new Error(`${file} is missing. Run: npm run golden`);
    }
    const saved = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
    const changed = names.filter((name) => saved[name] !== now[name]);
    const dropped = Object.keys(saved).filter((name) => !names.includes(name));
    if (changed.length === 0 && dropped.length === 0) return;
    if (UPDATE) {
      writeFileSync(file, `${JSON.stringify(now, null, 1)}\n`);
      return;
    }
    const readers = changed.map((name) => {
      const skills = allGenerators().filter((g) => g.lists.includes(name)).map((g) => g.skillId);
      return `${name} (read by ${skills.join(', ')})`;
    });
    throw new Error(
      `These lists changed: ${readers.join('; ') || 'none'}. Dropped: ${dropped.join(', ') || 'none'}. ` +
        'Raise the version of every skill that reads a changed list, then run: npm run golden',
    );
  });
});
