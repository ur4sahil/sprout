import type { Grade } from '../storage/schema';
import type { SkillGrade } from './types';

const ORDER: readonly Grade[] = ['PK', 'K', '1', '2', '3', '4', '5'];

// Where a grade sits, lowest first. Reasoning skills ('all') sit at the child's own grade.
export function gradeRank(grade: SkillGrade | Grade, childGrade?: Grade): number {
  if (grade === 'all') return childGrade ? ORDER.indexOf(childGrade) : 0;
  return ORDER.indexOf(grade);
}
