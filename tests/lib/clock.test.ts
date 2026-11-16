import { describe, expect, it } from 'vitest';
import { freezeClock, localDay } from '../../src/lib/clock';

describe('localDay', () => {
  it('gives the local calendar date with zero padding', () => {
    expect(localDay(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
    expect(localDay(new Date(2026, 10, 15, 0, 0))).toBe('2026-11-15');
  });

  it('follows the local clock at both ends of the day, not UTC', () => {
    expect(localDay(new Date(2026, 2, 9, 0, 0, 1))).toBe('2026-03-09');
    expect(localDay(new Date(2026, 2, 9, 23, 59, 59))).toBe('2026-03-09');
    expect(localDay(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });

  it('reads the frozen clock when no date is given', () => {
    freezeClock(new Date(2027, 5, 1, 23, 30));
    expect(localDay()).toBe('2027-06-01');
  });
});
