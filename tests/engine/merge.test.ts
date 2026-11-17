// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { addOnly, isDead, laterWins, mergeChild, mergeSkillState, recount } from '../../src/engine/merge';
import { applyPractice } from '../../src/engine/skillscore';
import type { Attempt, Child, SkillState } from '../../src/storage/schema';
import { defaultSettings, newSkillState } from '../../src/storage/schema';

const T = (n: number): string => `2026-03-${String(n).padStart(2, '0')}T12:00:00.000Z`;

function attempt(id: string, correct: boolean, createdAt: string, change: Partial<Attempt> = {}): Attempt {
  return {
    id,
    childId: 'kid',
    skillId: 'M-K-C4',
    sessionId: 's',
    level: 1,
    seed: 1,
    itemType: 'choice',
    response: { index: 0 },
    contentVersion: 1,
    snapshot: { prompt: 'p', correct: 'c', given: 'g' },
    correct,
    ms: 1000,
    scoreBefore: 0,
    scoreAfter: 0,
    kind: 'practice',
    day: createdAt.slice(0, 10),
    createdAt,
    ...change,
  };
}

// Practises on one device and returns its skill state and attempt log.
function device(start: SkillState, answers: boolean[], day: number, prefix: string): { state: SkillState; attempts: Attempt[] } {
  let state = start;
  const attempts: Attempt[] = [];
  answers.forEach((correct, i) => {
    const at = `2026-03-${String(day).padStart(2, '0')}T12:${String(i).padStart(2, '0')}:00.000Z`;
    state = applyPractice(state, correct, false, at).state;
    attempts.push(attempt(`${prefix}-${i}`, correct, at));
  });
  return { state, attempts };
}

describe('mergeSkillState', () => {
  it('two copies of a skill state keep both devices\' answer counts', () => {
    const shared = device(newSkillState('kid', 'M-K-C4', T(1)), [true, true, false], 1, 'shared');
    const ipadA = device(shared.state, [true, true, true, false], 2, 'a'); // 4 more answers
    const ipadB = device(shared.state, [false, true, true, true, true], 3, 'b'); // 5 more answers, later
    const log = addOnly([...shared.attempts, ...ipadA.attempts], [...shared.attempts, ...ipadB.attempts], (row) => row.id).merged;
    expect(log).toHaveLength(12);

    const onA = mergeSkillState(ipadA.state, ipadB.state, log);
    const onB = mergeSkillState(ipadB.state, ipadA.state, log);
    // Both iPads end with the same skill state.
    expect(onA).toEqual(onB);
    // Neither lost the other's answers.
    expect(onA.attempts).toBe(12);
    expect(onA.correct).toBe(2 + 3 + 4);
    expect(onA.recent).toEqual([false, true, true, true, false, false, true, true, true, true]);
    // The most recent practice wins for the score.
    expect(onA.score).toBe(ipadB.state.score);
    expect(onA.streak).toBe(ipadB.state.streak);
    expect(onA.lastPracticedAt).toBe(ipadB.state.lastPracticedAt);
  });

  it('takes score, streak, mastery and review from the copy practised later', () => {
    const older: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 100, bestScore: 100, masteredAt: T(2), reviewBox: 2, reviewDueAt: T(20), lastPracticedAt: T(2), updatedAt: T(2) };
    const newer: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 85, bestScore: 100, masteredAt: null, reviewBox: 0, reviewDueAt: null, lastPracticedAt: T(9), updatedAt: T(9), streak: 3 };
    for (const merged of [mergeSkillState(older, newer), mergeSkillState(newer, older)]) {
      expect(merged).toMatchObject({ score: 85, masteredAt: null, reviewBox: 0, reviewDueAt: null, streak: 3, lastPracticedAt: T(9) });
    }
  });

  it('bestScore is the higher of the two, and placedOut is true if either says so', () => {
    const a: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 40, bestScore: 95, lastPracticedAt: T(5), updatedAt: T(5) };
    const b: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 80, bestScore: 80, placedOut: true, lastPracticedAt: null, updatedAt: T(3) };
    for (const merged of [mergeSkillState(a, b), mergeSkillState(b, a)]) {
      expect(merged.bestScore).toBe(95);
      expect(merged.placedOut).toBe(true);
      expect(merged.score).toBe(40); // a was practised, b never was
      expect(merged.updatedAt).toBe(T(5));
    }
  });

  it('keeps the higher bestScore even when it sits on the copy that loses', () => {
    const olderButBest: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 60, bestScore: 97, lastPracticedAt: T(2), updatedAt: T(2) };
    const newer: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 40, bestScore: 70, lastPracticedAt: T(8), updatedAt: T(8) };
    for (const merged of [mergeSkillState(olderButBest, newer), mergeSkillState(newer, olderButBest)]) {
      expect(merged.score).toBe(40);
      expect(merged.bestScore).toBe(97);
    }
  });

  it('a copy that was never practised loses to one that was, and a tie goes to the later update', () => {
    const never: SkillState = { ...newSkillState('kid', 'S', T(9)), score: 80, placedOut: true };
    const practised: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 30, lastPracticedAt: T(2), updatedAt: T(2) };
    expect(mergeSkillState(never, practised).score).toBe(30);
    const x: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 10, updatedAt: T(4) };
    const y: SkillState = { ...newSkillState('kid', 'S', T(1)), score: 20, updatedAt: T(6) };
    expect(mergeSkillState(x, y).score).toBe(20);
    expect(mergeSkillState(y, x).score).toBe(20);
  });
});

