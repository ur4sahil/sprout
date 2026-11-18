import type { Piece, Scene } from './types';

// Where the lesson host stands and what it reaches for (plan section 16, the owner's choice of Nov 18, 2026: a
// drawn character that moves the things, points and counts). Worked out from the scene before and the scene now,
// so every lesson gets it with nothing written by hand.

export const ACTOR_W = 2.2; // the host's body, in stage squares
export const ACTOR_H = 2.64;
const SIDE = 0.5; // how far to the side of what it touches the host stands
const REACH = 3.2; // the longest its arm stretches; past that it points from where it stands

export interface ActorPose {
  left: number; // the body's left edge, in squares
  top: number;
  faces: 'left' | 'right';
  // The arm: from the shoulder, this long, at this angle (degrees, 0 = straight out to the right, 90 = down).
  shoulder: { x: number; y: number };
  length: number;
  angle: number;
  doing: 'resting' | 'pointing' | 'moving';
}

const centre = (piece: Piece): [number, number] => [piece.x + (piece.w ?? 1) / 2, piece.y + (piece.h ?? 1) / 2];
const shown = (piece: Piece): boolean => !piece.gone;

function middle(pieces: readonly Piece[]): [number, number] {
  const points = pieces.map(centre);
  return [points.reduce((sum, [x]) => sum + x, 0) / points.length, points.reduce((sum, [, y]) => sum + y, 0) / points.length];
}

// What the host attends to in this scene, most telling first: the pointing hand, pieces that moved, pieces that
// just appeared, pieces that just lit up, then anything lit. Null: nothing in particular.
export function actorFocus(before: Scene | null, now: Scene): { at: [number, number]; doing: 'pointing' | 'moving' } | null {
  const hand = now.pieces.find((piece) => piece.look.kind === 'hand' && shown(piece));
  if (hand) return { at: [hand.x + (hand.w ?? 1) / 2, hand.y], doing: 'pointing' };
  const was = new Map((before?.pieces ?? []).map((piece) => [piece.id, piece]));
  const real = now.pieces.filter((piece) => piece.look.kind !== 'hand' && shown(piece));
  if (before) {
    const moved = real.filter((piece) => {
      const old = was.get(piece.id);
      return old !== undefined && shown(old) && (Math.abs(old.x - piece.x) > 0.01 || Math.abs(old.y - piece.y) > 0.01);
    });
    if (moved.length > 0) return { at: middle(moved), doing: 'moving' };
    const arrived = real.filter((piece) => {
      const old = was.get(piece.id);
      return old === undefined || !shown(old);
    });
    if (arrived.length > 0 && arrived.length < real.length) return { at: middle(arrived), doing: 'pointing' };
    const newlyLit = real.filter((piece) => piece.lit && !was.get(piece.id)?.lit);
    if (newlyLit.length > 0) return { at: middle(newlyLit), doing: 'pointing' };
  }
  const lit = real.filter((piece) => piece.lit);
  if (lit.length > 0) return { at: middle(lit), doing: 'pointing' };
  return null;
}

// The host's pose for a scene. With nothing to attend to it stays where it stood, arm down.
export function actorPose(before: Scene | null, now: Scene, stoodAt: number | null): ActorPose {
  const top = now.rows - ACTOR_H;
  const focus = actorFocus(before, now);
  if (!focus) {
    const left = Math.min(Math.max(stoodAt ?? 0, 0), now.cols - ACTOR_W);
    const faces = left + ACTOR_W / 2 < now.cols / 2 ? 'right' : 'left';
    const shoulder = { x: left + ACTOR_W / 2 + (faces === 'right' ? 0.8 : -0.8), y: top + ACTOR_H * 0.66 };
    return { left, top, faces, shoulder, length: 0.6, angle: faces === 'right' ? 70 : 110, doing: 'resting' };
  }
  const [fx, fy] = focus.at;
  // Where to stand: beside what it touches, but not on top of the pieces. Every half square along the floor is
  // tried; a spot costs a lot for each piece it would stand over, and a little for each square away from the focus.
  // A piece not shown yet counts half: it is about to appear there.
  const pieces = now.pieces.filter((piece) => piece.look.kind !== 'hand');
  const covered = (left: number): number =>
    pieces
      .filter((piece) => piece.x < left + ACTOR_W - 0.3 && piece.x + (piece.w ?? 1) > left + 0.3 && piece.y + (piece.h ?? 1) > top + 0.5)
      .reduce((sum, piece) => sum + (shown(piece) ? 1 : 0.5), 0);
  let left = 0;
  let best = Infinity;
  for (let at = 0; at <= now.cols - ACTOR_W + 0.001; at += 0.5) {
    const aside = Math.abs(at + ACTOR_W / 2 - fx);
    // Standing right under the focus hides the reach; a little to the side is best.
    const cost = covered(at) * 10 + Math.abs(aside - (SIDE + ACTOR_W / 2)) + (stoodAt !== null ? Math.abs(at - stoodAt) * 0.15 : 0);
    if (cost < best) {
      best = cost;
      left = at;
    }
  }
  const faces = left + ACTOR_W / 2 <= fx ? 'right' : 'left';
  const shoulder = { x: left + ACTOR_W / 2 + (faces === 'right' ? 0.8 : -0.8), y: top + ACTOR_H * 0.66 };
  const dx = fx - shoulder.x;
  const dy = fy - shoulder.y;
  const far = Math.hypot(dx, dy);
  return { left, top, faces, shoulder, length: Math.min(far, REACH), angle: (Math.atan2(dy, dx) * 180) / Math.PI, doing: focus.doing };
}
