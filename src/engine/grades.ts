import type { Grade } from '../storage/schema';
import type { SkillGrade } from './types';

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
