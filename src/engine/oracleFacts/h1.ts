// The facts each oracle added by wave H1 reads (see ORACLE_FACTS in types.ts).
// Each name starts with h1, so it cannot clash with an oracle another wave adds.
export const FACTS = {
  h1Ordinal: ['line', 'ask'],
  h1Enough: ['need', 'have', 'ask'],
  h1WhichSign: ['a', 'b', 'result'],
  h1SentenceFor: ['a', 'b', 'op', 'ask'],
  h1ObjectShape: ['ask'],
  h1Solids: ['ask'],
  h1MeasureOrder: ['kind', 'ask'],
  h1SortRule: ['groups'],
  h1PatternKind: ['target'],
  h1TensOnes: ['n'],
  h1Chart: ['topLeft', 'blank'],
  h1FactFamily: ['numbers', 'ask'],
  h1Balance: ['left', 'right'],
  h1DownToTen: ['a', 'b'],
  h1Calendar: ['kind', 'start', 'shift'],
  h1Transitive: ['pairs', 'ask'],
  h1ShareSize: ['parts', 'ask'],
} as const satisfies Record<string, readonly string[]>;
