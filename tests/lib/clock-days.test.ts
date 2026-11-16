import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localDayOf } from '../../src/lib/clock';

const at = (y: number, m: number, d: number, h: number, min = 0): string => new Date(y, m - 1, d, h, min).toISOString();

describe('day helpers', () => {
  it('localDayOf gives the local calendar date of a saved time', () => {
    expect(localDayOf(at(2026, 3, 9, 0, 1))).toBe('2026-03-09');
    expect(localDayOf(at(2026, 3, 9, 23, 59))).toBe('2026-03-09');
  });

  it('addDays keeps the time of day and crosses months and years', () => {
    expect(addDays(at(2026, 1, 30, 17), 2)).toBe(at(2026, 2, 1, 17));
    expect(addDays(at(2026, 12, 31, 9), 1)).toBe(at(2027, 1, 1, 9));
    expect(addDays(at(2026, 3, 5, 9), 0)).toBe(at(2026, 3, 5, 9));
    expect(addDays(at(2026, 3, 5, 9), 60)).toBe(at(2026, 5, 4, 9));
  });

  it('addDays keeps the local time of day across a clock change', () => {
    // In places with daylight saving, 7 March to 9 March 2026 crosses the change in the US.
    expect(localDayOf(addDays(at(2026, 3, 7, 17), 2))).toBe('2026-03-09');
    expect(new Date(addDays(at(2026, 3, 7, 17), 2)).getHours()).toBe(17);
  });

  it('daysBetween counts calendar days, whatever the times of day', () => {
    expect(daysBetween(at(2026, 3, 2, 23, 59), at(2026, 3, 3, 0, 1))).toBe(1);
    expect(daysBetween(at(2026, 3, 2, 0, 1), at(2026, 3, 2, 23, 59))).toBe(0);
    expect(daysBetween(at(2026, 3, 2, 12), at(2026, 3, 16, 12))).toBe(14);
    expect(daysBetween(at(2026, 3, 7, 23), at(2026, 3, 9, 1))).toBe(2);
    expect(daysBetween(at(2026, 3, 16, 12), at(2026, 3, 2, 12))).toBe(-14);
  });
});
