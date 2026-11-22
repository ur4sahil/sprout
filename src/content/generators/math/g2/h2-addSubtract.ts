import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { COLLECTED, PRONOUN, STORY_NAMES } from '../../../data/h2-stories';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { skill } from '../pk/h2-lesson';
import { line, minusPrompt, together } from './addSubtract';

// Math grade 2, wave H2 (plan section 15): B.12 subtract across zeros, B.13 missing numbers to 100,
// B.14 word problems: find the start or the change, B.15 add by place value, B.16 even and odd sums.

type Explanation = QuestionDraft['explanation'];
const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });
const digit = (n: number, place: number): number => Math.floor(n / 10 ** place) % 10;

function numberChoice(answer: number, slips: number[], lo: number, hi: number, facts: QuestionDraft['facts'], base: { mode: 'look'; prompt: { text: string; speak: Say }; stimulus?: Visual; explanation: Explanation }, rng: Rng): QuestionDraft {
  const values = numeralChoices(answer, slips, lo, hi, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

// ---- B.12 Subtract across zeros ----
// Levels: hundreds minus a one-digit number / hundreds minus a two-digit number / a number with no tens minus a
// three-digit number, typed. Every question breaks a hundred into tens and a ten into ones. Oracle: subtract.

function acrossZeros(level: Level, rng: Rng): QuestionDraft {
  let a: number;
  let b: number;
  if (level === 1) [a, b] = [rng.int(2, 9) * 100, rng.int(1, 9)];
  else if (level === 2) {
    a = rng.int(2, 9) * 100;
    b = rng.int(1, 9) * 10 + rng.int(1, 9);
  } else {
    const h = rng.int(3, 9);
    const o = rng.int(0, 7);
    a = h * 100 + o;
    b = rng.int(1, h - 1) * 100 + rng.int(1, 9) * 10 + rng.int(o + 1, 9);
  }
  const answer = a - b;
  const [h, o] = [digit(a, 2), digit(a, 0)];
  const [bh, bt, bo] = [digit(b, 2), digit(b, 1), digit(b, 0)];
  const hundreds = (k: number): string => (k === 1 ? 'hundred' : 'hundreds');
  // Why and how to break, then how many of each there are now, then each place in turn. A place with nothing
  // to subtract just stays: no "9 − 0".
  const rest =
    bt === 0 && bh === 0
      ? line('The', 9, 'tens and', h - 1, `${hundreds(h - 1)} stay.`)
      : bh === 0
        ? line('Subtract the tens:', 9, '−', bt, '=', 9 - bt, '. The', h - 1, `${hundreds(h - 1)} stay.`)
        : line('Subtract the tens:', 9, '−', bt, '=', 9 - bt, '. Subtract the hundreds:', h - 1, '−', bh, '=', h - 1 - bh, '.');
  const lines = [
    line('There are not enough ones and no tens. Break a hundred into', 10, 'tens, then a ten into', 10, 'ones.'),
    line('Now there are', h - 1, `${hundreds(h - 1)},`, 9, 'tens and', o + 10, 'ones. Subtract the ones:', o + 10, '−', bo, '=', o + 10 - bo, '.'),
    rest,
    line('The answer is', answer, '.'),
  ];
  const explanation = together(lines, equation(a, '-', b, '=', answer), { text: 'There are no tens to break, so break a hundred first.' });
  const base = { mode: 'look' as const, prompt: minusPrompt(a, b), stimulus: equation(a, '-', b, '=', 'blank'), explanation };
  if (level === 3) return { ...base, type: 'numberPad', facts: { a, b }, answer, maxDigits: 3 };
  // The slips: the hundred not made one less, or the tens left at 10.
  return numberChoice(answer, [answer + 100, answer + 10, answer - 10], 0, 999, { a, b }, base, rng);
}

export const acrossZerosGenerator: SkillGenerator = skill({
  skillId: 'M-2-B12',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: acrossZeros,
  exampleSeed: 961,
  lesson: { see: 'When there are no tens to break, break a hundred first.', remember: 'A hundred becomes ten tens. A ten becomes ten ones.', tryLevel: 2 },
  oracle: 'subtract',
});

// ---- B.13 Missing numbers to 100 ----
// Levels: tens plus what makes tens / a two-digit number plus what makes a ten / either number missing, typed.
// Oracle: missing.

function missingTo100(level: Level, rng: Rng): QuestionDraft {
  let a: number;
  let total: number;
  if (level === 1) {
    a = rng.int(1, 8) * 10;
    total = rng.int(a / 10 + 1, 10) * 10;
  } else if (level === 2) {
    a = rng.int(1, 8) * 10 + rng.int(1, 9);
    total = rng.int(Math.floor(a / 10) + 1, 10) * 10;
  } else {
    a = rng.int(11, 80);
    total = rng.int(a + 5, 99);
  }
  const b = total - a;
  const blank = level === 3 ? rng.pick(['a', 'b'] as const) : 'b';
  const known = blank === 'a' ? b : a;
  const answer = blank === 'a' ? a : b;
  const text = blank === 'a' ? `What plus ${b} equals ${total}?` : `${a} plus what equals ${total}?`;
  const speak: Say = blank === 'a' ? ['What plus', { number: b }, 'equals', { number: total }, '?'] : [{ number: a }, 'plus what equals', { number: total }, '?'];
  // Count up from the number known: to the next ten, then by tens, then the ones left.
  const next = Math.ceil(known / 10) * 10;
  const lines = [];
  const jumps: number[] = [];
  if (next >= total) {
    lines.push(line('Count on from', known, 'to', total, '.'));
    jumps.push(answer);
  } else {
    if (next !== known) {
      lines.push(line('Jump to the next ten:', known, '+', next - known, '=', next, '.'));
      jumps.push(next - known);
    }
    const tens = Math.floor((total - next) / 10) * 10;
    if (tens > 0) {
      lines.push(line('Jump by tens:', next, '+', tens, '=', next + tens, '.'));
      jumps.push(tens);
    }
    if (total - next - tens > 0) {
      lines.push(line('Then the ones:', next + tens, '+', total - next - tens, '=', total, '.'));
      jumps.push(total - next - tens);
    }
  }
  lines.push(jumps.length > 1 ? line('The jumps make', ...jumps.flatMap((jump, i) => (i === 0 ? [jump] : ['+', jump])), '=', answer, '.') : line('That is', answer, '.'));
  // The hint is the first move of the same walk, with no number worked out (and no "ten": the answer can be 10).
  const hint = next >= total ? 'Count on from the number you know.' : next === known ? 'Count up by tens from the number you know.' : 'Count up from the number you know. First jump to a number that ends in 0.';
  const explanation = together(lines, equation(...(blank === 'a' ? [answer, '+', b] : [a, '+', answer]), '=', total), { text: hint });
  const stimulus = equation(...(blank === 'a' ? ['blank', '+', b] : [a, '+', 'blank']), '=', total);
  const base = { mode: 'look' as const, prompt: { text, speak }, stimulus, explanation };
  const facts = { a, b, total, blank };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer, maxDigits: 2 };
  // The slips: adding instead, or a ten out.
  return numberChoice(answer, [answer + 10, answer - 10, answer + 1], 0, 100, facts, base, rng);
}

export const missingTo100Generator: SkillGenerator = skill({
  skillId: 'M-2-B13',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: missingTo100,
  exampleSeed: 962,
  lesson: { see: 'To find a missing number, count up from the number you know.', remember: 'Jump to the next ten, then jump by tens.', tryLevel: 2 },
  oracle: 'missing',
});

// ---- B.14 Word problems: find the start or the change ----
// Levels: how many more were got / how many there were at first / either, with getting or giving away, typed.
// Oracle: missing (a + b = total, with the unknown named by blank).

type Form = 'gotSome' | 'hadSome' | 'gaveSome' | 'hadSomeGave';

// The story names its one person once, then says "he" or "she". The steps say what the story tells (the start,
// the end or the change), then the sum that finds the part not told, and why it is that sum.
function storyOf(form: Form, name: string, thing: string, a: number, b: number): { text: string; speak: Say; answer: number; why: Explanation } {
  const total = a + b;
  const he = PRONOUN[name] ?? name;
  const He = `${he.charAt(0).toUpperCase()}${he.slice(1)}`;
  const pick: Record<Form, { story: (string | number)[]; ask: string; answer: number; why: (string | number)[][]; hint: string; eq: (number | string)[] }> = {
    // a + ? = total
    gotSome: {
      story: [`${name} had`, a, `${thing}. ${He} got some more. Now ${he} has`, total, '.'],
      ask: `How many more did ${he} get?`,
      answer: b,
      why: [[`${name} went from`, a, 'to', total, '.'], ['To find the change, subtract:', total, '−', a, '=', b, '.'], [`${name} got`, b, 'more.']],
      hint: 'The story tells the start and the end. Find the change between them.',
      eq: [a, '+', 'blank', '=', total],
    },
    // ? + b = total
    hadSome: {
      story: [`${name} had some ${thing}. ${He} got`, b, `more. Now ${he} has`, total, '.'],
      ask: `How many did ${he} have at first?`,
      answer: a,
      why: [[`${name} got`, b, 'more and ended with', total, '.'], [`Take away the`, b, `${he} got:`, total, '−', b, '=', a, '.'], [`${name} had`, a, 'at first.']],
      hint: 'Start from the end. Take away what was added.',
      eq: ['blank', '+', b, '=', total],
    },
    // total − ? = a, which is a + ? = total
    gaveSome: {
      story: [`${name} had`, total, `${thing}. ${He} gave some away. Now ${he} has`, a, '.'],
      ask: `How many did ${he} give away?`,
      answer: b,
      why: [[`${name} went from`, total, 'down to', a, '.'], ['To find the change, subtract:', total, '−', a, '=', b, '.'], [`${name} gave away`, b, '.']],
      hint: 'The story tells the start and the end. Find the change between them.',
      eq: [total, '-', 'blank', '=', a],
    },
    // ? − b = a, which is a + b = ?
    hadSomeGave: {
      story: [`${name} had some ${thing}. ${He} gave`, b, `away. Now ${he} has`, a, '.'],
      ask: `How many did ${he} have at first?`,
      answer: total,
      why: [[`${name} gave away`, b, 'and has', a, 'left.'], ['Put back the', b, `${he} gave away:`, a, '+', b, '=', total, '.'], [`${name} had`, total, 'at first.']],
      hint: 'Start from the end. Put back what was given away.',
      eq: ['blank', '-', b, '=', a],
    },
  };
  const chosen = pick[form];
  const told = line(...chosen.story, chosen.ask);
  return {
    text: told.text,
    speak: told.speak,
    answer: chosen.answer,
    why: together(chosen.why.map((pieces) => line(...pieces)), equation(...chosen.eq.map((part) => (part === 'blank' ? chosen.answer : part))), { text: chosen.hint }),
  };
}

function storyProblems(level: Level, rng: Rng): QuestionDraft {
  const form: Form = level === 1 ? 'gotSome' : level === 2 ? 'hadSome' : rng.pick(['gotSome', 'hadSome', 'gaveSome', 'hadSomeGave'] as Form[]);
  const top = level === 1 ? 60 : 100;
  const a = rng.int(10, top - 15);
  const b = rng.int(5, top - a);
  const name = rng.pick(STORY_NAMES);
  const thing = rng.pick(COLLECTED);
  const story = storyOf(form, name, thing, a, b);
  // In the missing oracle's terms: a + b = total, and blank names the unknown.
  const blank = form === 'hadSome' ? 'a' : form === 'hadSomeGave' ? 'total' : 'b';
  const facts = { a, b, total: a + b, blank, form, name, thing };
  const base = { mode: 'look' as const, prompt: { text: story.text, speak: story.speak }, explanation: story.why };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer: story.answer, maxDigits: 3 };
  // The slips: adding the two numbers given, or a ten out.
  const given = { gotSome: a + (a + b), hadSome: b + (a + b), gaveSome: a + (a + b), hadSomeGave: Math.abs(a - b) }[form];
  return numberChoice(story.answer, [given, story.answer + 10, story.answer - 10], 0, 200, facts, base, rng);
}

