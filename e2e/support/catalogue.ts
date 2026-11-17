import { CATALOGUE } from '../../src/content/catalogue';
import type { SkillGrade } from '../../src/engine/types';

// What a subject page shows for one grade, read from the catalogue, so a new skill never breaks a count.
const rows = (subject: 'math' | 'ela' | 'reasoning', grade: SkillGrade) => CATALOGUE.filter((skill) => skill.subject === subject && skill.grade === grade && !skill.retired);
export const skillCount = (subject: 'math' | 'ela' | 'reasoning', grade: SkillGrade): number => rows(subject, grade).length;
export const groupNames = (subject: 'math' | 'ela' | 'reasoning', grade: SkillGrade): string[] => [...new Set(rows(subject, grade).map((skill) => skill.category))];
