import type { SkillGrade } from '../engine/types';

// Every ladder as a list of skill ids, in order (plan section 7).
// A ladder holds only skills that truly build on each other, across grades.

export interface Ladder {
  id: string;
  subject: 'math' | 'ela' | 'reasoning';
  skillIds: string[];
}

function run(prefix: string, category: string, from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${prefix}-${category}${from + i}`);
}

const M = { PK: 'M-PK', K: 'M-K', G1: 'M-1', G2: 'M-2' };
const E = { PK: 'E-PK', K: 'E-K', G1: 'E-1' };

export const LADDERS: readonly Ladder[] = [
  { id: 'counting', subject: 'math', skillIds: [...run(M.PK, 'A', 1, 8), ...run(M.K, 'A', 1, 7), ...run(M.G1, 'A', 1, 2), 'M-2-A4'] },
  { id: 'comparing', subject: 'math', skillIds: [...run(M.PK, 'B', 1, 2), ...run(M.K, 'B', 1, 3), 'M-1-A4', 'M-2-A3'] },
  { id: 'add-subtract', subject: 'math', skillIds: [...run(M.K, 'C', 1, 11), ...run(M.G1, 'B', 1, 10), ...run(M.G2, 'B', 1, 10)] },
  { id: 'place-value', subject: 'math', skillIds: ['M-K-D1', 'M-1-A3', 'M-1-A5', 'M-2-A1', 'M-2-A2', 'M-2-A6'] },
  { id: 'shapes', subject: 'math', skillIds: [...run(M.PK, 'C', 1, 2), ...run(M.K, 'E', 1, 3), 'M-1-D2', 'M-2-D1'] },
  { id: 'length', subject: 'math', skillIds: ['M-PK-C3', 'M-K-F1', 'M-1-C2', 'M-2-C3'] },
  { id: 'patterns', subject: 'math', skillIds: [...run(M.PK, 'D', 1, 3), 'M-K-G1', 'M-1-E1', 'M-2-A5'] },
  { id: 'data', subject: 'math', skillIds: ['M-K-F2', 'M-1-C3', 'M-2-C4'] },
  { id: 'time', subject: 'math', skillIds: ['M-1-C1', 'M-2-C1'] },
  { id: 'money', subject: 'math', skillIds: ['M-1-C4', 'M-2-C2'] },
  { id: 'fractions', subject: 'math', skillIds: ['M-1-D1', 'M-2-D2'] },
  { id: 'letters', subject: 'ela', skillIds: [...run(E.PK, 'A', 1, 5), ...run(E.K, 'A', 1, 2)] },
  { id: 'sounds', subject: 'ela', skillIds: [...run(E.PK, 'B', 1, 3), ...run(E.K, 'B', 1, 3), 'E-K-B6'] },
  { id: 'phonics', subject: 'ela', skillIds: ['E-K-B4', 'E-K-B5', 'E-K-B7', ...run(E.G1, 'A', 1, 5)] },
  { id: 'sight-words', subject: 'ela', skillIds: [...run(E.K, 'C', 1, 3), 'E-1-B1'] },
  { id: 'grammar', subject: 'ela', skillIds: [...run(E.K, 'D', 1, 3), ...run(E.G1, 'C', 1, 3)] },
  { id: 'vocabulary', subject: 'ela', skillIds: [...run(E.PK, 'C', 1, 2), 'E-1-B2', 'E-1-B3'] },
  { id: 'reading', subject: 'ela', skillIds: ['E-K-E1', 'E-1-D1'] },
  { id: 'figures', subject: 'reasoning', skillIds: [...run('R', 'A', 1, 7), 'R-A12', 'R-A13'] },
  { id: 'words-numbers', subject: 'reasoning', skillIds: ['R-A9', 'R-A14', 'R-A8', 'R-A10', 'R-A11'] },
];

// The grade written into a skill id: 'M-K-C4' is K, 'R-A4' is all.
export function gradeOfSkillId(skillId: string): SkillGrade {
  const parts = skillId.split('-');
  if (parts[0] === 'R') return 'all';
  const grade = parts[1];
  if (grade === 'PK' || grade === 'K' || grade === '1' || grade === '2') return grade;
  throw new Error(`Skill id ${skillId} has no grade part`);
}

export function ladderById(id: string): Ladder | undefined {
  return LADDERS.find((ladder) => ladder.id === id);
}

export function ladderOf(skillId: string): Ladder | undefined {
  return LADDERS.find((ladder) => ladder.skillIds.includes(skillId));
}

// A skill's default prerequisite: the skill before it on its ladder, across grades.
export function ladderPrerequisite(skillId: string): string | null {
  const ladder = ladderOf(skillId);
  if (!ladder || ladder.subject === 'reasoning') return null; // reasoning ladders are an order, not a staircase
  const index = ladder.skillIds.indexOf(skillId);
  return index > 0 ? (ladder.skillIds[index - 1] ?? null) : null;
}
