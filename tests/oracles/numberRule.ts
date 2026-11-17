import type { Oracle } from './types';
import { list, num } from './types';

// Example pairs such as [2, 5] and [4, 7]: the one rule that fits every pair, applied to base.
// The rules: plus n, minus n, double, times 3 to 10, and double then add or take away n.
// It fails when more than one rule fits, or none.
export const numberRule: Oracle = (facts) => {
  const base = num(facts, 'base');
  const pairs = list(facts, 'examples').map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'number' || typeof pair[1] !== 'number') throw new Error('oracle numberRule: an example is not a pair of numbers');
    return [pair[0], pair[1]] as [number, number];
  });
  if (pairs.length === 0) throw new Error('oracle numberRule: no examples');
  const answers: number[] = [];
  const difference = (pairs[0] as [number, number])[1] - (pairs[0] as [number, number])[0];
  if (difference !== 0 && pairs.every(([from, to]) => to - from === difference)) answers.push(base + difference);
  if (pairs.every(([from, to]) => to === from * 2)) answers.push(base * 2);
  for (let times = 3; times <= 10; times += 1) {
    if (pairs.every(([from, to]) => to === from * times)) answers.push(base * times);
  }
  const afterDouble = (pairs[0] as [number, number])[1] - (pairs[0] as [number, number])[0] * 2;
  if (afterDouble !== 0 && pairs.every(([from, to]) => to - from * 2 === afterDouble)) answers.push(base * 2 + afterDouble);
  if (answers.length !== 1) throw new Error(`oracle numberRule: ${answers.length} rules fit the examples`);
  return { kind: 'value', value: answers[0] as number };
};
