import type { Skill } from '../content/catalogue';
import type { SkillState } from '../storage/schema';

// Award rules (plan section 10). Pure functions.
// An award, once earned, is never taken back: the caller keeps what was earned before.

export interface AwardTotals {
  questionsAnswered: number; // all subjects together
  daysPractised: number; // different local days with at least one answer
  diagnosticsFinished: { math: boolean; ela: boolean };
}

export interface AwardDef {
  id: string;
  board: string; // 'math-PK', 'ela-K', 'reasoning' or 'milestones'
  family: 'mastered' | 'category' | 'questions' | 'days' | 'diagnostic';
  label: string;
}

export const MASTERED_STEPS = [1, 3, 5, 10, 15] as const;
export const QUESTION_STEPS = [25, 50, 100, 250, 500, 1000] as const;
export const DAY_STEPS = [3, 7, 14, 30] as const;

export function boardOf(skill: Pick<Skill, 'subject' | 'grade'>): string {
  return skill.subject === 'reasoning' ? 'reasoning' : `${skill.subject}-${skill.grade}`;
}

function categoryLetter(skill: Pick<Skill, 'code'>): string {
  return skill.code.split('.')[0] ?? skill.code;
}

interface Board {
  id: string;
  skills: Skill[];
}

function boards(skills: readonly Skill[]): Board[] {
  const map = new Map<string, Skill[]>();
  for (const skill of skills) {
    if (skill.retired) continue;
    const id = boardOf(skill);
    map.set(id, [...(map.get(id) ?? []), skill]);
  }
  return [...map].map(([id, list]) => ({ id, skills: list }));
}

// Every award there is, for the boards screen.
export function allAwards(skills: readonly Skill[]): AwardDef[] {
  const out: AwardDef[] = [];
  for (const board of boards(skills)) {
    // A threshold above the board's number of skills is left out.
    for (const step of MASTERED_STEPS) {
      if (step <= board.skills.length) {
        out.push({ id: `mastered:${board.id}:${step}`, board: board.id, family: 'mastered', label: `${step} ${step === 1 ? 'skill' : 'skills'} mastered` });
      }
    }
    out.push({ id: `mastered:${board.id}:all`, board: board.id, family: 'mastered', label: 'Every skill mastered' });
    const categories = new Map<string, string>();
    for (const skill of board.skills) categories.set(categoryLetter(skill), skill.category);
    for (const [letter, name] of categories) {
      out.push({ id: `category:${board.id}:${letter}`, board: board.id, family: 'category', label: name });
    }
  }
  for (const step of QUESTION_STEPS) out.push({ id: `questions:${step}`, board: 'milestones', family: 'questions', label: `${step} questions answered` });
  for (const step of DAY_STEPS) out.push({ id: `days:${step}`, board: 'milestones', family: 'days', label: `${step} days practised` });
  out.push({ id: 'diagnostic:math', board: 'milestones', family: 'diagnostic', label: 'Math check-in finished' });
  out.push({ id: 'diagnostic:ela', board: 'milestones', family: 'diagnostic', label: 'Language Arts check-in finished' });
  return out;
}

// Every award id the child has earned so far, from one child's skill states and totals.
export function evaluateAwards(states: readonly SkillState[], totals: AwardTotals, skills: readonly Skill[]): string[] {
  const stateById = new Map(states.map((state) => [state.skillId, state]));
  const earned: string[] = [];
  for (const board of boards(skills)) {
    const mastered = board.skills.filter((skill) => (stateById.get(skill.id)?.masteredAt ?? null) !== null).length;
    for (const step of MASTERED_STEPS) {
      if (step <= board.skills.length && mastered >= step) earned.push(`mastered:${board.id}:${step}`);
    }
    if (mastered === board.skills.length) earned.push(`mastered:${board.id}:all`);

    // Every skill in a category at 80 or above. Placed-out skills count in full.
    const byCategory = new Map<string, Skill[]>();
    for (const skill of board.skills) {
      const letter = categoryLetter(skill);
      byCategory.set(letter, [...(byCategory.get(letter) ?? []), skill]);
    }
    for (const [letter, list] of byCategory) {
      if (list.every((skill) => (stateById.get(skill.id)?.score ?? 0) >= 80)) earned.push(`category:${board.id}:${letter}`);
    }
  }
  for (const step of QUESTION_STEPS) if (totals.questionsAnswered >= step) earned.push(`questions:${step}`);
  for (const step of DAY_STEPS) if (totals.daysPractised >= step) earned.push(`days:${step}`);
  if (totals.diagnosticsFinished.math) earned.push('diagnostic:math');
  if (totals.diagnosticsFinished.ela) earned.push('diagnostic:ela');
  return earned;
}

// A category sticker earned only because the child placed out of every skill in it shows with no celebration.
export function isQuietAward(awardId: string, states: readonly SkillState[], skills: readonly Skill[]): boolean {
  const [family, board, letter] = awardId.split(':');
  if (family !== 'category') return false;
  const list = skills.filter((skill) => !skill.retired && boardOf(skill) === board && categoryLetter(skill) === letter);
  const stateById = new Map(states.map((state) => [state.skillId, state]));
  return list.length > 0 && list.every((skill) => stateById.get(skill.id)?.placedOut === true);
}
