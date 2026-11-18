// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SUNNY_ANSWERS, answersByDay, sunnyDays } from '../../src/app/sunnyDays';

// Sunny days: learning days counted with nothing to lose.
const WEDNESDAY = new Date(2026, 2, 11, 16, 30); // March 11, 2026
const day = (date: number): string => `2026-03-${String(date).padStart(2, '0')}`;

describe('sunny days', () => {
  it('a day is sunny from five answers, and this week runs Monday to Sunday', () => {
    const found = sunnyDays({ [day(9)]: SUNNY_ANSWERS, [day(10)]: SUNNY_ANSWERS - 1, [day(11)]: 12 }, WEDNESDAY);
    expect(found.week).toEqual([true, false, true, false, false, false, false]);
    expect(found.today).toBe(2);
    expect(found.thisWeek).toBe(2);
  });

  it('missing days costs nothing: the total only ever counts up', () => {
    const before = sunnyDays({ [day(2)]: 9, [day(3)]: 9 }, new Date(2026, 2, 3, 12));
    // A week away, then one day back.
    const after = sunnyDays({ [day(2)]: 9, [day(3)]: 9, [day(11)]: 9 }, WEDNESDAY);
    expect(before.total).toBe(2);
    expect(after.total).toBe(3);
    // Nothing in the result is a count that went down or a mark for a missed day.
    expect(Object.keys(after).sort()).toEqual(['thisWeek', 'today', 'total', 'week']);
  });

  it('a Sunday is the last of its week, not the first of the next', () => {
    const sunday = new Date(2026, 2, 15, 9);
    const found = sunnyDays({ [day(15)]: 6, [day(16)]: 6 }, sunday);
    expect(found.today).toBe(6);
    expect(found.week[6]).toBe(true);
    expect(found.thisWeek).toBe(1);
  });

  it('counts answers by their local day', () => {
    expect(answersByDay([{ day: day(9) }, { day: day(9) }, { day: day(10) }])).toEqual({ [day(9)]: 2, [day(10)]: 1 });
  });
});
