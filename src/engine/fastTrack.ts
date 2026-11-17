import type { SkillState } from '../storage/schema';

// The fast track (the owner's choice, Nov 17, 2026), for a child who already knows a skill.
// 1. The first five answers on a skill all right: the score goes straight to 90, the challenge zone.
// 2. A skill mastered without one miss earns a short test on the next skill of its ladder:
//    two questions at that skill's hardest level. Both right and the skill is passed without practising it.
// Pure functions.

export const FAST_RUN = 5;
export const SKIP_TEST_QUESTIONS = 2;
export const SKIPPED_SCORE = 80; // the same score the check-in gives a skill it places a child past

// Mastered, and never answered wrong on the way.
export function flawless(state: Pick<SkillState, 'masteredAt' | 'attempts' | 'correct'> | undefined): boolean {
  return state !== undefined && state.masteredAt !== null && state.attempts > 0 && state.attempts === state.correct;
}

// Whether a child opening this skill starts with the test: the skill is untouched, and the one before
// it on its ladder was mastered without a miss.
export function earnsSkipTest(state: SkillState | undefined, before: SkillState | undefined): boolean {
  const untouched = state === undefined || (state.attempts === 0 && state.score === 0 && !state.placedOut && state.masteredAt === null);
  return untouched && flawless(before);
}

// The skill's state once the test is passed: placed past it, exactly as the check-in would have.
// The two test answers leave no trace on the score, the streak or the "practised lately" date.
export function passedByTest(state: SkillState, nowIso: string): SkillState {
  return { ...state, score: SKIPPED_SCORE, bestScore: Math.max(state.bestScore, SKIPPED_SCORE), streak: 0, placedOut: true, lastPracticedAt: null, updatedAt: nowIso };
}

// A skill the child was placed past and has not practised since: there is nothing to pick up again.
export function isPlacedPast(state: Pick<SkillState, 'placedOut' | 'score' | 'lastPracticedAt' | 'masteredAt'> | undefined): boolean {
  return state !== undefined && state.placedOut && state.masteredAt === null && state.lastPracticedAt === null && state.score >= SKIPPED_SCORE;
}
