import type { Facts } from '../../../src/engine/types';
import type { Oracle } from '../types';
import { list, num, numbers, text } from '../types';

// Oracles added by wave H2. Their names and facts are in src/engine/oracleFacts/h2.ts.
// Each keeps its own table of facts and never reads the generators' lists.

const names = (facts: Facts, name: string): string[] => list(facts, name).map(String);
function onlyOne<T>(found: T[], what: string): T {
  if (found.length !== 1) throw new Error(`oracle: ${found.length} options are ${what}`);
  return found[0] as T;
}

// ---- Things from a child's world ----

const SHAPE: Record<string, string> = { cookie: 'circle', donut: 'circle', clock: 'circle', pizza: 'triangle', tent: 'triangle', window: 'square', door: 'rectangle', phone: 'rectangle' };
const COLOUR: Record<string, string> = { apple: 'red', strawberry: 'red', cherries: 'red', banana: 'yellow', lemon: 'yellow', chick: 'yellow', frog: 'green', clover: 'green', cactus: 'green', carrot: 'orange', pumpkin: 'orange', grapes: 'purple' };
const SOLID: Record<string, string> = { 'soccer ball': 'sphere', basketball: 'sphere', present: 'cube', package: 'cube', 'paper roll': 'cylinder', drum: 'cylinder', candle: 'cylinder' };
// About how heavy, in grams.
const GRAMS: Record<string, number> = {
  ant: 0.003, bee: 0.1, butterfly: 0.5, balloon: 3, strawberry: 15, egg: 55, mouse: 20, apple: 150,
  cat: 4000, dog: 15000, watermelon: 5000, cow: 600000, horse: 500000, lion: 190000, car: 1500000,
  elephant: 5000000, truck: 10000000, whale: 40000000, ship: 50000000000,
};
const KIND: Record<string, string> = {
  dog: 'animals', cat: 'animals', pig: 'animals', rabbit: 'animals', bear: 'animals', giraffe: 'animals',
  apple: 'food', banana: 'food', cookie: 'food', pizza: 'food', cheese: 'food', carrot: 'food',
  car: 'vehicles', bus: 'vehicles', train: 'vehicles', airplane: 'vehicles', bike: 'vehicles', tractor: 'vehicles',
  shirt: 'clothes', jeans: 'clothes', socks: 'clothes', cap: 'clothes', gloves: 'clothes', shoe: 'clothes',
};
const TABLES: Record<string, Record<string, string>> = { shape: SHAPE, colour: COLOUR, solid: SOLID };

function look(table: Record<string, string> | Record<string, number>, name: string): string | number {
  const found = table[name];
  if (found === undefined) throw new Error(`oracle h2World: nothing known about ${name}`);
  return found;
}

// ask: shape, colour, solid (of facts.thing, or the one option that is facts.want),
// heavy (the option that is heaviest, or lightest when want is least), kind (a bin for each item).
export const h2World: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  const table = TABLES[ask];
  if (table) {
    if ('thing' in facts) return { kind: 'value', value: look(table, text(facts, 'thing')) };
    const want = text(facts, 'want');
    return { kind: 'value', value: onlyOne(names(facts, 'options').filter((name) => look(table, name) === want), `a ${want} ${ask}`) };
  }
  if (ask === 'heavy') {
    const options = names(facts, 'options');
    const grams = options.map((name) => look(GRAMS, name) as number);
    const wanted = text(facts, 'want') === 'least' ? Math.min(...grams) : Math.max(...grams);
    return { kind: 'value', value: onlyOne(options.filter((_, i) => grams[i] === wanted), 'the heaviest or lightest') };
  }
  if (ask === 'kind') {
    const bins = names(facts, 'binAttrs');
    return { kind: 'bins', bins: names(facts, 'items').map((item) => onlyOne(bins.flatMap((bin, i) => (bin === look(KIND, item) ? [i] : [])), `the bin for ${item}`)) };
  }
  throw new Error(`oracle h2World: unknown ask ${ask}`);
};

// A line of things, the front of the line first. ask: first, second, third, last.
export const h2Ordinal: Oracle = (facts) => {
  const line = names(facts, 'line');
  const ask = text(facts, 'ask');
  const at: Record<string, number> = { first: 0, second: 1, third: 2, last: line.length - 1 };
  const index = at[ask];
  if (index === undefined || index >= line.length) throw new Error(`oracle h2Ordinal: no ${ask} in a line of ${line.length}`);
  return { kind: 'value', value: line[index] as string };
};

