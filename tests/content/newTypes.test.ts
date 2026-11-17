// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question } from '../../src/engine/types';

// The challenge levels that use the question types of plan section 15.4, added Nov 17, 2026.
const all = (skillId: string, level: Level): Question[] => Array.from({ length: 300 }, (_, i) => generateQuestion(skillId, level, i + 1));
const only = <T extends Question['type']>(questions: Question[], type: T): Extract<Question, { type: T }>[] => {
  for (const question of questions) expect(question.type).toBe(type);
  return questions as Extract<Question, { type: T }>[];
};

describe('the new top levels', () => {
  it('Grade 2 A.6 level 4: put the dot on a number of a 10-step line counting by 5 or 10, never at an end or the middle', () => {
    for (const q of only(all('M-2-A6', 4), 'numberLineTap')) {
      expect([5, 10]).toContain(q.line.step);
      expect((q.line.max - q.line.min) / q.line.step).toBe(10);
      expect([q.line.min, q.line.max, q.line.min + 5 * q.line.step]).not.toContain(q.answer);
    }
  });

  it('Grade 3 E.2 level 4: put the dot on a fraction between 0 and 1', () => {
    for (const q of only(all('M-3-E2', 4), 'numberLineTap')) {
      expect(q.line.denominator).toBe(q.line.max);
      expect(q.answer > 0 && q.answer < q.line.max).toBe(true);
    }
  });

  it('Grade 1 C.1 level 4 sets hours and half hours; Grade 2 C.1 level 4 sets five-minute times, from 12 o\'clock', () => {
    for (const q of only(all('M-1-C1', 4), 'setClock')) {
      expect(q.minuteStep).toBe(30);
      expect([0, 30]).toContain(q.answer.minute);
    }
    for (const q of only(all('M-2-C1', 4), 'setClock')) {
      expect(q.minuteStep).toBe(5);
      expect(q.answer.minute % 5).toBe(0);
      expect(q.start).toEqual({ hour: 12, minute: 0 });
    }
  });

  it('Grade 2 C.4 level 4 builds a bar graph to 10 from tally marks', () => {
    for (const q of only(all('M-2-C4', 4), 'buildBar')) {
      expect(q.max).toBe(10);
      expect(q.categories).toHaveLength(3);
      expect(q.answer).toEqual(q.facts.values);
    }
  });

  it('Grade 3 B.1 and B.2 level 4 are written in columns, with two regroups', () => {
    for (const q of only(all('M-3-B1', 4), 'columnSum')) expect([q.op, q.answer]).toEqual(['+', q.top + q.bottom]);
    for (const q of only(all('M-3-B2', 4), 'columnSum')) expect([q.op, q.answer]).toEqual(['-', q.top - q.bottom]);
  });

  it('Grade 1 B.5 level 4 and End marks level 3 move a number or a mark into the gap', () => {
    const missing = only(all('M-1-B5', 4), 'dragWord');
    expect(new Set(missing.map((q) => q.facts.blank))).toEqual(new Set(['a', 'b']));
    for (const q of only(all('E-1-C3', 3), 'dragWord')) {
      expect(q.after).toBe('');
      expect(q.options).toHaveLength(3);
    }
  });
});
