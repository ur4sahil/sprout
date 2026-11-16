// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../src/engine/rng';
import { applyReview } from '../../src/engine/review';
import { applyAnswer, applyPractice, lastWasMiss, levelToAsk, stageLevel, stageOf } from '../../src/engine/skillscore';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

const NOW = '2026-03-02T15:00:00.000Z';

function state(change: Partial<SkillState> = {}): SkillState {
  return { ...newSkillState('child', 'M-K-C4', NOW), ...change };
}

describe('applyAnswer: the table in the plan', () => {
  const rows: [number, number, boolean, 'any' | 'standard' | 'gentle', number, number, boolean?][] = [
    [0, 0, true, 'any', 10, 1],
    [10, 1, true, 'any', 20, 2],
    [20, 2, true, 'any', 31, 3],
    [31, 3, true, 'any', 41, 4],
    [41, 4, true, 'any', 52, 5],
    [86, 6, true, 'any', 90, 7],
    [92, 5, true, 'any', 94, 6],
    [98, 3, true, 'any', 100, 4, true],
    [85, 4, false, 'standard', 77, 0],
    [85, 4, false, 'gentle', 81, 0],
    [93, 2, false, 'gentle', 89, 0],
    [1, 0, false, 'standard', 0, 0],
  ];
  it.each(rows)('%i with streak %i, correct %s, %s -> %i with streak %i', (score, streak, correct, mode, after, streakAfter, mastered) => {
    const modes = mode === 'any' ? [true, false] : [mode === 'gentle'];
    for (const gentle of modes) {
      const result = applyAnswer({ score, streak, masteredAt: null }, correct, gentle);
      expect(result).toEqual({ score: after, streak: streakAfter, mastered: mastered ?? false });
    }
  });

  it('100 and mastered, wrong, standard -> 100 with streak 0', () => {
    expect(applyAnswer({ score: 100, streak: 2, masteredAt: NOW }, false, false)).toEqual({ score: 100, streak: 0, mastered: false });
    expect(applyAnswer({ score: 100, streak: 2, masteredAt: NOW }, true, false)).toEqual({ score: 100, streak: 3, mastered: false });
  });
});

