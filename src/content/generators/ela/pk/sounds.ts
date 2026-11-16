import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SoundWord } from '../../../data/firstSounds';
import { FIRST_SOUNDS } from '../../../data/firstSounds';
import type { PictureWord } from '../../../data/rhymes';
import { RHYME_FAMILIES } from '../../../data/rhymes';
import type { SyllableWord } from '../../../data/syllables';
import { SYLLABLE_WORDS } from '../../../data/syllables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import type { Explanation } from './parts';
import { cap, pickApart, picture, row } from './parts';

// Language Arts pre-K B.1 to B.3. Families: First sound, Rhymes, Syllables. Oracle: wordSet.
// A voice cannot say a lone sound, so every prompt uses whole words (plan section 9).

// ---- B.1 Starts with the same sound ----
// Levels: "Which one starts like ball?" 2 spoken pictures / 3 pictures.

const soundPicture = (entry: { word: string; emoji: string }): Visual => picture(entry.word, entry.emoji);

function sameSoundExplanation(target: SoundWord, answer: SoundWord): Explanation {
  return {
    speak: [{ word: target.word }, 'and', { word: answer.word }, 'start with the same sound.'],
    steps: [`${cap(target.word)} and ${answer.word} start with the same sound.`],
    visual: row(soundPicture(target), soundPicture(answer)),
  };
}

function startsLikePrompt(word: string): { text: string; speak: Say } {
  return { text: `Which one starts like ${word}?`, speak: ['Which one starts like', { word }, '?'] };
}

function startsLike(level: Level, rng: Rng): QuestionDraft {
  // A target needs a partner: another word with the same first sound.
  const target = rng.pick(FIRST_SOUNDS.filter((entry) => FIRST_SOUNDS.some((other) => other.word !== entry.word && other.sound === entry.sound)));
  const answer = rng.pick(FIRST_SOUNDS.filter((entry) => entry.word !== target.word && entry.sound === target.sound));
  // Wrong options each come from a different sound group.
  const wrong = pickApart(FIRST_SOUNDS, level === 1 ? 1 : 2, rng, (entry, picked) => entry.sound !== target.sound && picked.every((other) => other.sound !== entry.sound));
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: target.word, relation: 'firstSound', answer: answer.word, options: options.map((entry) => entry.word) },
    prompt: startsLikePrompt(target.word),
    stimulus: soundPicture(target),
    options: options.map(soundPicture),
    answerIndex: options.indexOf(answer),
    explanation: sameSoundExplanation(target, answer),
  };
}

const sound = (word: string): SoundWord => FIRST_SOUNDS.find((entry) => entry.word === word) as SoundWord;

function startsLikeLesson(): LessonStep[] {
  const shown = sameSoundExplanation(sound('ball'), sound('bear'));
  const revealed = sameSoundExplanation(sound('moon'), sound('milk'));
  return [
    {
      beat: 'see',
      text: 'Words start with a sound. Sun and sock start the same way.',
      speak: ['Words start with a sound.', { word: 'sun' }, 'and', { word: 'sock' }, 'start the same way.'],
      visual: row(soundPicture(sound('sun')), soundPicture(sound('sock'))),
    },
    { beat: 'watch', text: `${startsLikePrompt('ball').text} ${shown.steps.join(' ')}`, speak: [...startsLikePrompt('ball').speak, ...shown.speak], visual: shown.visual },
    {
      beat: 'try',
      text: startsLikePrompt('moon').text,
      speak: startsLikePrompt('moon').speak,
      visual: row(soundPicture(sound('dog')), soundPicture(sound('milk'))),
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual },
    },
    { beat: 'remember', text: 'Listen to the very start.', speak: ['Listen to the very start.'], visual: shown.visual },
  ];
}

export const startsLikeGenerator: SkillGenerator = {
  skillId: 'E-PK-B1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['firstSounds'],
  generate: startsLike,
  exampleSeed: 61,
  example: () => startsLike(1, makeRng(61)),
  lesson: startsLikeLesson,
  oracle: 'wordSet',
};

// ---- B.2 Rhymes ----
// Levels: "Which one rhymes with cat?" 2 spoken pictures / 3 pictures.

function rhymeExplanation(target: PictureWord, answer: PictureWord): Explanation {
  return {
    speak: [{ word: target.word }, 'and', { word: answer.word }, 'end the same way. They rhyme.'],
    steps: [`${cap(target.word)} and ${answer.word} end the same way.`, 'They rhyme.'],
    visual: row(soundPicture(target), soundPicture(answer)),
  };
}

function rhymePrompt(word: string): { text: string; speak: Say } {
  return { text: `Which one rhymes with ${word}?`, speak: ['Which one rhymes with', { word }, '?'] };
}

