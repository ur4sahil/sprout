import { describe, expect, it } from 'vitest';
import { sayWords } from '../../src/audio/say';
import { clockSay, dollarSay, fractionSay, openingWords, pluralWord, spokenSteps, stepSay } from '../../src/audio/stepSay';
import { voiceText } from '../../src/audio/voice';
import { allGenerators, generateFrom } from '../../src/content/registry';
import type { Question, Say } from '../../src/engine/types';
import { isSay } from '../../src/engine/validate';

// What the voice is given for a step: the recorded voice gets letters as capitals, the device voice their names.
const recorded = (step: string): string | null => {
  const said = stepSay(step);
  return said === null ? null : voiceText(said);
};
const device = (step: string): string | null => {
  const said = stepSay(step);
  return said === null ? null : sayWords(said);
};

describe('stepSay: a written step, said aloud', () => {
  it('says numbers as numbers and signs as words', () => {
    expect(stepSay('8 + 3 = 11')).toEqual([{ number: 8 }, 'plus', { number: 3 }, 'equals', { number: 11 }]);
    expect(stepSay('Count on 3 more: 9, 10, 11.')).toEqual(['Count on', { number: 3 }, 'more:', { number: 9 }, ',', { number: 10 }, ',', { number: 11 }, '.']);
    expect(stepSay('6 × 7 = 42')).toEqual([{ number: 6 }, 'times', { number: 7 }, 'equals', { number: 42 }]);
    expect(stepSay('42 ÷ 6 = 7')).toEqual([{ number: 42 }, 'divided by', { number: 6 }, 'equals', { number: 7 }]);
    expect(stepSay('9 − 2 = 7')).toEqual([{ number: 9 }, 'minus', { number: 2 }, 'equals', { number: 7 }]);
  });

  it('says 10s, 2s, 5s and 100s as tens, twos, fives and hundreds, for every number up to 1,000', () => {
    expect(device('We are counting by 10s.')).toBe('We are counting by tens.');
    expect(device('We are counting by 5s.')).toBe('We are counting by fives.');
    expect(device('Count by 2s: 2, 4, 6, 8.')).toBe('Count by twos: two, four, six, eight.');
    expect(device('We are counting by 100s.')).toBe('We are counting by hundreds.');
    const cases: [number, string][] = [
      [0, 'zeros'], [1, 'ones'], [3, 'threes'], [4, 'fours'], [6, 'sixes'], [7, 'sevens'], [8, 'eights'], [9, 'nines'], [11, 'elevens'], [12, 'twelves'],
      [15, 'fifteens'], [20, 'twenties'], [25, 'twenty-fives'], [50, 'fifties'], [90, 'nineties'], [200, 'two hundreds'], [1000, 'thousands'],
    ];
    for (const [n, word] of cases) expect(pluralWord(n), String(n)).toBe(word);
    expect(device('Count by 1,000s.')).toBe('Count by thousands.');
    const all = Array.from({ length: 1001 }, (_, n) => pluralWord(n));
    expect(new Set(all).size).toBe(1001);
    for (const word of all) expect(word).toMatch(/^[a-z -]+s$/);
    // Above 1,000 a plural is not read: the step is not said, rather than said wrong.
    expect(pluralWord(1001)).toBeNull();
    expect(stepSay('Count by 2000s.')).toBeNull();
  });

  it('says a lone ? as "what" and a box as "blank"', () => {
    expect(stepSay('Think: 1 + ? = 8.')).toEqual(['Think:', { number: 1 }, 'plus what equals', { number: 8 }, '.']);
    expect(device('? + 3 = 5')).toBe('what plus three equals five');
    expect(device('3 × □ = 18.')).toBe('three times blank equals eighteen.');
    // A question mark at the end of a question is a question mark.
    expect(device('How many are left?')).toBe('How many are left?');
  });

  it('says a sign named at the end of a sentence, and a sign between numbers in the order written', () => {
    expect(device('The sign is −.')).toBe('The sign is minus.');
    expect(device('The sign is +.')).toBe('The sign is plus.');
    expect(device('The sign is ×.')).toBe('The sign is times.');
    expect(device('The sign is ÷.')).toBe('The sign is divided by.');
    expect(device('The sign is =.')).toBe('The sign is equals.');
    expect(device('The sign is <.')).toBe('The sign is less than.');
    expect(device('The sign is >.')).toBe('The sign is greater than.');
    expect(device('54 is less than 68, so the sign is <')).toBe('fifty-four is less than sixty-eight, so the sign is less than');
    expect(device('So 54 < 68.')).toBe('So fifty-four is less than sixty-eight.');
    expect(device('So 2/6 < 4/6.')).toBe('So two sixths is less than four sixths.');
    expect(device('9 > 7, so the sign is >, greater than.')).toBe('nine is greater than seven, so the sign is greater than, greater than.');
  });

  it('says a letter on its own as the letter, and keeps the word "a" a word', () => {
    expect(stepSay('Milk starts with the letter m.')).toEqual(['Milk starts with the letter', { letter: 'm' }, '.']);
    expect(stepSay('Big A goes with small a.')).toEqual(['Big', { letter: 'a' }, 'goes with small', { letter: 'a' }, '.']);
    expect(stepSay('A square has 4 equal sides.')).toEqual(['A square has', { number: 4 }, 'equal sides.']);
    // Spelled out, in lists, before a verb, after "the", at the end of a sentence: the letter.
    expect(recorded('Hand is spelled H, a, N, D.')).toBe('Hand is spelled H, A, N, D.');
    expect(device('Hand is spelled H, a, N, D.')).toBe('Hand is spelled aitch, ay, en, dee.');
    expect(recorded('a is a vowel.')).toBe('A is a vowel.');
    expect(recorded('There is no e at the end, so the a is short.')).toBe('There is no E at the end, so the A is short.');
    expect(recorded('Before b comes a.')).toBe('Before B comes A.');
    expect(recorded('Apple starts with a')).toBe('Apple starts with A');
    expect(recorded('The e at the end makes the a say its name.')).toBe('The E at the end makes the A say its name.');
    expect(recorded('Ava starts with A too.')).toBe('Ava starts with A too.');
    expect(device('Ava starts with A too.')).toBe('Ava starts with ay too.');
    expect(recorded('c a t')).toBe('C A T');
    expect(recorded('Both repeat A A B, A A B.')).toBe('Both repeat A A B, A A B.');
    expect(device('Both repeat A A B, A A B.')).toBe('Both repeat ay ay bee, ay ay bee.');
    expect(recorded('The vowels are a, e, i, o and u.')).toBe('The vowels are A, E, I, O and U.');
    expect(recorded('A is in it.')).toBe('A is in it.');
    expect(device('A is in it.')).toBe('ay is in it.');
    expect(recorded('Kim has the letters K, I, M.')).toBe('Kim has the letters K, I, M.');
    // The word "a", the word "A" starting a sentence, and words such as "As" stay words.
    for (const step of ['This is a square.', 'There is a b in bed.', 'The story says: A big crab sat on a shell.', '3. A sprout came up.', 'What is in the box? A toy car.', 'As you count, touch each one.', 'Ben and I play.', '"A cat ran." is a sentence.']) {
      expect(stepSay(step)?.some((part) => typeof part === 'object' && 'letter' in part && /^[ai]$/.test(part.letter)), step).toBe(false);
    }
    expect(device('There is a b in bed.')).toBe('There is a bee in bed.');
    expect(device('As you count, touch each one.')).toBe('As you count, touch each one.');
  });

  it('reads fractions, mixed numbers, clock times and money', () => {
    expect(device('So it is 1/2.')).toBe('So it is one half.');
    expect(device('3/4 of the pizza')).toBe('three fourths of the pizza');
    expect(device('5/8 is shaded.')).toBe('five eighths is shaded.');
    expect(device('2/2 is one whole.')).toBe('two halves is one whole.');
    expect(device('1/10 is one group.')).toBe('one tenth is one group.');
    expect(device('7/1 means 7 wholes.')).toBe('seven over one means seven wholes.');
    expect(device('Find 8 1/2 on the line.')).toBe('Find eight and a half on the line.');
    expect(device('It is 6 3/4 inches.')).toBe('It is six and three fourths inches.');
    expect(fractionSay(1, 3)).toEqual([{ number: 1 }, 'third']);
    expect(fractionSay(1, 37)).toBeNull();
    expect(stepSay('It is 1/37 of it.')).toBeNull();

    expect(device('It is 3:30.')).toBe('It is three thirty.');
    expect(device('It is 7:05.')).toBe('It is seven oh five.');
    expect(device('It is 12:00.')).toBe("It is twelve o'clock.");
    expect(device('3 hours after 8:00 is 11:00.')).toBe("three hours after eight o'clock is eleven o'clock.");
    expect(device('It is 9:40.')).toBe('It is nine forty.');
    // A written time is a time part, so it is said by the same words as one: "eight thirty", never "half past eight".
    expect(clockSay(8, 30)).toEqual([{ time: { hour: 8, minute: 30 } }]);
    expect(device('It is 8:30.')).toBe('It is eight thirty.');
    expect(device('It is 8:45.')).toBe('It is eight forty-five.');
    expect(clockSay(13, 0)).toBeNull();
    expect(clockSay(3, 75)).toBeNull();
    expect(stepSay('It is 13:00.')).toBeNull();

    expect(device('That is $1.25.')).toBe('That is one dollar and twenty-five cents.');
    expect(device('That is 25¢.')).toBe('That is twenty-five cents.');
    expect(device('10¢ + 45¢ = 55¢.')).toBe('ten cents plus forty-five cents equals fifty-five cents.');
    expect(device('That is 1¢.')).toBe('That is one cent.');
    expect(device('It costs $5.')).toBe('It costs five dollars.');
    expect(device('It costs $1.')).toBe('It costs one dollar.');
    expect(device('It costs $2.05.')).toBe('It costs two dollars and five cents.');
    expect(dollarSay(0, 50)).toEqual([{ cents: 50 }]);
  });

  it('reads what is inside quotation marks and brackets, and leaves the marks out', () => {
    expect(recorded('"How many more" means take away.')).toBe('How many more means take away.');
    expect(recorded('“Stop!” is a shout.')).toBe('Stop! is a shout.');
    // A full stop inside the marks, with the sentence going on after them, is only a pause.
    expect(recorded('"I like my bed." is a sentence.')).toBe('I like my bed, is a sentence.');
    expect(recorded('I (1) see (2) you (3)')).toBe('I, one, see, two, you, three');
    expect(recorded('(4 × 2) × 4 = 8 × 4 = 32.')).toBe('four times two, times four equals eight times four equals thirty-two.');
    expect(recorded('(7 × 5) + (7 × 1) = 42')).toBe('seven times five, plus seven times one, equals forty-two');
    expect(recorded('Sam’s mom hugs him.')).toBe("Sam's mom hugs him.");
    expect(recorded("The dogs' bone is big.")).toBe('The dogs bone is big.');
    expect(recorded("It is 5 o'clock.")).toBe("It is five o'clock.");
  });

  it('gives up on what it cannot read safely', () => {
    expect(stepSay('12,000 is big.')).toBeNull();
    expect(stepSay('50000 is big.')).toBeNull();
    expect(stepSay('2,406 is big.')).toEqual([{ number: 2406 }, 'is big.']);
    expect(stepSay('4,306 is 4 thousands.')).toEqual([{ number: 4306 }, 'is', { number: 4 }, 'thousands.']);
    for (const step of ['50% off', 'It came 3rd.', 'Jet ends in /et/.', 'x² is big', '2.5 is a half more', 'A–Z', 'Gift ends with -ft.']) expect(stepSay(step), step).toBeNull();
  });
});

