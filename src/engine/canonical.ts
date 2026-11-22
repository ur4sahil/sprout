import type { FactValue, Facts, Level, Visual } from './types';

// Canonical forms: two things that are the same to a child get the same text.

// JSON with object keys in a fixed order.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// A question's key: skill, level and its facts, leaving out the option list.
// Two questions with the same key are the same question to a child.
export function questionKey(skillId: string, level: Level, facts: Facts): string {
  const rest: Record<string, FactValue> = {};
  for (const [name, value] of Object.entries(facts)) {
    if (name !== 'options') rest[name] = value;
  }
  return `${skillId}|${level}|${canonicalJson(rest)}`;
}

// How far a shape can turn before it looks the same again, in degrees.
const TURN_SYMMETRY: Record<string, number> = {
  circle: 1, // any turn at all
  square: 90,
  triangle: 120,
  rectangle: 180,
  hexagon: 60,
  star: 72,
  pentagon: 72,
  oval: 180,
  heart: 360,
  trapezoid: 360,
  arrow: 360,
  lShape: 360,
  flag: 360,
};

// Shapes with no line of symmetry. A flip of any other shape is the same picture.
const NO_MIRROR = new Set(['lShape', 'flag']);

function normalTurn(shape: string, rotation: number): number {
  const period = TURN_SYMMETRY[shape] ?? 360;
  if (period === 1) return 0;
  return (((Math.round(rotation) % period) + period) % period);
}

type Plain = string | number | boolean | Plain[] | { [key: string]: Plain };

// The form used to decide whether two visuals are the same picture.
// Spoken labels are left out: they are not part of the picture.
export function canonicalVisual(visual: Visual | 'blank'): Plain {
  if (visual === 'blank') return 'blank';
  switch (visual.kind) {
    case 'shape': {
      // A diamond is drawn as a square standing on a corner, so it is the same picture as a square turned 45 degrees.
      const shape = visual.shape === 'diamond' ? 'square' : visual.shape;
      const turned = visual.shape === 'diamond' ? visual.rotation + 45 : visual.rotation;
      const out: { [key: string]: Plain } = {
        kind: 'shape',
        shape,
        color: visual.color,
        size: visual.size,
        rotation: normalTurn(shape, turned),
      };
      if (visual.flip && NO_MIRROR.has(visual.shape)) out.flip = true;
      if (visual.open) out.open = true;
      return out;
    }
    case 'emojiGroup': {
      const out: { [key: string]: Plain } = {
        kind: 'emojiGroup',
        emoji: visual.emoji,
        count: visual.count,
        layout: visual.layout,
      };
      // Within one kind of picture the order of its places does not matter; which kind sits where does.
      if (visual.slots) {
        const first = visual.slots.slice(0, visual.count).sort((a, b) => a - b);
        const second = visual.slots.slice(visual.count).sort((a, b) => a - b);
        out.slots = [...first, ...second];
      }
      if (visual.crossed) out.crossed = visual.crossed;
      if (visual.numbered) out.numbered = true;
      if (visual.emoji2 !== undefined && visual.count2) {
        out.emoji2 = visual.emoji2;
        out.count2 = visual.count2;
      }
      // Words printed under a picture are part of what a child sees.
      if (visual.caption) out.caption = visual.caption;
      return out;
    }
    case 'sequence':
      return { kind: 'sequence', items: visual.items.map((item) => canonicalVisual(item)) };
    case 'matrix':
      return { kind: 'matrix', cells: visual.cells.map((cell) => canonicalVisual(cell)) };
    case 'row':
      return { kind: 'row', children: visual.children.map((child) => canonicalVisual(child)) };
    case 'coins':
      // The same coins in another order are the same handful.
      return { kind: 'coins', coins: visual.coins.slice().sort() };
    case 'foldPunch':
      return {
        kind: 'foldPunch',
        fold: visual.fold,
        state: visual.state,
        holes: visual.holes
          .map((hole) => ({ col: hole.col, row: hole.row }))
          .sort((a, b) => a.row - b.row || a.col - b.col),
      };
    default: {
      const out: { [key: string]: Plain } = {};
      for (const [name, value] of Object.entries(visual)) {
        if (name !== 'speak' && value !== undefined) out[name] = value as Plain;
      }
      return out;
    }
  }
}

export function samePicture(a: Visual | 'blank', b: Visual | 'blank'): boolean {
  return canonicalJson(canonicalVisual(a)) === canonicalJson(canonicalVisual(b));
}
