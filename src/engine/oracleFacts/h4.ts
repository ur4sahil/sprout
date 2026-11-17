// The facts each oracle added by wave H4 reads (see ORACLE_FACTS in types.ts).
export const FACTS = {
  h4ela: ['relation', 'target'],
} as const satisfies Record<string, readonly string[]>;
