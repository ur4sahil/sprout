// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { KEEP_GOING_QUESTIONS, MIXED_QUESTIONS, NEW_QUESTIONS, nextPart, partPath, partSize, planProgress, todaysPlan } from '../../src/app/todaysPlan';
import { REVIEW_QUESTIONS } from '../../src/engine/review';
import type { TodayPick } from '../../src/engine/recommend';
import type { Attempt, Child, Session, SkillState } from '../../src/storage/schema';
import { defaultSettings, newSkillState } from '../../src/storage/schema';

// Today's plan (plan section 18).
const TODAY = '2026-03-09';
const NOW = `${TODAY}T16:30:00.000Z`;
const child = (change: Partial<Child['settings']> = {}): Child => ({ id: 'kid-1', name: 'Robin', avatar: '🐢', grade: 'K', settings: { ...defaultSettings('K'), ...change }, resetAt: null, levelWeeks: [], createdAt: NOW, updatedAt: NOW, deletedAt: null });
const going = (skillId: string, at = NOW): SkillState => ({ ...newSkillState('kid-1', skillId, NOW), attempts: 4, correct: 2, score: 30, lastPracticedAt: at });
let made = 0;
const answer = (skillId: string, sessionId = 's1', day = TODAY): Attempt => ({ id: `${skillId}-${(made += 1)}`, childId: 'kid-1', skillId, sessionId, level: 1, seed: 1, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: '', correct: '', given: '' }, correct: true, ms: 3000, scoreBefore: 0, scoreAfter: 0, kind: 'practice', day, createdAt: NOW });
const session = (id: string, mixed: boolean): Session => ({ id, childId: 'kid-1', kind: 'practice', skillId: null, startedAt: NOW, endedAt: null, questions: 1, correct: 1, day: TODAY, mixed });
const next = (skillId: string): TodayPick => ({ skillId, reason: 'next' });
const base = { today: TODAY, reviewsDue: [] as string[], attempts: [] as Attempt[], sessions: [] as Session[] };

