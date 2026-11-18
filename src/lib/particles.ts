import type { ParticleKind } from '../worlds';

// A small particle engine (plan section 19, phase 1): bursts of sparkles, stars, petals, leaves, drops and confetti.
// The motion is worked out here with plain numbers; a canvas draws it. Everything is spread from a seed, never by
// chance, so a burst is the same every time and can be tested.

export interface Particle {
  x: number; // place, 0 to 1 across and down the area
  y: number;
  vx: number; // speed, in areas a second
  vy: number;
  size: number; // as a share of the area's width
  turn: number; // radians
  spin: number; // radians a second
  colour: number; // which of the world's colours
  age: number; // seconds
  life: number; // seconds until it is gone
}

export const MOST_PARTICLES = 120; // on screen at once

interface Recipe {
  count: number;
  speed: [number, number]; // how fast they leave
  up: number; // how much of that speed goes upward at the start (1 = straight up, 0 = all round)
  gravity: number; // areas a second, each second
  drag: number; // the share of speed kept after a second
  size: [number, number];
  life: [number, number];
  spin: number;
}

const RECIPES: Record<ParticleKind, Recipe> = {
  sparkle: { count: 14, speed: [0.25, 0.6], up: 0, gravity: 0.15, drag: 0.2, size: [0.012, 0.024], life: [0.45, 0.8], spin: 6 },
  star: { count: 10, speed: [0.3, 0.7], up: 0.6, gravity: 0.9, drag: 0.5, size: [0.02, 0.034], life: [0.7, 1.1], spin: 4 },
  petal: { count: 24, speed: [0.2, 0.6], up: 0.8, gravity: 0.5, drag: 0.35, size: [0.016, 0.03], life: [1.2, 2], spin: 3 },
  leaf: { count: 16, speed: [0.15, 0.4], up: 0.5, gravity: 0.35, drag: 0.4, size: [0.02, 0.034], life: [1.4, 2.2], spin: 2 },
  drop: { count: 12, speed: [0.3, 0.6], up: 0.9, gravity: 1.6, drag: 0.7, size: [0.01, 0.018], life: [0.6, 0.9], spin: 0 },
  confetti: { count: 40, speed: [0.4, 1], up: 0.9, gravity: 1.1, drag: 0.45, size: [0.012, 0.022], life: [1.2, 2], spin: 9 },
};

// A number from 0 to 1 that depends only on the seed and the index.
function spread(seed: number, index: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233 + salt * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

const between = ([low, high]: [number, number], share: number): number => low + (high - low) * share;

// A burst of one kind from a point (0 to 1 across and down the area).
export function burst(kind: ParticleKind, at: { x: number; y: number }, colours: number, seed = 1): Particle[] {
  const recipe = RECIPES[kind];
  return Array.from({ length: Math.min(recipe.count, MOST_PARTICLES) }, (_, i) => {
    const around = spread(seed, i, 1) * Math.PI * 2;
    const speed = between(recipe.speed, spread(seed, i, 2));
    // Lean the direction upward by the recipe's share.
    const vx = Math.cos(around) * speed * (1 - recipe.up * 0.5);
    const vy = Math.sin(around) * speed * (1 - recipe.up) - speed * recipe.up;
    return {
      x: at.x,
      y: at.y,
      vx,
      vy,
      size: between(recipe.size, spread(seed, i, 3)),
      turn: around,
      spin: (spread(seed, i, 4) - 0.5) * 2 * recipe.spin,
      colour: i % Math.max(colours, 1),
      age: 0,
      life: between(recipe.life, spread(seed, i, 5)),
    };
  });
}

// Moves every particle on by `seconds` and drops the ones whose time is up. Returns the ones still alive.
export function step(particles: readonly Particle[], kind: ParticleKind, seconds: number): Particle[] {
  const recipe = RECIPES[kind];
  const keep = recipe.drag ** seconds;
  const alive: Particle[] = [];
  for (const each of particles) {
    const age = each.age + seconds;
    if (age >= each.life) continue;
    const vx = each.vx * keep;
    const vy = each.vy * keep + recipe.gravity * seconds;
    alive.push({ ...each, age, vx, vy, x: each.x + vx * seconds, y: each.y + vy * seconds, turn: each.turn + each.spin * seconds });
  }
  return alive;
}

// How see-through a particle is: full for most of its life, fading over the last third.
export function fade(particle: Particle): number {
  const left = 1 - particle.age / particle.life;
  return Math.max(0, Math.min(1, left * 3));
}
