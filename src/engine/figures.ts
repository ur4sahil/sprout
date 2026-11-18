// Shapes made of smaller pieces, for "fill the shape" questions and pictures (the owner's request, Nov 18, 2026:
// the triangles must really fit the square, and a child must be able to place them to check).
// Every figure is drawn in a 100 by 100 box. Each slot is the outline of one piece, so the pieces fit exactly.

export type Point = readonly [number, number];
export type FigureId = 'square-2tri' | 'square-4tri' | 'square-4sq' | 'rect-2sq' | 'hex-6tri' | 'hex-2trap' | 'tri-4tri';
export type PieceName = 'triangle' | 'square' | 'trapezoid';
export type WholeName = 'square' | 'rectangle' | 'hexagon' | 'triangle';

export interface Figure {
  whole: WholeName; // the big shape
  piece: PieceName; // what it is built from
  outline: Point[]; // the big shape
  slots: Point[][]; // one outline for each piece
  odd: Point[]; // a piece of the same name that does not fit (a different triangle, a smaller square ...)
}

const R3 = Math.sqrt(3);
const hexCorner = (i: number): Point => [50 + 48 * Math.cos((Math.PI / 3) * i), 50 + 48 * Math.sin((Math.PI / 3) * i)];
const hex: Point[] = [0, 1, 2, 3, 4, 5].map(hexCorner);
const C: Point = [50, 50];
// A big triangle with its point up, side 92, standing on the bottom of the box.
const T = { a: [50, 92 - (92 * R3) / 2] as Point, b: [4, 92] as Point, c: [96, 92] as Point };
const mid = (p: Point, q: Point): Point => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
// A triangle with three equal sides: a triangle, but not the one that fills a square.
const EQUILATERAL: Point[] = [[50, 22], [20, 74], [80, 74]];

export const FIGURES: Readonly<Record<FigureId, Figure>> = {
  'square-2tri': {
    whole: 'square',
    piece: 'triangle',
    outline: [[10, 10], [90, 10], [90, 90], [10, 90]],
    slots: [
      [[10, 10], [90, 10], [10, 90]],
      [[90, 10], [90, 90], [10, 90]],
    ],
    odd: EQUILATERAL,
  },
  'square-4tri': {
    whole: 'square',
    piece: 'triangle',
    outline: [[10, 10], [90, 10], [90, 90], [10, 90]],
    slots: [
      [[10, 10], [90, 10], C],
      [[90, 10], [90, 90], C],
      [[90, 90], [10, 90], C],
      [[10, 90], [10, 10], C],
    ],
    odd: EQUILATERAL,
  },
  'square-4sq': {
    whole: 'square',
    piece: 'square',
    outline: [[10, 10], [90, 10], [90, 90], [10, 90]],
    slots: [
      [[10, 10], [50, 10], [50, 50], [10, 50]],
      [[50, 10], [90, 10], [90, 50], [50, 50]],
      [[10, 50], [50, 50], [50, 90], [10, 90]],
      [[50, 50], [90, 50], [90, 90], [50, 90]],
    ],
    odd: [[35, 35], [65, 35], [65, 65], [35, 65]],
  },
  'rect-2sq': {
    whole: 'rectangle',
    piece: 'square',
    outline: [[4, 27], [96, 27], [96, 73], [4, 73]],
    slots: [
      [[4, 27], [50, 27], [50, 73], [4, 73]],
      [[50, 27], [96, 27], [96, 73], [50, 73]],
    ],
    odd: [[35, 35], [65, 35], [65, 65], [35, 65]],
  },
  'hex-6tri': {
    whole: 'hexagon',
    piece: 'triangle',
    outline: hex,
    slots: [0, 1, 2, 3, 4, 5].map((i) => [C, hexCorner(i), hexCorner((i + 1) % 6)]),
    odd: [[20, 30], [80, 30], [20, 80]],
  },
  'hex-2trap': {
    whole: 'hexagon',
    piece: 'trapezoid',
    outline: hex,
    slots: [
      [hexCorner(0), hexCorner(1), hexCorner(2), hexCorner(3)],
      [hexCorner(3), hexCorner(4), hexCorner(5), hexCorner(0)],
    ],
    odd: [[15, 40], [85, 40], [70, 70], [30, 70]],
  },
  'tri-4tri': {
    whole: 'triangle',
    piece: 'triangle',
    outline: [T.a, T.b, T.c],
    slots: [
      [T.a, mid(T.a, T.b), mid(T.a, T.c)],
      [mid(T.a, T.b), T.b, mid(T.b, T.c)],
      [mid(T.a, T.c), mid(T.b, T.c), T.c],
      [mid(T.a, T.b), mid(T.b, T.c), mid(T.a, T.c)],
    ],
    odd: [[20, 30], [80, 30], [20, 80]],
  },
};

// The figure for "how many <piece>s make this <whole>", or null when there is none.
export function figureFor(whole: string, piece: string, count: number): FigureId | null {
  const found = (Object.keys(FIGURES) as FigureId[]).find((id) => FIGURES[id].whole === whole && FIGURES[id].piece === piece && FIGURES[id].slots.length === count);
  return found ?? null;
}

// Points as an SVG points attribute.
export function pointsText(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

// Whether a point is inside a polygon (ray casting).
export function inside(point: Point, polygon: readonly Point[]): boolean {
  const [x, y] = point;
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] as Point;
    const [xj, yj] = polygon[j] as Point;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// The polygon's area, for checking that the slots cover the whole exactly.
export function area(polygon: readonly Point[]): number {
  let sum = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] as Point;
    const [xj, yj] = polygon[j] as Point;
    sum += (xj + xi) * (yj - yi);
  }
  return Math.abs(sum) / 2;
}
