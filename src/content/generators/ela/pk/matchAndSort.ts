import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, SayPart, SortBin, Visual } from '../../../../engine/types';
import { ALPHABET, DIFFERENT_SHAPES, LOOK_ALIKE_LOWER, SORT_EXCLUDED_DIGITS, SORT_EXCLUDED_LETTERS } from '../../../data/letters';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from './parts';
import { letterSaid, letterTile, pickApart, row } from './parts';
import type { Line } from './h3-parts';
import { spoken, working } from './h3-parts';

// Language Arts pre-K A.3 and A.5.

// ---- A.3 Match uppercase and lowercase ----
// Family: Match letters. Oracle: matchEqual.
// Levels: 3 pairs, different shapes (A a, B b) / 3 pairs with look-alikes.

export const looksLike = (one: string, two: string): boolean => LOOK_ALIKE_LOWER.some((set) => set.includes(one) && set.includes(two));

export function pairsExplanation(letters: string[]): Explanation {
  const speak: Say = [];
  for (const letter of letters) speak.push('Big', { letter: letter.toUpperCase() }, 'goes with small', { letter }, '.');
  const first = letters[0] as string;
  return { speak, steps: letters.map((letter) => `Big ${letter.toUpperCase()} goes with small ${letter}.`), visual: row(letterSaid(first.toUpperCase()), letterSaid(first)) };
}

const MATCH = 'Match each big letter to its small letter.';
// A match has no step to nudge with (its steps list the pairs), so its hint is a way to work: big and small
// shapes can differ (A and a), but the name is the same.
const MATCH_HINT = { text: 'Say the name of each big letter. Find the small letter with the same name.' };

// `letters` is the left column, top to bottom, as small letters. `smalls` is the right column.
export function matchQuestion(letters: string[], smalls: string[]): QuestionDraft {
  return {
    type: 'match',
    mode: 'look',
    facts: { leftValues: letters, rightValues: smalls },
    prompt: { text: MATCH, speak: [MATCH] },
    left: letters.map((letter) => letterTile(letter.toUpperCase())),
    right: smalls.map((letter) => letterTile(letter)),
    answerPairs: letters.map((letter, l): [number, number] => [l, smalls.indexOf(letter)]),
    explanation: { ...pairsExplanation(letters), hint: MATCH_HINT },
  };
}

function matchLetters(level: Level, rng: Rng): QuestionDraft {
  let letters: string[];
  if (level === 1) {
    // Big and small look different, and no two of the small letters look alike.
    letters = pickApart(DIFFERENT_SHAPES, 3, rng, (letter, picked) => picked.every((other) => !looksLike(letter, other)));
  } else {
    // Two or three small letters that look alike, such as b, d and p.
    const set = rng.pick(LOOK_ALIKE_LOWER);
    const alike = rng.sample(set, Math.min(set.length, rng.int(2, 3)));
    const rest = rng.shuffle(DIFFERENT_SHAPES.filter((letter) => !alike.includes(letter) && alike.every((other) => !looksLike(letter, other))));
    letters = rng.shuffle([...alike, ...rest.slice(0, 3 - alike.length)]);
  }
  // The small letters never sit in the same order as the big ones: there would be nothing to work out.
  for (;;) {
    const smalls = rng.shuffle(letters);
    if (smalls.some((letter, i) => letter !== letters[i])) return matchQuestion(letters, smalls);
  }
}

function matchLesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Every letter has a big shape and a small shape. Big A and small a.',
      speak: ['Every letter has a big shape and a small shape. Big', { letter: 'A' }, 'and small', { letter: 'a' }, '.'],
      visual: row(letterSaid('A'), letterSaid('a')),
    },
    { beat: 'watch', text: 'Big B goes with small b.', speak: pairsExplanation(['b']).speak, visual: row(letterSaid('B'), letterSaid('b')) },
    {
      beat: 'try',
      text: 'Which small letter goes with big G?',
      speak: ['Which small letter goes with big', { letter: 'G' }, '?'],
      visual: row(letterSaid('G'), letterSaid('t'), letterSaid('g')),
      reveal: { text: 'Big G goes with small g.', speak: pairsExplanation(['g']).speak, visual: row(letterSaid('G'), letterSaid('g')) },
    },
    {
      beat: 'remember',
      text: 'Every letter has a big shape and a small shape.',
      speak: ['Every letter has a big shape and a small shape.'],
      visual: row(letterSaid('R'), letterSaid('r')),
    },
  ];
}

export const matchLettersGenerator: SkillGenerator = {
  skillId: 'E-PK-A3',
  maxLevel: 2,
  itemTypes: ['match'],
  lists: ['letters'],
  generate: matchLetters,
  exampleSeed: 53,
  example: () => matchLetters(1, makeRng(53)),
  lesson: matchLesson,
  oracle: 'matchEqual',
};

