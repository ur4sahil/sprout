import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import { CVC_WORDS } from '../../../data/cvc';
import { WORD_FAMILIES } from '../../../data/families';
import { VOWEL_SETS } from '../../../data/h3-sounds';
import { COUNT_SENTENCES } from '../../../data/h3-stories';
import { ALPHABET } from '../../../data/letters';
import type { SkillGenerator } from '../../../generator';
import { cap, letterSaid, letterTile, pickApart, row } from '../pk/parts';
import type { Told } from '../pk/h3-parts';
import { beats, letters, line, plain, spoken, working } from '../pk/h3-parts';

// Language Arts kindergarten A.3 to A.5 (plan section 15, wave H3).

// ---- A.3 Match big and small words ----
// Family: Match letters. Oracle: matchEqual.
// Levels: 3 words that start differently / 3 words with the same first letter / 3 words that
// differ only in the middle letter (pan, pen, pin). The words are not spoken: the child matches letters.

const THREE_LETTER: readonly string[] = [...new Set([...CVC_WORDS.map((each) => each.word), ...WORD_FAMILIES.flatMap((family) => family.words)])];
const FIRST_GROUPS: readonly string[][] = [...new Set(THREE_LETTER.map((word) => word.charAt(0)))].map((first) => THREE_LETTER.filter((word) => word.charAt(0) === first)).filter((group) => group.length >= 3);
// "Big word" would mean a long word: the words are the same, written in big and in small letters.
const MATCH_WORDS = line('Match each word in big letters to the same word in small letters.');
const MATCH_HINT = line('Check every letter, not just the first one.');

// Heard aloud, capitals vanish ("wet goes with wet"), so each step says which is big and which is small.
function wordsExplanation(words: string[]): Told {
  return working(
    words.map((word) => spoken(`${word.toUpperCase()} goes with ${word}.`, ['Big', { word }, 'goes with small', { word }, '.'])),
    row(plain((words[0] as string).toUpperCase(), 'xl'), plain(words[0] as string, 'xl')),
    MATCH_HINT,
  );
}

function matchWords(level: Level, rng: Rng): QuestionDraft {
  const words =
    level === 1
      ? pickApart(THREE_LETTER, 3, rng, (word, picked) => picked.every((other) => other.charAt(0) !== word.charAt(0)))
      : rng.sample(level === 2 ? rng.pick(FIRST_GROUPS) : rng.pick(VOWEL_SETS), 3);
  for (;;) {
    const smalls = rng.shuffle(words);
    if (smalls.some((word, i) => word !== words[i])) {
      return {
        type: 'match',
        mode: 'look',
        facts: { leftValues: words, rightValues: smalls },
        prompt: MATCH_WORDS,
        left: words.map((word) => plain(word.toUpperCase(), 'l')),
        right: smalls.map((word) => plain(word, 'l')),
        answerPairs: words.map((word, l): [number, number] => [l, smalls.indexOf(word)]),
        explanation: wordsExplanation(words),
      };
    }
  }
}

export const matchWordsGenerator: SkillGenerator = {
  skillId: 'E-K-A3',
  maxLevel: 3,
  itemTypes: ['match'],
  lists: ['cvc', 'families', 'h3-sounds'],
  generate: matchWords,
  exampleSeed: 4031,
  example: () => matchWords(1, makeRng(4031)),
  lesson: () =>
    beats(
      { text: 'A word can be written in big letters or small letters. CAT and cat are the same word.', speak: ['A word can be written in big letters or small letters. Big and small, it is the same word,', { word: 'cat' }, '.'], visual: row(plain('CAT', 'xl'), plain('cat', 'xl')) },
      { text: 'DOG goes with dog. Each letter matches: D and d, O and o, G and g.', speak: ['Big', { word: 'dog' }, 'goes with small', { word: 'dog' }, '. Each letter matches.'], visual: row(plain('DOG', 'xl'), plain('dog', 'xl')) },
      { text: 'Which small word goes with PEN?', speak: ['Which small word goes with big', { word: 'pen' }, '?'], visual: row(plain('PEN', 'xl'), plain('pin', 'xl'), plain('pen', 'xl')) },
      { text: 'PEN goes with pen. The middle letter is e in both.', speak: ['Big', { word: 'pen' }, 'goes with small', { word: 'pen' }, '. The middle letter is', { letter: 'e' }, 'in both.'], visual: row(plain('PEN', 'xl'), plain('pen', 'xl')) },
      { ...line('Check every letter, not just the first one.'), visual: row(plain('PAN', 'xl'), plain('pan', 'xl')) },
    ),
  oracle: 'matchEqual',
};

