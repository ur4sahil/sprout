import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say } from '../../../../engine/types';
import { ALPHABET, LOOK_ALIKE_LOWER, LOOK_ALIKE_UPPER } from '../../../data/letters';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from './parts';
import { letterSaid, letterTile, row } from './parts';

// Language Arts pre-K A.1, A.2 and A.4. Family: Find the letter. Oracle: letter.
// A.1 and A.2 are listen skills: the child hears a letter name, the screen never shows which,
// and the letters do not say their names.

type Case = 'upper' | 'lower';

const inCase = (letter: string, which: Case): string => (which === 'upper' ? letter.toUpperCase() : letter.toLowerCase());

function allLetters(which: Case): string[] {
  return ALPHABET.map((letter) => inCase(letter, which));
}

// The letters a child mixes up with this one, in the same case.
function lookAlikes(letter: string, which: Case): string[] {
  const sets = which === 'upper' ? LOOK_ALIKE_UPPER : LOOK_ALIKE_LOWER;
  return [...new Set(sets.filter((set) => set.includes(letter)).flatMap((set) => set))].filter((other) => other !== letter);
}

function confusable(which: Case): string[] {
  return allLetters(which).filter((letter) => lookAlikes(letter, which).length > 0);
}

// The letters offered, in a random order.
// Level 1: two letters that do not look alike. Level 2: three, with a look-alike when the letter has one.
// Level 3: a letter that has look-alikes, beside as many of them as fit.
function offered(level: Level, which: Case, rng: Rng): { target: string; values: string[] } {
  const target = rng.pick(level === 3 ? confusable(which) : allLetters(which));
  const alike = rng.shuffle(lookAlikes(target, which));
  const plain = rng.shuffle(allLetters(which).filter((letter) => letter !== target && !alike.includes(letter)));
  const others = level === 1 ? plain.slice(0, 1) : level === 2 ? [...alike.slice(0, 1), ...plain].slice(0, 2) : [...alike, ...plain].slice(0, 2);
  return { target, values: rng.shuffle([target, ...others]) };
}

function thisIs(letter: string): Explanation {
  return { speak: ['This is the letter', { letter }, '.'], steps: [`This is the letter ${letter}.`], visual: letterSaid(letter) };
}

// ---- A.1 and A.2: hear a letter name, tap the letter ----

// Every listen question starts with "Listen." on screen. The voice says the letter; the screen never shows it.
const FIND = 'Listen. Find the letter.';
const findSpeak = (letter: string): Say => ['Find the letter', { letter }, '.'];
const FIND_HINT = { text: 'Tap the speaker to hear the letter again. Then look closely at each letter.' };

function findQuestion(level: Level, which: Case, rng: Rng): QuestionDraft {
  const { target, values } = offered(level, which, rng);
  return {
    type: 'choice',
    mode: 'listen',
    facts: { target, letter: target, ask: which, options: values },
    prompt: { text: FIND, speak: findSpeak(target) },
    options: values.map((letter) => letterTile(letter)),
    answerIndex: values.indexOf(target),
    explanation: { ...thisIs(target), hint: FIND_HINT },
  };
}

function findLesson(which: Case): LessonStep[] {
  const [see, watch, other, tryIt, beside] = ['a', 'b', 'm', 's', 't'].map((letter) => inCase(letter, which)) as [string, string, string, string, string];
  return [
    { beat: 'see', text: `Every letter has a name. This is the letter ${see}.`, speak: ['Every letter has a name.', ...thisIs(see).speak], visual: letterSaid(see) },
    { beat: 'watch', text: `Find the letter ${watch}. This is the letter ${watch}.`, speak: [...findSpeak(watch), ...thisIs(watch).speak], visual: row(letterSaid(watch), letterSaid(other)) },
    {
      beat: 'try',
      text: `Find the letter ${tryIt}.`,
      speak: findSpeak(tryIt),
      visual: row(letterSaid(beside), letterSaid(tryIt)),
      reveal: { text: thisIs(tryIt).steps.join(' '), speak: thisIs(tryIt).speak, visual: letterSaid(tryIt) },
    },
    { beat: 'remember', text: 'Every letter has a name.', speak: ['Every letter has a name.'], visual: row(letterSaid(see), letterSaid(watch), letterSaid(tryIt)) },
  ];
}

function findSkill(skillId: string, which: Case, exampleSeed: number): SkillGenerator {
  const generate = (level: Level, rng: Rng): QuestionDraft => findQuestion(level, which, rng);
  return {
    skillId,
    maxLevel: 3,
    itemTypes: ['choice'],
    lists: ['letters'],
    generate,
    exampleSeed,
    example: () => generate(1, makeRng(exampleSeed)),
    lesson: () => findLesson(which),
    oracle: 'letter',
  };
}

export const findUppercaseGenerator = findSkill('E-PK-A1', 'upper', 51);
export const findLowercaseGenerator = findSkill('E-PK-A2', 'lower', 52);

// ---- A.4 Find the same letter ----
// Levels: see a letter, tap its twin: 2 options / 3 options / look-alikes.
// Level 1 uses big letters. Above that the letter is big or small, and every option is the same case.

const SAME = 'Find the same letter.';
const SAME_HINT = { text: 'Look at the letter above. Find the one with just the same shape.' };

function sameLetter(level: Level, rng: Rng): QuestionDraft {
  const which: Case = level === 1 ? 'upper' : rng.pick<Case>(['upper', 'lower']);
  const { target, values } = offered(level, which, rng);
  const shown = thisIs(target);
  return {
    type: 'choice',
    mode: 'look',
    facts: { letter: target, ask: which, options: values },
    prompt: { text: SAME, speak: [SAME] },
    stimulus: letterSaid(target),
    options: values.map((letter) => letterTile(letter)),
    answerIndex: values.indexOf(target),
    explanation: { speak: [...shown.speak, 'They are the same.'], steps: [...shown.steps, 'They are the same.'], visual: row(letterSaid(target), letterSaid(target)), hint: SAME_HINT },
  };
}

function sameLesson(): LessonStep[] {
  return [
    { beat: 'see', text: 'Every letter has its own shape. This is the letter A.', speak: ['Every letter has its own shape.', ...thisIs('A').speak], visual: letterSaid('A') },
    { beat: 'watch', text: 'Find the same letter. This is the letter T. They are the same.', speak: [SAME, ...thisIs('T').speak, 'They are the same.'], visual: row(letterSaid('T'), letterSaid('T')) },
    {
      beat: 'try',
      text: 'Which one is the same as the first letter?',
      speak: ['Which one is the same as the first letter?'],
      visual: row(letterSaid('M'), letterSaid('S'), letterSaid('M')),
      reveal: { text: 'This is the letter M. They are the same.', speak: [...thisIs('M').speak, 'They are the same.'], visual: row(letterSaid('M'), letterSaid('M')) },
    },
    { beat: 'remember', text: 'Every letter has a name.', speak: ['Every letter has a name.'], visual: row(letterSaid('A'), letterSaid('T'), letterSaid('M')) },
  ];
}

export const sameLetterGenerator: SkillGenerator = {
  skillId: 'E-PK-A4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['letters'],
  generate: sameLetter,
  exampleSeed: 54,
  example: () => sameLetter(1, makeRng(54)),
  lesson: sameLesson,
  oracle: 'letter',
};
