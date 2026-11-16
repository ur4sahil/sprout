import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { ALPHABET } from '../../../data/letters';
import type { SightSet } from '../../../data/sightWords';
import { ALL_SIGHT_WORDS, SIGHT_WORDS, SOUND_ALIKE, soundAlike } from '../../../data/sightWords';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from '../pk/parts';
import { row } from '../pk/parts';

// Language Arts kindergarten C.1 to C.3, and the shared pieces of grade 1 B.1.
// Family: Sight words. Oracles: wordSet, and spell for the tiles level.
// These are listen skills: the word is spoken, the screen never shows which one, and the words
// on screen do not say themselves when tapped.

const word = (value: string): Visual => ({ kind: 'text', value, size: 'l' });
const wordSaid = (value: string): Visual => ({ kind: 'text', value, size: 'xl', speak: [{ word: value }] });
const firstOf = (value: string): string => value.charAt(0).toLowerCase();

function thisWord(value: string): Explanation {
  return { speak: ['This word is', { word: value }, '.'], steps: [`This word is ${value}.`], visual: wordSaid(value) };
}

// The on-screen line never shows the word being asked for.
const tapText = (target: string): string => (target === 'the' ? 'Listen. Tap one word.' : 'Listen. Tap the word.');
const tapSpeak = (target: string): Say => ['Tap the word', { word: target }, '.'];

// Hear a word, tap it.
// Level 1: the other words are very different: another first letter and another length.
// Level 2: the other words are the same length, or as near as the list allows. Level 3: they start with the same letter.
export function hearAndTap(set: SightSet, level: Level, rng: Rng): QuestionDraft {
  const own = SIGHT_WORDS[set];
  for (;;) {
    const target = rng.pick(own);
    // Same-letter partners are scarce inside one list, so level 3 draws on every list.
    const pool = (level === 3 ? ALL_SIGHT_WORDS : own).filter((each) => each !== target && !soundAlike(each, target));
    const otherStart = pool.filter((each) => firstOf(each) !== firstOf(target));
    const lengthGap = (each: string): number => Math.abs(each.length - target.length);
    // Level 2: the same length where the list has two such words, or else the nearest lengths.
    const gap = [0, 1, 2, 3].find((most) => otherStart.filter((each) => lengthGap(each) <= most).length >= 2) ?? 3;
    const fits = level === 1 ? otherStart.filter((each) => each.length !== target.length) : level === 2 ? otherStart.filter((each) => lengthGap(each) <= gap) : pool.filter((each) => firstOf(each) === firstOf(target));
    const [one, two] = rng.shuffle(fits);
    // Words that sound alike never share a question, right or wrong.
    if (one === undefined || two === undefined || soundAlike(one, two)) continue;
    const options = rng.shuffle([target, one, two]);
    return {
      type: 'choice',
      mode: 'listen',
      facts: { target, relation: 'sightWord', options },
      prompt: { text: tapText(target), speak: tapSpeak(target) },
      options: options.map(word),
      answerIndex: options.indexOf(target),
      explanation: thisWord(target),
    };
  }
}

const SPELL = 'Listen. Spell the word.';

// Hear a word, build it from letter tiles. The two spare letters can never spell a word that sounds the same.
export function spellSightWord(set: SightSet, rng: Rng): QuestionDraft {
  const target = rng.pick(SIGHT_WORDS[set].filter((each) => each.length >= 2 && each === each.toLowerCase()));
  const letters = target.split('');
  const banned = new Set([...letters, ...SOUND_ALIKE.filter((group) => group.includes(target)).flatMap((group) => group.join('').toLowerCase().split(''))]);
  const spare = rng.sample(ALPHABET.filter((letter) => !banned.has(letter)), 2);
  return {
    type: 'tiles',
    mode: 'listen',
    facts: { target, word: target, parts: letters, oracle: 'spell' },
    prompt: { text: SPELL, speak: ['Spell the word', { word: target }, '.'] },
    slots: letters.length,
    bank: rng.shuffle([...letters, ...spare]),
    answer: target,
    explanation: { speak: [{ word: target }, 'is spelled', ...letters.map((letter) => ({ letter })), '.'], steps: [`${target} is spelled ${letters.join(', ')}.`], visual: wordSaid(target) },
  };
}

function lesson(one: string, two: string, other: string): () => LessonStep[] {
  return () => [
    { beat: 'see', text: 'Some words are used all the time. Learn to know them when you see them.', speak: ['Some words are used all the time. Learn to know them when you see them.'], visual: row(wordSaid(one), wordSaid(two)) },
    { beat: 'watch', text: thisWord(one).steps.join(' '), speak: thisWord(one).speak, visual: wordSaid(one) },
    { beat: 'try', text: `Which word is ${two}?`, speak: ['Which word is', { word: two }, '?'], visual: row(wordSaid(other), wordSaid(two)), reveal: { text: thisWord(two).steps.join(' '), speak: thisWord(two).speak, visual: wordSaid(two) } },
    { beat: 'remember', text: 'Look at the whole word.', speak: ['Look at the whole word.'], visual: row(wordSaid(one), wordSaid(two)) },
  ];
}

const setOne = (level: Level, rng: Rng): QuestionDraft => hearAndTap(1, level, rng);
export const sightWordsOneGenerator: SkillGenerator = {
  skillId: 'E-K-C1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['sightWords'],
  generate: setOne,
  exampleSeed: 321,
  example: () => setOne(1, makeRng(321)),
  lesson: lesson('can', 'little', 'go'),
  oracle: 'wordSet',
};

const setTwo = (level: Level, rng: Rng): QuestionDraft => hearAndTap(2, level, rng);
export const sightWordsTwoGenerator: SkillGenerator = {
  skillId: 'E-K-C2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['sightWords'],
  generate: setTwo,
  exampleSeed: 322,
  example: () => setTwo(1, makeRng(322)),
  lesson: lesson('look', 'yellow', 'me'),
  oracle: 'wordSet',
};

const setThree = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? spellSightWord(3, rng) : hearAndTap(3, level, rng));
export const sightWordsThreeGenerator: SkillGenerator = {
  skillId: 'E-K-C3',
  maxLevel: 4,
  itemTypes: ['choice', 'tiles'],
  lists: ['sightWords', 'letters'],
  generate: setThree,
  exampleSeed: 323,
  example: () => setThree(1, makeRng(323)),
  lesson: lesson('have', 'please', 'no'),
  oracle: 'wordSet',
};
