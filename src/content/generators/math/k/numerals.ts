import type { Rng } from '../../../../engine/rng';

function unique(values: number[]): number[] {
  return [...new Set(values)];
}

// Three numerals that include the answer, smallest first, inside lo to hi.
// The wrong ones are the slips a child makes (plan section 5, distractor rules): one off, and the
// `slips` the skill names, such as the other operation's result or a number from the question.
//
// Where the answer sits is chosen first, so it is not always the largest. A small answer cannot
// sit last, because too few numbers are below it. A skill whose answers are mostly small passes
// `weights`: how likely first, middle and last place are, among the places the answer can take.
export type PlaceWeights = readonly [number, number, number];

export function numeralChoices(answer: number, slips: readonly number[], lo: number, hi: number, rng: Rng, weights: PlaceWeights = [1, 1, 1]): number[] {
  const below = unique([answer - 1, ...slips]).filter((value) => value >= lo && value < answer);
  const above = unique([answer + 1, ...slips]).filter((value) => value > answer && value <= hi);
  if (below.length < 2 && answer - 2 >= lo) below.push(answer - 2);
  if (above.length < 2 && answer + 2 <= hi) above.push(answer + 2);
  // place = how many options are below the answer
  const places = [0, 1, 2].filter((place) => below.length >= place && above.length >= 2 - place);
  if (places.length === 0) throw new Error(`numeralChoices: no room for three numerals around ${answer} in ${lo} to ${hi}`);
  const weighted = places.flatMap((place) => Array.from({ length: weights[place] ?? 1 }, () => place));
  const place = rng.pick(weighted);
  return [...rng.sample(below, place), answer, ...rng.sample(above, 2 - place)].sort((x, y) => x - y);
}
