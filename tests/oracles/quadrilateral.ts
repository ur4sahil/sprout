import type { Oracle } from './types';
import { text } from './types';

// Facts about four-sided shapes, kept apart from the generators. ask: four (of facts.options, the one shape
// with 4 sides), notFour (the one without), clue (the shape whose sides and corners match equalSides and
// squareCorners).
const SIDES: Record<string, number> = { square: 4, rectangle: 4, diamond: 4, trapezoid: 4, triangle: 3, pentagon: 5, hexagon: 6, circle: 0 };
const QUAD: Record<string, { equalSides: boolean; squareCorners: boolean }> = {
  square: { equalSides: true, squareCorners: true },
  rectangle: { equalSides: false, squareCorners: true },
  trapezoid: { equalSides: false, squareCorners: false },
};

export const quadrilateral: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (!Array.isArray(facts.options)) throw new Error('oracle quadrilateral: facts.options is needed');
  const options = facts.options.map(String);
  const pick = (keep: (name: string) => boolean, what: string): string => {
    const found = options.filter(keep);
    if (found.length !== 1) throw new Error(`oracle quadrilateral: ${found.length} options are ${what}`);
    return found[0] as string;
  };
  const sides = (name: string): number => {
    const count = SIDES[name];
    if (count === undefined) throw new Error(`oracle quadrilateral: unknown shape ${name}`);
    return count;
  };
  if (ask === 'four') return { kind: 'value', value: pick((name) => sides(name) === 4, 'four-sided') };
  if (ask === 'notFour') return { kind: 'value', value: pick((name) => sides(name) !== 4, 'not four-sided') };
  if (ask === 'clue') {
    return { kind: 'value', value: pick((name) => QUAD[name]?.equalSides === facts.equalSides && QUAD[name]?.squareCorners === facts.squareCorners, 'a match for the clue') };
  }
  throw new Error(`oracle quadrilateral: unknown ask ${ask}`);
};
