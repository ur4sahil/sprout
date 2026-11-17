import { describe, expect, it } from 'vitest';
import { sayWords } from '../../src/audio/say';
import { spokenSteps, stepSay } from '../../src/audio/stepSay';
import { allGenerators, generateFrom } from '../../src/content/registry';
import { isSay } from '../../src/engine/validate';

describe('stepSay: a written step, said aloud', () => {
  it('says numbers as numbers and signs as words', () => {
    expect(stepSay('8 + 3 = 11')).toEqual([{ number: 8 }, 'plus', { number: 3 }, 'equals', { number: 11 }]);
    expect(stepSay('Count on 3 more: 9, 10, 11.')).toEqual(['Count on', { number: 3 }, 'more:', { number: 9 }, ',', { number: 10 }, ',', { number: 11 }, '.']);
    expect(sayWords(stepSay('We are counting by 5s.') ?? [])).toContain('five s');
  });

  it('says a letter on its own by its name, and keeps the word "a" a word', () => {
    expect(stepSay('Milk starts with the letter m.')).toEqual(['Milk starts with the letter', { letter: 'm' }, '.']);
    expect(stepSay('Big A goes with small a.')).toEqual(['Big', { letter: 'a' }, 'goes with small', { letter: 'a' }, '.']);
    expect(stepSay('A square has 4 equal sides.')).toEqual(['A square has', { number: 4 }, 'equal sides.']);
  });

  it('gives up on what it cannot read safely', () => {
    expect(stepSay('The clock says 3:30.')).toBeNull();
    expect(stepSay('It costs $5.')).toBeNull();
    expect(stepSay('12,000 is big.')).toBeNull();
    expect(stepSay('50000 is big.')).toBeNull();
    expect(stepSay('2,406 is big.')).toEqual([{ number: 2406 }, 'is big.']);
  });

  it('every step of every skill is either read as valid speech, or the whole question falls back', () => {
    let read = 0;
    let fellBack = 0;
    for (const generator of allGenerators()) {
      for (const level of [1, 2, 3]) {
        for (let seed = 1; seed <= 25; seed += 1) {
          const said = spokenSteps(generateFrom(generator, level, seed));
          if (said === null) fellBack += 1;
          else {
            read += 1;
            for (const each of said) {
              expect(isSay(each), JSON.stringify(each)).toBe(true);
              // No digit or sign is left inside a plain string.
              for (const part of each) if (typeof part === 'string') expect(part).not.toMatch(/[0-9+=·]/);
            }
          }
        }
      }
    }
    // Nearly every question is read step by step.
    expect(read / (read + fellBack)).toBeGreaterThan(0.9);
  });
});
