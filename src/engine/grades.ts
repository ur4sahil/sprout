import type { Grade } from '../storage/schema';
import type { Level, SkillGrade } from './types';

const ORDER: readonly Grade[] = ['PK', 'K', '1', '2', '3', '4', '5'];

// Where a grade sits, lowest first. Reasoning skills ('all') sit at the child's own grade.
export function gradeRank(grade: SkillGrade | Grade, childGrade?: Grade): number {
  if (grade === 'all') return childGrade ? ORDER.indexOf(childGrade) : 0;
  return ORDER.indexOf(grade);
}

// Whether a skill is offered to a child of this grade: every skill is, except one whose catalogue row names a youngest
// grade the child has not reached. The word puzzles R-A15 and R-A16 are words only, so a pre-K or kindergarten child is
// never offered them (the owner's choice, Nov 22, 2026): not in today's plan, the picks, the Mixed bag, Pop, a review,
// the garden or the Reasoning page. This is the one place that decides it.
export function offeredTo(skill: { fromGrade?: Exclude<SkillGrade, 'all'> }, grade: Grade): boolean {
  return skill.fromGrade === undefined || ORDER.indexOf(grade) >= ORDER.indexOf(skill.fromGrade);
}

// The highest level a child of this grade is asked on a skill: the skill's own top level, except that a pre-K or
// kindergarten child stops at the row's `youngMaxLevel` when it names one. Number analogies (R-A8) has 1, so a young
// child masters it on "goes up by 1" (the owner's choice, Nov 22, 2026). This is the one place that decides it, and
// every place that chooses a level for a child reads it: practice and its short skip test, the Mixed bag, Pop,
// reviews, the check on a listen question in today's day, and worksheets.
export function maxLevelFor(skill: { maxLevel: Level; youngMaxLevel?: Level }, grade: Grade): Level {
  const young = grade === 'PK' || grade === 'K';
  return young && skill.youngMaxLevel !== undefined ? (Math.min(skill.maxLevel, skill.youngMaxLevel) as Level) : skill.maxLevel;
}
