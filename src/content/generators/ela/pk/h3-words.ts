import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import type { Action, BodyUse, FeelingStory, GoPair, Helper, Pic } from '../../../data/h3-words';
import { ACTIONS, BODY_PARTS, BODY_USES, FEELING_STORIES, FEELINGS, GO_CLASHES, GO_CLOSE, GO_PAIRS, HELPERS } from '../../../data/h3-words';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from './parts';
import { picture, row } from './parts';
import type { Line } from './h3-parts';
import { beats, line, silent } from './h3-parts';

// Language Arts pre-K C.3 to C.7 (plan section 15, wave H3). Oracle: earlyWords.
// In the listen skills (C.4 to C.6) the word is only spoken, and no picture says its name.

const shown = (entry: Pic): Visual => picture(entry.word, entry.emoji);
const optionWords = (options: readonly Pic[]): string[] => options.map((each) => each.word);

// ---- C.3 Things that go together ----
// Levels: 2 spoken pictures / 3 spoken pictures. Wrong pictures never come from a close group.

const close = (one: GoPair, two: GoPair): boolean => one.group === two.group || GO_CLOSE.some(([a, b]) => (a === one.group && b === two.group) || (a === two.group && b === one.group));
const goPrompt = (word: string): Line => ({ text: `What goes with the ${word}?`, speak: ['What goes with the', { word }, '?'] });

function goExplanation(pair: GoPair): Explanation {
  return { speak: [pair.why, 'They go together.'], steps: [pair.why, 'They go together.'], visual: row(shown(pair.first), shown(pair.second)) };
}

function goesWith(level: Level, rng: Rng): QuestionDraft {
  const pair = rng.pick(GO_PAIRS);
  const clashes = GO_CLASHES.filter(([first]) => first === pair.first.word).map(([, second]) => second);
  const wrong = rng.sample(GO_PAIRS.filter((each) => !close(each, pair) && !clashes.includes(each.second.word)), level === 1 ? 1 : 2).map((each) => each.second);
  const options = rng.shuffle([pair.second, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'goesWith', target: pair.first.word, options: optionWords(options) },
    prompt: goPrompt(pair.first.word),
    stimulus: shown(pair.first),
    options: options.map(shown),
    answerIndex: options.indexOf(pair.second),
    explanation: goExplanation(pair),
  };
}

const goPair = (word: string): GoPair => GO_PAIRS.find((each) => each.first.word === word) as GoPair;

