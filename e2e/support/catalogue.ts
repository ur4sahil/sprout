import { CATALOGUE } from '../../src/content/catalogue';
import { offeredTo } from '../../src/engine/grades';
import type { SkillGrade } from '../../src/engine/types';
import type { Grade } from '../../src/storage/schema';

// What a subject page shows for one grade, read from the catalogue, so a new skill never breaks a count. Given the
// child's grade, only the skills that grade is offered (offeredTo: the word puzzles start at grade 1).
const rows = (subject: 'math' | 'ela' | 'reasoning', grade: SkillGrade, child?: Grade) => CATALOGUE.filter((skill) => skill.subject === subject && skill.grade === grade && !skill.retired && (child === undefined || offeredTo(skill, child)));
export const skillCount = (subject: 'math' | 'ela' | 'reasoning', grade: SkillGrade, child?: Grade): number => rows(subject, grade, child).length;
export const groupNames = (subject: 'math' | 'ela' | 'reasoning', grade: SkillGrade, child?: Grade): string[] => [...new Set(rows(subject, grade, child).map((skill) => skill.category))];
