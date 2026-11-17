// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { FactRecord } from '../../src/engine/facts';
import { FACT_SETS, factSetById, fluentShare, isFluent, openSets, pickRound, quickMs, recordAnswer, troubleFacts } from '../../src/engine/facts';
import { makeRng } from '../../src/engine/rng';

const set = (id: string) => {
  const found = factSetById(id);
  if (!found) throw new Error(id);
  return found;
};

describe('fact sets', () => {
  it('hold every fact once, each with the right answer, in both orders', () => {
    for (const each of FACT_SETS) {
      expect(new Set(each.facts.map((f) => f.id)).size, each.id).toBe(each.facts.length);
      for (const f of each.facts) {
        const answer = f.op === '+' ? f.a + f.b : f.op === '-' ? f.a - f.b : f.op === '×' ? f.a * f.b : f.a / f.b;
        expect(f.answer).toBe(answer);
        expect(Number.isInteger(f.answer) && f.answer >= 0).toBe(true);
      }
    }
    const adding = set('add20').facts.map((f) => f.id);
    expect(adding).toContain('7+8');
    expect(adding).toContain('8+7');
    expect(set('add10').facts.every((f) => f.answer <= 10)).toBe(true);
    expect(set('add20').facts.every((f) => f.answer > 10 && f.answer <= 20)).toBe(true);
    expect(set('sub20').facts.every((f) => f.a > 10 && f.b <= 10 && f.answer <= 10)).toBe(true);
    expect(set('times6789').facts.map((f) => f.id)).toEqual(expect.arrayContaining(['6×7', '7×6', '9×9']));
    expect(set('divide').facts.every((f) => f.b >= 2 && f.answer >= 1 && f.answer <= 10)).toBe(true);
    expect(FACT_SETS.every((each) => each.facts.length >= 20)).toBe(true);
  });

  it('open by grade, or earlier when a parent opens one', () => {
    expect(openSets('K', []).map((s) => s.id)).toEqual([]);
    expect(openSets('1', []).map((s) => s.id)).toEqual(['add10', 'sub10']);
    expect(openSets('2', ['times2510']).map((s) => s.id)).toEqual(['add10', 'sub10', 'add20', 'sub20', 'times2510']);
    expect(openSets('3', []).length).toBe(FACT_SETS.length);
  });
});

describe('fluent', () => {
  it('means right and quick twice in a row: 3 seconds to add or take away, 4 to times or divide', () => {
    expect([quickMs('+'), quickMs('-'), quickMs('×'), quickMs('÷')]).toEqual([3000, 3000, 4000, 4000]);
    let r: FactRecord | undefined;
    r = recordAnswer(r, '7+8', true, 2500);
    expect(isFluent(r, '+')).toBe(false);
    r = recordAnswer(r, '7+8', true, 2900);
    expect(isFluent(r, '+')).toBe(true);
    // A slow right answer counts as right but is not quick.
    r = recordAnswer(r, '7+8', true, 3500);
    expect(isFluent(r, '+')).toBe(false);
    expect(r).toMatchObject({ answers: 3, right: 3 });
    expect(isFluent({ factId: '6×7', answers: 2, right: 2, recent: [{ right: true, ms: 3900 }, { right: true, ms: 3600 }] }, '×')).toBe(true);
    // A miss breaks it.
    r = recordAnswer(recordAnswer(r, '7+8', true, 1000), '7+8', false, 1000);
    expect(isFluent(r, '+')).toBe(false);
    expect(r.recent).toHaveLength(4);
  });
});

describe('a round', () => {
  it('is 20 facts, mostly ones not yet fluent, with a few fluent ones kept', () => {
    const adding = set('add20');
    const records = new Map<string, FactRecord>();
    for (const f of adding.facts.slice(0, 30)) records.set(f.id, { factId: f.id, answers: 2, right: 2, recent: [{ right: true, ms: 1000 }, { right: true, ms: 1000 }] });
    const round = pickRound(adding, records, makeRng(7));
    expect(round).toHaveLength(20);
    const fluent = round.filter((f) => isFluent(records.get(f.id), f.op));
    expect(fluent.length).toBe(4);
    expect(new Set(round.map((f) => f.id)).size).toBe(20);
  });

  it('keeps fluent facts going once a whole set is fluent', () => {
    const adding = set('add20');
    const records = new Map<string, FactRecord>(adding.facts.map((f) => [f.id, { factId: f.id, answers: 2, right: 2, recent: [{ right: true, ms: 1000 }, { right: true, ms: 1000 }] }]));
    expect(pickRound(adding, records, makeRng(3))).toHaveLength(20);
    expect(fluentShare(adding, records)).toBe(1);
  });

  it('is the same for the same seed', () => {
    expect(pickRound(set('times34'), new Map(), makeRng(11))).toEqual(pickRound(set('times34'), new Map(), makeRng(11)));
  });
});

describe('what a parent sees', () => {
  it('lists facts that are often wrong, and facts right but slow', () => {
    const adding = set('add10');
    const records = new Map<string, FactRecord>([
      ['3+4', { factId: '3+4', answers: 4, right: 1, recent: [] }],
      ['5+2', { factId: '5+2', answers: 3, right: 3, recent: [{ right: true, ms: 6000 }, { right: true, ms: 5000 }, { right: true, ms: 7000 }] }],
      ['1+1', { factId: '1+1', answers: 3, right: 3, recent: [{ right: true, ms: 900 }, { right: true, ms: 900 }] }],
      ['2+2', { factId: '2+2', answers: 1, right: 0, recent: [] }],
    ]);
    expect(troubleFacts(adding, records).map((t) => [t.fact.id, t.why])).toEqual([['3+4', 'wrong'], ['5+2', 'slow']]);
  });
});
