import type { Oracle } from './types';
import { list, text } from './types';

// What each coin is worth, kept here and nowhere the generators can read.
const CENTS: Record<string, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };

// ask: total (the coins' worth in cents), name (the one coin's name), value (the one coin's worth),
// worthMore (which of the coins is worth the most, by its place).
export const money: Oracle = (facts) => {
  const coins = list(facts, 'coins').map((coin) => {
    if (typeof coin !== 'string' || !(coin in CENTS)) throw new Error(`oracle money: unknown coin ${String(coin)}`);
    return coin;
  });
  const ask = text(facts, 'ask');
  const cents = coins.map((coin) => CENTS[coin] as number);
  if (ask === 'total') return { kind: 'value', value: cents.reduce((sum, value) => sum + value, 0) };
  if (ask === 'name' || ask === 'value') {
    if (coins.length !== 1) throw new Error('oracle money: naming needs exactly one coin');
    return { kind: 'value', value: ask === 'name' ? (coins[0] as string) : (cents[0] as number) };
  }
  if (ask === 'worthMore') {
    const most = Math.max(...cents);
    const found = cents.flatMap((value, index) => (value === most ? [index] : []));
    if (coins.length < 2 || found.length !== 1) throw new Error('oracle money: no single coin is worth the most');
    return { kind: 'index', index: found[0] as number };
  }
  throw new Error(`oracle money: unknown ask ${ask}`);
};
