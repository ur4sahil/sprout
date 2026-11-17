import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/content/catalogue';
import { LADDERS } from '../../src/content/ladders';
import { FAST_RUN, SKIPPED_SCORE, earnsSkipTest, flawless, isPlacedPast, passedByTest } from '../../src/engine/fastTrack';
import { recommend } from '../../src/engine/recommend';
import { applyPractice } from '../../src/engine/skillscore';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

const NOW = '2026-03-09T15:00:00.000Z';
const fresh = (skillId = 'M-K-C4'): SkillState => newSkillState('kid', skillId, NOW);
const answer = (state: SkillState, right: boolean[]): SkillState => right.reduce((s, correct) => applyPractice(s, correct, false, NOW).state, state);

describe('the fast track: five right from the start', () => {
  it('takes the score straight to 90, and mastery then takes five more', () => {
    const scores: number[] = [];
    let state = fresh();
    for (let i = 0; i < 10; i += 1) {
      state = applyPractice(state, true, false, NOW).state;
      scores.push(state.score);
    }
    expect(scores).toEqual([10, 20, 31, 41, 90, 92, 94, 96, 98, 100]);
    expect(state.masteredAt).toBe(NOW);
  });

  it('shows every milestone it passes on the way up', () => {
    const fourth = answer(fresh(), [true, true, true, true]);
    expect(applyPractice(fourth, true, false, NOW).milestones).toEqual([50, 80, 90]);
  });

  it('does not apply after a miss, however long the run that follows', () => {
    const state = answer(fresh(), [false, true, true, true, true, true]);
    expect(state.score).toBe(52);
    expect(answer(fresh(), [true, true, true, true, false]).score).toBeLessThan(50);
    // Five right later on, after the first five answers, is ordinary practice.
    expect(answer(fresh(), [true, false, true, true, true, true, true]).score).toBeLessThan(90);
  });

  it('applies once, on the fifth answer only', () => {
    expect(FAST_RUN).toBe(5);
    expect(answer(fresh(), [true, true, true, true]).score).toBe(41);
  });
});

describe('the short test on the next skill', () => {
  const mastered = (attempts: number, correct: number): SkillState => ({ ...fresh('M-K-C3'), score: 100, masteredAt: NOW, attempts, correct });

  it('is earned by mastering the skill before without one miss', () => {
    expect(flawless(mastered(10, 10))).toBe(true);
    expect(flawless(mastered(12, 11))).toBe(false);
    expect(flawless({ ...fresh(), attempts: 4, correct: 4 })).toBe(false); // not mastered yet
    expect(flawless(undefined)).toBe(false);
    expect(earnsSkipTest(undefined, mastered(10, 10))).toBe(true);
    expect(earnsSkipTest(fresh(), mastered(10, 10))).toBe(true);
    expect(earnsSkipTest(fresh(), mastered(12, 11))).toBe(false);
    expect(earnsSkipTest(fresh(), undefined)).toBe(false);
  });

  it('is only for a skill the child has not touched', () => {
    expect(earnsSkipTest({ ...fresh(), attempts: 1 }, mastered(10, 10))).toBe(false);
    expect(earnsSkipTest({ ...fresh(), score: 80, placedOut: true }, mastered(10, 10))).toBe(false);
  });

  it('passing places the child past the skill, as the check-in would, and leaves no practice behind', () => {
    const two = answer(fresh(), [true, true]);
    const passed = passedByTest(two, NOW);
    expect(passed).toMatchObject({ score: SKIPPED_SCORE, bestScore: SKIPPED_SCORE, placedOut: true, lastPracticedAt: null, masteredAt: null, streak: 0, attempts: 2, correct: 2 });
    expect(isPlacedPast(passed)).toBe(true);
    // Practising it later makes it an ordinary skill in progress again.
    expect(isPlacedPast(applyPractice(passed, true, false, NOW).state)).toBe(false);
    expect(isPlacedPast(fresh())).toBe(false);
  });

  it('a skill passed by the test is not picked again: the next one on the ladder is', () => {
    const ladder = LADDERS.find((each) => each.id === 'add-subtract')!;
    const [first, second, third] = ladder.skillIds as [string, string, string];
    const states: SkillState[] = [
      { ...fresh(first), score: 100, masteredAt: NOW, attempts: 10, correct: 10 },
      passedByTest(answer(fresh(second), [true, true]), NOW),
    ];
    const picks = recommend({
      childId: 'kid', grade: 'K', nowIso: '2026-03-10T15:00:00.000Z', skills: CATALOGUE, ladders: [ladder], states, plans: [],
      placements: { 'add-subtract': first }, attemptsLast14Days: {}, lastSessionSkillId: null, canListen: true, isListenNext: () => false, hasGenerator: () => true,
    });
    expect(picks.map((pick) => pick.skillId)).toEqual([third]);
  });
});
