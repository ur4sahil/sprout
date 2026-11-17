import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import { COMPLETE, FRAGMENTS, HOW_GAPS, HOW_SENTENCES, REFLEXIVE_ACTIONS, REFLEXIVE_SUBJECTS, REFLEXIVES } from '../../../data/h4-grammar';
import { COLLECTIVES } from '../../../data/h4-words';
import type { SkillGenerator } from '../../../generator';
import { blankSay, choice, explain, lesson, plain, said, withOthers } from '../g1/h4-parts';
import { cap } from '../pk/parts';

// Language Arts grade 2 C.5 to C.8 (plan section 15 wave H4). Oracle: h4ela.

const FITS = 'Which word fits the sentence?';
const gapShown = (sentence: string): Visual => ({ ...plain(sentence), speak: [blankSay(sentence)] });
const many = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 5, layout: 'row' });

// ---- C.5 Group names ----
// Levels: what a group of these is called / what comes in a group / in a sentence, from four.

function collectives(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(COLLECTIVES);
  const groups = COLLECTIVES.map((each) => each.group);
  const why = explain([`A group of ${entry.things} is called a ${entry.group}.`], many(entry.emoji));
  if (level === 2) {
    return choice({
      prompt: `What comes in a ${entry.group}?`,
      options: withOthers(rng, entry.things, COLLECTIVES.map((each) => each.things)),
      right: entry.things,
      spoken: true,
      facts: { relation: 'collectiveThings', target: entry.group },
      why,
    });
  }
  if (level === 3) {
    const sentence = `We saw a ___ of ${entry.things}.`;
    return choice({
      prompt: FITS,
      speak: [FITS, blankSay(sentence)],
      options: withOthers(rng, entry.group, groups, 3),
      right: entry.group,
      spoken: true,
      stimulus: gapShown(sentence),
      facts: { relation: 'collective', target: entry.things },
      why,
    });
  }
  return choice({
    prompt: `What is a group of ${entry.things} called?`,
    options: withOthers(rng, entry.group, groups),
    right: entry.group,
    spoken: true,
    stimulus: many(entry.emoji),
    facts: { relation: 'collective', target: entry.things },
    why,
  });
}

export const collectivesGenerator: SkillGenerator = {
  skillId: 'E-2-C5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-words'],
  generate: collectives,
  exampleSeed: 1521,
  example: () => collectives(1, makeRng(1521)),
  lesson: lesson(
    ['Some groups have their own name.', many('🐄')],
    ['A group of cows is a herd. A group of fish is a school.', many('🐟')],
    ['What is a group of bees called?', many('🐝'), 'A swarm.', many('🐝')],
    ['Herd of cows, flock of birds, school of fish, swarm of bees.', many('🐦')],
  ),
  oracle: 'h4ela',
};

// ---- C.6 Reflexive pronouns ----
// Levels: myself, himself, herself / with ourselves and themselves / with yourself, from all seven.

const ONE_PERSON = REFLEXIVE_SUBJECTS.filter((each) => ['myself', 'himself', 'herself'].includes(each.reflexive));

function reflexives(level: Level, rng: Rng): QuestionDraft {
  const pool = level === 1 ? ONE_PERSON : level === 2 ? REFLEXIVE_SUBJECTS.filter((each) => each.subject !== 'You') : REFLEXIVE_SUBJECTS;
  const entry = rng.pick(pool);
  const sentence = `${entry.subject} ${rng.pick(REFLEXIVE_ACTIONS)}`;
  const choices = level === 1 ? ['myself', 'himself', 'herself'] : level === 2 ? REFLEXIVES.filter((each) => each !== 'yourself' && each !== 'itself') : REFLEXIVES;
  const options = level === 1 ? rng.shuffle(choices) : withOthers(rng, entry.reflexive, choices, 3);
  const done = sentence.replace('___', entry.reflexive);
  // I keeps its capital; he, she, we, they and you are lower case in the middle of a sentence.
  const who = ['He', 'She', 'We', 'They', 'You'].includes(entry.subject) ? entry.subject.toLowerCase() : entry.subject.replace(/^The /, 'the ');
  return choice({
    prompt: FITS,
    speak: [FITS, blankSay(sentence)],
    options,
    right: entry.reflexive,
    spoken: true,
    stimulus: gapShown(sentence),
    facts: { relation: 'reflexive', target: sentence, subject: entry.subject },
    why: explain([`${cap(entry.reflexive)} goes with ${who}.`, done], said(done), [`${entry.reflexive} goes with ${who}.`, done]),
  });
}

