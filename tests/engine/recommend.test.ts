// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Skill } from '../../src/content/catalogue';
import type { Ladder } from '../../src/content/ladders';
import { LADDERS } from '../../src/content/ladders';
import type { RecommendInput } from '../../src/engine/recommend';
import { isTroubleSpot, recommend } from '../../src/engine/recommend';
import type { Plan, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

const at = (y: number, m: number, d: number, h = 12): string => new Date(y, m - 1, d, h).toISOString();
const NOW = at(2026, 3, 20);

function skill(id: string, strand: string, change: Partial<Skill> = {}): Skill {
  const parts = id.split('-');
  const grade = parts[0] === 'R' ? 'all' : (parts[1] as Skill['grade']);
  return {
    id,
    subject: parts[0] === 'M' ? 'math' : parts[0] === 'E' ? 'ela' : 'reasoning',
    grade,
    category: 'A. Test',
    code: 'A.1',
    name: id,
    strand,
    ladder: 'x',
    icon: { kind: 'text', value: id, size: 'm' },
    speakName: ['Test skill'],
    version: 1,
    itemTypes: ['choice'],
    maxLevel: 4,
    prereqs: [],
    ...change,
  };
}

// A small catalogue on real ladder ids, so ladder prerequisites are the real ones.
const SKILLS: Skill[] = [
  skill('M-PK-A1', 'CC'),
  skill('M-PK-A2', 'CC'),
  skill('M-PK-A3', 'CC'),
  skill('M-K-A1', 'CC'),
  skill('M-K-A2', 'CC'),
  skill('M-K-C1', 'OA'),
  skill('M-K-C2', 'OA'),
  skill('M-K-C3', 'OA'),
  skill('M-K-E1', 'G'),
  skill('E-K-C1', 'RF'),
  skill('R-A1', 'R'),
];
const ladders: Ladder[] = LADDERS.map((ladder) => ({ ...ladder }));

function st(skillId: string, change: Partial<SkillState> = {}): SkillState {
  return { ...newSkillState('kid', skillId, NOW), ...change };
}

function input(change: Partial<RecommendInput> = {}): RecommendInput {
  return {
    childId: 'kid',
    grade: 'K',
    nowIso: NOW,
    skills: SKILLS,
    ladders,
    states: [],
    plans: [],
    placements: {},
    attemptsLast14Days: {},
    lastSessionSkillId: null,
    canListen: true,
    isListenNext: () => false,
    hasGenerator: () => true,
    ...change,
  };
}

function plan(id: string, skillIds: string[], change: Partial<Plan> = {}): Plan {
  return { id, name: id, skillIds, childIds: ['kid'], createdAt: at(2026, 1, 1), updatedAt: at(2026, 1, 1), deletedAt: null, ...change };
}

const masteredState = (skillId: string, dueDay: number | null): SkillState =>
  st(skillId, { score: 100, bestScore: 100, masteredAt: at(2026, 3, 1), reviewDueAt: dueDay === null ? null : at(2026, 3, dueDay) });

describe('trouble spots', () => {
  const recent = (right: number, total: number): boolean[] => [...new Array<boolean>(right).fill(true), ...new Array<boolean>(total - right).fill(false)];

  it('5 right out of 5 is not flagged, 2 right out of 5 is', () => {
    expect(isTroubleSpot({ recent: recent(5, 5), score: 50 }, 5)).toBe(false);
    expect(isTroubleSpot({ recent: recent(2, 5), score: 20 }, 5)).toBe(true);
  });

  it('needs all three: 5 attempts in 14 days, under 60% right, score under 80', () => {
    expect(isTroubleSpot({ recent: recent(2, 5), score: 20 }, 4)).toBe(false); // too few lately
    expect(isTroubleSpot({ recent: recent(3, 5), score: 20 }, 5)).toBe(false); // exactly 60%
    expect(isTroubleSpot({ recent: recent(5, 10), score: 20 }, 10)).toBe(true); // 50%
    expect(isTroubleSpot({ recent: recent(6, 10), score: 20 }, 10)).toBe(false); // 60%
    expect(isTroubleSpot({ recent: recent(2, 5), score: 80 }, 5)).toBe(false); // doing fine overall
    expect(isTroubleSpot({ recent: recent(2, 5), score: 79 }, 5)).toBe(true);
    expect(isTroubleSpot({ recent: [], score: 0 }, 9)).toBe(false);
  });
});

describe('recommend: each rule', () => {
  it('1. review: one mastered skill whose date has passed, and never more than one', () => {
    const picks = recommend(input({ states: [masteredState('M-PK-A1', 18), masteredState('M-PK-A2', 10), masteredState('M-PK-A3', 25)] }));
    expect(picks.filter((pick) => pick.reason === 'review')).toEqual([{ skillId: 'M-PK-A2', reason: 'review' }]);
    expect(picks[0]).toEqual({ skillId: 'M-PK-A2', reason: 'review' });
  });

  it('1. review: not yet due means no review pick, and a mastered skill is never offered as anything else', () => {
    const picks = recommend(input({ states: [masteredState('M-K-A1', 25)] }));
    expect(picks.some((pick) => pick.reason === 'review')).toBe(false);
    expect(picks.some((pick) => pick.skillId === 'M-K-A1')).toBe(false);
  });

  it('2. plan: the first unmastered skill in a plan assigned to this child', () => {
    const picks = recommend(input({ plans: [plan('p', ['M-K-C1', 'M-K-C2', 'M-K-C3'])], states: [masteredState('M-K-C1', null)] }));
    expect(picks[0]).toEqual({ skillId: 'M-K-C2', reason: 'plan' });
  });

  it('2. plan: ignores plans for another child and deleted plans', () => {
    const picks = recommend(
      input({ plans: [plan('other', ['M-K-E1'], { childIds: ['someone-else'] }), plan('gone', ['E-K-C1'], { deletedAt: at(2026, 2, 1) })] }),
    );
    expect(picks.some((pick) => pick.reason === 'plan')).toBe(false);
  });

  it('3. troubleSpot: a flagged skill is picked', () => {
    const flagged = st('M-K-C1', { score: 20, attempts: 6, recent: [false, false, true, false, false, true], lastPracticedAt: at(2026, 3, 19) });
    const picks = recommend(input({ states: [flagged], attemptsLast14Days: { 'M-K-C1': 6 } }));
    expect(picks[0]).toEqual({ skillId: 'M-K-C1', reason: 'troubleSpot' });
  });

  it('3. troubleSpot: a prerequisite under 70 is picked instead', () => {
    // M-K-C2 comes after M-K-C1 on the add-subtract ladder.
    const flagged = st('M-K-C2', { score: 20, attempts: 6, recent: [false, false, true, false, false], lastPracticedAt: at(2026, 3, 19) });
    const weak = recommend(input({ states: [flagged, st('M-K-C1', { score: 60 })], attemptsLast14Days: { 'M-K-C2': 6 } }));
    expect(weak[0]).toEqual({ skillId: 'M-K-C1', reason: 'troubleSpot' });
    const strong = recommend(input({ states: [flagged, st('M-K-C1', { score: 70 })], attemptsLast14Days: { 'M-K-C2': 6 } }));
    expect(strong[0]).toEqual({ skillId: 'M-K-C2', reason: 'troubleSpot' });
  });

  it('3. troubleSpot: an extra prerequisite named on the catalogue row counts too', () => {
    const skills = SKILLS.map((row) => (row.id === 'M-K-E1' ? { ...row, prereqs: ['M-PK-A3'] } : row));
    const flagged = st('M-K-E1', { score: 20, attempts: 6, recent: [false, false, false, true, false], lastPracticedAt: at(2026, 3, 19) });
    const picks = recommend(input({ skills, states: [flagged], attemptsLast14Days: { 'M-K-E1': 6 } }));
    expect(picks[0]).toEqual({ skillId: 'M-PK-A3', reason: 'troubleSpot' });
  });

  it('4. continue: scored 1 to 99 and practised in the last 14 days, highest score first', () => {
    const picks = recommend(
      input({
        states: [
          st('M-K-C1', { score: 30, lastPracticedAt: at(2026, 3, 19) }),
          st('M-K-E1', { score: 75, lastPracticedAt: at(2026, 3, 10) }),
          st('E-K-C1', { score: 50, lastPracticedAt: at(2026, 3, 6) }),
        ],
      }),
    );
    expect(picks).toEqual([
      { skillId: 'M-K-E1', reason: 'continue' },
      { skillId: 'E-K-C1', reason: 'continue' },
      { skillId: 'M-K-C1', reason: 'continue' },
    ]);
  });

  it('4. continue: leaves out a score of 0, a skill last practised 15 days ago, and one never practised', () => {
    const picks = recommend(
      input({
        states: [
          st('M-K-C1', { score: 0, attempts: 3, lastPracticedAt: at(2026, 3, 19) }),
          st('M-K-E1', { score: 75, lastPracticedAt: at(2026, 3, 5) }),
          st('E-K-C1', { score: 80, placedOut: true, lastPracticedAt: null }),
        ],
      }),
    );
    expect(picks.some((pick) => pick.reason === 'continue')).toBe(false);
  });

  it('5. next: the placement skill of each ladder, in ladder order', () => {
    const picks = recommend(input({ placements: { counting: 'M-K-A2', 'add-subtract': 'M-K-C2', shapes: 'M-K-E1' } }));
    expect(picks).toEqual([
      { skillId: 'M-K-A2', reason: 'next' },
      { skillId: 'M-K-C2', reason: 'next' },
      { skillId: 'M-K-E1', reason: 'next' },
    ]);
  });

  it('5. next: with no placement, the first unmastered skill at or above the child\'s grade', () => {
    const picks = recommend(input({ states: [masteredState('M-K-A1', null)] }));
    expect(picks[0]).toEqual({ skillId: 'M-K-A2', reason: 'next' }); // counting: K A.1 is mastered
    expect(picks[1]).toEqual({ skillId: 'M-K-C1', reason: 'next' }); // add-subtract
    const preK = recommend(input({ grade: 'PK' }));
    expect(preK[0]).toEqual({ skillId: 'M-PK-A1', reason: 'next' });
  });

  it('5. next: a ladder the child passed completely gives nothing, and a mastered placement moves on', () => {
    const passed = recommend(input({ placements: { counting: null } }));
    expect(passed.some((pick) => pick.skillId.startsWith('M-K-A') || pick.skillId.startsWith('M-PK-A'))).toBe(false);
    const moved = recommend(input({ placements: { counting: 'M-K-A1' }, states: [masteredState('M-K-A1', null)] }));
    expect(moved[0]).toEqual({ skillId: 'M-K-A2', reason: 'next' });
  });

  it('5. next: reasoning ladders start at their first skill for every child', () => {
    const picks = recommend(input({ skills: SKILLS.filter((row) => row.id === 'R-A1'), grade: '2' }));
    expect(picks).toEqual([{ skillId: 'R-A1', reason: 'next' }]);
  });

  it('fills the list in priority order: review, plan, trouble spot, continue, next', () => {
    const flagged = st('M-K-C3', { score: 20, attempts: 6, recent: [false, false, false, true, false], lastPracticedAt: at(2026, 3, 19) });
    const all = input({
      states: [masteredState('M-PK-A1', 10), flagged, st('M-K-C2', { score: 70 }), st('M-K-C1', { score: 70 }), st('E-K-C1', { score: 40, lastPracticedAt: at(2026, 3, 18) })],
      plans: [plan('p', ['M-K-E1'])],
      attemptsLast14Days: { 'M-K-C3': 6 },
    });
    expect(recommend(all).map((pick) => pick.reason)).toEqual(['review', 'plan', 'troubleSpot']);
    expect(recommend({ ...all, plans: [] }).map((pick) => pick.reason)).toEqual(['review', 'troubleSpot', 'continue']);
  });

  it('returns at most 3 picks, and fewer when there is less to offer', () => {
    expect(recommend(input()).length).toBe(3);
    expect(recommend(input({ skills: SKILLS.slice(0, 1), grade: 'PK' }))).toHaveLength(1);
    expect(recommend(input({ skills: [] }))).toEqual([]);
  });
});

describe('recommend: variety rules', () => {
  it('never repeats a skill', () => {
    const state = st('M-K-C1', { score: 30, lastPracticedAt: at(2026, 3, 19) });
    const picks = recommend(input({ states: [state], plans: [plan('p', ['M-K-C1'])], placements: { 'add-subtract': 'M-K-C1' } }));
    expect(new Set(picks.map((pick) => pick.skillId)).size).toBe(picks.length);
    expect(picks.filter((pick) => pick.skillId === 'M-K-C1')).toEqual([{ skillId: 'M-K-C1', reason: 'plan' }]);
  });

  it('covers at least two strands when possible', () => {
    const states = ['M-K-C1', 'M-K-C2', 'M-K-C3'].map((id, i) => st(id, { score: 90 - i, lastPracticedAt: at(2026, 3, 19) }));
    const picks = recommend(input({ states }));
    const strands = new Set(picks.map((pick) => SKILLS.find((row) => row.id === pick.skillId)?.strand));
    expect(strands.size).toBeGreaterThanOrEqual(2);
    expect(picks.slice(0, 2).map((pick) => pick.skillId)).toEqual(['M-K-C1', 'M-K-C2']);
  });

  it('keeps one strand when there is nothing else to offer', () => {
    const oa = SKILLS.filter((row) => row.strand === 'OA');
    const picks = recommend(input({ skills: oa, states: oa.map((row) => st(row.id, { score: 50, lastPracticedAt: at(2026, 3, 19) })) }));
    expect(picks).toHaveLength(3);
  });

  it('never leads with the skill from the child\'s last session', () => {
    const states = [st('M-K-E1', { score: 75, lastPracticedAt: at(2026, 3, 19) }), st('M-K-C1', { score: 30, lastPracticedAt: at(2026, 3, 19) })];
    const picks = recommend(input({ states, lastSessionSkillId: 'M-K-E1' }));
    expect(picks[0]?.skillId).not.toBe('M-K-E1');
    expect(picks.map((pick) => pick.skillId)).toContain('M-K-E1');
    // With only one thing to offer, it is still offered.
    const only = recommend(input({ skills: SKILLS.filter((row) => row.id === 'M-K-E1'), states: [states[0] as SkillState], lastSessionSkillId: 'M-K-E1' }));
    expect(only).toEqual([{ skillId: 'M-K-E1', reason: 'continue' }]);
  });

  it('leaves out a listen skill while the device is muted or has no voice', () => {
    const base = input({ placements: { counting: 'M-K-A2' }, isListenNext: (id) => id === 'M-K-A2' });
    expect(recommend(base).map((pick) => pick.skillId)).toContain('M-K-A2');
    expect(recommend({ ...base, canListen: false }).map((pick) => pick.skillId)).not.toContain('M-K-A2');
  });

  it('never picks a retired skill or one with no generator yet', () => {
    const retired = SKILLS.map((row) => (row.id === 'M-K-A1' ? { ...row, retired: true as const } : row));
    expect(recommend(input({ skills: retired })).map((pick) => pick.skillId)).not.toContain('M-K-A1');
    const none = recommend(input({ hasGenerator: (id) => id !== 'M-K-A1' && id !== 'M-K-C1' }));
    expect(none.map((pick) => pick.skillId)).not.toContain('M-K-A1');
    expect(none.map((pick) => pick.skillId)).not.toContain('M-K-C1');
    // Nor a skill that is in a plan or a ladder but not in the catalogue.
    expect(recommend(input({ plans: [plan('p', ['M-2-B9'])] })).map((pick) => pick.skillId)).not.toContain('M-2-B9');
  });
});
