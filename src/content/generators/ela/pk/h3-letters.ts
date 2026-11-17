import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SoundWord } from '../../../data/firstSounds';
import { FIRST_SOUNDS } from '../../../data/firstSounds';
import { LONG_NAMES, NAMES } from '../../../data/h3-stories';
import { LOOK_ALIKE_LOWER, LOOK_ALIKE_UPPER } from '../../../data/letters';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from './parts';
import { cap, letterSaid, letterTile, pickApart, picture, row } from './parts';
import { beats, letters, line, said } from './h3-parts';

// Language Arts pre-K A.6 and A.7 (plan section 15, wave H3). Oracle: earlyWords.

// ---- A.6 Which picture starts with the letter ----
// Levels: a big letter, 2 spoken pictures / a big letter, 3 pictures / a small letter, 3 pictures,
// one starting with a letter that looks like it (b and d) where the list has one.

const shown = (entry: SoundWord): Visual => picture(entry.word, entry.emoji);
const lookAlikes = (letter: string): string[] => [...new Set(LOOK_ALIKE_LOWER.filter((set) => set.includes(letter)).flat())].filter((other) => other !== letter);
// c, k and s can share a sound, as can g and j: never offered against each other.
const SOUND_GROUPS = [['c', 'k', 's'], ['g', 'j']];
const soundsLike = (one: string, two: string): boolean => SOUND_GROUPS.some((group) => group.includes(one) && group.includes(two));

function startsPrompt(letter: string): { text: string; speak: Say } {
  return { text: `Which one starts with the letter ${letter}?`, speak: ['Which one starts with the letter', { letter }, '?'] };
}

function startsExplanation(entry: SoundWord, letter: string): Explanation {
  return {
    speak: [{ word: entry.word }, 'starts with the letter', { letter }, '.'],
    steps: [`${cap(entry.word)} starts with the letter ${letter}.`],
    visual: row(shown(entry), letterSaid(letter)),
  };
}

function letterPicture(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(FIRST_SOUNDS);
  const letter = entry.letter;
  const fits = (other: SoundWord, picked: readonly SoundWord[]): boolean =>
    other.letter !== letter && other.sound !== entry.sound && !soundsLike(other.letter, letter) && picked.every((each) => each.letter !== other.letter && each.sound !== other.sound);
  const near = level === 3 ? rng.shuffle(FIRST_SOUNDS.filter((other) => lookAlikes(letter).includes(other.letter))).slice(0, 1) : [];
  const wrong = [...near, ...pickApart(FIRST_SOUNDS, 2, rng, (other, picked) => fits(other, [...near, ...picked]))].slice(0, level === 1 ? 1 : 2);
  const options = rng.shuffle([entry, ...wrong]);
  const written = level === 3 ? letter : letter.toUpperCase();
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'letterPicture', target: letter, answer: entry.word, options: options.map((each) => each.word) },
    prompt: startsPrompt(written),
    stimulus: letterSaid(written),
    options: options.map(shown),
    answerIndex: options.indexOf(entry),
    explanation: startsExplanation(entry, written),
  };
}

const sound = (word: string): SoundWord => FIRST_SOUNDS.find((entry) => entry.word === word) as SoundWord;

