// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../src/engine/rng';
import { seedFor } from '../../src/engine/seed';

function draw(seed: number): number[] {
  const rng = makeRng(seed);
  return Array.from({ length: 50 }, () => rng.int(0, 1_000_000));
}

describe('makeRng', () => {
  it('gives the same output for the same seed', () => {
    expect(draw(12345)).toEqual(draw(12345));
    expect(makeRng(9).shuffle([1, 2, 3, 4, 5, 6])).toEqual(makeRng(9).shuffle([1, 2, 3, 4, 5, 6]));
  });

  it('gives different output for different seeds', () => {
    expect(draw(1)).not.toEqual(draw(2));
  });

  it('pins the first values of seed 1, so the generator can never change unnoticed', () => {
    const rng = makeRng(1);
    expect([rng.int(1, 100), rng.int(1, 100), rng.int(1, 100), rng.int(1, 100)]).toMatchInlineSnapshot(`
      [
        63,
        1,
        53,
        99,
      ]
    `);
  });

  it('int includes both ends and nothing outside them', () => {
    const rng = makeRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) seen.add(rng.int(3, 6));
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
    expect(rng.int(5, 5)).toBe(5);
    expect(rng.int(-2, -2)).toBe(-2);
  });

  it('int is close to even', () => {
    const rng = makeRng(99);
    const tally = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i += 1) {
      const value = rng.int(0, 3);
      tally[value] = (tally[value] ?? 0) + 1;
    }
    for (const count of tally) expect(Math.abs(count - 2000)).toBeLessThan(200);
  });

  it('int refuses a bad range', () => {
    const rng = makeRng(1);
    expect(() => rng.int(5, 4)).toThrow();
    expect(() => rng.int(1.5, 4)).toThrow();
    expect(() => rng.int(Number.NaN, 4)).toThrow();
  });

  it('shuffle and sample return new arrays and leave the input alone', () => {
    const rng = makeRng(3);
    const input = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(shuffled).not.toBe(input);
    expect(shuffled.slice().sort()).toEqual(input);
    const sample = rng.sample(input, 3);
    expect(sample).toHaveLength(3);
    expect(new Set(sample).size).toBe(3);
    expect(sample.every((item) => input.includes(item))).toBe(true);
    expect(rng.sample(input, 0)).toEqual([]);
    expect(rng.sample(input, 5).slice().sort()).toEqual(input);
  });

  it('sample and pick refuse what they cannot do', () => {
    const rng = makeRng(1);
    expect(() => rng.sample([1, 2], 3)).toThrow();
    expect(() => rng.sample([1, 2], -1)).toThrow();
    expect(() => rng.pick([])).toThrow();
    expect(rng.pick(['only'])).toBe('only');
  });

  it('shuffle reaches every position', () => {
    const rng = makeRng(42);
    const firsts = new Set<number>();
    for (let i = 0; i < 200; i += 1) firsts.add(rng.shuffle([1, 2, 3, 4])[0] as number);
    expect(firsts.size).toBe(4);
  });

  it('bool follows its probability', () => {
    const rng = makeRng(5);
    let yes = 0;
    for (let i = 0; i < 4000; i += 1) if (rng.bool(0.25)) yes += 1;
    expect(Math.abs(yes - 1000)).toBeLessThan(150);
    expect(makeRng(1).bool(0)).toBe(false);
    expect(makeRng(1).bool(1)).toBe(true);
  });
});

describe('seedFor', () => {
  it('is stable: these values must never change, or old attempts could not be replayed', () => {
    expect([
      seedFor('child-1', 'M-K-C4', 'practice', 0),
      seedFor('child-1', 'M-K-C4', 'practice', 1),
      seedFor('child-1', 'M-K-C4', 'review', 0),
      seedFor('', '', 'practice', 0),
    ]).toMatchInlineSnapshot(`
      [
        1532376645,
        1515599026,
        1947470208,
        1160902076,
      ]
    `);
  });

  it('matches the published FNV-1a test vectors', () => {
    // FNV-1a 32-bit of "a|b|practice|0" worked out by hand from the definition.
    let hash = 0x811c9dc5;
    for (const char of 'a|b|practice|0') {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    expect(seedFor('a', 'b', 'practice', 0)).toBe(hash);
  });

  it('is a whole number in the 32-bit range and changes with every input', () => {
    const base = seedFor('c', 's', 'practice', 3);
    expect(Number.isInteger(base)).toBe(true);
    expect(base).toBeGreaterThanOrEqual(0);
    expect(base).toBeLessThanOrEqual(0xffffffff);
    expect(seedFor('d', 's', 'practice', 3)).not.toBe(base);
    expect(seedFor('c', 't', 'practice', 3)).not.toBe(base);
    expect(seedFor('c', 's', 'diagnostic', 3)).not.toBe(base);
    expect(seedFor('c', 's', 'practice', 4)).not.toBe(base);
  });

  it('does not mix up where one value ends and the next begins', () => {
    expect(seedFor('ab', 'c', 'practice', 1)).not.toBe(seedFor('a', 'bc', 'practice', 1));
  });
});
