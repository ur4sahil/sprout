import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Explanation, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Compound } from '../../../data/phonics1';
import { COMPOUNDS, OPPOSITES_1, SAME_MEANING } from '../../../data/phonics1';
import type { SkillGenerator } from '../../../generator';
import { hearAndTap, spellSightWord } from '../k/sightWords';
import { cap, picture, row } from '../pk/parts';
import { hint, spell } from './wording';

// Language Arts grade 1 B.1 to B.3.

const wordSaid = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak: [{ word: value }] });
const silent = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });

// ---- B.1 Sight words, set 4 ----
// Family: Sight words. Oracles: wordSet, spell. Levels: hear and tap / spell with tiles.

// The kindergarten pieces make the question; grade 1 words it the way its other heard skills are worded.
// No word of set 4 in the hint (how, think and of are in it): the hint must not name the answer.
const TAP_HINT = hint('Listen to the first sound. Which word starts with that letter?');
const SPELL = 'Listen. Tap the letters to spell the word.';
const SPELL_HINT = hint('Say the word slowly, one sound at a time. Find a letter for each sound.');

function setFour(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const question = hearAndTap(4, 2, rng);
    return { ...question, explanation: { ...question.explanation, hint: TAP_HINT } };
  }
  const question = spellSightWord(4, rng);
  if (question.type !== 'tiles') return question;
  const target = question.answer;
  return {
    ...question,
    prompt: { text: SPELL, speak: ['Tap the letters to spell', { word: target }, '.'] },
    explanation: { ...question.explanation, speak: [{ word: cap(target) }, 'is spelled', ...spell(target), '.'], steps: [`${cap(target)} is spelled ${target.split('').join(', ')}.`], hint: SPELL_HINT },
  };
}

export const sightWordsFourGenerator: SkillGenerator = {
  skillId: 'E-1-B1',
  maxLevel: 2,
  itemTypes: ['choice', 'tiles'],
  lists: ['sightWords', 'letters'],
  generate: setFour,
  exampleSeed: 411,
  example: () => setFour(1, makeRng(411)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Some words are used all the time. Learn to know them when you see them.', speak: ['Some words are used all the time. Learn to know them when you see them.'], visual: row(wordSaid('could'), wordSaid('walk')) },
    { beat: 'watch', text: 'This word is could.', speak: ['This word is', { word: 'could' }, '.'], visual: wordSaid('could', 'xl') },
    { beat: 'try', text: 'Which word is walk?', speak: ['Which word is', { word: 'walk' }, '?'], visual: row(wordSaid('when'), wordSaid('walk')), reveal: { text: 'This word is walk.', speak: ['This word is', { word: 'walk' }, '.'], visual: wordSaid('walk', 'xl') } },
    { beat: 'remember', text: 'Look at the whole word.', speak: ['Look at the whole word.'], visual: row(wordSaid('could'), wordSaid('walk')) },
  ],
  oracle: 'wordSet',
};

// ---- B.2 Compound words ----
// Family: Compound words. Oracle: spell.
// Levels: picture and spoken word, build it from 2 word tiles: 2 extra tiles / 4 extra tiles.
// The word is heard and built, never matched half to half: halves cross-match into other real words.

const whole = (entry: Compound): string => `${entry.first}${entry.second}`;
const BUILD = 'Listen. Tap the two words that make the word.';
const buildSpeak = (entry: Compound): Say => ['Tap the two words that make', { word: whole(entry) }, '.'];

function compoundExplanation(entry: Compound): Explanation & { visual: Visual } {
  return {
    speak: [{ word: entry.first }, 'and', { word: entry.second }, 'make', { word: whole(entry) }, '.'],
    steps: [`${cap(entry.first)} and ${entry.second} make ${whole(entry)}.`],
    visual: row(picture(whole(entry), entry.emoji), wordSaid(whole(entry))),
  };
}

function compounds(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(COMPOUNDS);
  // The spare tiles are halves of other compound words, each different from the two that are needed.
  const halves = [...new Set(COMPOUNDS.flatMap((each) => [each.first, each.second]))].filter((half) => half !== entry.first && half !== entry.second);
  const spare = rng.sample(halves, level === 1 ? 2 : 4);
  return {
    type: 'tiles',
    mode: 'listen',
    facts: { target: whole(entry), word: whole(entry), parts: [entry.first, entry.second] },
    prompt: { text: BUILD, speak: buildSpeak(entry) },
    stimulus: silent(entry.emoji),
    slots: 2,
    bank: rng.shuffle([entry.first, entry.second, ...spare]),
    answer: whole(entry),
    explanation: { ...compoundExplanation(entry), hint: hint('Say the word slowly. Listen for the two small words in it.') },
  };
}

const SUNFLOWER = COMPOUNDS[0] as Compound;
const RAINBOW = COMPOUNDS[1] as Compound;

