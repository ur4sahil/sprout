// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MIXED_PER_TOPIC, MIXED_TOPICS, mixedBagOrder } from '../../src/app/mixedBag';
import { LADDERS } from '../../src/content/ladders';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

// The Mixed bag (plan section 17): skills in progress only, up to 4 topics, 5 turns each, never two in a row from one topic.
const NOW = '2026-03-09T16:30:00.000Z';
function going(skillId: string, practisedAt = NOW, score = 40): SkillState {
  return { ...newSkillState('kid-1', skillId, NOW), attempts: 5, correct: 3, score, lastPracticedAt: practisedAt };
}
const ladderOf = (skillId: string): string => LADDERS.find((ladder) => ladder.skillIds.includes(skillId))?.id ?? '?';

describe('the Mixed bag order', () => {
  it('needs skills in progress from at least two topics', () => {
    expect(mixedBagOrder([], LADDERS)).toEqual([]);
    expect(mixedBagOrder([going('M-K-C1'), going('M-K-C2')], LADDERS)).toEqual([]); // one topic is not a mix
  });

  it('takes 5 turns from each topic, mixed so the same topic never comes twice in a row', () => {
    const order = mixedBagOrder([going('M-K-C1'), going('M-K-B1'), going('M-K-A1')], LADDERS);
    expect(order).toHaveLength(3 * MIXED_PER_TOPIC);
    for (let i = 1; i < order.length; i += 1) expect(ladderOf(order[i] as string)).not.toBe(ladderOf(order[i - 1] as string));
    for (const id of ['M-K-C1', 'M-K-B1', 'M-K-A1']) expect(order.filter((each) => each === id)).toHaveLength(MIXED_PER_TOPIC);
  });

  it('takes at most 4 topics, the most recently practised', () => {
    const states = [
      going('M-K-C1', '2026-03-09T10:00:00.000Z'),
      going('M-K-B1', '2026-03-08T10:00:00.000Z'),
      going('M-K-A1', '2026-03-07T10:00:00.000Z'),
      going('M-PK-C1', '2026-03-06T10:00:00.000Z'),
      going('M-PK-C3', '2026-03-01T10:00:00.000Z'),
    ];
    const order = mixedBagOrder(states, LADDERS);
    expect(order).toHaveLength(MIXED_TOPICS * MIXED_PER_TOPIC);
    expect(order).not.toContain('M-PK-C3');
  });

  it('leaves out skills not started, mastered or placed past', () => {
    const states = [going('M-K-C1'), going('M-K-B1'), { ...going('M-K-A1'), score: 100 }, { ...going('M-K-D1'), placedOut: true }, { ...newSkillState('kid-1', 'M-PK-C1', NOW) }];
    const order = mixedBagOrder(states, LADDERS);
    expect(new Set(order)).toEqual(new Set(['M-K-C1', 'M-K-B1']));
  });
});
