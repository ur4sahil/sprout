import type { Oracle } from './types';
import { text } from './types';

// Facts about shapes, kept here and nowhere else the generators can read.
// sides and corners: straight sides and the corners between them. A circle and an oval have none.
const FLAT: Record<string, { sides: number; corners: number }> = {
  circle: { sides: 0, corners: 0 },
  oval: { sides: 0, corners: 0 },
  triangle: { sides: 3, corners: 3 },
  square: { sides: 4, corners: 4 },
  rectangle: { sides: 4, corners: 4 },
  diamond: { sides: 4, corners: 4 },
  trapezoid: { sides: 4, corners: 4 },
  pentagon: { sides: 5, corners: 5 },
  hexagon: { sides: 6, corners: 6 },
};
const SOLID = new Set(['cube', 'sphere', 'cone', 'cylinder']);

// ask: sides, corners (a number), solid (true for a solid shape, false for a flat one),
// name (the shape's own name), closed (false when the facts say the outline has a gap).
export const shapeFacts: Oracle = (facts) => {
  const shape = text(facts, 'shape');
  const ask = text(facts, 'ask');
  const flat = FLAT[shape];
  if (!flat && !SOLID.has(shape)) throw new Error(`oracle shapeFacts: unknown shape ${shape}`);
  if (ask === 'sides' || ask === 'corners') {
    if (!flat) throw new Error(`oracle shapeFacts: ${shape} is not a flat shape with sides to count`);
    return { kind: 'value', value: flat[ask] };
  }
  if (ask === 'solid') return { kind: 'value', value: SOLID.has(shape) };
  if (ask === 'name') return { kind: 'value', value: shape };
  if (ask === 'closed') {
    if (!flat) throw new Error('oracle shapeFacts: only a flat shape is open or closed');
    return { kind: 'value', value: facts.open !== true };
  }
  throw new Error(`oracle shapeFacts: unknown ask ${ask}`);
};
