import type { Lesson } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. Filled in skill by skill.
export const LESSONS: Readonly<Record<string, () => Lesson>> = {};
