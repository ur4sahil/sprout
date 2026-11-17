import type { Grade } from '../storage/schema';
import { gradeRank } from './grades';
import type { Rng } from './rng';

// Fact fluency (plan section 15.5): knowing 7 + 8 or 6 × 7 at once. Each fact is tracked on its own,
// so 7 + 8 and 8 + 7 are two facts. Fact fluency never touches a Skill Score.

export type FactOp = '+' | '-' | '×' | '÷';
export interface Fact {
  id: string; // "7+8", "15-7", "6×7", "42÷6"
  a: number;
  b: number;
  op: FactOp;
  answer: number;
}
export interface FactSet {
  id: string;
  name: string;
  grade: Grade; // the set opens by itself from this grade
  facts: readonly Fact[];
}

const fact = (a: number, op: FactOp, b: number): Fact => {
  const answer = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b;
  return { id: `${a}${op}${b}`, a, b, op, answer };
};

function build(make: (push: (a: number, op: FactOp, b: number) => void) => void): Fact[] {
  const out = new Map<string, Fact>();
  make((a, op, b) => {
    const each = fact(a, op, b);
    out.set(each.id, each);
  });
  return [...out.values()];
}

const times = (tables: number[]): Fact[] =>
  build((push) => {
    for (const t of tables) {
      for (let n = 1; n <= 10; n += 1) {
        push(t, '×', n);
        push(n, '×', t);
      }
    }
  });

export const FACT_SETS: readonly FactSet[] = [
  { id: 'add10', name: 'Adding within 10', grade: '1', facts: build((push) => { for (let a = 0; a <= 10; a += 1) for (let b = 0; a + b <= 10; b += 1) push(a, '+', b); }) },
  { id: 'sub10', name: 'Taking away within 10', grade: '1', facts: build((push) => { for (let a = 0; a <= 10; a += 1) for (let b = 0; b <= a; b += 1) push(a, '-', b); }) },
  { id: 'add20', name: 'Adding within 20', grade: '2', facts: build((push) => { for (let a = 1; a <= 10; a += 1) for (let b = 1; b <= 10; b += 1) if (a + b > 10) push(a, '+', b); }) },
  { id: 'sub20', name: 'Taking away within 20', grade: '2', facts: build((push) => { for (let a = 11; a <= 20; a += 1) for (let b = a - 10; b <= 10; b += 1) push(a, '-', b); }) },
  { id: 'times2510', name: 'Times 2, 5 and 10', grade: '3', facts: times([2, 5, 10]) },
  { id: 'times34', name: 'Times 3 and 4', grade: '3', facts: times([3, 4]) },
  { id: 'times6789', name: 'Times 6, 7, 8 and 9', grade: '3', facts: times([6, 7, 8, 9]) },
  { id: 'divide', name: 'Division facts', grade: '3', facts: build((push) => { for (let b = 2; b <= 10; b += 1) for (let q = 1; q <= 10; q += 1) push(b * q, '÷', b); }) },
];

export function factSetById(id: string): FactSet | undefined {
  return FACT_SETS.find((set) => set.id === id);
}

// A set is open from its grade, or earlier when a parent opened it.
export function openSets(grade: Grade, opened: readonly string[]): FactSet[] {
  return FACT_SETS.filter((set) => gradeRank(set.grade) <= gradeRank(grade) || opened.includes(set.id));
}

// How quick a right answer must be to count towards fluent.
export function quickMs(op: FactOp): number {
  return op === '+' || op === '-' ? 3000 : 4000;
}

export interface FactRecord {
  factId: string;
  answers: number;
  right: number;
  recent: { right: boolean; ms: number }[]; // the last 4, newest last
}

// Fluent: the last two answers were both right and both quick.
export function isFluent(record: FactRecord | undefined, op: FactOp): boolean {
  if (!record || record.recent.length < 2) return false;
  return record.recent.slice(-2).every((answer) => answer.right && answer.ms <= quickMs(op));
}

export function recordAnswer(record: FactRecord | undefined, factId: string, right: boolean, ms: number): FactRecord {
  const held = record ?? { factId, answers: 0, right: 0, recent: [] };
  return { factId, answers: held.answers + 1, right: held.right + (right ? 1 : 0), recent: [...held.recent, { right, ms: Math.round(ms) }].slice(-4) };
}

export const ROUND_SIZE = 20;
const KEEP = 4; // fluent facts mixed into a round so they stay fluent

// A round: facts not yet fluent first (the ones answered least, then at random), with a few fluent ones mixed
// in. A set with everything fluent gives a round of fluent facts, to keep them. No fact twice in a row.
export function pickRound(set: FactSet, records: ReadonlyMap<string, FactRecord>, rng: Rng, size = ROUND_SIZE): Fact[] {
  const fluent = set.facts.filter((each) => isFluent(records.get(each.id), each.op));
  const learning = set.facts.filter((each) => !isFluent(records.get(each.id), each.op));
  const shuffled = rng.shuffle(learning);
  const ordered = shuffled.sort((x, y) => (records.get(x.id)?.answers ?? 0) - (records.get(y.id)?.answers ?? 0));
  const keep = Math.min(fluent.length, learning.length === 0 ? size : KEEP);
  const fresh = ordered.slice(0, size - keep);
  const kept = rng.sample(fluent, Math.min(fluent.length, size - fresh.length));
  const round = rng.shuffle([...fresh, ...kept]);
  // A small set may hold fewer facts than a round: go round it again.
  while (round.length < size && set.facts.length > 0) round.push(...rng.shuffle(set.facts).slice(0, size - round.length));
  return round;
}

// The share of a set that is fluent, 0 to 1.
export function fluentShare(set: FactSet, records: ReadonlyMap<string, FactRecord>): number {
  return set.facts.filter((each) => isFluent(records.get(each.id), each.op)).length / set.facts.length;
}

// Facts a parent should know about: often wrong (under 2 in 3 right after 3 answers), or right but slow.
export function troubleFacts(set: FactSet, records: ReadonlyMap<string, FactRecord>): { fact: Fact; why: 'wrong' | 'slow' }[] {
  const out: { fact: Fact; why: 'wrong' | 'slow' }[] = [];
  for (const each of set.facts) {
    const record = records.get(each.id);
    if (!record || record.answers < 3) continue;
    if (record.right / record.answers < 2 / 3) out.push({ fact: each, why: 'wrong' });
    else if (!isFluent(record, each.op) && record.recent.some((answer) => answer.right && answer.ms > quickMs(each.op))) out.push({ fact: each, why: 'slow' });
  }
  return out;
}