function question(steps: string[], stepsSay?: (Say | null)[]): Question {
  return {
    skillId: 'T-1', level: 1, seed: 1, key: 'T-1|1|{}', facts: { n: 1 }, mode: 'look', type: 'numberPad', answer: 3, maxDigits: 1,
    prompt: { text: 'How many?', speak: ['How many?'] },
    explanation: { speak: ['There are', { number: 3 }, '.'], steps, ...(stepsSay ? { stepsSay } : {}) },
  };
}

describe('spokenSteps: one line for each step', () => {
  it('a step that cannot be read is silent on its own, and the summary is never said in its place', () => {
    const q = question(['Start at 1.', 'It is 50% more.', 'So it is 3.']);
    expect(spokenSteps(q)).toEqual([['Start at', { number: 1 }, '.'], null, ['So it is', { number: 3 }, '.']]);
    expect(openingWords(q)).toEqual(['Not quite.', 'Start at', { number: 1 }, '.']);
    // A first step that cannot be read: only "Not quite" is said.
    expect(openingWords(question(['It is 50% more.', 'So it is 3.']))).toEqual(['Not quite.']);
  });

  it('a step with its own speech in explanation.stepsSay is said that way; null reads the text', () => {
    const own: Say = ['Jet and wet both end with', { letter: 'e' }, ',', { letter: 't' }, '.'];
    const q = question(['Jet and wet both end in et.', 'They rhyme.'], [own, null]);
    expect(spokenSteps(q)).toEqual([own, ['They rhyme.']]);
    expect(openingWords(q)).toEqual(['Not quite.', ...own]);
    // A list shorter than the steps reads the rest from the text.
    expect(spokenSteps(question(['Jet ends in /et/.', 'They rhyme.'], [own]))).toEqual([own, ['They rhyme.']]);
  });

  it('every step of every skill is said, as valid speech with no digit or sign left in its words', () => {
    let steps = 0;
    for (const generator of allGenerators()) {
      for (let level = 1; level <= generator.maxLevel; level += 1) {
        for (let seed = 1; seed <= 25; seed += 1) {
          const q = generateFrom(generator, level, seed);
          spokenSteps(q).forEach((said, i) => {
            const step = q.explanation.steps[i] ?? '';
            const where = `${generator.skillId} L${level} s${seed}: ${step}`;
            expect(said, where).not.toBeNull();
            if (said === null) return;
            steps += 1;
            expect(isSay(said), where).toBe(true);
            // No digit, sign, slash or quotation mark is left inside plain words.
            for (const part of said) if (typeof part === 'string') expect(part, where).not.toMatch(/[0-9+=·×÷−<>/¢$"“”()]|^\s*$/);
            // A number is never followed by a loose "s" ("ten s"), and every sign in the step is said.
            said.forEach((part, j) => {
              const after = said[j + 1];
              if (typeof part === 'object' && 'number' in part && typeof after === 'string') expect(after, where).not.toMatch(/^s\b/);
            });
            const signs = (step.match(/[+−×÷=<>]/g) ?? []).length;
            // Pre-K and kindergarten say "take away" for the minus sign (the owner's choice, Nov 22, 2026).
            const words = (sayWords(said).match(/\b(plus|minus|take away|times|divided by|equals|less than|greater than)\b/g) ?? []).length;
            expect(words, where).toBeGreaterThanOrEqual(signs);
          });
        }
      }
    }
    expect(steps).toBeGreaterThan(10_000);
  });
});