// The shape of a row: each new thing gets the next letter, so red blue red blue is ABAB.
function shapeOf(row: string[]): string {
  const seen: string[] = [];
  return row.map((item) => {
    if (!seen.includes(item)) seen.push(item);
    return 'ABCDEF'[seen.indexOf(item)];
  }).join('');
}
// Of the rows, the one that repeats the same way as the target.
export const h2SamePattern: Oracle = (facts) => {
  const target = shapeOf(names(facts, 'target'));
  const rows = list(facts, 'rows').map((row) => (Array.isArray(row) ? row.map(String) : []));
  return { kind: 'index', index: onlyOne(rows.flatMap((row, i) => (shapeOf(row) === target ? [i] : [])), 'the same pattern') };
};

// The items in order: smallest first (dir up) or largest first (dir down).
export const h2OrderBy: Oracle = (facts) => {
  const values = numbers(facts, 'values');
  if (new Set(values).size !== values.length) throw new Error('oracle h2OrderBy: two values tie');
  const down = text(facts, 'dir') === 'down';
  const order = values.map((_, i) => i).sort((x, y) => (down ? (values[y] as number) - (values[x] as number) : (values[x] as number) - (values[y] as number)));
  return { kind: 'order', order };
};

// Hundreds, tens and ones that may hold more than 9. ask: number (the value of them all), tensIn (how many
// tens there are in the number written with these digits: 3 hundreds 4 tens is 34 tens).
export const h2Regroup: Oracle = (facts) => {
  const [h, t, o] = [num(facts, 'hundreds'), num(facts, 'tens'), num(facts, 'ones')];
  const ask = text(facts, 'ask');
  if (ask === 'number') return { kind: 'value', value: h * 100 + t * 10 + o };
  if (ask === 'tensIn') {
    if (t > 9 || o > 9) throw new Error('oracle h2Regroup: tensIn needs plain digits');
    return { kind: 'value', value: h * 10 + t };
  }
  throw new Error(`oracle h2Regroup: unknown ask ${ask}`);
};

// Even numbers and doubles. ask: double (the double that makes total, "7 + 7"), half (the number that, doubled,
// makes total), isDouble ("yes" when n is two equal numbers), sumParity (whether a + b is even or odd),
// pickSum (of options written "a + b", the one whose sum is facts.want, even or odd).
const parityOf = (n: number): string => (n % 2 === 0 ? 'even' : 'odd');
const sumOf = (option: string): number => {
  const parts = /^(\d+) \+ (\d+)$/.exec(option);
  if (!parts) throw new Error(`oracle h2Even: ${option} is not a sum`);
  return Number(parts[1]) + Number(parts[2]);
};
export const h2Even: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'double' || ask === 'half') {
    const total = num(facts, 'total');
    if (total % 2 !== 0) throw new Error('oracle h2Even: an odd number is not a double');
    return { kind: 'value', value: ask === 'half' ? total / 2 : `${total / 2} + ${total / 2}` };
  }
  if (ask === 'isDouble') return { kind: 'value', value: num(facts, 'n') % 2 === 0 ? 'yes' : 'no' };
  if (ask === 'sumParity') return { kind: 'value', value: parityOf(num(facts, 'a') + num(facts, 'b')) };
  if (ask === 'pickSum') {
    const want = text(facts, 'want');
    return { kind: 'value', value: onlyOne(names(facts, 'options').filter((option) => parityOf(sumOf(option)) === want), `an ${want} sum`) };
  }
  throw new Error(`oracle h2Even: unknown ask ${ask}`);
};

// The greatest or least number made from all the digits, each used once. A number never starts with 0.
export const h2Digits: Oracle = (facts) => {
  const digits = numbers(facts, 'digits');
  const ask = text(facts, 'ask');
  const down = [...digits].sort((x, y) => y - x);
  if (ask === 'greatest') return { kind: 'value', value: Number(down.join('')) };
  if (ask === 'least') {
    const up = [...digits].sort((x, y) => x - y);
    const lead = up.findIndex((d) => d > 0);
    if (lead === -1) throw new Error('oracle h2Digits: all digits are zero');
    const first = up.splice(lead, 1);
    return { kind: 'value', value: Number([...first, ...up].join('')) };
  }
  throw new Error(`oracle h2Digits: unknown ask ${ask}`);
};

