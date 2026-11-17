// The facts each oracle added by wave H2 reads (see ORACLE_FACTS in types.ts).
// Every name starts with h2, so no other wave's oracle can take the same name.
export const FACTS = {
  h2World: ['ask'],
  h2Ordinal: ['line', 'ask'],
  h2SamePattern: ['target', 'rows'],
  h2OrderBy: ['values', 'dir'],
  h2Regroup: ['hundreds', 'tens', 'ones', 'ask'],
  h2Even: ['ask'],
  h2Digits: ['digits', 'ask'],
  h2Chart: ['topLeft', 'blank'],
  h2AmPm: ['ask'],
  h2Coins: ['target', 'sets'],
  h2Metric: ['ask'],
  h2Solid: ['solid', 'ask'],
  h2Split: ['a', 'b'],
} as const satisfies Record<string, readonly string[]>;
