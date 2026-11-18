import { generateFrom, generatorFor } from '../content/registry';
import type { Level, Question, Say } from '../engine/types';
import type { Moment, Piece, PieceLook, Scene } from './types';

// Small tools for writing lessons (plan section 16). A lesson is written as a story of scenes:
// each moment takes the scene before it and changes a few pieces, so pieces move instead of jumping.

export const COLS = 10;
export const ROWS = 6;

export function scene(pieces: Piece[], cols = COLS, rows = ROWS): Scene {
  return { cols, rows, pieces };
}

export function moment(say: Say, text: string, from: Scene): Moment {
  return { say, text, scene: from };
}

// A copy of the scene with some pieces changed. `change` gets each piece and returns it, changed or not.
export function alter(from: Scene, change: (piece: Piece) => Piece): Scene {
  return { ...from, pieces: from.pieces.map((piece) => change({ ...piece })) };
}

// A copy of the scene with the pieces whose ids are listed changed in the same way.
export function set(from: Scene, ids: readonly string[], fields: Partial<Piece>): Scene {
  const pick = new Set(ids);
  return alter(from, (piece) => (pick.has(piece.id) ? { ...piece, ...fields } : piece));
}

// A copy with every piece's highlight and badge cleared.
export function calm(from: Scene): Scene {
  return alter(from, (piece) => ({ ...piece, lit: undefined, badge: undefined }));
}

export function add(from: Scene, pieces: Piece[]): Scene {
  return { ...from, pieces: [...from.pieces, ...pieces] };
}

export function remove(from: Scene, ids: readonly string[]): Scene {
  const drop = new Set(ids);
  return { ...from, pieces: from.pieces.filter((piece) => !drop.has(piece.id)) };
}

// `count` pieces that look the same, in rows of up to `perRow`, starting at (x, y). Ids are prefix0, prefix1, ...
export function group(prefix: string, look: PieceLook, count: number, x: number, y: number, perRow = 5, size = 1): Piece[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}`, look, x: x + (i % perRow) * size, y: y + Math.floor(i / perRow) * size, w: size, h: size }));
}

export function ids(prefix: string, count: number, from = 0): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${from + i}`);
}

export const art = (emoji: string): PieceLook => ({ kind: 'art', emoji });
export const text = (value: string): PieceLook => ({ kind: 'text', text: value });
export const numeral = (value: number): PieceLook => ({ kind: 'numeral', value });

// Counting out loud: one moment for each piece, each lit in turn with its number above it, and the hand on it.
// The pieces already counted stay lit. Starts the count at `from` + 1.
export function countAlong(start: Scene, pieceIds: readonly string[], from = 0): { moments: Moment[]; end: Scene } {
  let now = calm(start);
  const moments: Moment[] = [];
  pieceIds.forEach((id, i) => {
    const piece = now.pieces.find((each) => each.id === id);
    const n = from + i + 1;
    now = alter(now, (each) => (each.id === id ? { ...each, lit: true, badge: String(n) } : each.badge ? { ...each, badge: undefined } : each));
    if (piece) now = pointAt(now, piece);
    moments.push(moment([{ number: n }], String(n), now));
  });
  return { moments, end: withoutHand(now) };
}

// The pointing hand, just below a piece.
export function pointAt(from: Scene, target: Piece): Scene {
  const hand: Piece = { id: 'hand', look: { kind: 'hand' }, x: target.x + (target.w ?? 1) / 2 - 0.4, y: target.y + (target.h ?? 1) - 0.1, w: 0.8, h: 0.8 };
  const without = from.pieces.filter((piece) => piece.id !== 'hand');
  return { ...from, pieces: [...without, hand] };
}

export function withoutHand(from: Scene): Scene {
  return set(from, ['hand'], { gone: true });
}

// A question for a turn: the first seed at that level whose facts pass `accept`, so a lesson always gets
// the same question, made and checked like any other.
export function turnQuestion(skillId: string, level: Level, accept: (facts: Record<string, unknown>) => boolean = () => true): Question {
  const generator = generatorFor(skillId);
  for (let seed = 1; seed <= 2000; seed += 1) {
    const question = generateFrom(generator, level, seed);
    if (accept(question.facts)) return question;
  }
  throw new Error(`No turn question for ${skillId} at level ${level}`);
}

export function num(facts: Record<string, unknown>, key: string): number {
  const value = facts[key];
  if (typeof value !== 'number') throw new Error(`facts.${key} is not a number`);
  return value;
}

export function str(facts: Record<string, unknown>, key: string): string {
  const value = facts[key];
  if (typeof value !== 'string') throw new Error(`facts.${key} is not a string`);
  return value;
}
