// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { KEEP_GOING_QUESTIONS, MIXED_QUESTIONS, NEW_QUESTIONS, moreAfter, nextPart, partPath, partRunPath, partSize, planProgress, todaysPlan } from '../../src/app/todaysPlan';
import type { PlanPart } from '../../src/app/todaysPlan';
import { REVIEW_QUESTIONS } from '../../src/engine/review';
import type { TodayPick } from '../../src/engine/recommend';
import type { Attempt, Child, Session, SkillState } from '../../src/storage/schema';
import { defaultSettings, newSkillState } from '../../src/storage/schema';

// Today's plan (plan section 18).
const TODAY = '2026-03-09';
const NOW = `${TODAY}T16:30:00.000Z`;
const child = (change: Partial<Child['settings']> = {}): Child => ({ id: 'kid-1', name: 'Robin', avatar: '🐢', grade: 'K', settings: { ...defaultSettings('K'), ...change }, resetAt: null, levelWeeks: [], storiesRead: [], stickersPlaced: [], createdAt: NOW, updatedAt: NOW, deletedAt: null });
const going = (skillId: string, at = NOW): SkillState => ({ ...newSkillState('kid-1', skillId, NOW), attempts: 4, correct: 2, score: 30, lastPracticedAt: at });
let made = 0;
const answer = (skillId: string, sessionId = 's1', day = TODAY): Attempt => ({ id: `${skillId}-${(made += 1)}`, childId: 'kid-1', skillId, sessionId, level: 1, seed: 1, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: '', correct: '', given: '' }, correct: true, hinted: false, ms: 3000, scoreBefore: 0, scoreAfter: 0, kind: 'practice', day, createdAt: NOW });
const session = (id: string, mixed: boolean): Session => ({ id, childId: 'kid-1', kind: 'practice', skillId: null, startedAt: NOW, endedAt: null, questions: 1, correct: 1, day: TODAY, mixed });
const next = (skillId: string): TodayPick => ({ skillId, reason: 'next' });
const base = { today: TODAY, reviewsDue: [] as string[], attempts: [] as Attempt[], sessions: [] as Session[] };

