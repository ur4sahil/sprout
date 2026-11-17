import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft } from '../../../../engine/types';
import { FACT_SENTENCES, FACT_TEXTS, FEELING_TEXTS, FEELINGS, STORY_SENTENCES, STORY_TEXTS, TELLERS, TOLD_BY_ME, TOLD_BY_OTHER } from '../../../data/h4-reading';
import type { SkillGenerator } from '../../../generator';
import { pickApart } from '../pk/parts';
import { choice, explain, lesson, plain, withOthers } from './h4-parts';

// Language Arts grade 1 D.6 to D.8 (plan section 15 wave H4). The texts are read, never spoken, and their
// answers do not speak. Oracle: h4ela.

const text = (value: string) => plain(value, 'm');

// ---- D.6 Story or facts ----
// Levels: does this text tell a story or give facts / which sentence is from a fact book.

const KINDS = ['It tells a story.', 'It gives facts.'];
const STORY_RULE = 'A story has characters, and things happen to them.';
const FACT_RULE = 'A fact text tells true things about the world.';

function storyOrFacts(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const right = rng.pick(FACT_SENTENCES);
    const options = rng.shuffle([right, ...rng.sample(STORY_SENTENCES, 2)]);
    return choice({
      prompt: 'Which sentence is from a fact book?',
      mode: 'read',
      options,
      right,
      size: 'm',
      facts: { relation: 'factSentence', target: 'fact', read: options },
      why: explain([FACT_RULE, right], text(right)),
    });
  }
  const story = rng.bool();
  const entry = rng.pick(story ? STORY_TEXTS : FACT_TEXTS);
  return choice({
    prompt: 'Does this tell a story or give facts?',
    mode: 'read',
    fixedOrder: true,
    options: KINDS,
    right: KINDS[story ? 0 : 1] as string,
    size: 'm',
    stimulus: text(entry.text),
    facts: { relation: 'storyOrFact', target: entry.id, read: [entry.text] },
    why: explain([story ? STORY_RULE : FACT_RULE], text(entry.text), [story ? STORY_RULE : FACT_RULE]),
  });
}

export const storyOrFactsGenerator: SkillGenerator = {
  skillId: 'E-1-D6',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-reading'],
  generate: storyOrFacts,
  exampleSeed: 1431,
  example: () => storyOrFacts(1, makeRng(1431)),
  lesson: lesson(
    ['Some books tell a story. Some books give facts.', text((STORY_TEXTS[0] as { text: string }).text)],
    ['Pip the pup lost his bone. That is a story: Pip is a character. Frogs eat bugs. That is a fact.', text('Frogs live near water. They eat bugs.')],
    ['The sun is a star. Story or facts?', text('The sun is a star. It gives us light.'), 'Facts. It tells true things about the sun.', text('The sun is a star.')],
    ['Characters and what happens: a story. True things about the world: facts.', text('story   facts')],
  ),
  oracle: 'h4ela',
};

// ---- D.7 Who is telling the story ----
// Levels: who is the I in the story / is the teller a character or someone outside the story.

function teller(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const entry = rng.pick(TOLD_BY_ME);
    const options = rng.shuffle([...entry.teller]);
    return choice({
      prompt: 'Who is telling this story?',
      mode: 'read',
      options,
      right: entry.teller[0],
      size: 'l',
      stimulus: text(entry.text),
      facts: { relation: 'teller', target: entry.id, read: [entry.text, ...entry.teller] },
      why: explain(['The one telling the story says I.', `Here, I is ${entry.teller[0]}.`], text(entry.text), ['The one telling the story says I. Look back at who I is.']),
    });
  }
  const inside = rng.bool();
  const entry = inside ? rng.pick(TOLD_BY_ME) : rng.pick(TOLD_BY_OTHER);
  const rule = inside ? 'The story says I, so a character in the story is telling it.' : 'The story never says I, so someone outside the story is telling it.';
  return choice({
    prompt: 'Who is telling this story?',
    mode: 'read',
    fixedOrder: true,
    options: TELLERS,
    right: TELLERS[inside ? 0 : 1],
    size: 'm',
    stimulus: text(entry.text),
    facts: { relation: 'tellerKind', target: entry.id, read: [entry.text] },
    why: explain([rule], text(entry.text), [rule]),
  });
}

export const tellerGenerator: SkillGenerator = {
  skillId: 'E-1-D7',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-reading'],
  generate: teller,
  exampleSeed: 1432,
  example: () => teller(1, makeRng(1432)),
  lesson: lesson(
    ['Someone tells every story. Look for the word I.', text('I am a little frog. I sit on a log all day.')],
    ['I am a little frog. The frog says I, so the frog is telling the story.', text('I am a little frog.')],
    ['Who is telling this? I am a red kite. A girl holds my string.', text('I am a red kite. A girl holds my string.'), 'The kite. The kite says I.', text('I am a red kite.')],
    ['I in the story: a character tells it. No I: someone outside tells it.', text('I am a bee.')],
  ),
  oracle: 'h4ela',
};

// ---- D.8 Feelings in a story ----
// Levels: how does the character feel / which sentence shows a feeling.

function feelings(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const entry = rng.pick(FEELING_TEXTS);
    const options = withOthers(rng, entry.feeling, FEELINGS);
    return choice({
      prompt: `How does ${entry.who} feel?`,
      mode: 'read',
      options,
      right: entry.feeling,
      stimulus: text(entry.text),
      facts: { relation: 'feeling', target: entry.id, read: [entry.text, ...options] },
      why: explain([`${entry.clue}`, `That shows ${entry.who} is ${entry.feeling}.`], text(entry.clue), ['Look for what the character does.', `That shows ${entry.who} is ${entry.feeling}.`]),
    });
  }
  const feeling = rng.pick(FEELINGS);
  const entry = rng.pick(FEELING_TEXTS.filter((each) => each.feeling === feeling));
  const others = pickApart(FEELING_TEXTS, 2, rng, (each, picked) => each.feeling !== feeling && picked.every((other) => other.feeling !== each.feeling)).map((each) => each.clue);
  const options = rng.shuffle([entry.clue, ...others]);
  return choice({
    prompt: `Which sentence shows that someone is ${feeling}?`,
    mode: 'read',
    options,
    right: entry.clue,
    size: 'm',
    facts: { relation: 'feelingClue', target: feeling, read: options },
    why: explain([`${entry.clue}`, `That is what someone does when they are ${feeling}.`], text(entry.clue), [`Think about what someone does when they are ${feeling}.`]),
  });
}

export const feelingsGenerator: SkillGenerator = {
  skillId: 'E-1-D8',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-reading'],
  generate: feelings,
  exampleSeed: 1433,
  example: () => feelings(1, makeRng(1433)),
  lesson: lesson(
    ['A story may not say how a character feels. What they do shows it.', text('Ana lost her kite in a tree. She cried and cried.')],
    ['Ana cried and cried. Crying shows she is sad.', text('She cried and cried.')],
    ['Max jumped up and down and laughed. How does Max feel?', text('He jumped up and down and laughed.'), 'Happy. Laughing shows he is happy.', text('happy')],
    ['Look at what the character does and says.', text('happy  sad  scared  angry  tired')],
  ),
  oracle: 'h4ela',
};
