import type { Rng } from '../../../../engine/rng';
import type { CoinName, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { STORY_COUNTABLES } from '../../../data/countables';
import { DAY_THINGS, METRIC_THINGS } from '../../../data/h2-world';
import { PRONOUN, SHOP, STORY_NAMES } from '../../../data/h2-stories';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { skill } from '../pk/h2-lesson';
import { line, together } from './addSubtract';
import { PICKED, coinsExplanation } from './measure';

// Math grade 2, wave H2 (plan section 15): C.8 a.m. and p.m., C.9 money word problems, C.10 make an amount
// with coins, C.11 picture graph problems, C.12 centimeters and meters.

type Explanation = QuestionDraft['explanation'];
const picture = (thing: { emoji: string; name: string }): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [thing.name] });
const AM: Say = [{ letter: 'a' }, { letter: 'm' }];
const PM: Say = [{ letter: 'p' }, { letter: 'm' }];
const halfSay = (half: 'am' | 'pm'): Say => (half === 'am' ? AM : PM);
const halfText = (half: 'am' | 'pm'): string => (half === 'am' ? 'a.m.' : 'p.m.');
const cap = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
const word = (value: string, speak: Say = [value]): Visual => ({ kind: 'text', value, size: 'l', speak });

// ---- C.8 A.M. and P.M. ----
// Levels: is it in the a.m. or the p.m. / which time, with the clock / which thing happens in the a.m. or p.m.
// Oracle: h2AmPm.

const AMPM_RULE: Explanation['speak'] = ['From midnight to noon is', ...AM, '. From noon to midnight is', ...PM, '.'];
const AMPM_STEP = 'Midnight to noon is a.m. Noon to midnight is p.m.';
// The voice reads "a.m." as a word, so a step that names it is said with the letters, as the question is.
const halfStep = (who: string, thing: { verb: string; half: 'am' | 'pm' }): { text: string; speak: Say } => {
  const when = thing.half === 'am' ? 'the morning' : 'the evening';
  return { text: `${who} ${thing.verb} in ${when}, so it is ${halfText(thing.half)}`, speak: [`${who} ${thing.verb} in ${when}, so it is`, ...halfSay(thing.half), '.'] };
};
function halfExplanation(who: string, thing: (typeof DAY_THINGS)[number], hint: string): Explanation {
  const step = halfStep(who, thing);
  return { speak: [...step.speak, ...AMPM_RULE], steps: [step.text, AMPM_STEP], stepsSay: [step.speak, AMPM_RULE], visual: picture(thing), hint: { text: hint } };
}
// The picture of a thing is said as what you do with it: "Which one do you do in the a.m.?" "eat breakfast".
const doing = (verb: string): string => verb.replace(/^goes\b/, 'go').replace(/^(\w+?)s\b/, '$1');
// A picture alone can belong to both halves of the day: school goes on into the afternoon, and a child wakes up
// in bed and can see the moon before the sun is up. Those are never offered as the wrong half.
const BOTH_HALVES: Record<'am' | 'pm', readonly string[]> = { am: ['bed', 'moon'], pm: ['school'] };

