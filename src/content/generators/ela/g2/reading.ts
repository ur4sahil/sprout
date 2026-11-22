import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Visual } from '../../../../engine/types';
import type { Story2, StoryQuestion } from '../../../banks/reading2';
import { STORIES_2 } from '../../../banks/reading2';
import type { SkillGenerator } from '../../../generator';
import { hint } from '../g1/wording';

// Language Arts grade 2 D.1 to D.3, from the authored bank in banks/reading2.ts. The story is for the child
// to read, so it is never spoken and its options do not speak. The question is spoken.

const plain = (value: string, size: 'm' | 'l' = 'm'): Visual => ({ kind: 'text', value, size });
const story = (entry: Story2): Visual => plain(entry.text);

function choose(entry: Story2, id: string, ask: string, answers: readonly string[], because: string, nudge: Hint, rng: Rng): QuestionDraft {
  const choices = rng.shuffle([...answers]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { id, read: [entry.text, ...answers] },
    prompt: { text: ask, speak: [ask] },
    stimulus: story(entry),
    options: choices.map((each) => plain(each)),
    answerIndex: choices.indexOf(answers[0] as string),
    explanation: { speak: ['Look back at the story.'], steps: ['Look back at the story.', because], visual: plain(because), hint: nudge },
  };
}

// ---- D.1 Read a story ----
// Levels: who or what / why or how. Oracle: authored.

function readStory2(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(STORIES_2);
  const q: StoryQuestion = level === 1 ? entry.who : entry.why;
  return choose(entry, `${entry.id}-${level === 1 ? 'who' : 'why'}`, q.ask, q.answers, q.because, hint('Look back at the story. Find the sentence that answers the question.'), rng);
}

export const readStory2Generator: SkillGenerator = {
  skillId: 'E-2-D1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  generate: readStory2,
  exampleSeed: 531,
  example: () => readStory2(1, makeRng(531)),
  lesson: (): LessonStep[] => {
    const first = STORIES_2[0] as Story2;
    return [
      { beat: 'see', text: 'Read the story. Then read the question and look back to find the answer.', speak: ['Read the story. Then read the question and look back to find the answer.'], visual: story(first) },
      { beat: 'watch', text: `${first.who.ask} The story says: ${first.who.because}`, speak: [first.who.ask, 'The story tells us.'], visual: plain(first.who.because) },
      { beat: 'try', text: first.why.ask, speak: [first.why.ask], visual: story(first), reveal: { text: `The story says: ${first.why.because}`, speak: ['Look back at the story.'], visual: plain(first.why.because) } },
      { beat: 'remember', text: 'The answer is in the story. Look back.', speak: ['The answer is in the story. Look back.'], visual: story(first) },
    ];
  },
  oracle: 'authored',
};

// ---- D.2 Main idea ----
// Levels: the best title / what it is mostly about. Oracle: authored.

function mainIdea(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(STORIES_2);
  const ask = level === 1 ? 'Which is the best title for the story?' : 'What is the story mostly about?';
  const answers = level === 1 ? entry.title : entry.about;
  const nudge = hint(level === 1 ? 'A good title fits the whole story, not just one part.' : 'Think about the whole story, not just one part.');
  return choose(entry, `${entry.id}-${level === 1 ? 'title' : 'about'}`, ask, answers, `The whole story is about this: ${entry.about[0]}`, nudge, rng);
}

export const mainIdeaGenerator: SkillGenerator = {
  skillId: 'E-2-D2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  generate: mainIdea,
  exampleSeed: 532,
  example: () => mainIdea(1, makeRng(532)),
  lesson: (): LessonStep[] => {
    const first = STORIES_2[1] as Story2;
    return [
      { beat: 'see', text: 'The main idea is what the whole story is about, not one small part.', speak: ['The main idea is what the whole story is about, not one small part.'], visual: story(first) },
      { beat: 'watch', text: `This story is mostly about this: ${first.about[0]}`, speak: ['Think about the whole story.'], visual: plain(first.about[0]) },
      { beat: 'try', text: 'Which is the best title for the story?', speak: ['Which is the best title for the story?'], visual: story(first), reveal: { text: `The best title: ${first.title[0]}`, speak: ['The best title fits the whole story.'], visual: plain(first.title[0]) } },
      { beat: 'remember', text: 'A good title fits the whole story.', speak: ['A good title fits the whole story.'], visual: story(first) },
    ];
  },
  oracle: 'authored',
};

// ---- D.3 Order of events ----
// Levels: put 3 events in order / 4 events. Oracle: order of the authored list.

function orderOfEvents(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(STORIES_2);
  const events = level === 1 ? [entry.events[0], entry.events[1], entry.events[3]].filter((each): each is string => each !== undefined) : [...entry.events];
  const shown = rng.shuffle(events.map((_, i) => i));
  const ask = 'Put what happened in order. Tap the first thing first.';
  return {
    type: 'order',
    mode: 'read',
    facts: { id: `${entry.id}-order-${level}`, read: [entry.text, ...events] },
    prompt: { text: ask, speak: [ask] },
    stimulus: story(entry),
    items: shown.map((i) => plain(events[i] as string)),
    answerOrder: events.map((_, i) => shown.indexOf(i)),
    // The steps list the answer, so the hint points to the start without placing a card.
    explanation: { speak: ['Look back at the story to see what happened first, next and last.'], steps: events.map((each, i) => `${i + 1}. ${each}`), visual: story(entry), hint: hint('Look at the start of the story. What happened first?') },
  };
}

export const orderOfEventsGenerator: SkillGenerator = {
  skillId: 'E-2-D3',
  maxLevel: 2,
  itemTypes: ['order'],
  lists: [],
  generate: orderOfEvents,
  exampleSeed: 533,
  example: () => orderOfEvents(1, makeRng(533)),
  lesson: (): LessonStep[] => {
    const first = STORIES_2[2] as Story2;
    return [
      { beat: 'see', text: 'Stories happen in order: first, next, then, last.', speak: ['Stories happen in order: first, next, then, last.'], visual: story(first) },
      { beat: 'watch', text: first.events.map((each, i) => `${i + 1}. ${each}`).join(' '), speak: ['First, it rained. Then they built a fort.'], visual: story(first) },
      { beat: 'try', text: 'What happened last?', speak: ['What happened last?'], visual: story(first), reveal: { text: `Last: ${first.events[3]}`, speak: ['Look at the end of the story.'], visual: plain(first.events[3] as string) } },
      { beat: 'remember', text: 'Look for first, next, then and last.', speak: ['Look for first, next, then and last.'], visual: story(first) },
    ];
  },
  oracle: 'authored',
};
