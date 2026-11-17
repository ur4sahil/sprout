import type { Oracle } from './types';
import { num, text } from './types';

// A rectangle length by width. ask: area (square units covering it), perimeter (the distance around it).
export const rect: Oracle = (facts) => {
  const length = num(facts, 'length');
  const width = num(facts, 'width');
  if (length < 1 || width < 1) throw new Error('oracle rect: sides must be 1 or more');
  const ask = text(facts, 'ask');
  if (ask === 'area') return { kind: 'value', value: length * width };
  if (ask === 'perimeter') return { kind: 'value', value: length + width + length + width };
  throw new Error(`oracle rect: unknown ask ${ask}`);
};