describe("today's plan", () => {
  it('keeps going with skills in progress, adds one new skill, then the Mixed bag', () => {
    const plan = todaysPlan({ ...base, child: child(), states: [going('M-K-C1'), going('M-K-B1')], picks: [next('M-K-A1')] });
    expect(plan.map((part) => part.kind)).toEqual(['keepGoing', 'keepGoing', 'new', 'mixed']);
    expect(plan.find((part) => part.kind === 'new')).toMatchObject({ skillId: 'M-K-A1' });
    expect(partPath(plan[2] as never)).toBe('/skill/M-K-A1/learn');
  });

  it('follows the settings: how many to keep going with, and whether to add something new or the Mixed bag', () => {
    const plan = todaysPlan({ ...base, child: child({ planKeepGoing: 1, planNew: false, planMixed: false }), states: [going('M-K-C1'), going('M-K-B1')], picks: [next('M-K-A1')] });
    expect(plan.map((part) => part.kind)).toEqual(['keepGoing']);
  });

  it('ticks a part off once its answers are in, and Start goes to the first one not done', () => {
    const attempts = Array.from({ length: KEEP_GOING_QUESTIONS }, () => answer('M-K-C1'));
    const plan = todaysPlan({ ...base, child: child({ planKeepGoing: 2, planNew: false, planMixed: false }), states: [going('M-K-C1'), going('M-K-B1', '2026-03-08T10:00:00.000Z')], picks: [], attempts });
    expect(plan.map((part) => part.done)).toEqual([true, false]);
    expect(nextPart(plan)).toMatchObject({ kind: 'keepGoing', skillId: 'M-K-B1' });
  });

  it('the new skill stays the same all day once started, and ticks off after its answers', () => {
    const started = { ...going('M-K-A1'), attempts: NEW_QUESTIONS };
    const plan = todaysPlan({ ...base, child: child({ planKeepGoing: 0, planMixed: false }), states: [started], picks: [next('M-K-B1')], attempts: Array.from({ length: NEW_QUESTIONS }, () => answer('M-K-A1')) });
    expect(plan).toEqual([{ kind: 'new', skillId: 'M-K-A1', answered: NEW_QUESTIONS, done: true }]);
  });

  it('Mixed bag answers tick the Mixed bag, not the skills they were on', () => {
    const attempts = Array.from({ length: MIXED_QUESTIONS }, (_, i) => answer(i % 2 ? 'M-K-C1' : 'M-K-B1', 'mix'));
    const plan = todaysPlan({ ...base, child: child({ planNew: false }), states: [going('M-K-C1'), going('M-K-B1')], picks: [], attempts, sessions: [session('mix', true)] });
    expect(plan.find((part) => part.kind === 'mixed')).toMatchObject({ answered: MIXED_QUESTIONS, done: true });
    expect(plan.filter((part) => part.kind === 'keepGoing').every((part) => !part.done && part.answered === 0)).toBe(true);
  });

  it('shows Review while reviews are due, and ticks it once they are done today', () => {
    expect(todaysPlan({ ...base, child: child(), states: [], picks: [], reviewsDue: ['M-K-C4'] })[0]).toMatchObject({ kind: 'review', done: false });
    const reviewed = { ...answer('M-K-C4'), kind: 'review' as const };
    expect(todaysPlan({ ...base, child: child(), states: [], picks: [], attempts: [reviewed] })[0]).toMatchObject({ kind: 'review', done: true });
  });

  it('the goal is the plan\'s questions added up, counting only answers inside each part', () => {
    const plan = todaysPlan({ ...base, child: child(), states: [going('M-K-C1'), going('M-K-B1')], picks: [next('M-K-A1')] });
    expect(planProgress(plan)).toEqual({ done: 0, goal: KEEP_GOING_QUESTIONS * 2 + NEW_QUESTIONS + MIXED_QUESTIONS });
    // 12 answers on one skill count as 10; answers on a skill outside the plan do not count.
    // (C1 was practised yesterday too, so it is a skill to practice, not today's new skill.)
    const attempts = [answer('M-K-C1', 's0', '2026-03-08'), ...Array.from({ length: 12 }, () => answer('M-K-C1')), answer('M-K-Z9')];
    const later = todaysPlan({ ...base, child: child(), states: [going('M-K-C1'), going('M-K-B1')], picks: [next('M-K-A1')], attempts });
    expect(planProgress(later).done).toBe(KEEP_GOING_QUESTIONS);
  });

  it('a part ticked off early counts in full, so a finished plan reaches its goal', () => {
    const mastered = { ...going('M-K-C1'), score: 100, masteredAt: NOW };
    const plan = todaysPlan({ ...base, child: child({ planKeepGoing: 1, planNew: false, planMixed: false }), states: [mastered], picks: [], attempts: [answer('M-K-C1')] });
    expect(plan[0]).toMatchObject({ done: true, answered: 1 });
    expect(planProgress(plan)).toEqual({ done: KEEP_GOING_QUESTIONS, goal: KEEP_GOING_QUESTIONS });
  });

  it('a review asks its questions on each skill, without counting a half-reviewed skill twice', () => {
    const due = (answered: number, skillIds: string[]) => ({ kind: 'review' as const, skillIds, answered, done: skillIds.length === 0 });
    expect(partSize(due(0, ['a', 'b']))).toBe(2 * REVIEW_QUESTIONS);
    expect(partSize(due(1, ['a', 'b']))).toBe(2 * REVIEW_QUESTIONS); // "a" is under way and still due
    expect(partSize(due(REVIEW_QUESTIONS, ['b']))).toBe(2 * REVIEW_QUESTIONS);
    expect(partSize(due(2 * REVIEW_QUESTIONS, []))).toBe(2 * REVIEW_QUESTIONS);
  });
});
