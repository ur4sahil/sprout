import type { Facts } from '../../src/engine/types';

// What an oracle works out from the facts alone, in the shape of the question type.
export type OracleAnswer =
  | { kind: 'value'; value: number | string | boolean | number[] } // one value, or a list of values for a bar graph
  | { kind: 'index'; index: number } // which option
  | { kind: 'indexes'; indexes: number[] } // a set of options
  | { kind: 'order'; order: number[] } // items in order
  | { kind: 'bins'; bins: number[] } // a bin for each item
  | { kind: 'pairs'; pairs: [number, number][] }; // left and right partners

export type Oracle = (facts: Facts) => OracleAnswer;

export function num(facts: Facts, name: string): number {
  const value = facts[name];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`oracle: facts.${name} is not a number`);
  return value;
}

export function text(facts: Facts, name: string): string {
  const value = facts[name];
  if (typeof value !== 'string') throw new Error(`oracle: facts.${name} is not text`);
  return value;
}

export function list(facts: Facts, name: string): Facts[string][] {
  const value = facts[name];
  if (!Array.isArray(value) || value.length === 0) throw new Error(`oracle: facts.${name} is not a list`);
  return value;
}

export function numbers(facts: Facts, name: string): number[] {
  return list(facts, name).map((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`oracle: facts.${name} holds something that is not a number`);
    return value;
  });
}

// Compares two fact values of any shape.
export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
