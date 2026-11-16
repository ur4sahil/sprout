// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyReview, dueForReview, isReviewDue, reviewLevel, scheduleFirstReview } from '../../src/engine/review';
import { daysBetween, localDayOf } from '../../src/lib/clock';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

// Local times, so the tests mean the same thing in any time zone.
const at = (y: number, m: number, d: number, h: number, min = 0): string => new Date(y, m - 1, d, h, min).toISOString();

function mastered(change: Partial<SkillState> = {}): SkillState {
  const when = at(2026, 3, 2, 17);
  return { ...newSkillState('child', 'M-K-C4', when), score: 100, bestScore: 100, masteredAt: when, ...scheduleFirstReview(when), ...change };
}

describe('review dates', () => {
  it('a skill mastered at 5 pm on Monday can be reviewed at 9 am on Wednesday, not on Tuesday', () => {
    const state = mastered(); // Monday 2 March 2026, 5 pm
    expect(isReviewDue(state, at(2026, 3, 3, 23, 59))).toBe(false);
    expect(isReviewDue(state, at(2026, 3, 4, 0, 1))).toBe(true);
    expect(isReviewDue(state, at(2026, 3, 4, 9))).toBe(true);
    expect(isReviewDue(state, at(2026, 3, 9, 9))).toBe(true);
  });

  it('is never due when the skill is not mastered or has no date', () => {
    expect(isReviewDue(mastered({ masteredAt: null }), at(2027, 1, 1, 9))).toBe(false);
    expect(isReviewDue(mastered({ reviewDueAt: null }), at(2027, 1, 1, 9))).toBe(false);
  });

  it('a review session takes up to 4 due skills, the longest overdue first', () => {
    const states = [5, 1, 3, 2, 4, 9].map((offset, i) =>
      mastered({ skillId: `S-${i}`, reviewDueAt: at(2026, 3, offset, 12) }),
    );
    const due = dueForReview(states, at(2026, 3, 6, 9));
    expect(due.map((state) => state.skillId)).toEqual(['S-1', 'S-3', 'S-2', 'S-4']);
    expect(dueForReview(states, at(2026, 2, 1, 9))).toEqual([]);
  });

  it('asks at level 3, or the skill\'s top level when that is lower', () => {
    expect([1, 2, 3, 4].map((max) => reviewLevel(max as 1 | 2 | 3 | 4))).toEqual([1, 2, 3, 3]);
  });
});

describe('applyReview', () => {
  const today = at(2026, 3, 4, 9);

  it('3 right moves up one box and sets the next date by that box: 5, 12, 30, 60 days', () => {
    let state = mastered();
    const gaps: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const result = applyReview(state, 3, today);
      expect(result.passed).toBe(true);
      state = result.state;
      gaps.push(daysBetween(today, state.reviewDueAt as string));
    }
    expect(gaps).toEqual([5, 12, 30, 60, 60, 60]);
    expect(state.reviewBox).toBe(4);
    expect(state.score).toBe(100);
    expect(state.masteredAt).not.toBeNull();
  });

  it('2 right stays in the box, due again after that box\'s interval', () => {
    const result = applyReview(mastered({ reviewBox: 2 }), 2, today);
    expect(result.passed).toBe(true);
    expect(result.state.reviewBox).toBe(2);
    expect(daysBetween(today, result.state.reviewDueAt as string)).toBe(12);
    expect(localDayOf(result.state.reviewDueAt as string)).toBe('2026-03-16');
  });

  it('0 or 1 right drops to 85, takes the medal, and returns to box 0 with no date', () => {
    for (const right of [0, 1]) {
      const { state, passed } = applyReview(mastered({ reviewBox: 4 }), right, today);
      expect(passed).toBe(false);
      expect(state).toMatchObject({ score: 85, masteredAt: null, reviewBox: 0, reviewDueAt: null, bestScore: 100 });
    }
  });

  it('refuses a count that is not 0 to 3', () => {
    for (const right of [-1, 4, 1.5, Number.NaN]) expect(() => applyReview(mastered(), right, today)).toThrow();
  });

  it('review answers never touch the practice counts', () => {
    const before = mastered({ attempts: 15, correct: 15, recent: [true, true, true] });
    const { state } = applyReview(before, 3, today);
    expect(state.attempts).toBe(15);
    expect(state.correct).toBe(15);
    expect(state.recent).toEqual([true, true, true]);
  });
});
