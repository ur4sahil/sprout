import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { ItemType, LessonStep, Level, OracleId, QuestionDraft, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';

// What the skills of plan section 15 wave H2 (Math pre-K and grade 2) share: a skill built from its
// generate function, and a four-beat lesson built from two of its own questions, so the lesson always
// shows the same wording and pictures as practice.

function pictureOf(question: QuestionDraft): Visual {
  const visual = question.explanation.visual ?? question.stimulus;
  if (visual) return visual;
  throw new Error('h2 lesson: a question with no picture');
}

export interface LessonWords {
  see: string; // the idea, in words with no digits
  remember: string; // the rule the lesson ends on, with no digits
  watchLevel?: Level; // the level of the worked example (1 when left out)
  tryLevel?: Level; // the level of the question tried together (the watch level when left out)
}

export function lessonFrom(generate: (level: Level, rng: Rng) => QuestionDraft, seed: number, words: LessonWords): LessonStep[] {
  const watch = generate(words.watchLevel ?? 1, makeRng(seed));
  const tryIt = generate(words.tryLevel ?? words.watchLevel ?? 1, makeRng(seed + 7));
  return [
    { beat: 'see', text: words.see, speak: [words.see], visual: watch.stimulus ?? pictureOf(watch) },
    {
      beat: 'watch',
      text: `${watch.prompt.text} ${watch.explanation.steps.join(' ')}`,
      speak: [...watch.prompt.speak, ...watch.explanation.speak],
      visual: pictureOf(watch),
    },
    {
      beat: 'try',
      text: tryIt.prompt.text,
      speak: tryIt.prompt.speak,
      visual: tryIt.stimulus ?? pictureOf(tryIt),
      reveal: { text: tryIt.explanation.steps.join(' '), speak: tryIt.explanation.speak, visual: pictureOf(tryIt) },
    },
    { beat: 'remember', text: words.remember, speak: [words.remember], visual: pictureOf(watch) },
  ];
}

export interface SkillSpec {
  skillId: string;
  maxLevel: Level;
  itemTypes: ItemType[];
  lists: string[];
  pool?: Partial<Record<Level, number>>;
  generate: (level: Level, rng: Rng) => QuestionDraft;
  exampleSeed: number;
  lesson: LessonWords;
  oracle: OracleId;
}

export function skill(spec: SkillSpec): SkillGenerator {
  const { lesson, ...rest } = spec;
  return {
    ...rest,
    example: () => spec.generate(1, makeRng(spec.exampleSeed)),
    lesson: () => lessonFrom(spec.generate, spec.exampleSeed, lesson),
  };
}
