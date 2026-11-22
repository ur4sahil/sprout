import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Blank, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { ALPHABET, LOOK_ALIKE_LOWER } from '../../../data/letters';
import type { SkillGenerator } from '../../../generator';
import { looksLike, matchQuestion, pairsExplanation } from '../pk/matchAndSort';
import type { Explanation } from '../pk/parts';
import { letterSaid, pickApart, row } from '../pk/parts';

// Language Arts kindergarten A.1 and A.2.

// ---- A.1 ABC order ----
// Family: ABC order. Oracle: letter.
// Levels: next letter, A to G / whole alphabet / letter before / fill a row of 4.

const inRow = (items: (string | Blank)[]): Visual => ({ kind: 'sequence', items: items.map((item): Visual | Blank => (item === 'blank' ? 'blank' : letterSaid(item))) });
const said = (letters: string[]): Say => letters.map((letter) => ({ letter }));

function orderExplanation(letters: string[], answer: string, before: boolean): Explanation {
  const neighbour = before ? (letters[1] as string) : (letters[letters.length - 2] as string);
  return {
    speak: [...said(letters), '.', before ? 'Before' : 'After', { letter: neighbour }, 'comes', { letter: answer }, '.'],
    steps: [`${letters.join(', ')}.`, `${before ? 'Before' : 'After'} ${neighbour} comes ${answer}.`],
    visual: inRow(letters),
  };
}

const NEXT = 'Which letter comes next?';
const MISSING = 'Which letter is missing?';
// The tiles question says what to do with the tiles: tap them in order.
const fillPrompt = (start: string): { text: string; speak: Say } => ({ text: `Tap the letters that come after ${start}, in ABC order.`, speak: ['Tap the letters that come after', { letter: start }, ', in ABC order.'] });
// Hints never name a letter: one of them is the answer.
const NEXT_HINT = { text: 'Sing the ABC song. What comes after the last letter here?' };
const BEFORE_HINT = { text: 'Sing the ABC song. What comes just before the first letter here?' };
const FILL_HINT = { text: 'Start at the letter you see. Sing the ABC song from there, and tap each letter you sing.' };

function abcOrder(level: Level, rng: Rng): QuestionDraft {
  const upper = rng.bool();
  const at = (index: number): string => (upper ? (ALPHABET[index] as string).toUpperCase() : (ALPHABET[index] as string));
  if (level === 4) {
    // One letter is given. The next three are built from tiles. The two spare tiles are never neighbours of the row.
    const start = rng.int(0, 22);
    const run = [1, 2, 3].map((step) => at(start + step));
    const far = ALPHABET.map((_, index) => index).filter((index) => index < start - 1 || index > start + 4);
    const bank = rng.shuffle([...run, ...rng.sample(far, 2).map(at)]);
    const all = [at(start), ...run];
    return {
      type: 'tiles',
      mode: 'look',
      facts: { letter: at(start), ask: 'run', length: 3 },
      prompt: fillPrompt(at(start)),
      stimulus: inRow([at(start), 'blank', 'blank', 'blank']),
      slots: 3,
      bank,
      answer: run.join(''),
      explanation: { speak: [...said(all), '.'], steps: [`${all.join(', ')}.`], visual: inRow(all), hint: FILL_HINT },
    };
  }
  const before = level === 3;
  // Four letters in a row. The last one is asked for, or the first one at level 3.
  const start = level === 1 ? rng.int(0, 3) : rng.int(0, 22);
  const letters = [0, 1, 2, 3].map((step) => at(start + step));
  const answerAt = before ? start : start + 3;
  // The slips: a neighbour on the wrong side, or one letter too far.
  // They are the four letters closest to the answer that are not already in the row.
  const outside = ALPHABET.map((_, index) => index).filter((index) => index < start || index > start + 3);
  const near = outside.sort((one, two) => Math.abs(one - answerAt) - Math.abs(two - answerAt) || one - two).slice(0, 4);
  const values = rng.shuffle([at(answerAt), ...rng.sample(near, 2).map(at)]);
  const shown: (string | Blank)[] = before ? ['blank', ...letters.slice(1)] : [...letters.slice(0, 3), 'blank'];
  const prompt = before ? MISSING : NEXT;
  return {
    type: 'choice',
    mode: 'look',
    facts: { letter: before ? (letters[1] as string) : (letters[2] as string), ask: before ? 'before' : 'next', options: values },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: inRow(shown),
    options: values.map((letter) => letterSaid(letter)),
    answerIndex: values.indexOf(at(answerAt)),
    explanation: { ...orderExplanation(letters, at(answerAt), before), hint: before ? BEFORE_HINT : NEXT_HINT },
  };
}