function rhymes(level: Level, rng: Rng): QuestionDraft {
  const family = rng.pick(RHYME_FAMILIES);
  const [target, answer] = rng.sample(family, 2) as [PictureWord, PictureWord];
  // Wrong options each come from a different rhyme family.
  const others = rng.sample(RHYME_FAMILIES.filter((members) => members !== family), level === 1 ? 1 : 2);
  const options = rng.shuffle([answer, ...others.map((members) => rng.pick(members))]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: target.word, relation: 'rhyme', answer: answer.word, options: options.map((entry) => entry.word) },
    prompt: rhymePrompt(target.word),
    stimulus: soundPicture(target),
    options: options.map(soundPicture),
    answerIndex: options.indexOf(answer),
    explanation: rhymeExplanation(target, answer),
  };
}

const rhymeWord = (word: string): PictureWord => RHYME_FAMILIES.flat().find((entry) => entry.word === word) as PictureWord;

function rhymesLesson(): LessonStep[] {
  const shown = rhymeExplanation(rhymeWord('cat'), rhymeWord('hat'));
  const revealed = rhymeExplanation(rhymeWord('star'), rhymeWord('car'));
  return [
    {
      beat: 'see',
      text: 'Some words sound the same at the end. Bee and tree rhyme.',
      speak: ['Some words sound the same at the end.', { word: 'bee' }, 'and', { word: 'tree' }, 'rhyme.'],
      visual: row(soundPicture(rhymeWord('bee')), soundPicture(rhymeWord('tree'))),
    },
    { beat: 'watch', text: `${rhymePrompt('cat').text} ${shown.steps.join(' ')}`, speak: [...rhymePrompt('cat').speak, ...shown.speak], visual: shown.visual },
    {
      beat: 'try',
      text: rhymePrompt('star').text,
      speak: rhymePrompt('star').speak,
      visual: row(soundPicture(rhymeWord('car')), soundPicture(rhymeWord('dog'))),
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual },
    },
    { beat: 'remember', text: 'Rhymes sound the same at the end.', speak: ['Rhymes sound the same at the end.'], visual: shown.visual },
  ];
}

export const rhymesGenerator: SkillGenerator = {
  skillId: 'E-PK-B2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['rhymes'],
  generate: rhymes,
  exampleSeed: 62,
  example: () => rhymes(1, makeRng(62)),
  lesson: rhymesLesson,
  oracle: 'wordSet',
};

// ---- B.3 Count syllables ----
// Levels: spoken word, 1 or 2 claps / 1 to 3 claps.

// The word split into its parts, as the screen shows it.
const split = (entry: SyllableWord): string => entry.parts.join(' · ');

function clapsExplanation(entry: SyllableWord): Explanation {
  const claps = entry.parts.length;
  return {
    speak: [{ word: entry.word }, '.', { number: claps }, claps === 1 ? 'clap.' : 'claps.'],
    steps: [split(entry), `${claps} ${claps === 1 ? 'clap' : 'claps'}.`],
    visual: { kind: 'text', value: split(entry), size: 'l' },
  };
}

function clapsPrompt(word: string): { text: string; speak: Say } {
  return { text: `How many claps in ${word}?`, speak: ['How many claps in', { word }, '?'] };
}

function claps(level: Level, rng: Rng): QuestionDraft {
  const most = level === 1 ? 2 : 3;
  // The number of claps is chosen first, so each answer comes up as often as the others.
  const count = rng.int(1, most);
  const entry = rng.pick(SYLLABLE_WORDS.filter((candidate) => candidate.parts.length === count));
  const values = Array.from({ length: most }, (_, i) => i + 1);
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { target: entry.word, relation: 'syllables', options: values },
    prompt: clapsPrompt(entry.word),
    stimulus: picture(entry.word, entry.emoji),
    options: values.map((value) => numeral(value)),
    answerIndex: count - 1,
    explanation: clapsExplanation(entry),
  };
}

const syllableWord = (word: string): SyllableWord => SYLLABLE_WORDS.find((entry) => entry.word === word) as SyllableWord;

function clapsLesson(): LessonStep[] {
  const [cat, apple, rabbit] = [syllableWord('cat'), syllableWord('apple'), syllableWord('rabbit')];
  return [
    { beat: 'see', text: 'Words have beats. Clap once for each beat.', speak: ['Words have beats. Clap once for each beat.'], visual: picture(cat.word, cat.emoji) },
    { beat: 'watch', text: `${clapsPrompt('apple').text} ${clapsExplanation(apple).steps.join('. ')}`, speak: [...clapsPrompt('apple').speak, ...clapsExplanation(apple).speak], visual: clapsExplanation(apple).visual },
    {
      beat: 'try',
      text: clapsPrompt('rabbit').text,
      speak: clapsPrompt('rabbit').speak,
      visual: picture(rabbit.word, rabbit.emoji),
      reveal: { text: clapsExplanation(rabbit).steps.join('. '), speak: clapsExplanation(rabbit).speak, visual: clapsExplanation(rabbit).visual },
    },
    { beat: 'remember', text: 'Each clap has one vowel sound.', speak: ['Each clap has one vowel sound.'], visual: clapsExplanation(apple).visual },
  ];
}

export const clapsGenerator: SkillGenerator = {
  skillId: 'E-PK-B3',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['syllables'],
  generate: claps,
  exampleSeed: 63,
  example: () => claps(1, makeRng(63)),
  lesson: clapsLesson,
  oracle: 'wordSet',
};