describe('recount', () => {
  it('counts only this child\'s practice answers for this skill, in time order', () => {
    const log = [
      attempt('3', true, T(3)),
      attempt('1', false, T(1)),
      attempt('2', true, T(2)),
      attempt('r', true, T(4), { kind: 'review' }),
      attempt('d', false, T(4), { kind: 'diagnostic' }),
      attempt('other-skill', true, T(4), { skillId: 'M-K-B3' }),
      attempt('other-child', true, T(4), { childId: 'sibling' }),
    ];
    const state = recount({ ...newSkillState('kid', 'M-K-C4', T(1)), attempts: 99, correct: 99, recent: [] }, log);
    expect(state.attempts).toBe(3);
    expect(state.correct).toBe(2);
    expect(state.recent).toEqual([false, true, true]);
  });

  it('keeps only the last 10 in recent', () => {
    const log = Array.from({ length: 14 }, (_, i) => attempt(`a${i}`, i >= 4, `2026-03-01T12:${String(i).padStart(2, '0')}:00.000Z`));
    const state = recount(newSkillState('kid', 'M-K-C4', T(1)), log);
    expect(state.attempts).toBe(14);
    expect(state.recent).toHaveLength(10);
    expect(state.recent.every(Boolean)).toBe(true);
  });
});

describe('other records', () => {
  const child = (change: Partial<Child>): Child => ({
    id: 'kid',
    name: 'Test child',
    avatar: '🐢',
    grade: 'K',
    settings: defaultSettings('K'),
    resetAt: null,
    levelWeeks: [],
    createdAt: T(1),
    updatedAt: T(1),
    deletedAt: null,
    ...change,
  });

  it('the copy with the later updatedAt wins, and a tie keeps the local copy', () => {
    const a = { name: 'a', updatedAt: T(2) };
    const b = { name: 'b', updatedAt: T(5) };
    expect(laterWins(a, b)).toBe(b);
    expect(laterWins(b, a)).toBe(b);
    const tie = { name: 'tie', updatedAt: T(2) };
    expect(laterWins(a, tie)).toBe(a);
  });

  it('a child keeps the later copy, and resetAt is the later of the two', () => {
    const local = child({ name: 'Old name', updatedAt: T(3), resetAt: T(8) });
    const incoming = child({ name: 'New name', updatedAt: T(6), resetAt: T(4) });
    expect(mergeChild(local, incoming)).toMatchObject({ name: 'New name', resetAt: T(8) });
    expect(mergeChild(incoming, local)).toMatchObject({ name: 'New name', resetAt: T(8) });
    expect(mergeChild(child({ resetAt: null }), child({ resetAt: T(2) })).resetAt).toBe(T(2));
    expect(mergeChild(child({}), child({})).resetAt).toBeNull();
  });

  it('a soft delete travels like any other change', () => {
    const merged = mergeChild(child({ updatedAt: T(3) }), child({ updatedAt: T(7), deletedAt: T(7) }));
    expect(merged.deletedAt).toBe(T(7));
  });

  it('added-only rows skip ids already on the device, and report what was added', () => {
    const local = [attempt('1', true, T(1)), attempt('2', true, T(2))];
    const incoming = [attempt('2', false, T(2)), attempt('3', true, T(3)), attempt('3', true, T(3))];
    const { merged, added } = addOnly(local, incoming, (row) => row.id);
    expect(merged.map((row) => row.id)).toEqual(['1', '2', '3']);
    expect(added.map((row) => row.id)).toEqual(['3']);
    expect(merged[1]?.correct).toBe(true); // the device's own copy is kept
    expect(local).toHaveLength(2);
  });

  it('a row made before the child\'s reset is dead', () => {
    expect(isDead(T(3), T(5))).toBe(true);
    expect(isDead(T(5), T(5))).toBe(false);
    expect(isDead(T(6), T(5))).toBe(false);
    expect(isDead(T(3), null)).toBe(false);
  });
});