// ---- A.4 Vowels ----
// Levels: find the vowel, 2 letters / find the vowel, 3 letters / find the one that is not a vowel, 3 letters.
// All the letters in a question are big, or all small. Never y, which is sometimes a vowel.

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
// Never y, which is sometimes a vowel, nor l, which looks like a capital I.
const CONSONANTS = ALPHABET.filter((letter) => !VOWELS.includes(letter) && letter !== 'y' && letter !== 'l');
const ALL_VOWELS = letters(['A', 'E', 'I', 'O', 'U']);
const vowelPrompt = (vowel: boolean): Line => line(vowel ? 'Which letter is a vowel?' : 'Which letter is not a vowel?');
type Line = { text: string; speak: Say };

// A step starts with a capital, as a sentence does: "The letter a is a vowel.", never "a is a vowel."
// The hint for finding a vowel cannot list the vowels: one of them is the answer.
const FIND_VOWEL_HINT = line('Say each letter. Is it one of the five vowels?');
const NOT_VOWEL_HINT = spoken(`The vowels are ${ALL_VOWELS.text}. Which letter is not one of them?`, ['The vowels are', ...ALL_VOWELS.speak, '. Which letter is not one of them?']);

function vowelExplanation(letter: string, vowel: boolean): Told {
  return working(
    [
      spoken(`The vowels are ${ALL_VOWELS.text}.`, ['The vowels are', ...ALL_VOWELS.speak, '.']),
      spoken(`The letter ${letter} ${vowel ? 'is' : 'is not'} a vowel.`, ['The letter', { letter }, vowel ? 'is a vowel.' : 'is not a vowel.']),
    ],
    row(...['a', 'e', 'i', 'o', 'u'].map((each) => letterSaid(letter === letter.toUpperCase() ? each.toUpperCase() : each))),
    vowel ? FIND_VOWEL_HINT : NOT_VOWEL_HINT,
  );
}

function vowels(level: Level, rng: Rng): QuestionDraft {
  const big = rng.bool();
  const cased = (letter: string): string => (big ? letter.toUpperCase() : letter);
  const vowel = level < 3;
  const answer = cased(rng.pick(vowel ? VOWELS : CONSONANTS));
  const wrong = rng.sample(vowel ? CONSONANTS : VOWELS, level === 1 ? 1 : 2).map(cased);
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'vowel', target: vowel ? 'vowel' : 'consonant', answer, options },
    prompt: vowelPrompt(vowel),
    options: options.map((each) => letterTile(each)),
    answerIndex: options.indexOf(answer),
    explanation: vowelExplanation(answer, vowel),
  };
}

export const vowelsGenerator: SkillGenerator = {
  skillId: 'E-K-A4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['letters'],
  generate: vowels,
  exampleSeed: 4041,
  example: () => vowels(1, makeRng(4041)),
  lesson: () =>
    beats(
      { text: `Five letters are vowels: ${ALL_VOWELS.text}. Every word has a vowel.`, speak: ['Five letters are vowels:', ...ALL_VOWELS.speak, '. Every word has a vowel.'], visual: row(...['A', 'E', 'I', 'O', 'U'].map((each) => letterSaid(each))) },
      { text: `${vowelPrompt(true).text} ${vowelExplanation('o', true).steps.join(' ')}`, speak: [...vowelPrompt(true).speak, ...vowelExplanation('o', true).speak], visual: row(letterTile('t'), letterTile('o')) },
      { ...vowelPrompt(true), visual: row(letterTile('M'), letterTile('E'), letterTile('R')) },
      { text: vowelExplanation('E', true).steps.join(' '), speak: vowelExplanation('E', true).speak, visual: letterSaid('E') },
      { text: `The vowels are ${ALL_VOWELS.text}.`, speak: ['The vowels are', ...ALL_VOWELS.speak, '.'], visual: row(...['A', 'E', 'I', 'O', 'U'].map((each) => letterSaid(each))) },
    ),
  oracle: 'earlyWords',
};