export const letterPictureGenerator: SkillGenerator = {
  skillId: 'E-PK-A6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['firstSounds', 'letters'],
  generate: letterPicture,
  exampleSeed: 3061,
  example: () => letterPicture(1, makeRng(3061)),
  lesson: () => {
    const sun = startsExplanation(sound('sun'), 'S');
    const moon = startsExplanation(sound('moon'), 'M');
    return beats(
      { text: 'Every letter starts some words. S starts sun.', speak: ['Every letter starts some words.', { letter: 'S' }, 'starts', { word: 'sun' }, '.'], visual: sun.visual },
      { text: `${startsPrompt('S').text} ${sun.steps.join(' ')}`, speak: [...startsPrompt('S').speak, ...sun.speak], visual: row(shown(sound('sun')), shown(sound('dog'))) },
      { ...startsPrompt('M'), visual: row(letterSaid('M'), shown(sound('pig')), shown(sound('moon'))) },
      { text: moon.steps.join(' '), speak: moon.speak, visual: moon.visual },
      { ...line('Say the word and listen to the very start.'), visual: sun.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- A.7 Letters in a name ----
// Levels: a short name, 2 letters / a short name, 3 letters / a longer name, 3 letters, one
// that looks like a letter in the name (M and N) where there is one. Letters do not say their names.

const ALPHABET_UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ'.split(''); // never I or L, which look like lines
const upperLookAlikes = (letter: string): string[] => [...new Set(LOOK_ALIKE_UPPER.filter((set) => set.includes(letter)).flat())].filter((other) => other !== letter);
const IN_NAME = 'Which letter is in this name?';
const IN_NAME_SAY: Say = ['Which letter is in this name?'];

function nameExplanation(name: string, letter: string): Explanation {
  const all = letters(name.toUpperCase().split(''));
  return {
    speak: ['The name', { word: name }, 'has the letters', ...all.speak, '.', { letter }, 'is in it.'],
    steps: [`${name} has the letters ${all.text}.`, `${letter} is in it.`],
    visual: row(said(name.toUpperCase(), [{ word: name }], 'xl'), letterSaid(letter)),
  };
}

function inName(level: Level, rng: Rng): QuestionDraft {
  const name = rng.pick(level === 3 ? LONG_NAMES : NAMES);
  const upper = name.toUpperCase();
  const inside = [...new Set(upper.split(''))];
  const letter = rng.pick(inside);
  const outside = ALPHABET_UPPER.filter((each) => !upper.includes(each));
  const near = level === 3 ? rng.shuffle(outside.filter((each) => inside.some((one) => upperLookAlikes(one).includes(each)))).slice(0, 1) : [];
  const wrong = [...near, ...rng.shuffle(outside.filter((each) => !near.includes(each)))].slice(0, level === 1 ? 1 : 2);
  const options = rng.shuffle([letter, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'inName', target: upper, answer: letter, options },
    prompt: { text: IN_NAME, speak: IN_NAME_SAY },
    stimulus: said(upper, [{ word: name }], 'xl'),
    options: options.map((each) => letterTile(each)),
    answerIndex: options.indexOf(letter),
    explanation: nameExplanation(name, letter),
  };
}

export const inNameGenerator: SkillGenerator = {
  skillId: 'E-PK-A7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h3-stories', 'letters'],
  generate: inName,
  exampleSeed: 3071,
  example: () => inName(1, makeRng(3071)),
  lesson: () => {
    const sam = nameExplanation('Sam', 'S');
    const zoe = nameExplanation('Zoe', 'Z');
    return beats(
      { text: 'A name is made of letters. Sam has the letters S, A, M.', speak: ['A name is made of letters.', { word: 'Sam' }, 'has the letters', { letter: 'S' }, { letter: 'A' }, { letter: 'M' }, '.'], visual: said('SAM', [{ word: 'Sam' }], 'xl') },
      { text: `${IN_NAME} ${sam.steps.join(' ')}`, speak: [...IN_NAME_SAY, ...sam.speak], visual: row(said('SAM', [{ word: 'Sam' }], 'xl'), letterTile('S'), letterTile('T')) },
      { text: IN_NAME, speak: IN_NAME_SAY, visual: row(said('ZOE', [{ word: 'Zoe' }], 'xl'), letterTile('B'), letterTile('Z')) },
      { text: zoe.steps.join(' '), speak: zoe.speak, visual: zoe.visual },
      { ...line('Look at each letter in the name, one at a time.'), visual: said('SAM', [{ word: 'Sam' }], 'xl') },
    );
  },
  oracle: 'earlyWords',
};
