import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft } from '../../../../engine/types';
import { FEATURE_USE, FEATURE_WHAT, FEATURES, POEMS, PURPOSE_TEXTS, PURPOSES, STORY_PAIRS } from '../../../data/h4-reading';
import type { SkillGenerator } from '../../../generator';
import { choice, explain, lesson, plain, withOthers } from '../g1/h4-parts';
import { cap } from '../pk/parts';

// Language Arts grade 2 D.7 to D.10 (plan section 15 wave H4). Poems, story pairs and purpose texts are read,
// never spoken. Oracle: h4ela.

const text = (value: string) => plain(value, 'm');

// ---- D.7 Text features ----
// Levels: what each part of a book is for / where to look to find something / both, from four.

const FEATURE_RULE: Record<string, string> = {
  title: 'The title is the name of the whole book.',
  heading: 'A heading tells what one part of the page is about.',
  caption: 'A caption is a sentence that tells about a picture.',
  label: 'Labels name the parts of a picture.',
  glossary: 'The glossary at the back tells what hard words mean.',
  'table of contents': 'The table of contents at the front lists the topics and their pages.',
  'bold word': 'A bold word is printed dark so you notice it.',
};

function features(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(level === 1 ? FEATURE_WHAT : level === 2 ? FEATURE_USE : [...FEATURE_WHAT, ...FEATURE_USE]);
  return choice({
    prompt: entry.ask,
    options: withOthers(rng, entry.feature, FEATURES, level === 3 ? 3 : 2),
    right: entry.feature,
    spoken: true,
    size: 'm',
    facts: { relation: 'feature', target: entry.ask },
    why: explain([FEATURE_RULE[entry.feature] as string], plain(entry.feature)),
  });
}

export const featuresGenerator: SkillGenerator = {
  skillId: 'E-2-D7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-reading'],
  pool: { 1: 7, 2: 6 },
  generate: features,
  exampleSeed: 1531,
  example: () => features(1, makeRng(1531)),
  lesson: lesson(
    ['Fact books have parts that help you find things: a title, headings, captions, labels and a glossary.', plain('title   heading   caption')],
    ['Under a photo of a frog, a caption says: A frog sits on a lily pad.', text('A frog sits on a lily pad.')],
    ['Where do you look to find what a hard word means?', plain('glossary?'), 'The glossary, at the back of the book.', plain('glossary')],
    ['Use the parts of a book to find what you need fast.', plain('table of contents')],
  ),
  oracle: 'h4ela',
};

// ---- D.8 Poems: rhyme and repeated lines ----
// Levels: which word rhymes with a word in the poem / which line is said two times.

const lineOf = (line: string): string => cap(line.replace(/[,.]$/, ''));
const poemText = (lines: readonly string[]): string => lines.join(' / ');

function poems(level: Level, rng: Rng): QuestionDraft {
  const poem = rng.pick(POEMS);
  const shown = poemText(poem.lines);
  if (level === 1) {
    const [word, partner] = poem.rhyme;
    const options = rng.shuffle([partner, ...poem.others]);
    return choice({
      prompt: `Which word in the poem rhymes with ${word}?`,
      mode: 'read',
      options,
      right: partner,
      size: 'xl',
      stimulus: text(shown),
      facts: { relation: 'poemRhyme', target: word, id: poem.id, read: [shown, ...options] },
      why: explain([`${cap(word)} and ${partner} rhyme. They end with the same sound.`], text(`${poem.lines[1]} / ${poem.lines[2]}`), ['Rhyming words end with the same sound.']),
    });
  }
  const options = rng.shuffle(poem.lines.slice(0, 3).map(lineOf));
  const right = lineOf(poem.lines[0]);
  return choice({
    prompt: 'Which line is said two times?',
    mode: 'read',
    options,
    right,
    size: 'm',
    stimulus: text(shown),
    facts: { relation: 'poemRepeat', target: poem.id, read: [shown, ...options] },
    why: explain(['The poem starts and ends with the same line.', right], text(right), ['The poem starts and ends with the same line.']),
  });
}

