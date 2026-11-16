// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { SkillGenerator } from '../../src/content/generator';
import { numeral } from '../../src/content/generator';
import {
  allGenerators,
  clampLevel,
  exampleQuestion,
  generateFrom,
  generateQuestion,
  generatorFor,
  nextQuestion,
  nextQuestionFrom,
  repeatWindow,
} from '../../src/content/registry';
import { canonicalJson } from '../../src/engine/canonical';
import type { Level, QuestionDraft } from '../../src/engine/types';

// A made-up skill whose levels have exactly `size` different questions.
function tiny(size: number, pool?: number): SkillGenerator {
  const make = (n: number): QuestionDraft => ({
    type: 'choice',
    mode: 'look',
    facts: { n, options: [n, n + 1] },
    prompt: { text: 'How many?', speak: ['How many?'] },
    options: [numeral(n), numeral(n + 1)],
    answerIndex: 0,
    explanation: { speak: ['That many.'], steps: ['That many.'] },
  });
  return {
    skillId: 'T-TINY',
    maxLevel: 2,
    itemTypes: ['choice'],
    lists: [],
    pool: pool === undefined ? undefined : { 1: pool, 2: pool },
    generate: (_level: Level, rng) => make(rng.int(1, size)),
    exampleSeed: 1,
    example: () => make(1),
    lesson: () => [],
    oracle: 'count',
  };
}

describe('registry', () => {
  it('gives the same question for the same skill, level and seed', () => {
    for (const generator of allGenerators()) {
      for (let level = 1; level <= generator.maxLevel; level += 1) {
        const a = generateQuestion(generator.skillId, level, 4242);
        const b = generateQuestion(generator.skillId, level, 4242);
        expect(canonicalJson(a)).toBe(canonicalJson(b));
        expect(a.seed).toBe(4242);
        expect(a.skillId).toBe(generator.skillId);
        expect(a.level).toBe(level);
      }
    }
  });

  it('clamps the level to what the skill has', () => {
    const generator = generatorFor('M-PK-A2');
    expect(clampLevel(generator, 9)).toBe(3);
    expect(clampLevel(generator, 0)).toBe(1);
    expect(clampLevel(generator, -3)).toBe(1);
    expect(clampLevel(generator, Number.NaN)).toBe(1);
    expect(clampLevel(generator, 2.4)).toBe(2);
    expect(generateQuestion('M-PK-A2', 4, 1).level).toBe(3);
    expect(nextQuestion('M-PK-A2', 99, 1, []).level).toBe(3);
  });

  it('throws for a skill that does not exist', () => {
    expect(() => generatorFor('M-NOPE')).toThrow();
    expect(() => nextQuestion('M-NOPE', 1, 1, [])).toThrow();
  });

  it('carries the seed that actually produced the question', () => {
    const first = generateQuestion('M-K-C4', 1, 100);
    const next = nextQuestion('M-K-C4', 1, 100, [first.key]);
    expect(next.key).not.toBe(first.key);
    expect(next.seed).toBeGreaterThan(100);
    expect(canonicalJson(generateQuestion('M-K-C4', 1, next.seed))).toBe(canonicalJson(next));
  });

  it('avoids the last 6 questions of a skill with plenty', () => {
    let recent: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      const question = nextQuestion('M-K-C4', 1, 1000 + i * 37, recent);
      expect(recent.slice(-6)).not.toContain(question.key);
      recent = [...recent, question.key];
    }
  });

  it('only looks at the newest 6 keys, however many it is given', () => {
    const old = generateQuestion('M-K-C4', 1, 5);
    const filler = Array.from({ length: 6 }, (_, i) => `filler-${i}`);
    expect(nextQuestion('M-K-C4', 1, 5, [old.key, ...filler]).key).toBe(old.key);
    expect(nextQuestion('M-K-C4', 1, 5, [...filler, old.key]).key).not.toBe(old.key);
  });

  it('a level with a pool of 2 never repeats back to back and never throws', () => {
    const generator = tiny(2, 2);
    expect(repeatWindow(generator, 1)).toBe(1);
    let recent: string[] = [];
    for (let i = 0; i < 500; i += 1) {
      const question = nextQuestionFrom(generator, 1, i * 7919, recent);
      expect(question.key).not.toBe(recent[recent.length - 1]);
      recent = [...recent, question.key];
    }
  });

  it('a level with a pool of 1 just repeats, and never throws', () => {
    const generator = tiny(1, 1);
    expect(repeatWindow(generator, 1)).toBe(0);
    const first = nextQuestionFrom(generator, 1, 1, []);
    const second = nextQuestionFrom(generator, 1, 2, [first.key]);
    expect(second.key).toBe(first.key);
  });

  it('gives up after 20 tries and returns a question when every one would repeat', () => {
    const generator = tiny(3);
    const keys = [1, 2, 3].map((n) => `T-TINY|1|{"n":${n}}`);
    const question = nextQuestionFrom(generator, 1, 50, keys);
    expect(keys).toContain(question.key);
    expect(question.seed).toBe(50 + 19);
  });

  it('uses a window of pool minus 1 for a small pool, and 6 at most', () => {
    expect(repeatWindow(tiny(4, 4), 1)).toBe(3);
    expect(repeatWindow(tiny(7, 7), 1)).toBe(6);
    expect(repeatWindow(tiny(30), 1)).toBe(6);
    // With 4 questions and 3 to avoid, each try has a 1 in 4 chance, so 20 tries
    // almost always find the one that is left. The plan accepts the rare miss.
    const generator = tiny(4, 4);
    let recent: string[] = [];
    let repeats = 0;
    for (let i = 0; i < 2000; i += 1) {
      const question = nextQuestionFrom(generator, 1, i * 104729, recent);
      if (recent.slice(-3).includes(question.key)) repeats += 1;
      recent = [...recent, question.key];
    }
    expect(repeats).toBeLessThan(40); // under 2%
  });

  it('handles any seed a caller might pass', () => {
    const generator = tiny(5);
    for (const seed of [0, -1, 2 ** 32 - 1, 2 ** 32 + 5, 1.7]) {
      const question = generateFrom(generator, 1, seed);
      expect(Number.isInteger(question.seed)).toBe(true);
      expect(question.seed).toBeGreaterThanOrEqual(0);
      expect(canonicalJson(generateFrom(generator, 1, question.seed))).toBe(canonicalJson(question));
    }
  });

  it('gives each skill a fixed example at level 1', () => {
    for (const generator of allGenerators()) {
      const example = exampleQuestion(generator.skillId);
      expect(example.level).toBe(1);
      expect(canonicalJson(example)).toBe(canonicalJson(exampleQuestion(generator.skillId)));
      expect(canonicalJson(example)).toBe(canonicalJson(generateQuestion(generator.skillId, 1, generator.exampleSeed)));
    }
  });
});

