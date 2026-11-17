// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { TopicSkill, TopicState } from '../../src/engine/topicLevel';
import { levelNumber, levelWords, topicLevel } from '../../src/engine/topicLevel';
import { mergeWeeks } from '../../src/engine/merge';
import { localWeek } from '../../src/lib/clock';

// A made-up ladder: two kindergarten skills, then four grade 1 skills.
const LADDER: TopicSkill[] = [
  { id: 'k1', grade: 'K' },
  { id: 'k2', grade: 'K' },
  { id: 'g1', grade: '1' },
  { id: 'g2', grade: '1' },
  { id: 'g3', grade: '1' },
  { id: 'g4', grade: '1' },
];
const st = (skillId: string, score: number, change: Partial<TopicState> = {}): TopicState => ({ skillId, score, attempts: score > 0 ? 10 : 0, placedOut: false, ...change });

describe('a running level for one topic', () => {
  it('says "not tried yet" with nothing done, never a guess', () => {
    expect(topicLevel(LADDER, [])).toEqual({ kind: 'notTried' });
    expect(topicLevel(LADDER, [st('other', 90)])).toEqual({ kind: 'notTried' });
  });

  it('is the end of the furthest skill known, plus part credit for the next', () => {
    // k1, k2 known: the end of kindergarten. g1 at 40 of 80: half of its quarter of grade 1.
    expect(topicLevel(LADDER, [st('k1', 90), st('k2', 85), st('g1', 40)])).toEqual({ kind: 'level', value: 1.1 });
    expect(topicLevel(LADDER, [st('k1', 90), st('k2', 85)])).toEqual({ kind: 'level', value: 1 });
  });

  it('moves up when the child masters a skill', () => {
    const before = topicLevel(LADDER, [st('k1', 90), st('k2', 85), st('g1', 60)]);
    const after = topicLevel(LADDER, [st('k1', 90), st('k2', 85), st('g1', 100)]);
    expect(before.kind === 'level' && after.kind === 'level' && after.value > before.value).toBe(true);
    expect(after).toEqual({ kind: 'level', value: 1.3 });
  });

  it('counts a skill placed out by the check-in, and skills below it need no state', () => {
    expect(topicLevel(LADDER, [st('g2', 80, { placedOut: true, attempts: 0 })])).toEqual({ kind: 'level', value: 1.5 });
  });

  it('goes down when a failed review takes a skill below 80', () => {
    const known = topicLevel(LADDER, [st('k1', 90), st('k2', 90), st('g1', 90), st('g2', 90)]);
    const slipped = topicLevel(LADDER, [st('k1', 90), st('k2', 90), st('g1', 90), st('g2', 40)]);
    expect(known).toEqual({ kind: 'level', value: 1.5 });
    // g2 at 40 is half known: the end of g1 (1.25) and half of g2's quarter.
    expect(slipped).toEqual({ kind: 'level', value: 1.4 });
  });

  it('starts at the first skill tried when nothing is known yet', () => {
    expect(topicLevel(LADDER, [st('g3', 40)])).toEqual({ kind: 'level', value: 1.6 });
  });

  it('is above the top once the last skill is known', () => {
    expect(topicLevel(LADDER, [st('g4', 95)])).toEqual({ kind: 'above', value: 2 });
  });

  it('is said in words, with a number from grade 1', () => {
    expect([levelWords(1.5), levelWords(0.2), levelWords(-0.5), levelWords(2.9), levelWords(3)]).toEqual(['about mid-grade 1', 'about early kindergarten', 'about mid pre-K', 'about late-grade 2', 'about early-grade 3']);
    expect([levelNumber(1.5), levelNumber(0.4)]).toEqual(['1.5', null]);
  });
});

describe('weekly snapshots', () => {
  it('are keyed by the Monday of the local week', () => {
    expect(localWeek(new Date(2026, 10, 19, 12))).toBe('2026-11-16');
    expect(localWeek(new Date(2026, 10, 16, 0, 5))).toBe('2026-11-16');
    expect(localWeek(new Date(2026, 10, 22, 23, 55))).toBe('2026-11-16');
  });

  it('merge from two devices: every week, the later snapshot of a shared week', () => {
    const a = [{ week: '2026-11-02', at: '2026-11-02T10:00:00.000Z', levels: { counting: 1 } }, { week: '2026-11-09', at: '2026-11-10T10:00:00.000Z', levels: { counting: 1.2 } }];
    const b = [{ week: '2026-11-09', at: '2026-11-12T10:00:00.000Z', levels: { counting: 1.3 } }, { week: '2026-11-16', at: '2026-11-16T10:00:00.000Z', levels: { counting: 1.4 } }];
    expect(mergeWeeks(a, b).map((snapshot) => [snapshot.week, snapshot.levels.counting])).toEqual([['2026-11-02', 1], ['2026-11-09', 1.3], ['2026-11-16', 1.4]]);
  });
});
