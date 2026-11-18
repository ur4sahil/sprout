// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allLessons } from '../../src/lessons';
import { ACTOR_H, ACTOR_W, actorFocus, actorPose } from '../../src/lessons/actor';
import { group, art, pointAt, scene, set, withoutHand } from '../../src/lessons/build';

// The lesson host on the stage (plan section 16): where it stands and what it reaches for.
const apples = scene(group('a', art('🍎'), 3, 1, 2));

describe('the lesson host', () => {
  it('points where the pointing hand is', () => {
    const target = apples.pieces[1]!;
    const focus = actorFocus(apples, pointAt(apples, target));
    expect(focus?.doing).toBe('pointing');
    expect(focus?.at[0]).toBeCloseTo(target.x + 0.5, 1);
  });

  it('goes with pieces that move, so it looks like the one moving them', () => {
    const moved = set(apples, ['a2'], { x: 7, y: 2 });
    const focus = actorFocus(apples, moved);
    expect(focus).toEqual({ at: [7.5, 2.5], doing: 'moving' });
    const pose = actorPose(apples, moved, 0);
    expect(Math.abs(pose.left + ACTOR_W / 2 - 7.5)).toBeLessThan(3);
  });

  it('reaches for pieces that appear or light up, and rests when nothing changes', () => {
    const hidden = set(apples, ['a0'], { gone: true });
    expect(actorFocus(hidden, apples)?.at).toEqual([1.5, 2.5]);
    expect(actorFocus(apples, set(apples, ['a1'], { lit: true }))?.at).toEqual([2.5, 2.5]);
    expect(actorFocus(apples, apples)).toBeNull();
    const resting = actorPose(apples, withoutHand(apples), 4);
    expect(resting).toMatchObject({ left: 4, doing: 'resting' });
  });

  it('stays on the stage and keeps its arm a sensible length in every scene of every lesson', () => {
    for (const [skillId, , make] of allLessons()) {
      const scenes = make().parts.flatMap((part) => (part.kind === 'show' ? [part.moment.scene] : part.turn.why.map((each) => each.scene)));
      let before = null as (typeof scenes)[number] | null;
      let left: number | null = null;
      for (const now of scenes) {
        const pose = actorPose(before, now, left);
        expect(pose.left, skillId).toBeGreaterThanOrEqual(0);
        expect(pose.left + ACTOR_W, skillId).toBeLessThanOrEqual(now.cols + 0.001);
        expect(pose.top + ACTOR_H, skillId).toBeCloseTo(now.rows, 5);
        expect(pose.length, skillId).toBeGreaterThan(0);
        expect(pose.length, skillId).toBeLessThanOrEqual(3.2001);
        expect(Number.isFinite(pose.angle), skillId).toBe(true);
        before = now;
        left = pose.left;
      }
    }
  });
});
