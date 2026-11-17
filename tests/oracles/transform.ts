import type { Oracle } from './types';
import { list, num, text } from './types';

// A shape after quarter turns and, when facts.flip is true, a mirror flip at the end.
// A shape's position is how many quarter turns clockwise it stands at (0 to 3) and whether it is
// flipped. The app draws a flip before the turn, so a mirror, which swaps left and right of the
// whole picture, also reverses the turn: 1 becomes 3.
// The answer is the quarter turns, followed by "f" when flipped: "2" or "3f".
// With facts.colors, the colour also changes each step, round the list: after facts.shown steps the
// next one has colors[shown mod length], and the answer is "2|red".
export const transform: Oracle = (facts) => {
  text(facts, 'shape');
  const start = num(facts, 'startTurn');
  const turns = num(facts, 'turns');
  if (![start, turns].every((value) => Number.isInteger(value) && value >= 0)) throw new Error('oracle transform: turns must be whole numbers');
  if (typeof facts.flip !== 'boolean') throw new Error('oracle transform: facts.flip must be true or false');
  const turned = (start + turns) % 4;
  const pose = facts.flip ? `${(4 - turned) % 4}f` : String(turned);
  if (facts.colors === undefined) return { kind: 'value', value: pose };
  const colors = list(facts, 'colors').map(String);
  const shown = num(facts, 'shown');
  if (colors.length < 2 || new Set(colors).size !== colors.length) throw new Error('oracle transform: a colour change needs two or more different colours');
  if (!Number.isInteger(shown) || shown < 1) throw new Error('oracle transform: shown must be a whole number of steps');
  return { kind: 'value', value: `${pose}|${colors[shown % colors.length] as string}` };
};