export const reflexivesGenerator: SkillGenerator = {
  skillId: 'E-2-C6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: reflexives,
  exampleSeed: 1522,
  example: () => reflexives(1, makeRng(1522)),
  lesson: lesson(
    ['Words like myself and herself point back to who did it.', plain('I → myself')],
    ['Kim built a fort by herself. Herself points back to Kim.', plain('Kim built a fort by herself.')],
    ['We made lunch all by ___. Which word fits?', plain('We made lunch all by ___.'), 'Ourselves. It goes with we.', plain('We made lunch all by ourselves.')],
    ['I: myself. He: himself. She: herself. We: ourselves. They: themselves.', plain('myself  himself  herself')],
  ),
  oracle: 'h4ela',
};

// ---- C.7 Adverbs ----
// Levels: which word tells how / the describing word or the how word in a gap / which word tells how, from four.

const HOW_RULE = 'A word that tells how something is done often ends in ly.';

function adverbs(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const entry = rng.pick(HOW_GAPS);
    const afterBe = /\b(is|was|are|were) ___/.test(entry.sentence);
    const right = afterBe ? entry.adjective : entry.adverb;
    const done = entry.sentence.replace('___', right);
    const rule = afterBe ? 'After is, was or are, use a describing word.' : 'To tell how it was done, use the word that ends in ly.';
    return choice({
      prompt: FITS,
      speak: [FITS, blankSay(entry.sentence)],
      options: rng.shuffle([entry.adjective, entry.adverb]),
      right,
      spoken: true,
      stimulus: gapShown(entry.sentence),
      facts: { relation: 'adverbGap', target: entry.sentence },
      why: explain([rule, done], said(done), [rule, done]),
    });
  }
  const entry = rng.pick(HOW_SENTENCES);
  const words = level === 1 ? [entry.noun, entry.verb, entry.adverb] : [entry.adjective, entry.noun, entry.verb, entry.adverb];
  return choice({
    prompt: 'Which word tells how?',
    speak: ['Which word tells how?', entry.sentence],
    options: rng.shuffle(words),
    right: entry.adverb,
    spoken: true,
    stimulus: said(entry.sentence),
    facts: { relation: 'adverb', target: entry.sentence },
    why: explain([HOW_RULE, `${cap(entry.adverb)} tells how the ${entry.noun} ${entry.verb}.`], said(entry.sentence)),
  });
}

export const adverbsGenerator: SkillGenerator = {
  skillId: 'E-2-C7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: adverbs,
  exampleSeed: 1523,
  example: () => adverbs(1, makeRng(1523)),
  lesson: lesson(
    ['An adverb tells how something is done.', plain('The turtle walked slowly.')],
    ['The turtle walked slowly. Slowly tells how the turtle walked.', plain('slow → slowly')],
    ['The dog barked ___. Loud or loudly?', plain('The dog barked ___.'), 'Loudly. It tells how the dog barked.', plain('The dog barked loudly.')],
    [HOW_RULE, plain('slowly  quickly  softly')],
  ),
  oracle: 'h4ela',
};

// ---- C.8 Complete sentences ----
// Levels: is this a complete sentence / pick the complete one from 3 / from 4. Read, never spoken.

const COMPLETE_RULE = 'A complete sentence tells who or what, and what they do or are.';

function complete(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const yes = rng.bool();
    const sentence = rng.pick(yes ? COMPLETE : FRAGMENTS);
    return choice({
      prompt: 'Is this a complete sentence?',
      mode: 'read',
      fixedOrder: true,
      options: ['Yes', 'No'],
      right: yes ? 'Yes' : 'No',
      size: 'xl',
      stimulus: plain(sentence),
      facts: { relation: 'complete', target: sentence, read: [sentence] },
      why: explain([COMPLETE_RULE, yes ? 'This one has both parts.' : 'This one is missing a part.'], plain(sentence), [COMPLETE_RULE, yes ? 'This one has both parts.' : 'This one is missing a part.']),
    });
  }
  const right = rng.pick(COMPLETE);
  const options = rng.shuffle([right, ...rng.sample(FRAGMENTS, level === 2 ? 2 : 3)]);
  return choice({
    prompt: 'Which is a complete sentence?',
    mode: 'read',
    options,
    right,
    size: 'm',
    facts: { relation: 'completeChoice', target: 'complete', read: options },
    why: explain([COMPLETE_RULE, right], plain(right), [COMPLETE_RULE]),
  });
}

export const completeGenerator: SkillGenerator = {
  skillId: 'E-2-C8',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: complete,
  exampleSeed: 1524,
  example: () => complete(1, makeRng(1524)),
  lesson: lesson(
    [COMPLETE_RULE, plain('The dog ran to the park.')],
    ['The dog ran to the park. Who: the dog. What it did: ran. It is complete.', plain('The dog ran to the park.')],
    ['Is this complete? Ran to the park.', plain('Ran to the park.'), 'No. It does not say who ran.', plain('Ran to the park.')],
    ['Ask: who or what? What do they do?', plain('Birds sing in the morning.')],
  ),
  oracle: 'h4ela',
};
