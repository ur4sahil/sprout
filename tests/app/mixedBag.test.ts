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
  it('is open from the start: with fewer than two topics practised, topics not yet practised fill in at the child\'s grade', () => {
    const fresh = mixedBagOrder([], LADDERS, 'K');
    expect(new Set(fresh.map(ladderOf)).size).toBe(2);
    for (const id of fresh) expect(id.startsWith('M-K-') || id.startsWith('E-K-')).toBe(true);
    const one = mixedBagOrder([going('M-K-C1'), going('M-K-C2')], LADDERS, 'K');
    expect(new Set(one.map(ladderOf)).size).toBe(2);
    expect(one).toContain('M-K-C2'); // the topic being practised stays in
  });

  it('takes 5 turns from each topic, mixed so the same topic never comes twice in a row', () => {
    const order = mixedBagOrder([going('M-K-C1'), going('M-K-B1'), going('M-K-A1')], LADDERS, 'K');
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
    const order = mixedBagOrder(states, LADDERS, 'K');
    expect(order).toHaveLength(MIXED_TOPICS * MIXED_PER_TOPIC);
    expect(order).not.toContain('M-PK-C3');
  });

  it('leaves out mastered and placed-past skills, and takes a mastered topic\'s next skill up to the child\'s grade', () => {
    const states = [going('M-K-C1'), going('M-K-B1'), { ...going('M-K-A1'), score: 100 }, { ...going('M-K-D1'), placedOut: true }, { ...newSkillState('kid-1', 'M-PK-C1', NOW) }];
    const order = mixedBagOrder(states, LADDERS, 'K');
    // Counting's next skill after M-K-A1 is M-K-A2; place value's next (M-1-A3) is Grade 1, past this Kindergartener.
    expect(new Set(order)).toEqual(new Set(['M-K-C1', 'M-K-B1', 'M-K-A2']));
  });

  it('opens for a child whose practised skills all reached 100 today (Nov 19, 2026)', () => {
    const states = [{ ...going('M-1-A3'), score: 100 }, { ...going('E-1-A3'), score: 100 }, { ...going('R-A1'), score: 100 }, going('E-1-A1')];
    const order = mixedBagOrder(states, LADDERS, '1');
    const placeValue = LADDERS.find((ladder) => ladder.id === 'place-value')?.skillIds ?? [];
    expect(order).toContain(placeValue[placeValue.indexOf('M-1-A3') + 1]); // place value, next after Tens and ones
    expect(order).toContain('E-1-A1'); // phonics: the skill still being learnt
    expect(order).toContain('R-A2'); // figures, next after Odd one out
  });
});
