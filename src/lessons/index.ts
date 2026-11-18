import { missingNumberLesson } from './g1Math';
import { firstLetterLesson, middleVowelLesson } from './kEla';
import { addPicturesLesson, countLesson, teenLesson } from './kMath';
import type { Say } from '../engine/types';
import { rich } from './build';
import { LESSONS as kCount } from './more/kCount';
import { LESSONS as kAdd } from './more/kAdd';
import { LESSONS as kShapes } from './more/kShapes';
import { LESSONS as kEla1 } from './more/kEla1';
import { LESSONS as kEla2 } from './more/kEla2';
import { LESSONS as g1Place } from './more/g1Place';
import { LESSONS as g1Add } from './more/g1Add';
import { LESSONS as g1Measure } from './more/g1Measure';
import { LESSONS as g1Ela1 } from './more/g1Ela1';
import { LESSONS as g1Ela2 } from './more/g1Ela2';
import { LESSONS as reasoning } from './more/reasoning';
import { LESSONS as kPictures } from './more/kPictures';
import { LESSONS as g1Pictures } from './more/g1Pictures';
import { LESSONS as reasoningShapes } from './more/reasoningShapes';
import { LESSONS as kMathAPart2 } from './part2/kMathA';
import { LESSONS as kMathBPart2 } from './part2/kMathB';
import { LESSONS as kMathCPart2 } from './part2/kMathC';
import { LESSONS as g1MathCPart2 } from './part2/g1MathC';
import { LESSONS as kElaPart2 } from './part2/kEla';
import { LESSONS as g1MathAPart2 } from './part2/g1MathA';
import { LESSONS as g1MathBPart2 } from './part2/g1MathB';
import { LESSONS as g1ElaPart2 } from './part2/g1Ela';
import { LESSONS as reasoningPart2 } from './part2/reasoning';
import type { Lesson, Moment } from './types';

// The skills that have a lesson that teaches (plan section 16). Any other skill keeps its old four beats.
const WRITTEN: Readonly<Record<string, () => Lesson>> = {
  ...kCount, ...kAdd, ...kShapes, ...kEla1, ...kEla2, ...g1Place, ...g1Add, ...g1Measure, ...g1Ela1, ...g1Ela2, ...reasoning, ...kPictures, ...g1Pictures, ...reasoningShapes,
  'M-K-A1': countLesson,
  'M-K-C1': addPicturesLesson,
  'M-K-D1': teenLesson,
  'E-K-B1': firstLetterLesson,
  'E-K-B3': middleVowelLesson,
  'M-1-B5': missingNumberLesson,
};

// Every lesson in the rich look (the owner's choice, Nov 18, 2026): the host, the table, the bounce and confetti.
// The app is American: some generators keep the British word as a data key ("colour"), and a lesson that builds a
// sentence from such a key would say it. Every sentence and caption is put right here, in one place.
const american = (words: string): string => words.replace(/colour/g, 'color').replace(/Colour/g, 'Color');
const spelled = (each: Moment): Moment => ({ ...each, text: american(each.text), say: each.say.map((part) => (typeof part === 'string' ? american(part) : part)) });
function finished(lesson: Lesson): Lesson {
  const look = lesson.look === 'rich' ? lesson : rich(lesson, 'table');
  return { ...look, parts: look.parts.map((part) => (part.kind === 'show' ? { kind: 'show', moment: spelled(part.moment) } : { kind: 'turn', turn: { ...part.turn, why: part.turn.why.map(spelled) } })) };
}
const richly = (written: Readonly<Record<string, () => Lesson>>): Readonly<Record<string, () => Lesson>> =>
  Object.fromEntries(Object.entries(written).map(([skillId, make]) => [skillId, () => finished(make())]));

export const LESSONS: Readonly<Record<string, () => Lesson>> = richly(WRITTEN);

// Part 2 (the owner's choice, Nov 18, 2026): a second short lesson for the skill's harder levels, for the skills whose
// first lesson stops at the starting levels. Offered on the bulb's choice screen and at the half-way milestone.
export const LESSONS_PART2: Readonly<Record<string, () => Lesson>> = richly({ ...kMathAPart2, ...kMathBPart2, ...kMathCPart2, ...g1MathCPart2, ...kElaPart2, ...g1MathAPart2, ...g1MathBPart2, ...g1ElaPart2, ...reasoningPart2 });
export const PART2_AT_SCORE = 50; // the score from which part 2 is put forward

const madePart2 = new Map<string, Lesson>();

export function teachingPart2For(skillId: string): Lesson | null {
  const make = LESSONS_PART2[skillId];
  if (!make) return null;
  const known = madePart2.get(skillId);
  if (known) return known;
  const lesson = make();
  madePart2.set(skillId, lesson);
  return lesson;
}

// Every written lesson, first parts then second parts: [its name for a person, the skill, how to make it].
export function allLessons(): [string, string, () => Lesson][] {
  return [
    ...Object.entries(LESSONS).map(([skillId, make]): [string, string, () => Lesson] => [skillId, skillId, make]),
    ...Object.entries(LESSONS_PART2).map(([skillId, make]): [string, string, () => Lesson] => [`${skillId} part 2`, skillId, make]),
  ];
}

const made = new Map<string, Lesson>();

export function teachingFor(skillId: string): Lesson | null {
  const make = LESSONS[skillId];
  if (!make) return null;
  const known = made.get(skillId);
  if (known) return known;
  const lesson = make();
  made.set(skillId, lesson);
  return lesson;
}

// Every sentence a lesson can say, in order: for asking the voice early.
export function lessonSays(lesson: Lesson): Say[] {
  return lesson.parts.flatMap((part) => (part.kind === 'show' ? [part.moment.say] : [part.turn.question.prompt.speak, ...part.turn.why.map((each) => each.say)]));
}