describe("today's plan", () => {
  it('one Practice skill for each subject, then one new skill, then the Mixed bag', () => {
    const plan = todaysPlan({ ...base, child: child(), states: [going('M-K-C1'), going('M-K-B1'), going('E-K-B1')], picks: [next('M-K-A1'), next('R-A1')] });
    expect(plan.map((part) => part.kind)).toEqual(['keepGoing', 'keepGoing', 'keepGoing', 'new', 'mixed']);
    // Math has two skills in progress: only one is today's Math practice. Reasoning has none, so it is Sprout's next pick.
    expect(plan.filter((part) => part.kind === 'keepGoing').map((part) => [part.subject, part.skillId])).toEqual([['math', 'M-K-C1'], ['ela', 'E-K-B1'], ['reasoning', 'R-A1']]);
    expect(plan.find((part) => part.kind === 'new')).toMatchObject({ skillId: 'M-K-A1' });
    expect(partPath(plan[3] as never)).toBe('/skill/M-K-A1/learn');
  });

  it('a skill practised today stays its subject\'s Practice skill, so the row does not change under the child', () => {
    const attempts = [answer('M-K-B1', 's0', '2026-03-08'), answer('M-K-B1')];
    const plan = todaysPlan({ ...base, child: child({ planNew: false, planMixed: false }), states: [going('M-K-C1'), going('M-K-B1', '2026-03-01T10:00:00.000Z')], picks: [], attempts });
    expect(plan.find((part) => part.kind === 'keepGoing' && part.subject === 'math')).toMatchObject({ skillId: 'M-K-B1', answered: 1 });
  });

  it('follows the settings: which subjects to practice, and whether to add something new or the Mixed bag', () => {
    const plan = todaysPlan({ ...base, child: child({ planPractice: ['ela'], planNew: false, planMixed: false }), states: [going('M-K-C1'), going('E-K-B1')], picks: [next('M-K-A1')] });
    expect(plan).toMatchObject([{ kind: 'keepGoing', subject: 'ela', skillId: 'E-K-B1' }]);
  });

  it('ticks a part off once its answers are in, and Start goes to the first one not done', () => {
    const attempts = [answer('M-K-C1', 's0', '2026-03-08'), ...Array.from({ length: KEEP_GOING_QUESTIONS }, () => answer('M-K-C1'))];
    const plan = todaysPlan({ ...base, child: child({ planPractice: ['math', 'ela'], planNew: false, planMixed: false }), states: [going('M-K-C1'), going('E-K-B1')], picks: [], attempts });
    expect(plan.map((part) => part.done)).toEqual([true, false]);
    expect(nextPart(plan)).toMatchObject({ kind: 'keepGoing', skillId: 'E-K-B1' });
  });

  it('the Mixed bag is open with one topic practised (another fills in), but it is extra practice: not in the goal, and Start skips it', () => {
    const plan = todaysPlan({ ...base, child: child({ planPractice: ['math'], planNew: false }), states: [going('M-K-C1')], picks: [] });
    expect(plan.map((part) => part.kind)).toEqual(['keepGoing', 'mixed']);
    expect(plan[1]).toMatchObject({ locked: false, done: false });
    expect(planProgress(plan).goal).toBe(KEEP_GOING_QUESTIONS);
    const finished = todaysPlan({ ...base, child: child({ planPractice: ['math'], planNew: false }), states: [going('M-K-C1')], picks: [], attempts: [answer('M-K-C1', 's0', '2026-03-08'), ...Array.from({ length: KEEP_GOING_QUESTIONS }, () => answer('M-K-C1'))] });
    expect(nextPart(finished)).toBeNull(); // the plan is done; the Mixed bag stays there as extra practice
  });

  it('the Mixed bag stays open after every practised skill reached 100 (Nov 19, 2026)', () => {
    const mastered = [{ ...going('M-K-C1'), score: 100 }, { ...going('M-K-B1'), score: 100 }];
    const plan = todaysPlan({ ...base, child: child({ planPractice: [], planNew: false }), states: mastered, picks: [] });
    expect(plan).toEqual([{ kind: 'mixed', answered: 0, size: 10, done: false, locked: false }]); // two topics: 5 each
  });

  it('the new skill stays the same all day once started, and ticks off after its answers', () => {
    const started = { ...going('M-K-A1'), attempts: NEW_QUESTIONS };
    const plan = todaysPlan({ ...base, child: child({ planPractice: [], planMixed: false }), states: [started], picks: [next('M-K-B1')], attempts: Array.from({ length: NEW_QUESTIONS }, () => answer('M-K-A1')) });
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
    const plan = todaysPlan({ ...base, child: child(), states: [going('M-K-C1'), going('E-K-B1')], picks: [next('M-K-A1'), next('R-A1')] });
    expect(planProgress(plan)).toEqual({ done: 0, goal: KEEP_GOING_QUESTIONS * 3 + NEW_QUESTIONS }); // the Mixed bag is extra practice, not in the goal
    // 12 answers on one skill count as 10; answers on a skill outside the plan do not count.
    // (C1 was practised yesterday too, so it is a skill to practice, not today's new skill.)
    const attempts = [answer('M-K-C1', 's0', '2026-03-08'), ...Array.from({ length: 12 }, () => answer('M-K-C1')), answer('M-K-Z9')];
    const later = todaysPlan({ ...base, child: child(), states: [going('M-K-C1'), going('E-K-B1')], picks: [next('M-K-A1'), next('R-A1')], attempts });
    expect(planProgress(later).done).toBe(KEEP_GOING_QUESTIONS);
  });

  it('a part ticked off early counts in full, so a finished plan reaches its goal', () => {
    const mastered = { ...going('M-K-C1'), score: 100, masteredAt: NOW };
    const plan = todaysPlan({ ...base, child: child({ planPractice: ['math'], planNew: false, planMixed: false }), states: [mastered], picks: [], attempts: [answer('M-K-C1')] });
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

  it('the Mixed bag card counts what the bag asks: 5 for each topic, up to 20 (Nov 21, 2026)', () => {
    const four = [going('M-K-C1'), going('M-K-B1'), going('M-K-A1'), going('E-K-B1')];
    expect(todaysPlan({ ...base, child: child({ planPractice: [], planNew: false }), states: four, picks: [] })[0]).toMatchObject({ kind: 'mixed', size: MIXED_QUESTIONS });
  });

  it('a run goes into each part with the answers it still needs', () => {
    expect(partRunPath({ kind: 'keepGoing', subject: 'math', skillId: 'M-K-C1', answered: 3, done: false })).toBe('/skill/M-K-C1?run=7');
    expect(partRunPath({ kind: 'new', skillId: 'M-K-A1', answered: 0, done: false })).toBe(`/skill/M-K-A1/learn?run=${NEW_QUESTIONS}`);
    expect(partRunPath({ kind: 'review', skillIds: ['M-K-C4'], answered: 0, done: false })).toBe('/review?run=1');
  });

  it("a run goes on after a skill's part while another part is not done; the Mixed bag does not count (Nov 22, 2026)", () => {
    const keep = (skillId: string, done = false): PlanPart => ({ kind: 'keepGoing', subject: skillId.startsWith('E') ? 'ela' : 'math', skillId, answered: 0, done });
    const bag: PlanPart = { kind: 'mixed', answered: 0, size: 10, done: false, locked: false };
    expect(moreAfter([keep('M-K-C1'), keep('E-K-B1')], 'M-K-C1')).toBe(true);
    expect(moreAfter([keep('M-K-C1'), { kind: 'new', skillId: 'M-K-A1', answered: 0, done: false }], 'M-K-C1')).toBe(true);
    // A review left undone is still ahead of the run.
    expect(moreAfter([{ kind: 'review', skillIds: ['M-K-B1'], answered: 0, done: false }, keep('M-K-C1')], 'M-K-C1')).toBe(true);
    // The skill's own part, whether the medal has ticked it yet or not, is never "more".
    expect(moreAfter([keep('M-K-C1')], 'M-K-C1')).toBe(false);
    expect(moreAfter([keep('M-K-C1', true)], 'M-K-C1')).toBe(false);
    expect(moreAfter([keep('M-K-C1'), keep('E-K-B1', true)], 'M-K-C1')).toBe(false);
    // Start never goes into the Mixed bag, so the plan ends without it.
    expect(moreAfter([keep('M-K-C1'), bag], 'M-K-C1')).toBe(false);
    // Each part agrees with where /play goes next once this part is ticked off.
    const plan = [keep('M-K-C1', true), keep('E-K-B1'), bag];
    expect(moreAfter(plan, 'M-K-C1')).toBe(nextPart(plan) !== null);
  });
});

