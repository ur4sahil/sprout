import type { CoinName, ShapeName } from '../engine/types';
import { PALETTE } from './palette';

// Pure geometry behind the pictures, kept apart so it can be tested without drawing.

export const INK = PALETTE.ink;

// Degrees clockwise from 12 o'clock. The hour hand sits at hour plus minute/60,
// so at half past it is halfway to the next number.
export function clockAngles(hour: number, minute: number): { hour: number; minute: number } {
  return { hour: ((hour % 12) + minute / 60) * 30, minute: (minute % 60) * 6 };
}

export function polar(cx: number, cy: number, radius: number, degreesFromTop: number): { x: number; y: number } {
  const radians = ((degreesFromTop - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function ring(count: number, radius: number, startDegrees = 0, inner?: number): string {
  const points: string[] = [];
  const total = inner === undefined ? count : count * 2;
  for (let i = 0; i < total; i += 1) {
    const r = inner !== undefined && i % 2 === 1 ? inner : radius;
    const { x, y } = polar(50, 50, r, startDegrees + (360 / total) * i);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

// Each shape in a 100 by 100 box, centred on (50, 50) so that a turn keeps it in place.
// `points` is a polygon. `path` is an SVG path. `circle` and `ellipse` are what they say.
export type ShapeOutline =
  | { type: 'circle'; r: number }
  | { type: 'ellipse'; rx: number; ry: number }
  | { type: 'polygon'; points: string }
  | { type: 'path'; d: string }
  | { type: 'flag' };

export const SHAPES: Record<ShapeName, ShapeOutline> = {
  circle: { type: 'circle', r: 42 },
  oval: { type: 'ellipse', rx: 44, ry: 27 },
  square: { type: 'polygon', points: '14,14 86,14 86,86 14,86' },
  rectangle: { type: 'polygon', points: '6,27 94,27 94,73 6,73' },
  triangle: { type: 'polygon', points: ring(3, 46) },
  pentagon: { type: 'polygon', points: ring(5, 45) },
  hexagon: { type: 'polygon', points: ring(6, 45, 30) },
  star: { type: 'polygon', points: ring(5, 47, 0, 19) },
  // A diamond is a square standing on a corner.
  diamond: { type: 'polygon', points: '50,8 92,50 50,92 8,50' },
  trapezoid: { type: 'polygon', points: '28,26 72,26 94,74 6,74' },
  heart: { type: 'path', d: 'M50 88 C 20 66 6 48 6 32 C 6 18 17 10 28 10 C 38 10 46 16 50 25 C 54 16 62 10 72 10 C 83 10 94 18 94 32 C 94 48 80 66 50 88 Z' },
  // These three have no symmetry that hides a turn or a flip.
  arrow: { type: 'polygon', points: '50,6 86,44 62,44 62,94 38,94 38,44 14,44' },
  lShape: { type: 'polygon', points: '22,8 46,8 46,68 82,68 82,92 22,92' },
  flag: { type: 'flag' },
};

// The transform for a shape: mirrored first when flipped, then turned clockwise.
export function shapeTransform(rotation: number, flip: boolean): string {
  const turn = `rotate(${rotation} 50 50)`;
  return flip ? `${turn} translate(100 0) scale(-1 1)` : turn;
}

// Real coin widths in millimetres. The dime is the smallest.
export const COIN_MM: Record<CoinName, number> = { penny: 19.05, nickel: 21.21, dime: 17.91, quarter: 24.26 };
export const COIN_COLOR: Record<CoinName, string> = { penny: PALETTE.copper, nickel: PALETTE.silver, dime: PALETTE.silver, quarter: PALETTE.silver };
export const COIN_RIDGED: Record<CoinName, boolean> = { penny: false, nickel: false, dime: true, quarter: true };

// Where each dot sits on a die face, as cells of a 3 by 3 grid numbered left to right, top to bottom.
export const DICE_CELLS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// How wide each part of a partitioned shape is, as shares that add up to 1.
// Unequal parts are clearly different in size, never nearly equal.
export function partShares(parts: number, equal: boolean): number[] {
  if (equal) return new Array<number>(parts).fill(1 / parts);
  const weights = Array.from({ length: parts }, (_, i) => (i % 2 === 0 ? 1 : 2.4) + i * 0.35);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

// A wedge of a circle, from one angle to another, as an SVG path.
export function wedge(cx: number, cy: number, radius: number, fromDegrees: number, toDegrees: number): string {
  if (toDegrees - fromDegrees >= 359.999) {
    return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`;
  }
  const a = polar(cx, cy, radius, fromDegrees);
  const b = polar(cx, cy, radius, toDegrees);
  const large = toDegrees - fromDegrees > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
}

// ---- The pictures added on Nov 22, 2026 (the owner's choice) ----

// A rectangle drawn to its sides: the longer side is `long` across, the other in proportion.
export function rectBox(length: number, width: number, long: number): { w: number; h: number } {
  const most = Math.max(length, width, 1);
  return { w: (length / most) * long, h: (width / most) * long };
}

// A paper clip lying flat, `length` long and 12 high, its left end at (x, y): the wire runs along the top, round
// the right end, back along the bottom, round the left end and in again, and bends back inside itself.
export const CLIP_HIGH = 12;
export function clipPath(x: number, y: number, length: number): string {
  const right = x + length - 6;
  return [
    `M ${x + 5} ${y}`,
    `H ${right}`,
    `A 6 6 0 0 1 ${right} ${y + 12}`,
    `H ${x + 4}`,
    `A 4 4 0 0 1 ${x + 4} ${y + 4}`,
    `H ${right - 4}`,
    `A 2 2 0 0 1 ${right - 4} ${y + 8}`,
    `H ${x + 9}`,
  ].join(' ');
}

// Where each thing sits on a plate or in a basket drawn 96 wide: one row of up to 4, or for 5 or 6 a back row and a
// front row set half a thing apart, like a little pile (the back row has the odd one). Each place is the top left
// of a picture `THING` across; no two places overlap by more than a little, so every thing can be counted.
export const HOLDER = { width: 96, height: 64, most: 6 } as const;
export const THING = 20;
export function holderSpots(each: number): { x: number; y: number }[] {
  const rows = each <= 4 ? [each] : [Math.ceil(each / 2), Math.floor(each / 2)];
  const tops = rows.length === 1 ? [26] : [14, 30];
  // Two rows of the same length would stand in columns, so they are pushed apart; 3 and 2 fall between already.
  const even = rows.length === 2 && rows[0] === rows[1];
  return rows.flatMap((count, r) => {
    const across = count * (THING + 2) - 2;
    const nudge = even ? (r === 0 ? -6 : 6) : 0;
    return Array.from({ length: count }, (_, i) => ({ x: (HOLDER.width - across) / 2 + nudge + i * (THING + 2), y: tops[r] as number }));
  });
}

// The holes of a folded paper once it is opened out (plan section 5, Paper folding).
// A vertical fold copies each hole to column 3 minus its column. A horizontal fold copies to row 3 minus its row.
export function unfoldHoles(fold: 'vertical' | 'horizontal', holes: readonly { col: number; row: number }[]): { col: number; row: number }[] {
  const out = new Map<string, { col: number; row: number }>();
  for (const hole of holes) {
    const twin = fold === 'vertical' ? { col: 3 - hole.col, row: hole.row } : { col: hole.col, row: 3 - hole.row };
    for (const each of [hole, twin]) out.set(`${each.col},${each.row}`, { col: each.col, row: each.row });
  }
  return [...out.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}