// ---- A.5 Letter or number ----
// Family: Sorting. Oracle: sortBy.
// Levels: 4 items / 6 items. Never the look-alikes listed in the distractor rules.

const SORT_LETTERS: readonly string[] = [...ALPHABET, ...ALPHABET.map((letter) => letter.toUpperCase())].filter((letter) => !SORT_EXCLUDED_LETTERS.includes(letter));
const SORT_DIGITS: readonly string[] = Array.from({ length: 10 }, (_, digit) => digit).filter((digit) => !SORT_EXCLUDED_DIGITS.includes(digit)).map(String);

const BINS: SortBin[] = [
  { label: 'Letters', speak: ['Letters'], icon: { kind: 'text', value: 'abc', size: 'm' } },
  { label: 'Numbers', speak: ['Numbers'], icon: { kind: 'text', value: '123', size: 'm' } },
];
const KINDS = ['letter', 'number'];

const isDigit = (item: string): boolean => /^[0-9]$/.test(item);

// "t and M", "V, Q and P": a list as a child says it, written and with each item a typed part.
function listed(items: readonly string[], part: (item: string) => SayPart): Line {
  const text = items.length === 1 ? (items[0] as string) : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`;
  const speak: Say = items.flatMap((item, i): Say => [...(i === 0 ? [] : [i === items.length - 1 ? 'and' : ',']), part(item)]);
  return { text, speak };
}

// One full sentence for each group: "The letters are t and M." "The numbers are 4 and 9."
function groupLine(items: readonly string[], one: string, many: string, part: (item: string) => SayPart): Line {
  const named = items.length === 1 ? `The ${one} is` : `The ${many} are`;
  const list = listed(items, part);
  return spoken(`${named} ${list.text}.`, [named, ...list.speak, '.']);
}

const SORT_HINT = spoken('Look at each card. Is it a letter, or is it a number?', ['Look at each card. Is it a letter, or is it a number?']);

function sortExplanation(items: string[]): Explanation {
  const letters = items.filter((item) => !isDigit(item));
  const digits = items.filter(isDigit);
  const steps = [groupLine(letters, 'letter', 'letters', (letter) => ({ letter })), groupLine(digits, 'number', 'numbers', (digit) => ({ number: Number(digit) }))];
  return working(steps, row(...letters.map((letter) => letterSaid(letter))), SORT_HINT);
}

const SORT = 'Put each one in its group.';

function sortQuestion(items: string[]): QuestionDraft {
  const kinds = items.map((item) => (isDigit(item) ? 'number' : 'letter'));
  return {
    type: 'sort',
    mode: 'look',
    facts: { itemAttrs: kinds, binAttrs: KINDS, items },
    prompt: { text: SORT, speak: [SORT] },
    items: items.map((item): Visual => ({ kind: 'text', value: item, size: 'xl' })),
    bins: BINS,
    answerBin: kinds.map((kind) => KINDS.indexOf(kind)),
    explanation: sortExplanation(items),
  };
}

function letterOrNumber(level: Level, rng: Rng): QuestionDraft {
  const total = level === 1 ? 4 : 6;
  // At least one of each kind, and never more numbers than there are numbers to use.
  const letters = level === 1 ? rng.int(1, 3) : rng.int(2, 4);
  // One letter is never shown both big and small: that would be two tiles for one answer.
  const chosen = pickApart(SORT_LETTERS, letters, rng, (letter, picked) => picked.every((other) => other.toLowerCase() !== letter.toLowerCase()));
  return sortQuestion(rng.shuffle([...chosen, ...rng.sample(SORT_DIGITS, total - letters)]));
}

function sortLesson(): LessonStep[] {
  return [
    { beat: 'see', text: 'Letters make words. Numbers tell how many.', speak: ['Letters make words. Numbers tell how many.'], visual: row(letterSaid('m'), { kind: 'text', value: '4', size: 'xl', speak: [{ number: 4 }] }) },
    { beat: 'watch', text: 'R is a letter. 7 is a number.', speak: [{ letter: 'R' }, 'is a letter.', { number: 7 }, 'is a number.'], visual: row(letterSaid('R'), { kind: 'text', value: '7', size: 'xl', speak: [{ number: 7 }] }) },
    {
      beat: 'try',
      text: 'Is this a letter or a number?',
      speak: ['Is this a letter or a number?'],
      visual: letterTile('k'),
      reveal: { text: 'k is a letter.', speak: [{ letter: 'k' }, 'is a letter.'], visual: letterSaid('k') },
    },
    { beat: 'remember', text: 'Things in a group share something.', speak: ['Things in a group share something.'], visual: row(letterSaid('a'), letterSaid('t'), letterSaid('m')) },
  ];
}

export const letterOrNumberGenerator: SkillGenerator = {
  skillId: 'E-PK-A5',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['letters'],
  generate: letterOrNumber,
  exampleSeed: 55,
  example: () => letterOrNumber(1, makeRng(55)),
  lesson: sortLesson,
  oracle: 'sortBy',
};
