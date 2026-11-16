import { addDays, localDayOf } from '../lib/clock';
import type { SkillState } from '../storage/schema';
import type { Level } from './types';

// Spaced review (plan section 7). Pure functions.

export const REVIEW_INTERVALS = [2, 5, 12, 30, 60] as const; // days, by box
export const REVIEW_QUESTIONS = 3;
export const REVIEW_LEVEL: Level = 3;
export const REVIEW_SESSION_SKILLS = 4;
export const FAILED_REVIEW_SCORE = 85;

function interval(box: number): number {
  const index = Math.min(Math.max(box, 0), REVIEW_INTERVALS.length - 1);
  return REVIEW_INTERVALS[index] as number;
}

// Mastering a skill puts it in box 0, due in 2 days.
export function scheduleFirstReview(nowIso: string): Pick<SkillState, 'reviewBox' | 'reviewDueAt'> {
  return { reviewBox: 0, reviewDueAt: addDays(nowIso, interval(0)) };
}

// Due once today's local day reaches the local day of reviewDueAt. The time of day does not matter.
export function isReviewDue(state: Pick<SkillState, 'masteredAt' | 'reviewDueAt'>, nowIso: string): boolean {
  if (state.masteredAt === null || state.reviewDueAt === null) return false;
  return localDayOf(nowIso) >= localDayOf(state.reviewDueAt);
}

// The skills for one review session: up to 4, the longest overdue first.
export function dueForReview(states: readonly SkillState[], nowIso: string): SkillState[] {
  return states
    .filter((state) => isReviewDue(state, nowIso))
    .sort((a, b) => (a.reviewDueAt ?? '').localeCompare(b.reviewDueAt ?? '') || a.skillId.localeCompare(b.skillId))
    .slice(0, REVIEW_SESSION_SKILLS);
}

export function reviewLevel(maxLevel: Level): Level {
  return Math.min(REVIEW_LEVEL, maxLevel) as Level;
}

// The skill state after a review of 3 questions.
// 3 right: up one box. 2 right: same box. 0 or 1 right: back to 85, no medal, box 0, normal practice.
export function applyReview(state: SkillState, right: number, nowIso: string): { state: SkillState; passed: boolean } {
  if (!Number.isInteger(right) || right < 0 || right > REVIEW_QUESTIONS) {
    throw new Error(`A review has 0 to ${REVIEW_QUESTIONS} right answers, not ${right}`);
  }
  if (right <= 1) {
    return {
      passed: false,
      state: {
        ...state,
        score: FAILED_REVIEW_SCORE,
        masteredAt: null,
        reviewBox: 0,
        reviewDueAt: null,
        streak: 0,
        updatedAt: nowIso,
      },
    };
  }
  const box = right === REVIEW_QUESTIONS ? Math.min(state.reviewBox + 1, REVIEW_INTERVALS.length - 1) : state.reviewBox;
  return {
    passed: true,
    state: { ...state, reviewBox: box, reviewDueAt: addDays(nowIso, interval(box)), updatedAt: nowIso },
  };
}