export const compoundsGenerator: SkillGenerator = {
  skillId: 'E-1-B2',
  maxLevel: 2,
  itemTypes: ['tiles'],
  lists: ['phonics1'],
  generate: compounds,
  exampleSeed: 412,
  example: () => compounds(1, makeRng(412)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Two small words can join to make one big word.', speak: ['Two small words can join to make one big word.'], visual: row(wordSaid('sun'), wordSaid('flower')) },
    { beat: 'watch', text: compoundExplanation(SUNFLOWER).steps.join(' '), speak: compoundExplanation(SUNFLOWER).speak, visual: compoundExplanation(SUNFLOWER).visual },
    { beat: 'try', text: 'Which two words make rainbow?', speak: ['Which two words make', { word: 'rainbow' }, '?'], visual: picture('rainbow', RAINBOW.emoji), reveal: { text: compoundExplanation(RAINBOW).steps.join(' '), speak: compoundExplanation(RAINBOW).speak, visual: compoundExplanation(RAINBOW).visual } },
    { beat: 'remember', text: 'Two small words can make one big word.', speak: ['Two small words can make one big word.'], visual: compoundExplanation(SUNFLOWER).visual },
  ],
  oracle: 'spell',
};

// ---- B.3 Opposites and same meanings ----
// Family: Opposites. Oracle: wordSet. Levels: opposites / same meaning / mixed.

type Kind = 'opposite' | 'same';
const partnersIn = (pairs: readonly (readonly [string, string])[], value: string): string[] => pairs.flatMap(([one, two]) => (one === value ? [two] : two === value ? [one] : []));
const sameAs = (value: string): string[] => partnersIn(SAME_MEANING, value);
// Every word that means the opposite: the listed opposite, and any word that means the same as it.
// The words that mean the same as the given one are tried too: large is the opposite of small.
const oppositesOf = (value: string): string[] => [...new Set([value, ...sameAs(value)].flatMap((each) => partnersIn(OPPOSITES_1, each)).flatMap((each) => [each, ...sameAs(each)]))];
const ALL_WORDS: readonly string[] = [...new Set([...OPPOSITES_1.flat(), ...SAME_MEANING.flat()])];

const MEANING_HINT: Record<Kind, string> = {
  opposite: 'Say the word. Which word means something very different?',
  same: 'Say the word. Which word could take its place in a sentence?',
};

function meaningExplanation(kind: Kind, target: string, answer: string): Explanation {
  const told = kind === 'opposite' ? 'are opposites.' : 'mean the same.';
  return { speak: [{ word: cap(target) }, 'and', { word: answer }, told], steps: [`${cap(target)} and ${answer} ${told}`], visual: row(wordSaid(target), wordSaid(answer)), hint: hint(MEANING_HINT[kind]) };
}

const meaningPrompt = (kind: Kind, target: string): { text: string; speak: Say } =>
  kind === 'opposite' ? { text: `Which word is the opposite of ${target}?`, speak: ['Which word is the opposite of', { word: target }, '?'] } : { text: `Which word means the same as ${target}?`, speak: ['Which word means the same as', { word: target }, '?'] };

function meanings(level: Level, rng: Rng): QuestionDraft {
  const kind: Kind = level === 1 ? 'opposite' : level === 2 ? 'same' : rng.pick<Kind>(['opposite', 'same']);
  const [target, answer] = rng.shuffle([...rng.pick(kind === 'opposite' ? OPPOSITES_1 : SAME_MEANING)]) as [string, string];
  // No wrong option is also right: nothing that means the opposite in an opposites question, or the same in a same-meaning one.
  const alsoRight = kind === 'opposite' ? oppositesOf(target) : sameAs(target);
  const wrong = rng.sample(ALL_WORDS.filter((each) => each !== target && each !== answer && !alsoRight.includes(each)), 2);
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target, relation: kind === 'opposite' ? 'opposite1' : 'same', options },
    prompt: meaningPrompt(kind, target),
    stimulus: wordSaid(target, 'xl'),
    options: options.map((each) => wordSaid(each)),
    answerIndex: options.indexOf(answer),
    explanation: meaningExplanation(kind, target, answer),
  };
}

export const meaningsGenerator: SkillGenerator = {
  skillId: 'E-1-B3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics1'],
  generate: meanings,
  exampleSeed: 413,
  example: () => meanings(1, makeRng(413)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Opposites are as different as can be. Hot and cold are opposites.', speak: ['Opposites are as different as can be.', { word: 'hot' }, 'and', { word: 'cold' }, 'are opposites.'], visual: row(wordSaid('hot'), wordSaid('cold')) },
    { beat: 'watch', text: 'Some words mean the same. Big and large mean the same.', speak: ['Some words mean the same.', { word: 'big' }, 'and', { word: 'large' }, 'mean the same.'], visual: row(wordSaid('big'), wordSaid('large')) },
    { beat: 'try', text: meaningPrompt('opposite', 'wet').text, speak: meaningPrompt('opposite', 'wet').speak, visual: row(wordSaid('wet'), wordSaid('dry'), wordSaid('glad')), reveal: { text: meaningExplanation('opposite', 'wet', 'dry').steps.join(' '), speak: meaningExplanation('opposite', 'wet', 'dry').speak, visual: row(wordSaid('wet'), wordSaid('dry')) } },
    { beat: 'remember', text: 'Opposites are different. Some words mean the same.', speak: ['Opposites are different. Some words mean the same.'], visual: row(wordSaid('hot'), wordSaid('cold')) },
  ],
  oracle: 'wordSet',
};
