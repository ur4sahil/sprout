import { missingNumberLesson } from './g1Math';
import { firstLetterLesson, middleVowelLesson } from './kEla';
import { addPicturesLesson, countLesson, teenLesson } from './kMath';
import type { Say } from '../engine/types';
import type { Lesson } from './types';

// The skills that have a lesson that teaches (plan section 16). Any other skill keeps its old four beats.
export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-A1': countLesson,
  'M-K-C1': addPicturesLesson,
  'M-K-D1': teenLesson,
  'E-K-B1': firstLetterLesson,
  'E-K-B3': middleVowelLesson,
  'M-1-B5': missingNumberLesson,
};

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