export const goesWithGenerator: SkillGenerator = {
  skillId: 'E-PK-C3',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-words'],
  generate: goesWith,
  exampleSeed: 3231,
  example: () => goesWith(1, makeRng(3231)),
  lesson: () => {
    const sock = goExplanation(goPair('sock'));
    const dog = goExplanation(goPair('dog'));
    return beats(
      { ...line('Some things go together, like a sock and a shoe.'), visual: sock.visual },
      { text: `${goPrompt('sock').text} ${sock.steps.join(' ')}`, speak: [...goPrompt('sock').speak, ...sock.speak], visual: sock.visual },
      { ...goPrompt('dog'), visual: row(shown(goPair('dog').first), shown(goPair('paint').second), shown(goPair('dog').second)) },
      { text: dog.steps.join(' '), speak: dog.speak, visual: dog.visual },
      { ...line('Think about how you use them.'), visual: sock.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- C.4 Feelings ----
// Levels: hear a feeling, 2 faces / 3 faces / hear a short story, then "How does Sam feel?", 3 faces.
// Faces that could be argued for in a story are never offered beside it.

const feelingFace = (word: string): Pic => FEELINGS.find((each) => each.word === word) as Pic;
const FACE = 'Listen. Tap the face.';
const faceExplanation = (word: string): Explanation => ({ speak: [`This face looks ${word}.`], steps: [`This face looks ${word}.`], visual: shown(feelingFace(word)) });

function feelings(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const story: FeelingStory = rng.pick(FEELING_STORIES);
    const answer = feelingFace(story.feeling);
    const wrong = rng.sample(FEELINGS.filter((each) => each !== answer && !story.also.includes(each.word)), 2);
    const options = rng.shuffle([answer, ...wrong]);
    const ask = `How does ${story.name} feel?`;
    return {
      type: 'choice',
      mode: 'listen',
      facts: { relation: 'feelingStory', target: story.feeling, story: story.story, options: optionWords(options) },
      prompt: { text: `Listen. ${ask}`, speak: ['Listen.', ...story.story.split(/(?<=\.)\s+/), ask] },
      options: options.map((each) => silent(each.emoji)),
      answerIndex: options.indexOf(answer),
      explanation: { speak: [story.story, `${story.name} feels ${story.feeling}.`], steps: [story.story, `${story.name} feels ${story.feeling}.`], visual: shown(answer) },
    };
  }
  const answer = rng.pick(FEELINGS);
  const options = rng.shuffle([answer, ...rng.sample(FEELINGS.filter((each) => each !== answer), level)]);
  return {
    type: 'choice',
    mode: 'listen',
    facts: { relation: 'feeling', target: answer.word, options: optionWords(options) },
    prompt: { text: FACE, speak: ['Tap the face that looks', answer.word, '.'] },
    options: options.map((each) => silent(each.emoji)),
    answerIndex: options.indexOf(answer),
    explanation: faceExplanation(answer.word),
  };
}

export const feelingsGenerator: SkillGenerator = {
  skillId: 'E-PK-C4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h3-words'],
  pool: { 1: 6, 2: 6 }, // the six feelings
  generate: feelings,
  exampleSeed: 3241,
  example: () => feelings(1, makeRng(3241)),
  lesson: () =>
    beats(
      { ...line('Faces show how we feel. This face looks happy. This one looks sad.'), visual: row(shown(feelingFace('happy')), shown(feelingFace('sad'))) },
      { text: 'Tap the face that looks scared. This face looks scared.', speak: ['Tap the face that looks scared.', ...faceExplanation('scared').speak], visual: shown(feelingFace('scared')) },
      { ...line('Sam gets a new puppy. How does Sam feel?'), visual: row(silent(feelingFace('sad').emoji), silent(feelingFace('happy').emoji)) },
      { ...line('Sam feels happy.'), visual: shown(feelingFace('happy')) },
      { ...line('Look at the eyes and the mouth.'), visual: row(shown(feelingFace('angry')), shown(feelingFace('surprised'))) },
    ),
  oracle: 'earlyWords',
};

// ---- C.5 Body words ----
// Levels: hear a body part, 2 pictures / 3 pictures / "Which one do you hear with?", 3 pictures.

const part = (word: string): Pic => BODY_PARTS.find((each) => each.word === word) as Pic;
const BODY = 'Listen. Tap the part of the body.';
const bodyExplanation = (word: string): Explanation => ({ speak: [`This is ${word === 'arm' || word === 'ear' || word === 'eye' ? 'an' : 'a'} ${word}.`], steps: [`This is ${word === 'arm' || word === 'ear' || word === 'eye' ? 'an' : 'a'} ${word}.`], visual: shown(part(word)) });

function bodyWords(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const use: BodyUse = rng.pick(BODY_USES);
    const answer = part(use.part);
    const options = rng.shuffle([answer, ...rng.sample(BODY_PARTS.filter((each) => each !== answer && !use.also.includes(each.word)), 2)]);
    return {
      type: 'choice',
      mode: 'listen',
      facts: { relation: 'bodyUse', target: use.part, ask: use.ask, options: optionWords(options) },
      prompt: line(use.ask),
      options: options.map((each) => silent(each.emoji)),
      answerIndex: options.indexOf(answer),
      explanation: { speak: [use.why], steps: [use.why], visual: shown(answer) },
    };
  }
  const answer = rng.pick(BODY_PARTS);
  const options = rng.shuffle([answer, ...rng.sample(BODY_PARTS.filter((each) => each !== answer), level)]);
  return {
    type: 'choice',
    mode: 'listen',
    facts: { relation: 'bodyPart', target: answer.word, options: optionWords(options) },
    prompt: { text: BODY, speak: ['Tap the', { word: answer.word }, '.'] },
    options: options.map((each) => silent(each.emoji)),
    answerIndex: options.indexOf(answer),
    explanation: bodyExplanation(answer.word),
  };
}

export const bodyWordsGenerator: SkillGenerator = {
  skillId: 'E-PK-C5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h3-words'],
  generate: bodyWords,
  exampleSeed: 3251,
  example: () => bodyWords(1, makeRng(3251)),
  lesson: () =>
    beats(
      { ...line('Our bodies have parts with names. This is a hand. This is a foot.'), visual: row(shown(part('hand')), shown(part('foot'))) },
      { text: 'Tap the nose. This is a nose.', speak: ['Tap the', { word: 'nose' }, '.', ...bodyExplanation('nose').speak], visual: shown(part('nose')) },
      { ...line('Which one do you hear with?'), visual: row(silent(part('ear').emoji), silent(part('leg').emoji)) },
      { ...line('You hear with your ears.'), visual: shown(part('ear')) },
      { ...line('Touch each part as you say its name.'), visual: row(shown(part('eye')), shown(part('ear')), shown(part('nose'))) },
    ),
  oracle: 'earlyWords',
};

