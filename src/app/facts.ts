import type { Fact, FactRecord } from '../engine/facts';
import { isFluent, recordAnswer } from '../engine/facts';
import type { Say } from '../engine/types';
import type { FactState } from '../storage/schema';

// The app's side of fast facts: saved rows to the engine's records and back.

export function recordsOf(states: readonly FactState[]): Map<string, FactRecord> {
  return new Map(states.map((state) => [state.factId, { factId: state.factId, answers: state.answers, right: state.right, recent: state.recent }]));
}

export interface FactAnswer {
  state: FactState;
  right: boolean;
  becameFluent: boolean;
}

// One answer to one fact. The time is measured but never shown on the fact itself.
export function answerFact(childId: string, fact: Fact, held: FactRecord | undefined, value: number, ms: number, at: string): FactAnswer {
  const right = value === fact.answer;
  const record = recordAnswer(held, fact.id, right, ms);
  return {
    state: { childId, factId: fact.id, answers: record.answers, right: record.right, recent: record.recent, updatedAt: at },
    right,
    becameFluent: !isFluent(held, fact.op) && isFluent(record, fact.op),
  };
}

const OP_WORD: Record<Fact['op'], string> = { '+': 'plus', '-': 'minus', '×': 'times', '÷': 'divided by' };
export const factText = (fact: Fact): string => `${fact.a} ${fact.op === '-' ? '−' : fact.op} ${fact.b}`;
export const factSay = (fact: Fact): Say => [{ number: fact.a }, OP_WORD[fact.op], { number: fact.b }];
// What the race says: the fact read aloud on the speaker, and the right answer after a miss.
export const factAskSay = (fact: Fact): Say => [...factSay(fact), 'equals what?'];
export const factMissSay = (fact: Fact): Say => ['Not quite.', ...factSay(fact), 'is', { number: fact.answer }, '.'];

// "1:05" for a round's time.
export function clockText(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
