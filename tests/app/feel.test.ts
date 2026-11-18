import { afterEach, describe, expect, it } from 'vitest';
import { applyChildFeel, isPressable } from '../../src/app/feel';
import { stepRate } from '../../src/audio/sounds';
import { MOST_PARTICLES, burst, fade, step } from '../../src/lib/particles';
import type { Child } from '../../src/storage/schema';
import { childSettingsSchema, defaultSettings } from '../../src/storage/schema';
import { WORLDS, currentWorld, growthStage, worldFor } from '../../src/worlds';

// How the app feels (plan section 19, phase 1): the world, Calm mode, touch, sounds and particles.
const child = (change: Partial<Child['settings']> = {}): Child => ({ id: 'kid-1', name: 'Robin', avatar: '🐢', grade: 'K', settings: { ...defaultSettings('K'), ...change }, resetAt: null, levelWeeks: [], createdAt: '', updatedAt: '', deletedAt: null });

afterEach(() => applyChildFeel(null));

describe('the world', () => {
  it('is the garden by default, and an unknown world falls back to it', () => {
    expect(defaultSettings('1').world).toBe('garden');
    expect(worldFor(undefined).id).toBe('garden');
    expect(worldFor('nowhere').id).toBe('garden');
  });

  it('settings saved before worlds existed read as the garden, with Calm mode off', () => {
    const old: Record<string, unknown> = { ...defaultSettings('K') };
    delete old.calm;
    delete old.world;
    expect(childSettingsSchema.parse(old)).toMatchObject({ calm: false, world: 'garden' });
  });

  it('every world names all five stages, a sound for each moment, and colours as tokens', () => {
    for (const world of Object.values(WORLDS)) {
      expect(world.words.stages).toHaveLength(5);
      expect(Object.values(world.sounds).every((name) => name.length > 0)).toBe(true);
      for (const value of [...Object.values(world.palette), ...world.particles.colours]) expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/);
    }
  });

  it('a skill grows through five stages with its score', () => {
    expect([0, 1, 24, 25, 74, 75, 99, 100].map((score) => growthStage(score, false))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
    expect(growthStage(60, true)).toBe(4);
  });
});

describe('the page while a child plays', () => {
  it('carries the child\'s world and its colours, and drops them when no child is playing', () => {
    applyChildFeel(child());
    const root = document.documentElement;
    expect(root.dataset.world).toBe('garden');
    expect(root.style.getPropertyValue('--world-accent')).toBe(currentWorld().palette['--world-accent']);
    applyChildFeel(null);
    expect(root.dataset.world).toBeUndefined();
    expect(root.style.getPropertyValue('--world-accent')).toBe('');
  });

  it('is calm only for a child whose Calm mode is on', () => {
    applyChildFeel(child({ calm: true }));
    expect(document.documentElement.dataset.calm).toBe('');
    applyChildFeel(child());
    expect(document.documentElement.dataset.calm).toBeUndefined();
  });

  it('a touch sounds on a control that is on, and not on plain text or a control that is off', () => {
    document.body.innerHTML = '<button id="on"><span id="inside">Go</span></button><button id="off" disabled>No</button><p id="text">Words</p><div role="tab" id="tab">Tab</div>';
    const el = (id: string) => document.getElementById(id);
    expect(isPressable(el('on'))).toBe(true);
    expect(isPressable(el('inside'))).toBe(true);
    expect(isPressable(el('tab'))).toBe(true);
    expect(isPressable(el('off'))).toBe(false);
    expect(isPressable(el('text'))).toBe(false);
    expect(isPressable(null)).toBe(false);
  });
});

describe('sounds', () => {
  it('a run of right answers climbs a scale and stops at the octave', () => {
    expect(stepRate(0)).toBe(1);
    expect(stepRate(1)).toBeGreaterThan(stepRate(0));
    expect(stepRate(7)).toBeCloseTo(2, 5);
    expect(stepRate(40)).toBeCloseTo(2, 5);
  });
});

describe('particles', () => {
  it('a burst is the same every time for the same seed, and stays under the limit', () => {
    expect(burst('sparkle', { x: 0.5, y: 0.5 }, 4, 7)).toEqual(burst('sparkle', { x: 0.5, y: 0.5 }, 4, 7));
    expect(burst('sparkle', { x: 0.5, y: 0.5 }, 4, 8)).not.toEqual(burst('sparkle', { x: 0.5, y: 0.5 }, 4, 7));
    for (const kind of ['sparkle', 'star', 'petal', 'leaf', 'drop', 'confetti'] as const) expect(burst(kind, { x: 0.5, y: 0.5 }, 4).length).toBeLessThanOrEqual(MOST_PARTICLES);
  });

  it('particles move, fade near the end, and are all gone before three seconds', () => {
    let alive = burst('confetti', { x: 0.5, y: 0.5 }, 4);
    const first = alive[0]!;
    alive = step(alive, 'confetti', 0.1);
    expect(alive[0]?.x).not.toBe(first.x);
    expect(fade({ ...first, age: 0 })).toBe(1);
    expect(fade({ ...first, age: first.life * 0.9 })).toBeLessThan(1);
    for (let t = 0; t < 30; t += 1) alive = step(alive, 'confetti', 0.1);
    expect(alive).toHaveLength(0);
  });
});