// A 3 by 3 piece of a hundred chart: one step right is 1 more, one step down is 10 more.
export const h2Chart: Oracle = (facts) => {
  const blank = num(facts, 'blank');
  if (!Number.isInteger(blank) || blank < 0 || blank > 8) throw new Error('oracle h2Chart: the blank is not a cell');
  return { kind: 'value', value: num(facts, 'topLeft') + 10 * Math.floor(blank / 3) + (blank % 3) };
};

// Morning things are a.m., afternoon and evening things are p.m.
const HALF: Record<string, string> = { breakfast: 'a.m.', school: 'a.m.', rooster: 'a.m.', cereal: 'a.m.', dinner: 'p.m.', bed: 'p.m.', moon: 'p.m.', bath: 'p.m.' };
// ask: half (a.m. or p.m. for facts.thing), time (facts.hour o'clock with it), which (the option that is facts.want).
export const h2AmPm: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'half') return { kind: 'value', value: look(HALF, text(facts, 'thing')) };
  if (ask === 'time') return { kind: 'value', value: `${num(facts, 'hour')}:00 ${look(HALF, text(facts, 'thing'))}` };
  if (ask === 'which') {
    const want = text(facts, 'want');
    return { kind: 'value', value: onlyOne(names(facts, 'options').filter((name) => look(HALF, name) === want), `in the ${want}`) };
  }
  throw new Error(`oracle h2AmPm: unknown ask ${ask}`);
};

// Of sets of coins, the one worth exactly facts.target cents.
const CENTS: Record<string, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
export const h2Coins: Oracle = (facts) => {
  const target = num(facts, 'target');
  const worth = list(facts, 'sets').map((set) => (Array.isArray(set) ? set.reduce((sum: number, coin) => sum + (look(CENTS, String(coin)) as number), 0) : -1));
  return { kind: 'index', index: onlyOne(worth.flatMap((value, i) => (value === target ? [i] : [])), `worth ${target} cents`) };
};

// About how long, in centimeters.
const LENGTH_CM: Record<string, number> = { crayon: 9, spoon: 15, pencil: 18, phone: 14, door: 200, bed: 200, car: 400, bus: 1200 };
// ask: unit (centimeters under a meter, else meters), estimate (about how long, in that unit), convert (facts.meters in centimeters).
export const h2Metric: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'convert') return { kind: 'value', value: num(facts, 'meters') * 100 };
  const cm = look(LENGTH_CM, text(facts, 'thing')) as number;
  if (ask === 'unit') return { kind: 'value', value: cm < 100 ? 'centimeters' : 'meters' };
  if (ask === 'estimate') return { kind: 'value', value: cm < 100 ? `${cm} cm` : `${cm / 100} m` };
  throw new Error(`oracle h2Metric: unknown ask ${ask}`);
};

// Solid shapes. faces: flat faces. corners: points where edges meet. edges: where two flat faces meet.
// The cone's point and the cylinder's rims are left out: schools do not agree on them.
const SOLID_FACTS: Record<string, { faces: number; corners?: number; edges?: number }> = {
  cube: { faces: 6, corners: 8, edges: 12 },
  sphere: { faces: 0, corners: 0, edges: 0 },
  cylinder: { faces: 2, corners: 0 },
  cone: { faces: 1 },
};
// ask: faces, corners, edges (of facts.solid), which (the option with facts.want flat faces).
export const h2Solid: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'which') {
    const want = num(facts, 'want');
    return { kind: 'value', value: onlyOne(names(facts, 'options').filter((name) => SOLID_FACTS[name]?.faces === want), `a solid with ${want} flat faces`) };
  }
  const known = SOLID_FACTS[text(facts, 'solid')];
  const value = known && (ask === 'faces' || ask === 'corners' || ask === 'edges') ? known[ask] : undefined;
  if (value === undefined) throw new Error(`oracle h2Solid: no agreed ${ask} for ${text(facts, 'solid')}`);
  return { kind: 'value', value };
};

// Of options written as sums ("40 + 20 + 7 + 5"), the one equal to a + b.
export const h2Split: Oracle = (facts) => {
  const total = num(facts, 'a') + num(facts, 'b');
  const value = (option: string): number => option.split(' + ').reduce((sum, part) => sum + Number(part), 0);
  return { kind: 'value', value: onlyOne(names(facts, 'options').filter((option) => value(option) === total), `equal to ${total}`) };
};

export const WAVE: Record<string, Oracle> = { h2World, h2Ordinal, h2SamePattern, h2OrderBy, h2Regroup, h2Even, h2Digits, h2Chart, h2AmPm, h2Coins, h2Metric, h2Solid, h2Split };