export const poemsGenerator: SkillGenerator = {
  skillId: 'E-2-D8',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-reading'],
  generate: poems,
  exampleSeed: 1532,
  example: () => poems(1, makeRng(1532)),
  lesson: lesson(
    ['Poems often have words that rhyme and lines that come back.', text(poemText((POEMS[0] as (typeof POEMS)[number]).lines))],
    ['Log and fog rhyme. Little frog, little frog is said at the start and again at the end.', text(poemText((POEMS[0] as (typeof POEMS)[number]).lines))],
    ['In the rain poem, which word rhymes with gray?', text(poemText((POEMS[1] as (typeof POEMS)[number]).lines)), 'Play. Gray and play end with the same sound.', text('the clouds are gray, / I cannot play,')],
    ['Listen for the same ending sound, and look for lines that repeat.', text('frog / log / fog')],
  ),
  oracle: 'h4ela',
};

// ---- D.9 Compare two stories ----
// Levels: what is the same in both stories / how they are different.

function compareStories(level: Level, rng: Rng): QuestionDraft {
  const pair = rng.pick(STORY_PAIRS);
  const answers = level === 1 ? pair.same : pair.differ;
  const options = rng.shuffle([...answers]);
  const shown = `Story 1: ${pair.one} Story 2: ${pair.two}`;
  return choice({
    prompt: level === 1 ? 'What is the same in both stories?' : 'How are the two stories different?',
    mode: 'read',
    options,
    right: answers[0],
    size: 'm',
    stimulus: text(shown),
    facts: { relation: level === 1 ? 'sameInBoth' : 'differ', target: pair.id, read: [shown, ...options] },
    why: explain(['Read both stories, then check each answer against both.', answers[0]], text(answers[0]), ['Read both stories, then check each answer against both.']),
  });
}

export const compareStoriesGenerator: SkillGenerator = {
  skillId: 'E-2-D9',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-reading'],
  generate: compareStories,
  exampleSeed: 1533,
  example: () => compareStories(1, makeRng(1533)),
  lesson: lesson(
    ['Two stories can be alike in some ways and different in others.', text('Story 1   Story 2')],
    ['Ana lost her cat. Ben lost his dog. Both lost a pet. One is a cat, one is a dog.', text('cat   dog')],
    ['It rained, so Max played inside. It snowed, so Lin played outside. What is different?', text('inside   outside'), 'Max plays inside, but Lin plays outside.', text('inside   outside')],
    ['Same: true for both stories. Different: true for only one.', text('same   different')],
  ),
  oracle: 'h4ela',
};

// ---- D.10 Author's purpose ----
// Levels: to tell a story, teach facts or get you to do something / adds telling how to do something.

const PURPOSE_RULE: Record<string, string> = {
  'To tell a story': 'It has characters and things that happen, so it tells a story.',
  'To teach facts': 'It gives true facts, so it teaches.',
  'To get you to do something': 'It asks you to do something, so it wants you to act.',
  'To tell how to do something': 'It gives steps in order, so it tells how to do something.',
};

function purpose(level: Level, rng: Rng): QuestionDraft {
  const shown = level === 1 ? PURPOSES.slice(0, 3) : PURPOSES;
  // The purpose is chosen first, so each is right about as often as the others.
  const why = rng.pick(shown);
  const entry = rng.pick(PURPOSE_TEXTS.filter((each) => each.purpose === why));
  return choice({
    prompt: 'Why did the author write this?',
    mode: 'read',
    fixedOrder: true,
    options: shown,
    right: why,
    size: 'm',
    stimulus: text(entry.text),
    facts: { relation: 'purpose', target: entry.id, read: [entry.text] },
    why: explain([PURPOSE_RULE[why] as string], text(entry.text), [PURPOSE_RULE[why] as string]),
  });
}

export const purposeGenerator: SkillGenerator = {
  skillId: 'E-2-D10',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-reading'],
  generate: purpose,
  exampleSeed: 1534,
  example: () => purpose(1, makeRng(1534)),
  lesson: lesson(
    ['Authors write for a reason: to tell a story, to teach, to get you to do something, or to tell how.', text('Why did the author write this?')],
    ['Ants live in big groups. They dig tunnels. This teaches facts about ants.', text('Ants live in big groups.')],
    ['Come to the school fair! You will love it! Why was this written?', text('Come to the school fair on Saturday!'), 'To get you to do something: to come to the fair.', text('Come to the school fair!')],
    ['Ask: does it tell, teach, ask, or give steps?', text('tell   teach   ask   steps')],
  ),
  oracle: 'h4ela',
};
