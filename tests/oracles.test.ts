// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allGenerators, generateFrom } from '../src/content/registry';
import type { Level, OracleId } from '../src/engine/types';
import { ORACLES } from './oracles/index';
import { judge } from './oracles/judge';

// Every skill, level and 300 seeds: the answer a generator marks must be the answer
// an independent oracle works out from the facts, and no wrong option may also be right.
const SEEDS = 300;

describe.each(allGenerators().map((generator) => [generator.skillId, generator] as const))('%s', (_skillId, generator) => {
  for (let level = 1 as Level; level <= generator.maxLevel; level = (level + 1) as Level) {
    it(`level ${level}: marked answers agree with the oracle over ${SEEDS} seeds`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const question = generateFrom(generator, level, seed);
        const named = typeof question.facts.oracle === 'string' ? (question.facts.oracle as OracleId) : generator.oracle;
        if (named === 'authored') continue; // covered by the review sheet only
        const oracle = ORACLES[named];
        expect(oracle, `the ${named} oracle has not been written`).toBeDefined();
        if (!oracle) continue;
        expect(judge(question, oracle(question.facts)), `seed ${seed}: ${JSON.stringify(question.facts)}`).toEqual([]);
      }
    });
  }
});