describe('applyAnswer: every band', () => {
  it('gains and losses follow the table at each band edge', () => {
    const cases: [number, number, number, number][] = [
      // score, gain, loss, gentle loss
      [0, 10, 2, 1],
      [29, 10, 2, 1],
      [30, 8, 4, 2],
      [49, 8, 4, 2],
      [50, 6, 6, 3],
      [69, 6, 6, 3],
      [70, 5, 7, 4],
      [79, 5, 7, 4],
      [80, 4, 8, 4],
      [89, 4, 8, 4],
      [90, 2, 8, 4],
      [99, 2, 8, 4],
    ];
    for (const [score, gain, loss, gentleLoss] of cases) {
      const up = applyAnswer({ score, streak: 0, masteredAt: null }, true, false).score;
      const cap = score < 90 ? 90 : 100;
      expect(up, `gain at ${score}`).toBe(Math.min(cap, score + gain));
      expect(applyAnswer({ score, streak: 0, masteredAt: null }, false, false).score, `loss at ${score}`).toBe(Math.max(0, score - loss));
      expect(applyAnswer({ score, streak: 0, masteredAt: null }, false, true).score, `gentle loss at ${score}`).toBe(Math.max(0, score - gentleLoss));
    }
  });

  it('the streak bonus is 0, 0, 1, 2, 3, 3 and never applies in the challenge zone', () => {
    const bonus = (streak: number, score = 0): number => applyAnswer({ score, streak, masteredAt: null }, true, false).score - score - 10;
    expect([0, 1, 2, 3, 4, 5, 20].map((streak) => bonus(streak))).toEqual([0, 0, 1, 2, 3, 3, 3]);
    expect(applyAnswer({ score: 90, streak: 9, masteredAt: null }, true, false).score).toBe(92);
    expect(applyAnswer({ score: 98, streak: 9, masteredAt: null }, true, false).score).toBe(100);
  });

  it('a gain from below 90 never lands above 90', () => {
    for (let score = 80; score < 90; score += 1) {
      for (let streak = 0; streak < 8; streak += 1) {
        expect(applyAnswer({ score, streak, masteredAt: null }, true, false).score).toBeLessThanOrEqual(90);
      }
    }
    expect(applyAnswer({ score: 89, streak: 9, masteredAt: null }, true, false)).toEqual({ score: 90, streak: 10, mastered: false });
  });

  it('fifteen correct answers in a row from 0 reach exactly 100, and fourteen do not', () => {
    let s = { score: 0, streak: 0, masteredAt: null as string | null };
    const path: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const result = applyAnswer(s, true, false);
      path.push(result.score);
      s = { score: result.score, streak: result.streak, masteredAt: null };
    }
    expect(path).toEqual([10, 20, 31, 41, 52, 61, 70, 78, 86, 90, 92, 94, 96, 98, 100]);
    expect(path[13]).toBeLessThan(100);
  });

  it('no run of 1,000 seeded random answers ever leaves 0 to 100', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const gentle of [true, false]) {
        const rng = makeRng(seed);
        let s = state();
        for (let i = 0; i < 1000; i += 1) {
          s = applyPractice(s, rng.bool(seed === 5 ? 0.2 : 0.55), gentle, NOW).state;
          expect(Number.isInteger(s.score)).toBe(true);
          expect(s.score).toBeGreaterThanOrEqual(0);
          expect(s.score).toBeLessThanOrEqual(100);
          expect(s.bestScore).toBeGreaterThanOrEqual(s.score);
          expect(s.recent.length).toBeLessThanOrEqual(10);
          if (s.masteredAt !== null) expect(s.score).toBe(100);
        }
      }
    }
  });
});

describe('applyPractice', () => {
  it('counts the answer and keeps the last 10 results, newest last', () => {
    let s = state();
    const answers = [true, true, false, true, true, true, false, true, true, true, true, false];
    for (const answer of answers) s = applyPractice(s, answer, false, NOW).state;
    expect(s.attempts).toBe(12);
    expect(s.correct).toBe(9);
    expect(s.recent).toEqual(answers.slice(-10));
    expect(s.lastPracticedAt).toBe(NOW);
    expect(s.streak).toBe(0);
  });

  it('a child who drops from 82 to 77 and climbs back past 80 crosses the 80 milestone once', () => {
    let s = state({ score: 78, bestScore: 78, streak: 0, attempts: 9 });
    const crossed: number[] = [];
    const step = (correct: boolean): void => {
      const result = applyPractice(s, correct, false, NOW);
      crossed.push(...result.milestones);
      s = result.state;
    };
    step(true); // 83
    expect(s.score).toBe(83);
    step(false); // 75
    expect(s.score).toBe(75);
    step(true); // 80
    step(true); // back past 80
    expect(s.score).toBeGreaterThan(80);
    expect(crossed.filter((mark) => mark === 80)).toHaveLength(1);
    expect(s.bestScore).toBe(Math.max(83, s.score));
  });

  it('one answer can cross more than one milestone, and each is reported once', () => {
    const result = applyPractice(state({ score: 86, bestScore: 40, streak: 6 }), true, false, NOW);
    expect(result.state.score).toBe(90);
    expect(result.milestones).toEqual([50, 80, 90]);
  });

  it('a placed-out skill does not celebrate 50 or 80 again', () => {
    const placed = state({ score: 80, bestScore: 80, placedOut: true });
    const result = applyPractice(placed, true, false, NOW);
    expect(result.milestones).toEqual([]);
  });

  it('reaching 100 sets masteredAt and schedules the first review in 2 days', () => {
    const result = applyPractice(state({ score: 98, bestScore: 98, streak: 3 }), true, false, NOW);
    expect(result.mastered).toBe(true);
    expect(result.milestones).toEqual([100]);
    expect(result.state.masteredAt).toBe(NOW);
    expect(result.state.reviewBox).toBe(0);
    expect(result.state.reviewDueAt).toBe('2026-03-04T15:00:00.000Z');
  });

  it('after mastery, extra practice never lowers the score or the review date', () => {
    const mastered = applyPractice(state({ score: 98, bestScore: 98, streak: 3 }), true, false, NOW).state;
    let s = mastered;
    for (let i = 0; i < 20; i += 1) s = applyPractice(s, false, false, '2026-03-03T15:00:00.000Z').state;
    expect(s.score).toBe(100);
    expect(s.masteredAt).toBe(NOW);
    expect(s.reviewDueAt).toBe(mastered.reviewDueAt);
    expect(s.attempts).toBe(mastered.attempts + 20);
  });

  it('a failed review of a mastered skill gives 85, no medal and box 0', () => {
    const mastered = state({ score: 100, bestScore: 100, masteredAt: NOW, reviewBox: 3, reviewDueAt: NOW });
    const { state: after, passed } = applyReview(mastered, 1, '2026-04-01T15:00:00.000Z');
    expect(passed).toBe(false);
    expect(after.score).toBe(85);
    expect(after.masteredAt).toBeNull();
    expect(after.reviewBox).toBe(0);
    expect(after.reviewDueAt).toBeNull();
    expect(after.bestScore).toBe(100);
    // Back in normal practice, the score moves again.
    expect(applyPractice(after, false, false, NOW).state.score).toBe(77);
    // Mastering it again does not celebrate 100 twice.
    expect(applyPractice({ ...after, score: 98 }, true, false, NOW).milestones).toEqual([]);
  });
});

