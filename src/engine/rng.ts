// The only source of randomness in the app. Seeded, so any question can be replayed.

export interface Rng {
  /** A whole number from min to max, both included. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** A new array in random order. */
  shuffle<T>(items: readonly T[]): T[];
  /** A new array of n different items, in random order. */
  sample<T>(items: readonly T[], n: number): T[];
  /** True with probability p. */
  bool(p?: number): boolean;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed);

  function int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`rng.int needs whole numbers with min <= max, got ${min} and ${max}`);
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      const a = out[i] as T;
      out[i] = out[j] as T;
      out[j] = a;
    }
    return out;
  }

  return {
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick needs at least one item');
      return items[int(0, items.length - 1)] as T;
    },
    shuffle,
    sample<T>(items: readonly T[], n: number): T[] {
      if (!Number.isInteger(n) || n < 0 || n > items.length) {
        throw new Error(`rng.sample cannot take ${n} from ${items.length}`);
      }
      return shuffle(items).slice(0, n);
    },
    bool(p = 0.5): boolean {
      return next() < p;
    },
  };
}