export const storyProblemsGenerator: SkillGenerator = skill({
  skillId: 'M-2-B14',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['h2-stories'],
  generate: storyProblems,
  exampleSeed: 963,
  lesson: { see: 'Sometimes a story tells the end and asks about the start or the change.', remember: 'Find the part you do not know. Use the parts you do know.', tryLevel: 2 },
  oracle: 'missing',
});

// ---- B.15 Add by place value ----
// Levels: which split is the same sum / tens added, then the ones / three-digit numbers, typed.
// Oracles: h2Split at level 1, missing after.

const splitText = (parts: number[]): string => parts.join(' + ');
const SPLIT_HINT = { text: 'Split each number into tens and ones.' };
const splitVisual = (parts: number[]): Visual => ({ kind: 'text', value: splitText(parts), size: 'l', speak: parts.flatMap((part, i): Say => (i === 0 ? [{ number: part }] : ['plus', { number: part }])) });

function placeSplit(level: Level, rng: Rng): QuestionDraft {
  const big = level === 3;
  const a = big ? rng.int(1, 4) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9) : rng.int(1, 6) * 10 + rng.int(1, 9);
  const b = big ? rng.int(1, 4) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9) : rng.int(1, 3) * 10 + rng.int(1, 9);
  const tens = a - (a % 10) + b - (b % 10);
  const ones = (a % 10) + (b % 10);
  // Asked in words, as every sum is: "41 plus 29 is the same as 60 plus what?"
  const prompt = { text: `${a} plus ${b} is the same as ${tens} plus what?`, speak: [{ number: a }, 'plus', { number: b }, 'is the same as', { number: tens }, 'plus what?'] as Say };
  const lines = big
    ? [line('Add the hundreds and the tens:', a - (a % 10), '+', b - (b % 10), '=', tens, '.'), line('Add the ones:', a % 10, '+', b % 10, '=', ones, '.')]
    : [line('Add the tens:', a - (a % 10), '+', b - (b % 10), '=', tens, '.'), line('Add the ones:', a % 10, '+', b % 10, '=', ones, '.')];
  lines.push(line('So the missing number is', ones, '.'));
  const explanation = together(lines, equation(a, '+', b, '=', tens, '+', ones), SPLIT_HINT);
  if (level === 1) {
    const [ta, oa, tb, ob] = [a - (a % 10), a % 10, b - (b % 10), b % 10];
    const right = [ta, tb, oa, ob];
    const slips = [
      [ta / 10, tb / 10, oa, ob], // tens counted as ones
      [ta, tb, oa], // the ones of the second number left out
      [ta, ob * 10, oa, tb / 10], // the second number's digits swapped
      [ta, tb + 10, oa, ob], // a ten too many
    ].filter((parts) => parts.reduce((s, x) => s + x, 0) !== a + b);
    const sums = new Set([a + b]);
    const wrong = rng.shuffle(slips).filter((parts) => {
      const sum = parts.reduce((s, x) => s + x, 0);
      if (sums.has(sum)) return false;
      sums.add(sum);
      return true;
    }).slice(0, 2);
    for (let k = 2; wrong.length < 2; k += 1) if (!sums.has(a + b + 10 * k)) wrong.push([ta, tb + 10 * k, oa, ob]);
    const offered = rng.shuffle([right, ...wrong]);
    const text = `Which is the same as ${a} plus ${b}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { a, b, options: offered.map(splitText) },
      prompt: { text, speak: ['Which is the same as', { number: a }, 'plus', { number: b }, '?'] },
      options: offered.map(splitVisual),
      answerIndex: offered.indexOf(right),
      explanation: { speak: ['Split each number into tens and ones.', { number: a }, 'is', { number: ta }, 'plus', { number: oa }, '.', { number: b }, 'is', { number: tb }, 'plus', { number: ob }, '.'], steps: ['Split each number into tens and ones.', `${a} = ${ta} + ${oa}. ${b} = ${tb} + ${ob}.`, `So ${a} + ${b} = ${splitText(right)}.`], visual: splitVisual(right), hint: SPLIT_HINT },
    };
  }
  const facts = { a: tens, b: ones, total: a + b, blank: 'b', oracle: 'missing', x: a, y: b };
  const base = { mode: 'look' as const, prompt, stimulus: equation(a, '+', b, '=', tens, '+', 'blank'), explanation };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer: ones, maxDigits: 2 };
  return numberChoice(ones, [ones + 10, ones - 10, ones + 1, Math.abs((a % 10) - (b % 10))], 0, 30, facts, base, rng);
}

export const placeSplitGenerator: SkillGenerator = skill({
  skillId: 'M-2-B15',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: placeSplit,
  exampleSeed: 964,
  lesson: { see: 'We can add by splitting each number into tens and ones.', remember: 'Add the tens, add the ones, then put them together.', watchLevel: 1, tryLevel: 2 },
  oracle: 'h2Split',
});

// ---- B.16 Even and odd sums ----
// Levels: is a sum to 20 even or odd / numbers to 50 / which sum is odd or even. Oracle: h2Even.

const parity = (n: number): 'even' | 'odd' => (n % 2 === 0 ? 'even' : 'odd');
// The choices are written "Even" and "Odd", as in A.5. The plain value stays lower case for the answer check.
const sayWord = (value: string): Visual => ({ kind: 'text', value: `${value.charAt(0).toUpperCase()}${value.slice(1)}`, size: 'l', speak: [value] });

// The rule is said in the sum's own order: 7 + 2 is "odd plus even is odd".
function sumRule(x: number, y: number): Explanation {
  const rule = `${parity(x).charAt(0).toUpperCase()}${parity(x).slice(1)} plus ${parity(y)} is ${parity(x + y)}.`;
  return {
    speak: [{ number: x }, `is ${parity(x)} and`, { number: y }, `is ${parity(y)}. ${rule}`, { number: x }, 'plus', { number: y }, 'is', { number: x + y }, '.'],
    steps: [`${x} is ${parity(x)}. ${y} is ${parity(y)}.`, rule, `${x} + ${y} = ${x + y}, which is ${parity(x + y)}.`],
    visual: equation(x, '+', y, '=', x + y),
    hint: { text: 'Look at the last digit of each number.' },
  };
}

function evenOddSums(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const want = rng.pick(['even', 'odd'] as const);
    const pairs: [number, number][] = [];
    // One sum that is wanted, two that are not.
    while (pairs.length < 3) {
      const [x, y] = [rng.int(2, 30), rng.int(2, 30)];
      const fits = parity(x + y) === want;
      if (fits === (pairs.length === 0) && !pairs.some(([p, q]) => p === x && q === y)) pairs.push([x, y]);
    }
    const offered = rng.shuffle(pairs);
    const answer = pairs[0] as [number, number];
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'pickSum', want, set: offered.map(([x, y]) => `${x} + ${y}`).sort(), options: offered.map(([x, y]) => `${x} + ${y}`) },
      prompt: { text: `Which sum is ${want}?`, speak: [`Which sum is ${want}?`] },
      options: offered.map(([x, y]): Visual => ({ kind: 'text', value: `${x} + ${y}`, size: 'l', speak: [{ number: x }, 'plus', { number: y }] })),
      answerIndex: offered.indexOf(answer),
      explanation: sumRule(...answer),
    };
  }
  const top = level === 1 ? 10 : 50;
  const [a, b] = [rng.int(1, top), rng.int(1, top)];
  const prompt = { text: `Is ${a} plus ${b} even or odd?`, speak: ['Is', { number: a }, 'plus', { number: b }, 'even or odd?'] as Say };
  return { type: 'choice', mode: 'look', fixedOrder: true, facts: { ask: 'sumParity', a, b, options: ['even', 'odd'] }, prompt, stimulus: equation(a, '+', b), options: ['even', 'odd'].map(sayWord), answerIndex: parity(a + b) === 'even' ? 0 : 1, explanation: sumRule(a, b) };
}

export const evenOddSumsGenerator: SkillGenerator = skill({
  skillId: 'M-2-B16',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: evenOddSums,
  exampleSeed: 965,
  lesson: { see: 'Even plus even is even. Odd plus odd is even too. Even plus odd is odd.', remember: 'Two odd numbers make an even number: their leftover ones make a pair.' },
  oracle: 'h2Even',
});
