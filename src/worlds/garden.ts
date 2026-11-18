import type { World } from './types';

// Sprout's garden: the first world. Each skill is a plant; practice makes it grow and mastery makes it bloom.
export const GARDEN: World = {
  id: 'garden',
  name: 'Garden',
  words: {
    home: 'garden',
    path: "today's path",
    review: 'water your plants',
    stages: ['a seed', 'a sprout', 'a plant', 'a bud', 'in bloom'],
  },
  palette: {
    '--world-accent': 'var(--color-brand)',
    '--world-accent-soft': 'var(--color-brand-soft)',
    '--world-glow': 'var(--color-star)',
  },
  particles: { right: 'sparkle', milestone: 'petal', colours: ['var(--color-star)', 'var(--color-brand)', 'var(--color-petal)', 'var(--color-sky)'] },
  sounds: { tap: 'tap', pick: 'pick', drop: 'drop', right: 'right', next: 'whoosh-in', open: 'open', close: 'close', star: 'star' },
};
