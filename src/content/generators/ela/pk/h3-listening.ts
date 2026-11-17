import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import type { Sequence, WhoSentence } from '../../../data/h3-stories';
import { SEQUENCES, STEP_CLOSE, WHO_CHARACTERS, WHO_SENTENCES } from '../../../data/h3-stories';
import type { Pic } from '../../../data/h3-words';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from './parts';
import { picture, row } from './parts';
import type { Line } from './h3-parts';
import { beats, line, silent } from './h3-parts';

// Language Arts pre-K D.1 and D.2 (plan section 15, wave H3). Oracle: earlyWords.

const shown = (entry: Pic): Visual => picture(entry.word, entry.emoji);

// ---- D.1 What comes next ----
// Levels: one picture, then which comes next: 2 spoken pictures / 3 spoken pictures.
// Wrong pictures come from sequences that could not follow: rain is never followed by a flower here.

const closeGroups = (one: Sequence, two: Sequence): boolean => one.group === two.group || STEP_CLOSE.some(([a, b]) => (a === one.group && b === two.group) || (a === two.group && b === one.group));
const STEPS = SEQUENCES.flatMap((sequence) => sequence.steps.slice(0, -1).map((step, at) => ({ sequence, step, at })));
const nextPrompt = (word: string): Line => ({ text: `What comes after the ${word}?`, speak: ['What comes after the', { word }, '?'] });

function nextExplanation(sequence: Sequence, at: number): Explanation {
  const two = [sequence.lines[at] as string, sequence.lines[at + 1] as string];
  return { speak: two, steps: two, visual: row(shown(sequence.steps[at] as Pic), shown(sequence.steps[at + 1] as Pic)) };
}

function whatNext(level: Level, rng: Rng): QuestionDraft {
  const { sequence, step, at } = rng.pick(STEPS);
  const answer = sequence.steps[at + 1] as Pic;
  const others = SEQUENCES.filter((each) => !closeGroups(each, sequence)).flatMap((each) => each.steps);
  const wrong: Pic[] = [];
  for (const each of rng.shuffle(others)) if (wrong.length < level && wrong.every((one) => one.word !== each.word)) wrong.push(each);
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'next', target: step.word, sequence: sequence.id, options: options.map((each) => each.word) },
    prompt: nextPrompt(step.word),
    stimulus: shown(step),
    options: options.map(shown),
    answerIndex: options.indexOf(answer),
    explanation: nextExplanation(sequence, at),
  };
}

const seq = (id: string): Sequence => SEQUENCES.find((each) => each.id === id) as Sequence;

export const whatNextGenerator: SkillGenerator = {
  skillId: 'E-PK-D1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-stories'],
  generate: whatNext,
  exampleSeed: 3311,
  example: () => whatNext(1, makeRng(3311)),
  lesson: () => {
    const chick = nextExplanation(seq('chick'), 0);
    const bread = nextExplanation(seq('bread'), 1);
    return beats(
      { ...line('Things happen in order. First one thing, then the next.'), visual: row(...seq('chick').steps.map(shown)) },
      { text: `${nextPrompt('egg').text} ${chick.steps.join(' ')}`, speak: [...nextPrompt('egg').speak, ...chick.speak], visual: chick.visual },
      { ...nextPrompt('bread'), visual: row(shown(seq('bread').steps[1] as Pic), shown(seq('dress').steps[1] as Pic), shown(seq('bread').steps[2] as Pic)) },
      { text: bread.steps.join(' '), speak: bread.speak, visual: bread.visual },
      { ...line('Ask yourself: what happens after that?'), visual: chick.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- D.2 Who did it? ----
// Levels: hear a sentence with one character, 2 pictures / a sentence with two characters,
// 3 pictures, one of them the other character. The pictures never say their names.

const WHO = 'Listen. Who is it?';

function whoExplanation(entry: WhoSentence): Explanation {
  const answer = `${entry.ask} The ${entry.answer.word}.`;
  return { speak: [entry.sentence, answer], steps: [entry.sentence, answer], visual: shown(entry.answer) };
}

function whoDid(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(WHO_SENTENCES.filter((each) => (level === 1 ? each.others.length === 0 : each.others.length > 0)));
  const inSentence = [entry.answer, ...entry.others].map((each) => each.word);
  const extra = rng.sample(WHO_CHARACTERS.filter((each) => !inSentence.includes(each.word)), level === 1 ? 1 : 1);
  const options = rng.shuffle([entry.answer, ...entry.others, ...extra]);
  return {
    type: 'choice',
    mode: 'listen',
    facts: { relation: 'whoDid', target: entry.answer.word, story: entry.sentence, ask: entry.ask, options: options.map((each) => each.word) },
    prompt: { text: WHO, speak: ['Listen.', entry.sentence, entry.ask] },
    options: options.map((each) => silent(each.emoji)),
    answerIndex: options.indexOf(entry.answer),
    explanation: whoExplanation(entry),
  };
}

const who = (sentence: string): WhoSentence => WHO_SENTENCES.find((each) => each.sentence === sentence) as WhoSentence;

export const whoDidGenerator: SkillGenerator = {
  skillId: 'E-PK-D2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-stories'],
  generate: whoDid,
  exampleSeed: 3321,
  example: () => whoDid(1, makeRng(3321)),
  lesson: () => {
    const duck = whoExplanation(who('The duck swims in the pond.'));
    const dog = whoExplanation(who('The dog chases the cat.'));
    return beats(
      { ...line('Listen to the whole sentence. It tells who did something.'), visual: shown(who('The duck swims in the pond.').answer) },
      { text: `The duck swims in the pond. ${duck.steps[1] as string}`, speak: duck.speak, visual: duck.visual },
      { ...line('The dog chases the cat. Who chases?'), visual: row(silent('🐱'), silent('🐶')) },
      { text: dog.steps[1] as string, speak: [dog.steps[1] as string], visual: dog.visual },
      { ...line('Listen for who does it.'), visual: duck.visual },
    );
  },
  oracle: 'earlyWords',
};