describe('stages and levels', () => {
  it('names the six stages', () => {
    expect(stageOf(0, 0)).toBe('notStarted');
    expect(stageOf(0, 3)).toBe('gettingStarted');
    expect(stageOf(39, 5)).toBe('gettingStarted');
    expect(stageOf(40, 5)).toBe('practising');
    expect(stageOf(79, 5)).toBe('practising');
    expect(stageOf(80, 5)).toBe('proficient');
    expect(stageOf(80, 0, true)).toBe('proficient');
    expect(stageOf(89, 5)).toBe('proficient');
    expect(stageOf(90, 5)).toBe('challenge');
    expect(stageOf(99, 5)).toBe('challenge');
    expect(stageOf(100, 15)).toBe('mastered');
  });

  it('asks level 1, 2, 3, 3, 4, 4 by score', () => {
    expect([0, 39, 40, 69, 70, 79, 80, 89, 90, 99, 100].map(stageLevel)).toEqual([1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4]);
  });

  it('goes one level easier straight after a miss, never below 1', () => {
    expect(levelToAsk(95, false, 4)).toBe(4);
    expect(levelToAsk(95, true, 4)).toBe(3);
    expect(levelToAsk(50, true, 4)).toBe(1);
    expect(levelToAsk(10, true, 4)).toBe(1);
  });

  it('a skill with maxLevel 2 is never asked at level 3', () => {
    for (let score = 0; score <= 100; score += 1) {
      for (const afterMiss of [true, false]) {
        expect(levelToAsk(score, afterMiss, 2)).toBeLessThanOrEqual(2);
        expect(levelToAsk(score, afterMiss, 1)).toBe(1);
      }
    }
    expect(levelToAsk(100, true, 2)).toBe(2);
  });

  it('knows whether the latest answer was a miss', () => {
    expect(lastWasMiss({ recent: [] })).toBe(false);
    expect(lastWasMiss({ recent: [false, true] })).toBe(false);
    expect(lastWasMiss({ recent: [true, false] })).toBe(true);
  });
});