function amPm(level: Level, rng: Rng): QuestionDraft {
  const name = rng.pick(STORY_NAMES);
  if (level === 3) {
    const want = rng.pick(['am', 'pm'] as const);
    const right = rng.pick(DAY_THINGS.filter((thing) => thing.half === want));
    const offered = rng.shuffle([right, ...rng.sample(DAY_THINGS.filter((thing) => thing.half !== want && !BOTH_HALVES[want].includes(thing.name)), 2)]);
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'which', want: halfText(want), set: offered.map((thing) => thing.name).sort(), options: offered.map((thing) => thing.name) },
      prompt: { text: `Which one do you do in the ${halfText(want)}?`, speak: ['Which one do you do in the', ...halfSay(want), '?'] },
      options: offered.map((thing) => ({ ...picture(thing), speak: [doing(thing.verb)] })),
      answerIndex: offered.indexOf(right),
      explanation: halfExplanation('A child', right, want === 'am' ? 'Think about what you do in the morning.' : 'Think about what you do in the afternoon or at night.'),
    };
  }
  const thing = rng.pick(DAY_THINGS);
  const explanation = halfExplanation(name, thing, 'Think: is it in the morning, or later in the day?');
  if (level === 1) {
    const text = `${name} ${thing.verb}. Is that in the a.m. or the p.m.?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ask: 'half', thing: thing.name, name, options: ['a.m.', 'p.m.'] },
      prompt: { text, speak: [`${name} ${thing.verb}. Is that in the`, ...AM, 'or the', ...PM, '?'] },
      stimulus: picture(thing),
      options: [word('a.m.', AM), word('p.m.', PM)],
      answerIndex: thing.half === 'am' ? 0 : 1,
      explanation,
    };
  }
  const time = { hour: thing.hour, minute: 0 };
  const times = (['am', 'pm'] as const).map((half) => `${thing.hour}:00 ${halfText(half)}`);
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { ask: 'time', thing: thing.name, hour: thing.hour, name, options: times },
    prompt: { text: `${name} ${thing.verb} at this time. Which time is it?`, speak: [`${name} ${thing.verb} at this time. Which time is it?`] },
    stimulus: { kind: 'row', children: [picture(thing), { kind: 'clock', ...time }] },
    options: (['am', 'pm'] as const).map((half) => word(`${thing.hour}:00 ${halfText(half)}`, [{ time }, ...halfSay(half)])),
    answerIndex: thing.half === 'am' ? 0 : 1,
    explanation,
  };
}

export const amPmGenerator: SkillGenerator = skill({
  skillId: 'M-2-C8',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h2-world', 'h2-stories'],
  generate: amPm,
  exampleSeed: 971,
  lesson: { see: 'A clock shows each hour twice a day. A.M. is the morning. P.M. is the afternoon and the night.', remember: 'Morning is a.m. Afternoon and night are p.m.', tryLevel: 2 },
  oracle: 'h2AmPm',
});

// ---- C.9 Money word problems ----
// Levels: find more money / spend some, how much is left / buy two things, typed. Oracles: add, subtract.

const cents = (value: number): Visual => ({ kind: 'text', value: `${value}¢`, size: 'l', speak: [{ cents: value }] });

function moneyStories(level: Level, rng: Rng): QuestionDraft {
  const name = rng.pick(STORY_NAMES);
  if (level === 2) {
    const item = rng.pick(SHOP);
    const have = rng.int(item.cents / 5 + 2, 19) * 5;
    const left = have - item.cents;
    const text = `${name} has ${have}¢ and buys ${item.name} for ${item.cents}¢. How much money is left?`;
    const explanation: Explanation = { speak: [{ cents: have }, 'minus', { cents: item.cents }, 'is', { cents: left }, '.'], steps: [`${have}¢ − ${item.cents}¢ = ${left}¢.`, `${name} has ${left}¢ left.`], visual: cents(left), hint: { text: 'Spending money means subtract.' } };
    const values = numeralChoices(left, [have + item.cents, left + 10, left - 10, left + 5], 0, 200, rng);
    return {
      type: 'choice',
      mode: 'look',
      facts: { a: have, b: item.cents, oracle: 'subtract', name, item: item.name, options: values },
      prompt: { text, speak: [`${name} has`, { cents: have }, `and buys ${item.name} for`, { cents: item.cents }, '. How much money is left?'] },
      stimulus: { kind: 'row', children: [picture({ emoji: item.emoji, name: item.name.replace(/^an? /, '') }), cents(item.cents)] },
      options: values.map(cents),
      answerIndex: values.indexOf(left),
      explanation,
    };
  }
  if (level === 3) {
    const [one, two] = rng.sample(SHOP, 2) as [(typeof SHOP)[number], (typeof SHOP)[number]];
    const total = one.cents + two.cents;
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { a: one.cents, b: two.cents, oracle: 'add', name, items: [one.name, two.name] },
      prompt: { text: `${name} buys ${one.name} for ${one.cents}¢ and ${two.name} for ${two.cents}¢. How many cents is that in all?`, speak: [`${name} buys ${one.name} for`, { cents: one.cents }, `and ${two.name} for`, { cents: two.cents }, '. How many cents is that in all?'] },
      stimulus: { kind: 'row', children: [picture({ emoji: one.emoji, name: one.name.replace(/^an? /, '') }), cents(one.cents), picture({ emoji: two.emoji, name: two.name.replace(/^an? /, '') }), cents(two.cents)] },
      answer: total,
      maxDigits: 2,
      explanation: { speak: [{ cents: one.cents }, 'plus', { cents: two.cents }, 'is', { cents: total }, '.'], steps: [`${one.cents}¢ + ${two.cents}¢ = ${total}¢.`], visual: cents(total), hint: { text: 'In all means add.' } },
    };
  }
  const he = PRONOUN[name] ?? name;
  const He = `${he.charAt(0).toUpperCase()}${he.slice(1)}`;
  const have = rng.int(2, 12) * 5;
  const found = rng.int(1, 19 - have / 5) * 5;
  const total = have + found;
  const values = numeralChoices(total, [total + 10, total - 10, total - 5, found], 0, 200, rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a: have, b: found, oracle: 'add', name, options: values },
    // The one person is named once, then "he" or "she".
    prompt: { text: `${name} has ${have}¢. ${He} finds ${found}¢ more. How much money does ${he} have now?`, speak: [`${name} has`, { cents: have }, `. ${He} finds`, { cents: found }, `more. How much money does ${he} have now?`] },
    options: values.map(cents),
    answerIndex: values.indexOf(total),
    explanation: { speak: [{ cents: have }, 'plus', { cents: found }, 'is', { cents: total }, '.'], steps: [`${have}¢ + ${found}¢ = ${total}¢.`, `${name} has ${total}¢ now.`], visual: cents(total), hint: { text: 'Finding more money means add.' } },
  };
}

export const moneyStoriesGenerator: SkillGenerator = skill({
  skillId: 'M-2-C9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['h2-stories'],
  generate: moneyStories,
  exampleSeed: 972,
  lesson: { see: 'Money stories are adding and taking away, counted in cents.', remember: 'Getting more money: add. Spending money: subtract.', tryLevel: 2 },
  oracle: 'add',
});

// ---- C.10 Make an amount with coins ----
// Levels: dimes and pennies / with nickels / with quarters. Oracle: h2Coins.

const WORTH: Record<CoinName, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const ORDER: CoinName[] = ['quarter', 'dime', 'nickel', 'penny'];
const worth = (coins: CoinName[]): number => coins.reduce((sum, coin) => sum + WORTH[coin], 0);
const tidy = (coins: CoinName[]): CoinName[] => [...coins].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));

function makeSet(level: Level, rng: Rng): CoinName[] {
  const count = (coin: CoinName, n: number): CoinName[] => Array.from({ length: n }, () => coin);
  if (level === 1) return [...count('dime', rng.int(1, 4)), ...count('penny', rng.int(1, 4))];
  if (level === 2) return [...count('dime', rng.int(1, 3)), ...count('nickel', 1), ...count('penny', rng.int(0, 4))];
  return [...count('quarter', rng.int(1, 2)), ...count('dime', rng.int(0, 2)), ...count('nickel', rng.int(0, 1)), ...count('penny', rng.int(0, 3))];
}

function makeAmount(level: Level, rng: Rng): QuestionDraft {
  const right = tidy(makeSet(level, rng));
  const target = worth(right);
  const kinds = ORDER.filter((coin) => level === 3 || coin !== 'quarter').filter((coin) => level >= 2 || coin !== 'nickel');
  // The wrong sets: one coin more, one coin less, or one coin swapped for another kind.
  const near: CoinName[][] = [];
  for (const coin of kinds) near.push(tidy([...right, coin]));
  for (let i = 0; i < right.length; i += 1) {
    const less = right.filter((_, j) => j !== i);
    if (less.length > 0) near.push(less);
    for (const coin of kinds) if (coin !== right[i]) near.push(tidy([...less, coin]));
  }
  const totals = new Set([target]);
  const wrong = rng.shuffle(near).filter((set) => {
    if (totals.has(worth(set)) || set.length > 8) return false;
    totals.add(worth(set));
    return true;
  }).slice(0, 2);
  const sets = rng.shuffle([right, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target, sets, options: sets.map((set) => set.join(',')) },
    prompt: { text: `Which coins make ${target}¢?`, speak: ['Which coins make', { cents: target }, '?'] },
    options: sets.map((coins): Visual => ({ kind: 'coins', coins })),
    answerIndex: sets.indexOf(right),
    // The right set counted in C.2's words: what each coin is worth, then count on from the one worth the most
    // (or by one coin's worth, when they are all the same).
    explanation: { ...coinsExplanation(right), hint: { text: 'Count each set of coins. Start with the coin worth the most.' } },
  };
}

export const makeAmountGenerator: SkillGenerator = skill({
  skillId: 'M-2-C10',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: makeAmount,
  exampleSeed: 973,
  lesson: { see: 'To check a set of coins, count on from the coin worth the most.', remember: 'Quarters, then dimes, then nickels, then pennies.', tryLevel: 2 },
  oracle: 'h2Coins',
});

// ---- C.11 Picture graph problems ----
// Levels: how many more / how many in all / how many fewer or in all, with four rows, typed. Oracle: graph.

function graphProblems(level: Level, rng: Rng): QuestionDraft {
  const count = level === 3 ? 4 : 3;
  const things = rng.sample(STORY_COUNTABLES, count) as Countable[];
  const values = rng.sample([1, 2, 3, 4, 5, 6], count);
  const stimulus: Visual = { kind: 'graph', type: 'picture', categories: things.map((thing, i) => ({ label: thing.many, emoji: thing.emoji, value: values[i] as number })) };
  const ask = level === 2 ? 'total' : level === 1 ? 'difference' : rng.pick(['total', 'difference'] as const);
  let facts: QuestionDraft['facts'];
  let text: string;
  let speak: Say;
  let answer: number;
  let explanation: Explanation;
  if (ask === 'total') {
    answer = values.reduce((sum, value) => sum + value, 0);
    facts = { values, ask, things: things.map((thing) => thing.one) };
    // Who picked is said first, as in C.4, and every question says "picked".
    text = `${PICKED} Each picture is one kid. How many kids picked in all?`;
    speak = [text];
    explanation = { speak: ['Count every row and add:', ...values.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : ['plus', { number: value }])), 'is', { number: answer }, '.'], steps: ['Count every row and add.', `${values.join(' + ')} = ${answer}.`], visual: stimulus, hint: { text: 'Count every row. Then add the rows.' } };
  } else {
    const [i, j] = rng.sample(things.map((_, k) => k), 2).sort((x, y) => (values[y] as number) - (values[x] as number)) as [number, number];
    const [big, small] = [things[i] as Countable, things[j] as Countable];
    answer = (values[i] as number) - (values[j] as number);
    facts = { values, ask, index: i, other: j, things: things.map((thing) => thing.one) };
    const fewer = level === 3 && rng.bool();
    text = `${PICKED} ${fewer ? `How many fewer kids picked ${small.many} than ${big.many}?` : `How many more kids picked ${big.many} than ${small.many}?`}`;
    speak = [text];
    explanation = { speak: [`The ${big.many} row has`, { number: values[i] as number }, `. The ${small.many} row has`, { number: values[j] as number }, '.', { number: values[i] as number }, 'minus', { number: values[j] as number }, 'is', { number: answer }, '.'], steps: [`${cap(big.many)}: ${values[i]}. ${cap(small.many)}: ${values[j]}.`, `${values[i]} − ${values[j]} = ${answer}.`], visual: stimulus, hint: { text: 'Count both rows. Then subtract.' } };
  }
  const base = { mode: 'look' as const, facts, prompt: { text, speak }, stimulus, explanation };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 2 };
  const slips = ask === 'total' ? [answer + 1, answer - 1, answer - (values[0] as number)] : [answer + 1, answer - 1, (values[0] as number) + (values[1] as number)];
  const choices = numeralChoices(answer, slips, 0, 24, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: choices }, options: choices.map((value) => numeral(value)), answerIndex: choices.indexOf(answer) };
}

export const graphProblemsGenerator: SkillGenerator = skill({
  skillId: 'M-2-C11',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: graphProblems,
  exampleSeed: 974,
  lesson: { see: 'A picture graph can answer questions: how many more, how many fewer, how many in all.', remember: 'How many more or fewer: subtract. How many in all: add.', tryLevel: 2 },
  oracle: 'graph',
});

// ---- C.12 Centimeters and meters ----
// Levels: centimeters or meters / about how long / meters to centimeters, typed. Oracle: h2Metric.

const TALL: readonly string[] = ['door'];

function metric(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const meters = rng.int(2, 9);
    const hundreds = Array.from({ length: meters }, (_, i) => 100 * (i + 1));
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { ask: 'convert', meters },
      prompt: { text: `1 meter is 100 centimeters. How many centimeters are in ${meters} meters?`, speak: ['One meter is', { number: 100 }, 'centimeters. How many centimeters are in', { number: meters }, 'meters?'] },
      stimulus: { kind: 'text', value: `${meters} m = ? cm`, size: 'l' },
      answer: meters * 100,
      maxDigits: 3,
      // Units in full in the steps, so the voice says them; the count by hundreds shows how.
      explanation: together(
        [line('Each meter is', 100, 'centimeters.'), { text: `Count by 100s, once for each meter: ${hundreds.join(', ')}.`, speak: ['Count by hundreds, once for each meter:', ...hundreds.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }])), '.'] }, line(meters, 'meters is', meters * 100, 'centimeters.')],
        { kind: 'text', value: `${meters} m = ${meters * 100} cm`, size: 'l' },
        { text: 'Count by 100s, once for each meter.' },
      ),
    };
  }
  const thing = rng.pick(METRIC_THINGS);
  const small = thing.cm < 100;
  const fit = small ? `${thing.cm} cm` : `${thing.cm / 100} m`;
  const said = (value: string): Say => {
    const [n, unit] = value.split(' ');
    return [{ number: Number(n) }, unit === 'cm' ? 'centimeters' : 'meters'];
  };
  // The rule first, with no object in it, so the first step never names this object's unit; then this object.
  // Units are written in full ("2 meters"), so the voice says them. A door is tall, the rest are long.
  const way = TALL.includes(thing.name) ? 'tall' : 'long';
  const n = small ? thing.cm : thing.cm / 100;
  const steps = [
    line('Centimeters are for small things. Meters are for big things.'),
    line(`A ${thing.name} is ${small ? 'small' : 'big'}, so we measure it in ${small ? 'centimeters' : 'meters'}.`),
    line('It is about', n, `${small ? 'centimeters' : 'meters'} ${way}.`),
    line('A meter is', 100, 'centimeters.'),
  ];
  const why = (hint: string): Explanation => together(steps, picture(thing), { text: hint });
  if (level === 1) {
    const text = `Would you measure a ${thing.name} in centimeters or in meters?`;
    return { type: 'choice', mode: 'look', fixedOrder: true, facts: { ask: 'unit', thing: thing.name, options: ['centimeters', 'meters'] }, prompt: { text, speak: [text] }, stimulus: picture(thing), options: [word('centimeters'), word('meters')], answerIndex: small ? 0 : 1, explanation: why('Could you hold it in one hand?') };
  }
  const choices = rng.shuffle([fit, small ? `${n} m` : `${n} cm`, small ? `${n * 10} cm` : `${n * 10} m`]);
  const text = `About how ${way} is a ${thing.name}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'estimate', thing: thing.name, options: choices },
    prompt: { text, speak: [text] },
    stimulus: picture(thing),
    options: choices.map((value) => word(value, said(value))),
    answerIndex: choices.indexOf(fit),
    explanation: why('Centimeters are for small things. Meters are for big things.'),
  };
}

export const metricGenerator: SkillGenerator = skill({
  skillId: 'M-2-C12',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['h2-world'],
  generate: metric,
  exampleSeed: 975,
  lesson: { see: 'Short things are measured in centimeters. Long things are measured in meters.', remember: 'One meter is one hundred centimeters.', tryLevel: 2 },
  oracle: 'h2Metric',
});
