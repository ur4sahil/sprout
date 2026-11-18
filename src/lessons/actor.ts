import type { Say } from '../engine/types';
import type { Lesson, Piece, Scene, Turn } from './types';

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

// ---- Acting (game feel, phase 6) ----
// Small things the host does at telling moments, worked out from the lesson's words alone.

export interface HostCue {
  lookUp: boolean; // eyes forward and a small lean toward the child: a turn is coming
  nod: boolean; // a nod on the last moment before a turn
  hop: boolean; // a small hop as a count finishes
}

export const NO_CUE: HostCue = { lookUp: false, nod: false, hop: false };

// A counting moment says one number and nothing else ("Seven.").
export function isCount(say: Say): boolean {
  const [only] = say;
  return say.length === 1 && typeof only === 'object' && 'number' in only;
}

// The cue for moment `index` of a run of moments. `turnAfter`: the moment after the last one is a turn.
// A count finishes on a counting moment that the next moment does not carry on.
export function cueIn(says: readonly Say[], index: number, turnAfter: boolean): HostCue {
  const now = says[index];
  if (!now) return NO_CUE;
  const next = says[index + 1];
  const last = index === says.length - 1;
  const beforeTurn = last && turnAfter;
  return { lookUp: beforeTurn, nod: beforeTurn, hop: isCount(now) && !(next !== undefined && isCount(next)) };
}

// The cue for a part of a lesson that shows a moment. A run is the stretch of shown moments up to the next turn.
export function partCue(lesson: Lesson, partIndex: number): HostCue {
  const part = lesson.parts[partIndex];
  if (part?.kind !== 'show') return NO_CUE;
  const next = lesson.parts[partIndex + 1];
  const nextSay = next?.kind === 'show' ? [next.moment.say] : [];
  return cueIn([part.moment.say, ...nextSay], 0, next?.kind === 'turn');
}

// The cue for a moment of a turn's why: after the last one the turn is asked again.
export function whyCue(turn: Turn, whyIndex: number): HostCue {
  return cueIn(
    turn.why.map((each) => each.say),
    whyIndex,
    true,
  );
}

// ---- Props with life ----
// Counters clack as they land: a ten-frame square, a cube or a round counter that appears. At most one sound a
// moment, however many land at once.
const COUNTERS = new Set(['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '⚫', '⚪']);

function isCounter(piece: Piece): boolean {
  return piece.look.kind === 'cell' || piece.look.kind === 'cube' || (piece.look.kind === 'art' && COUNTERS.has(piece.look.emoji));
}

export function countersLand(before: Scene | null, now: Scene): boolean {
  if (!before) return false;
  const was = new Map(before.pieces.map((piece) => [piece.id, piece]));
  return now.pieces.some((piece) => {
    if (!isCounter(piece) || !shown(piece)) return false;
    const old = was.get(piece.id);
    return old === undefined || !shown(old);
  });
}

// ---- The camera ----
// The stage leans in toward what the lesson is about: a scale and a pan, worked out in stage squares. It never
// goes so far that a piece that can be seen, the focus or the host leaves the stage, and never past MAX_ZOOM.

export const MAX_ZOOM = 1.25;
const MIN_ZOOM_WORTH = 1.08; // a smaller lean is not worth moving the stage for: it reads as drifting, not as looking closer
const BADGE_H = 0.55; // a badge stands this far above its piece
const LIT_GROW = 0.06; // a lit piece grows by this share of its size on each side

export interface Camera {
  zoom: number; // 1 = the whole stage
  x: number; // the left edge of what is shown, in squares
  y: number; // the top edge
}

export const WIDE: Camera = { zoom: 1, x: 0, y: 0 };

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// Everything that must stay in view: every piece that can be seen (its ring and badge too), the host and the focus.
export function mustSee(now: Scene, pose: ActorPose, focus: [number, number]): Box {
  const box: Box = { x0: focus[0], y0: focus[1], x1: focus[0], y1: focus[1] };
  const take = (x0: number, y0: number, x1: number, y1: number): void => {
    box.x0 = Math.min(box.x0, x0);
    box.y0 = Math.min(box.y0, y0);
    box.x1 = Math.max(box.x1, x1);
    box.y1 = Math.max(box.y1, y1);
  };
  take(pose.left, pose.top, pose.left + ACTOR_W, pose.top + ACTOR_H);
  for (const piece of now.pieces) {
    if (!shown(piece)) continue;
    const w = piece.w ?? 1;
    const h = piece.h ?? 1;
    const grow = piece.lit ? LIT_GROW : 0;
    take(piece.x - w * grow, piece.y - h * grow - (piece.badge ? BADGE_H : 0), piece.x + w * (1 + grow), piece.y + h * (1 + grow));
  }
  return { x0: Math.max(box.x0, 0), y0: Math.max(box.y0, 0), x1: Math.min(box.x1, now.cols), y1: Math.min(box.y1, now.rows) };
}

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

export function cameraFor(before: Scene | null, now: Scene, pose: ActorPose): Camera {
  const focus = actorFocus(before, now);
  if (!focus) return WIDE;
  const at: [number, number] = [clamp(focus.at[0], 0, now.cols), clamp(focus.at[1], 0, now.rows)];
  const box = mustSee(now, pose, at);
  const zoom = Math.min(MAX_ZOOM, now.cols / Math.max(box.x1 - box.x0, 0.001), now.rows / Math.max(box.y1 - box.y0, 0.001));
  if (zoom < MIN_ZOOM_WORTH) return WIDE;
  const w = now.cols / zoom;
  const h = now.rows / zoom;
  // Centre on the focus as far as the rule allows: the window must hold the box and stay on the stage.
  const x = clamp(at[0] - w / 2, Math.max(0, box.x1 - w), Math.min(now.cols - w, box.x0));
  const y = clamp(at[1] - h / 2, Math.max(0, box.y1 - h), Math.min(now.rows - h, box.y0));
  return { zoom, x, y };
}

// Where a point of the stage is drawn once the camera has moved.
export function seenAt(camera: Camera, point: [number, number]): [number, number] {
  return [(point[0] - camera.x) * camera.zoom, (point[1] - camera.y) * camera.zoom];
}