// ---- C.6 Action words ----
// Levels: hear an action, 2 pictures / 3 pictures.

const action = (verb: string): Action => ACTIONS.find((each) => each.verb === verb) as Action;
const actionPicture = (each: Action): Visual => picture(each.doing, each.emoji);
const DOING = 'Listen. Who is doing it?';

function actionWords(level: Level, rng: Rng): QuestionDraft {
  const answer = rng.pick(ACTIONS);
  const options = rng.shuffle([answer, ...rng.sample(ACTIONS.filter((each) => each !== answer), level)]);
  return {
    type: 'choice',
    mode: 'listen',
    facts: { relation: 'action', target: answer.verb, options: options.map((each) => each.verb) },
    prompt: { text: DOING, speak: [`Who is ${answer.doing}?`] },
    options: options.map((each) => silent(each.emoji)),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [`This one is ${answer.doing}.`], steps: [`This one is ${answer.doing}.`], visual: actionPicture(answer) },
  };
}

export const actionWordsGenerator: SkillGenerator = {
  skillId: 'E-PK-C6',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-words'],
  generate: actionWords,
  exampleSeed: 3261,
  example: () => actionWords(1, makeRng(3261)),
  lesson: () =>
    beats(
      { ...line('Action words tell what someone is doing. Run, swim, climb.'), visual: row(actionPicture(action('run')), actionPicture(action('swim'))) },
      { ...line('Who is climbing? This one is climbing.'), visual: actionPicture(action('climb')) },
      { ...line('Who is sleeping?'), visual: row(silent(action('dance').emoji), silent(action('sleep').emoji)) },
      { ...line('This one is sleeping.'), visual: actionPicture(action('sleep')) },
      { ...line('Look at what the body is doing.'), visual: actionPicture(action('run')) },
    ),
  oracle: 'earlyWords',
};

// ---- C.7 Helpers and their things ----
// Levels: 2 spoken pictures of helpers / 3. A helper who could be argued for is never offered.

const helperPrompt = (word: string): Line => ({ text: `Who works with the ${word}?`, speak: ['Who works with the', { word }, '?'] });
const helperExplanation = (helper: Helper): Explanation => ({ speak: [helper.why], steps: [helper.why], visual: row(shown(helper.thing), shown(helper.helper)) });

function helpers(level: Level, rng: Rng): QuestionDraft {
  const helper = rng.pick(HELPERS);
  const wrong = rng.sample(HELPERS.filter((each) => each !== helper && each.helper.word !== helper.clash), level).map((each) => each.helper);
  const options = rng.shuffle([helper.helper, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'helper', target: helper.thing.word, options: optionWords(options) },
    prompt: helperPrompt(helper.thing.word),
    stimulus: shown(helper.thing),
    options: options.map(shown),
    answerIndex: options.indexOf(helper.helper),
    explanation: helperExplanation(helper),
  };
}

const helperFor = (thing: string): Helper => HELPERS.find((each) => each.thing.word === thing) as Helper;

export const helpersGenerator: SkillGenerator = {
  skillId: 'E-PK-C7',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-words'],
  generate: helpers,
  exampleSeed: 3271,
  example: () => helpers(1, makeRng(3271)),
  lesson: () => {
    const farmer = helperExplanation(helperFor('tractor'));
    const doctor = helperExplanation(helperFor('stethoscope'));
    return beats(
      { ...line('Helpers use things to do their jobs.'), visual: row(shown(helperFor('fire truck').helper), shown(helperFor('fire truck').thing)) },
      { text: `${helperPrompt('tractor').text} ${farmer.steps.join(' ')}`, speak: [...helperPrompt('tractor').speak, ...farmer.speak], visual: farmer.visual },
      { ...helperPrompt('stethoscope'), visual: row(shown(helperFor('stethoscope').thing), shown(helperFor('pan').helper), shown(helperFor('stethoscope').helper)) },
      { text: doctor.steps.join(' '), speak: doctor.speak, visual: doctor.visual },
      { ...line('Think about the job each helper does.'), visual: farmer.visual },
    );
  },
  oracle: 'earlyWords',
};

