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
import type { Lesson } from './types';

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
export const LESSONS: Readonly<Record<string, () => Lesson>> = Object.fromEntries(
  Object.entries(WRITTEN).map(([skillId, make]) => [skillId, () => {
    const lesson = make();
    return lesson.look === 'rich' ? lesson : rich(lesson, 'table');
  }]),
);

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