describe('colours a child has to tell apart', () => {
  it('never pairs two that are easy to mix up', async () => {
    const { easyToTellApart, twoClearColors } = await import('../../src/content/generators/math/pk/parts');
    const { makeRng } = await import('../../src/engine/rng');
    expect(easyToTellApart('red', 'green')).toBe(false);
    expect(easyToTellApart('green', 'red')).toBe(false);
    expect(easyToTellApart('blue', 'purple')).toBe(false);
    expect(easyToTellApart('brown', 'black')).toBe(false);
    expect(easyToTellApart('red', 'red')).toBe(false);
    expect(easyToTellApart('red', 'blue')).toBe(true);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 500; seed += 1) {
      const [one, two] = twoClearColors(makeRng(seed));
      expect(easyToTellApart(one, two), `${one} with ${two}`).toBe(true);
      seen.add([one, two].sort().join('+'));
    }
    expect(seen.size).toBeGreaterThan(20); // still plenty of variety
  });

  it('holds in every colour question of the three skills that turn on two colours', async () => {
    const { easyToTellApart } = await import('../../src/content/generators/math/pk/parts');
    for (const skillId of ['M-PK-D1', 'M-PK-D2', 'M-PK-D3']) {
      for (let seed = 1; seed <= 300; seed += 1) {
        const facts = generateQuestion(skillId, 1, seed).facts as { optionAttrs?: string[]; unit?: string[]; binAttrs?: string[] };
        const colours = [...new Set(facts.optionAttrs ?? facts.unit ?? facts.binAttrs ?? [])];
        expect(colours, `${skillId} seed ${seed}`).toHaveLength(2);
        expect(easyToTellApart(colours[0] as never, colours[1] as never), `${skillId} seed ${seed}: ${colours.join(' with ')}`).toBe(true);
      }
    }
  });
});
