// The facts each oracle added by wave H5 reads (see ORACLE_FACTS in types.ts).
// expression3: a written number sentence (facts.expr, facts.exprs or facts.options) and ask.
// operation3: the kind of story and ask (sign, or the sentence from facts.a and facts.b).
export const FACTS = { expression3: ['ask'], operation3: ['kind', 'ask'] } as const satisfies Record<string, readonly string[]>;
