// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allLessons } from '../../src/lessons';
import { ACTOR_H, ACTOR_W, MAX_ZOOM, WIDE, actorFocus, actorPose, cameraFor, countersLand, cueIn, isCount, partCue, seenAt, whyCue } from '../../src/lessons/actor';
import { group, art, moment, pointAt, scene, set, withoutHand } from '../../src/lessons/build';
import type { Lesson, Scene } from '../../src/lessons/types';

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

// Every scene of a lesson in the order it plays, the whys after their turn.
function scenesOf(make: () => Lesson): Scene[] {
  return make().parts.flatMap((part) => (part.kind === 'show' ? [part.moment.scene] : part.turn.why.map((each) => each.scene)));
}

describe('the camera', () => {
  it('stays back when nothing is in focus, and leans in toward a focus', () => {
    const pose = actorPose(null, apples, null);
    expect(cameraFor(apples, apples, pose)).toEqual(WIDE);
    const small = scene([{ id: 'a', look: art('🍎'), x: 4, y: 3 }]);
    const lit = set(small, ['a'], { lit: true });
    const camera = cameraFor(small, lit, actorPose(small, lit, null));
    expect(camera.zoom).toBeGreaterThan(1);
    expect(camera.zoom).toBeLessThanOrEqual(MAX_ZOOM);
  });

  it('keeps the focus, the host and every piece that can be seen on the stage, in every scene of every lesson', () => {
    const inside = (scene: Scene, [x, y]: [number, number]): boolean => x >= -0.001 && y >= -0.001 && x <= scene.cols + 0.001 && y <= scene.rows + 0.001;
    let leaned = 0;
    for (const [name, , make] of allLessons()) {
      let before: Scene | null = null;
      let left: number | null = null;
      for (const now of scenesOf(make)) {
        const pose = actorPose(before, now, left);
        const camera = cameraFor(before, now, pose);
        expect(camera.zoom, name).toBeGreaterThanOrEqual(1);
        expect(camera.zoom, name).toBeLessThanOrEqual(MAX_ZOOM);
        if (camera.zoom > 1) leaned += 1;
        const focus = actorFocus(before, now);
        if (focus) expect(inside(now, seenAt(camera, [Math.min(Math.max(focus.at[0], 0), now.cols), Math.min(Math.max(focus.at[1], 0), now.rows)])), `${name}: the focus`).toBe(true);
        for (const corner of [
          [pose.left, pose.top],
          [pose.left + ACTOR_W, pose.top + ACTOR_H],
        ] as [number, number][])
          expect(inside(now, seenAt(camera, corner)), `${name}: the host`).toBe(true);
        for (const piece of now.pieces) {
          if (piece.gone) continue;
          // A piece written partly off the stage is held to what was on the stage before the camera moved.
          const x0 = Math.max(piece.x, 0);
          const y0 = Math.max(piece.y - (piece.badge ? 0.55 : 0), 0);
          const x1 = Math.min(piece.x + (piece.w ?? 1), now.cols);
          const y1 = Math.min(piece.y + (piece.h ?? 1), now.rows);
          expect(inside(now, seenAt(camera, [x0, y0])) && inside(now, seenAt(camera, [x1, y1])), `${name}: piece ${piece.id}`).toBe(true);
        }
        before = now;
        left = pose.left;
      }
    }
    // The camera does lean in somewhere: it is not a rule that never fires.
    expect(leaned).toBeGreaterThan(100);
  });
});

describe('the host acting', () => {
  const n = (value: number) => [{ number: value }];
  it('a counting moment is one number said alone', () => {
    expect(isCount(n(3))).toBe(true);
    expect(isCount(['Three.'])).toBe(false);
    expect(isCount(['There are', { number: 3 }])).toBe(false);
  });

  it('hops when a run of counting ends, and only then', () => {
    const says = [['Count with me.'], n(1), n(2), n(3), ['Three apples.']];
    expect(says.map((_, i) => cueIn(says, i, false).hop)).toEqual([false, false, false, true, false]);
    // A count that runs to the end of a stretch also finishes.
    expect(cueIn([n(1), n(2)], 1, false).hop).toBe(true);
  });

  it('looks up and nods on the last moment before a turn', () => {
    const says = [['One.'], ['Two.']];
    expect(cueIn(says, 0, true)).toEqual({ lookUp: false, nod: false, hop: false });
    expect(cueIn(says, 1, true)).toEqual({ lookUp: true, nod: true, hop: false });
    expect(cueIn(says, 1, false)).toEqual({ lookUp: false, nod: false, hop: false });
  });

  it('reads the cues from a lesson and from a why', () => {
    const shown = (say: Parameters<typeof moment>[0]) => ({ kind: 'show' as const, moment: moment(say, 'x', apples) });
    const [, , make] = allLessons()[0]!;
    const turnPart = make().parts.find((part) => part.kind === 'turn');
    if (turnPart?.kind !== 'turn') throw new Error('a lesson with a turn');
    const lesson: Lesson = { parts: [shown(['Look.']), shown(n(1)), shown(n(2)), turnPart, shown(['The end.'])] };
    expect(partCue(lesson, 0)).toEqual({ lookUp: false, nod: false, hop: false });
    expect(partCue(lesson, 1).hop).toBe(false);
    expect(partCue(lesson, 2)).toEqual({ lookUp: true, nod: true, hop: true });
    expect(partCue(lesson, 3)).toEqual({ lookUp: false, nod: false, hop: false });
    expect(partCue(lesson, 4).nod).toBe(false);
    const why = turnPart.turn.why;
    expect(whyCue(turnPart.turn, why.length - 1).nod).toBe(true);
  });
});

describe('counters landing', () => {
  const frame = scene([...group('c', { kind: 'cell' }, 3, 0, 0), ...group('r', art('🔴'), 3, 0, 0).map((piece) => ({ ...piece, gone: true }))]);
  it('clacks when a counter appears, once however many appear', () => {
    expect(countersLand(null, frame)).toBe(false);
    expect(countersLand(frame, frame)).toBe(false);
    expect(countersLand(frame, set(frame, ['r0'], { gone: false }))).toBe(true);
    expect(countersLand(frame, set(frame, ['r0', 'r1', 'r2'], { gone: false }))).toBe(true);
  });

  it('stays quiet for other pieces', () => {
    expect(countersLand(apples, set(apples, ['a0'], { lit: true }))).toBe(false);
    const hidden = set(apples, ['a0'], { gone: true });
    expect(countersLand(hidden, apples)).toBe(false);
  });
});