// ---- A.5 Letter, word or sentence ----
// Family: Sorting. Levels: 4 cards into letters and words, two each / 6 cards into letters, words and sentences, two each.
// The cards are not spoken. Never a, i or I, which are letters and words, nor l and o, which look like 1 and 0.

const KINDS = ['letter', 'word', 'sentence'] as const;
const KIND_BINS: SortBin[] = [
  { label: 'Letter', speak: ['Letter'] },
  { label: 'Word', speak: ['Word'] },
  { label: 'Sentence', speak: ['Sentence'] },
];
const SORT_LETTERS = ALPHABET.filter((letter) => !['a', 'i', 'l', 'o'].includes(letter));
const SENTENCES = COUNT_SENTENCES.filter((sentence) => sentence.split(' ').length >= 3);
// Level 1 has no sentence group, so it does not ask about sentences.
const sortPrompt = (bins: number): Line => line(bins === 2 ? 'Is it a letter or a word? Put each card in its group.' : 'Is it a letter, a word or a sentence? Put each card in its group.');
const sortHint = (bins: number): Line => line(bins === 2 ? 'Count the letters on each card. One letter on its own is a letter.' : 'Count the letters on each card, and look for spaces between words.');

// Full sentences, each starting with a capital: never "k is one letter." or a label such as "mop is a word: ...".
function kindExplanation(items: string[], bins: number): Told {
  const first = (kind: string): string => items.find((item) => (item.includes(' ') ? 'sentence' : item.length === 1 ? 'letter' : 'word') === kind) as string;
  const letter = first('letter');
  const word = first('word');
  const steps: Line[] = [
    spoken(`The card with ${letter} has one letter.`, ['The card with', { letter }, 'has one letter.']),
    spoken(`${cap(word)} is a word. A word is letters put together.`, [{ word }, 'is a word. A word is letters put together.']),
  ];
  if (bins === 3) steps.push(line(`${first('sentence')} That is a sentence. A sentence is words put together.`));
  return working(steps, row(plain(letter, 'xl'), plain(word, 'l')), sortHint(bins));
}

function printKinds(level: Level, rng: Rng): QuestionDraft {
  const bins = level === 1 ? 2 : 3;
  const picked = [rng.sample(SORT_LETTERS, 2), rng.sample(THREE_LETTER, 2), rng.sample(SENTENCES, 2)].slice(0, bins);
  const items = rng.shuffle(picked.flat());
  const kindOf = (item: string): number => picked.findIndex((group) => group.includes(item));
  return {
    type: 'sort',
    mode: 'look',
    facts: { relation: 'printKind', target: KINDS.slice(0, bins).join('|'), items, bins: [...KINDS.slice(0, bins)] },
    prompt: sortPrompt(bins),
    items: items.map((item): Visual => plain(item, item.includes(' ') ? 'm' : 'l')),
    bins: KIND_BINS.slice(0, bins),
    answerBin: items.map(kindOf),
    explanation: kindExplanation(items, bins),
  };
}

export const printKindsGenerator: SkillGenerator = {
  skillId: 'E-K-A5',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['cvc', 'families', 'h3-stories', 'letters'],
  generate: printKinds,
  exampleSeed: 4051,
  example: () => printKinds(1, makeRng(4051)),
  lesson: () =>
    beats(
      { ...line('A letter is one mark. Letters together make a word. Words together make a sentence.'), visual: row(plain('m', 'xl'), plain('map', 'l'), plain('I see a map.', 'm')) },
      { text: 'Is t a letter or a word? t is one letter.', speak: ['Is this a letter or a word?', { letter: 't' }, 'is one letter.'], visual: plain('t', 'xl') },
      { ...line('Is this a letter, a word or a sentence?'), visual: plain('We can run.', 'm') },
      { ...line('It is a sentence: words together, with a period at the end.'), visual: plain('We can run.', 'm') },
      { ...line('Count the letters. Look for spaces between words.'), visual: row(plain('m', 'xl'), plain('map', 'l')) },
    ),
  oracle: 'earlyWords',
};