export const abcOrderGenerator: SkillGenerator = {
  skillId: 'E-K-A1',
  maxLevel: 4,
  itemTypes: ['choice', 'tiles'],
  lists: ['letters'],
  generate: abcOrder,
  exampleSeed: 301,
  example: () => abcOrder(1, makeRng(301)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'The letters of the alphabet always come in the same order.', speak: ['The letters of the alphabet always come in the same order.'], visual: inRow(['A', 'B', 'C', 'D']) },
    { beat: 'watch', text: `${NEXT} ${orderExplanation(['A', 'B', 'C', 'D'], 'D', false).steps.join(' ')}`, speak: [NEXT, ...orderExplanation(['A', 'B', 'C', 'D'], 'D', false).speak], visual: inRow(['A', 'B', 'C', 'D']) },
    { beat: 'try', text: NEXT, speak: [NEXT], visual: inRow(['d', 'e', 'f', 'blank']), reveal: { text: orderExplanation(['d', 'e', 'f', 'g'], 'g', false).steps.join(' '), speak: orderExplanation(['d', 'e', 'f', 'g'], 'g', false).speak, visual: inRow(['d', 'e', 'f', 'g']) } },
    { beat: 'remember', text: 'Sing the alphabet to check.', speak: ['Sing the alphabet to check.'], visual: inRow(['A', 'B', 'C', 'D']) },
  ],
  oracle: 'letter',
};

// ---- A.2 Uppercase and lowercase, all letters ----
// Family: Match letters. Oracle: matchEqual.
// Levels: 4 pairs / 4 pairs with look-alikes.

// A big I and a small l look the same, so the two letters never share a question.
const clash = (one: string, two: string): boolean => (one === 'i' && two === 'l') || (one === 'l' && two === 'i');
const apart = (letter: string, picked: readonly string[]): boolean => picked.every((other) => !looksLike(letter, other) && !clash(letter, other));

function matchAll(level: Level, rng: Rng): QuestionDraft {
  let letters: string[];
  if (level === 1) {
    letters = pickApart(ALPHABET, 4, rng, apart);
  } else {
    // Two or three small letters that look alike, such as b, d and p, among the four.
    const set = rng.pick(LOOK_ALIKE_LOWER);
    const alike = rng.sample(set, Math.min(set.length, rng.int(2, 3)));
    const rest = ALPHABET.filter((letter) => !alike.includes(letter) && alike.every((other) => !looksLike(letter, other)));
    letters = rng.shuffle([...alike, ...pickApart(rest, 4 - alike.length, rng, apart)]);
  }
  // The small letters never sit in the same order as the big ones.
  for (;;) {
    const smalls = rng.shuffle(letters);
    if (smalls.some((letter, i) => letter !== letters[i])) return matchQuestion(letters, smalls);
  }
}

export const matchAllLettersGenerator: SkillGenerator = {
  skillId: 'E-K-A2',
  maxLevel: 2,
  itemTypes: ['match'],
  lists: ['letters'],
  generate: matchAll,
  exampleSeed: 302,
  example: () => matchAll(1, makeRng(302)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Every letter has a big shape and a small shape. Big Q and small q.', speak: ['Every letter has a big shape and a small shape. Big', { letter: 'Q' }, 'and small', { letter: 'q' }, '.'], visual: row(letterSaid('Q'), letterSaid('q')) },
    { beat: 'watch', text: 'Big D goes with small d.', speak: pairsExplanation(['d']).speak, visual: row(letterSaid('D'), letterSaid('d')) },
    { beat: 'try', text: 'Which small letter goes with big B?', speak: ['Which small letter goes with big', { letter: 'B' }, '?'], visual: row(letterSaid('B'), letterSaid('d'), letterSaid('b')), reveal: { text: 'Big B goes with small b.', speak: pairsExplanation(['b']).speak, visual: row(letterSaid('B'), letterSaid('b')) } },
    { beat: 'remember', text: 'Every letter has a big shape and a small shape.', speak: ['Every letter has a big shape and a small shape.'], visual: row(letterSaid('M'), letterSaid('m')) },
  ],
  oracle: 'matchEqual',
};
