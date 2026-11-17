import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { PartStory, ThreeStory } from '../../../data/h1-stories';
import { PART_STORIES, THREE_STORIES } from '../../../data/h1-stories';
import { STORY_NAMES } from '../../../data/h1-things';
import type { SkillGenerator } from '../../../generator';
import { listText } from '../../../generator';
import type { Explanation } from '../k/h1-parts';
import { equation, h1Skill, lessonOf, mathText, numberChoice, sayMath, shown, spoken } from '../k/h1-parts';
import { numeralChoices } from '../k/numerals';

// Math grade 1, plan section 15 wave H1: B.14 fact families, B.15 three-number stories, B.16 stories
// with a missing part, B.17 make both sides equal, B.18 count back to subtract, B.19 go down to ten.

// ---- B.14 Fact families ----
// a + b = c, b + a = c, c − a = b, c − b = a. Levels: which fact is in the family, sums to 10 /
// which is not, to 20 / typed: 4 + 7 = 11, so 11 − 7 = ?. Oracles: h1FactFamily, subtract.

const familyOf = (a: number, b: number): string[] => {
  const c = a + b;
  return [`${a} + ${b} = ${c}`, `${b} + ${a} = ${c}`, `${c} - ${a} = ${b}`, `${c} - ${b} = ${a}`];
};

function familyExplanation(a: number, b: number): Explanation {
  const facts = familyOf(a, b);
  return {
    speak: [...spoken(`The family of ${a}, ${b} and ${a + b} has four facts:`), ...facts.flatMap((fact, i) => [...sayMath(fact), i === facts.length - 1 ? '.' : ','])],
    steps: [`The family of ${a}, ${b} and ${a + b}:`, `${shown(facts[0] as string)} and ${shown(facts[1] as string)}.`, `${shown(facts[2] as string)} and ${shown(facts[3] as string)}.`],
    visual: { kind: 'text', value: `${a}, ${b}, ${a + b}`, size: 'l', speak: spoken(`${a}, ${b}, ${a + b}`) },
  };
}

function factFamily(level: Level, rng: Rng): QuestionDraft {
  const c = rng.int(level === 1 ? 3 : 8, level === 1 ? 10 : 20);
  let a = rng.int(1, c - 1);
  if (a * 2 === c) a = a === 1 ? 2 : a - 1;
  const b = c - a;
  const numbers = [a, b, c];
  const family = familyOf(a, b);
  const stimulus: Visual = { kind: 'text', value: `${a}, ${b}, ${c}`, size: 'l', speak: spoken(`${a}, ${b}, ${c}`) };
  if (level === 3) {
    const [given, ask] = rng.bool() ? [family[0] as string, b] : [family[1] as string, a];
    const other = c - ask;
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { a: c, b: ask, numbers, oracle: 'subtract' },
      prompt: { text: `${shown(given)}. So ${c} − ${ask} = ?`, speak: [...sayMath(given), '. So', { number: c }, 'minus', { number: ask }, 'equals what?'] },
      stimulus: mathText(given),
      answer: other,
      maxDigits: 2,
      explanation: familyExplanation(a, b),
    };
  }
  // Wrong facts: false with the same numbers, or true with a number from outside the family.
  const wrong = [`${a} + ${b} = ${c + 1}`, `${c} - ${a} = ${b + 1}`, `${a} + ${b + 1} = ${c + 1}`, `${c + 1} - ${b} = ${a + 1}`, `${c} + ${b} = ${a}`];
  const ask = level === 1 ? 'in' : 'notIn';
  const picked = ask === 'in' ? [rng.pick(family), ...rng.sample(wrong, 2)] : [rng.pick(wrong), ...rng.sample(family, 3)];
  const options = rng.shuffle(picked);
  const right = picked[0] as string;
  const prompt = ask === 'in' ? `Which fact is in the family of ${a}, ${b} and ${c}?` : `Which fact is not in the family of ${a}, ${b} and ${c}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { numbers, ask, options },
    prompt: { text: prompt, speak: spoken(prompt) },
    stimulus,
    options: options.map((option) => mathText(option, 'minus', 'm')),
    answerIndex: options.indexOf(right),
    explanation: familyExplanation(a, b),
  };
}

export const factFamilyGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-B14',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'h1FactFamily',
  exampleSeed: 911,
  generate: factFamily,
  lesson: (make) => lessonOf('3, 5 and 8 are a fact family: 3 and 5 make 8, and 8 splits into 3 and 5.', { kind: 'text', value: '3, 5, 8', size: 'l' }, make(1, 911), make(2, 912), 'Two parts and the whole: two adding facts and two taking away facts.'),
});

// ---- Stories ----

function tell(text: string, values: Record<string, number | string>): { text: string; speak: Say } {
  const filled = text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));
  return { text: filled, speak: spoken(filled) };
}

// ---- B.15 Three-number stories ----
// Levels: sums to 10 with a picture / to 20 / to 20, typed. Oracle: add.

function threeExplanation(a: number, b: number, c: number, things: string): Explanation {
  const first = a + b;
  return {
    speak: [{ number: a }, 'plus', { number: b }, 'is', { number: first }, '. Then', { number: first }, 'plus', { number: c }, 'is', { number: first + c }, '.', ...spoken(`There are ${first + c} ${things} in all.`)],
    steps: [`${a} + ${b} = ${first}.`, `${first} + ${c} = ${first + c}.`, `${first + c} ${things} in all.`],
    visual: equation(a, '+', b, '+', c, '=', first + c),
  };
}

function threeStories(level: Level, rng: Rng): QuestionDraft {
  const story = rng.pick(THREE_STORIES) as ThreeStory;
  const name = rng.pick(STORY_NAMES);
  const most = level === 1 ? 10 : 20;
  let [a, b, c] = [2, 2, 2];
  do {
    [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
  } while (a + b + c > most || (level > 1 && a + b + c < 11));
  const sum = a + b + c;
  const prompt = tell(story.text, { name, a, b, c });
  const picture: Visual = { kind: 'row', children: [a, b, c].map((count, i): Visual => ({ kind: 'emojiGroup', emoji: story.emoji[i] as string, count, layout: count <= 5 ? 'row' : 'grid5' })) };
  const base = { mode: 'look' as const, facts: { a, b, c, story: story.id, name }, prompt, explanation: threeExplanation(a, b, c, story.things) };
  if (level === 3) return { ...base, type: 'numberPad', answer: sum, maxDigits: 2 };
  const values = numeralChoices(sum, [a + b, b + c, sum + 1, sum - 1], 0, 30, rng);
  const choice = { ...base, facts: { ...base.facts, options: values }, ...numberChoice(sum, values) };
  return level === 1 ? { ...choice, stimulus: picture } : choice;
}

export const threeStoriesGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-B15',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'add',
  exampleSeed: 913,
  lists: ['h1-stories', 'h1-things'],
  generate: threeStories,
  lesson: (make) => lessonOf('Some stories have three numbers to add. Add two of them, then add the third.', equation(3, '+', 4, '+', 2, '=', 'blank'), make(1, 913), make(2, 914), 'Add two numbers first, then add the third.'),
});

// ---- B.16 Stories with a missing part ----
// Levels: some more came, how many, to 10 / some went away, how many, to 20 / any kind, or how many at
// the start, typed. Oracles: missing (added and start), subtract (taken).

function partStory(level: Level, rng: Rng): QuestionDraft {
  const kinds: PartStory['kind'][] = level === 1 ? ['added'] : level === 2 ? ['taken'] : ['added', 'taken', 'start'];
  const kind = rng.pick(kinds);
  const story = rng.pick(PART_STORIES.filter((each) => each.kind === kind));
  const name = rng.pick(STORY_NAMES);
  const top = level === 1 ? 10 : 20;
  const t = rng.int(5, top);
  let facts: Record<string, number | string>;
  let answer: number;
  let slips: number[];
  let explanation: Explanation;
  let prompt: { text: string; speak: Say };
  if (kind === 'added' || kind === 'start') {
    const known = rng.int(2, t - 1);
    answer = t - known;
    const lines = kind === 'added' ? [`Start at ${known}. Count up to ${t}.`, `That is ${answer} more.`, `${known} + ${answer} = ${t}.`] : [`${t} − ${known} = ${answer}.`, `At the start there were ${answer} ${story.things}.`, `Check: ${answer} + ${known} = ${t}.`];
    explanation = { speak: lines.flatMap((line) => spoken(line.replace(' − ', ' minus ').replace(' + ', ' plus ').replace(' = ', ' equals '))), steps: lines, visual: kind === 'added' ? equation(known, '+', answer, '=', t) : equation('blank', '+', known, '=', t) };
    facts = kind === 'added' ? { a: known, b: answer, total: t, blank: 'b' } : { a: answer, b: known, total: t, blank: 'a' };
    prompt = tell(story.text, kind === 'added' ? { name, a: known, t } : { name, b: known, t });
    slips = [t + known, t, known];
  } else {
    const r = rng.int(2, t - 1);
    answer = t - r;
    const lines = [`${t} − ${r} = ${answer}.`, `The answer is ${answer}.`];
    explanation = { speak: [{ number: t }, 'minus', { number: r }, 'is', { number: answer }, '.'], steps: lines, visual: equation(t, '-', r, '=', answer) };
    facts = { a: t, b: r, oracle: 'subtract' };
    prompt = tell(story.text, { name, t, r });
    slips = [t + r, r];
  }
  const base = { mode: 'look' as const, facts: { ...facts, story: story.id, name }, prompt, stimulus: { kind: 'emojiGroup', emoji: story.emoji, count: 1, layout: 'row' } as Visual, explanation };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 2 };
  const values = numeralChoices(answer, slips, 0, 40, rng);
  return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(answer, values) };
}

export const partStoriesGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-B16',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'missing',
  exampleSeed: 915,
  lists: ['h1-stories', 'h1-things'],
  generate: partStory,
  lesson: (make) => lessonOf('Sometimes a story hides the middle number: how many came, or how many went.', equation(5, '+', 'blank', '=', 9), make(1, 915), make(2, 916), 'Find what is missing. Count up, or take away.'),
});

// ---- B.17 Make both sides equal ----
// Levels: 4 + 4 = 6 + ?, to 10 / the gap anywhere, to 20 / typed, with a minus on one side.
// Oracle: h1Balance.

type Side = (number | string)[];
const sideText = (side: Side): string => side.map((part) => (part === 'blank' ? '?' : part === '-' ? '−' : String(part))).join(' ');
const sideValue = (side: Side): number => (side[1] === '+' ? (side[0] as number) + (side[2] as number) : (side[0] as number) - (side[2] as number));

function balanceExplanation(left: Side, right: Side, answer: number): Explanation {
  const filled = (side: Side): Side => side.map((part) => (part === 'blank' ? answer : part));
  const known = left.includes('blank') ? right : left;
  const value = sideValue(known);
  const lines = ['The equal sign means both sides are the same.', `${sideText(known)} = ${value}.`, `${sideText(filled(known === left ? right : left))} = ${value}. The missing number is ${answer}.`];
  return {
    speak: ['The equal sign means both sides are the same.', ...sayMath(`${known.join(' ')} = ${value}`), '. So the missing number is', { number: answer }, '.'],
    steps: lines,
    visual: equation(...filled(left), '=', ...filled(right)),
  };
}

function makeEqual(level: Level, rng: Rng): QuestionDraft {
  let left: Side;
  let right: Side;
  let answer: number;
  if (level === 3 && rng.bool()) {
    // 9 − 2 = 5 + ? or 4 + 3 = 9 − ?
    const value = rng.int(3, 12);
    if (rng.bool()) {
      const b = rng.int(1, 8);
      const c = rng.int(1, value - 1);
      answer = value - c;
      left = [value + b, '-', b];
      right = [c, '+', 'blank'];
    } else {
      const x = rng.int(1, value - 1);
      const c = value + rng.int(1, 8);
      answer = c - value;
      left = [x, '+', value - x];
      right = [c, '-', 'blank'];
    }
  } else {
    const value = level === 1 ? rng.int(4, 10) : rng.int(6, 20);
    const a = rng.int(1, value - 1);
    // The other side is a different pair, so it is not the same sum turned around.
    const c = rng.pick(Array.from({ length: value - 1 }, (_, i) => i + 1).filter((each) => each !== a && each !== value - a));
    const terms: [number, number, number, number] = [a, value - a, c, value - c];
    const at = level === 1 ? 3 : rng.int(0, 3);
    answer = terms[at] as number;
    const parts = terms.map((term, i): number | string => (i === at ? 'blank' : term));
    left = [parts[0] as number | string, '+', parts[1] as number | string];
    right = [parts[2] as number | string, '+', parts[3] as number | string];
  }
  const facts = { left, right };
  const known = left.includes('blank') ? right : left;
  const prompt = level === 3 ? 'What number makes both sides equal?' : 'Which number makes both sides equal?';
  const base = { mode: 'look' as const, facts, prompt: { text: prompt, speak: [prompt] }, stimulus: equation(...left, '=', ...right), explanation: balanceExplanation(left, right, answer) };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 2 };
  // The usual slip: writing the total of the other side.
  const values = numeralChoices(answer, [sideValue(known), answer + 1, answer - 1], 0, 30, rng);
  return { ...base, facts: { ...facts, options: values }, ...numberChoice(answer, values) };
}

export const makeEqualGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-B17',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'h1Balance',
  exampleSeed: 917,
  generate: makeEqual,
  lesson: (make) => lessonOf('The equal sign means the same as. Both sides must make the same number.', equation(4, '+', 4, '=', 6, '+', 2), make(1, 917), make(2, 918), 'Work out the side you know. Make the other side match.'),
});

// ---- B.18 Count back to subtract ----
// Levels: count back 1 or 2 from 10 or less, on a number line / count back 3 from 20 or less / typed.
// Oracle: subtract.

function backExplanation(start: number, back: number): Explanation {
  const steps = Array.from({ length: back }, (_, i) => start - i - 1);
  return {
    speak: ['Start at', { number: start }, '. Count back', { number: back }, ':', ...steps.map((n) => ({ number: n })), '. You land on', { number: start - back }, '.'],
    steps: [`Start at ${start}.`, `Count back ${back}: ${listText(steps)}.`, `${start} − ${back} = ${start - back}.`],
    visual: { kind: 'numberLine', min: start - back - 1, max: start + 1, step: 1, marked: [start, start - back] },
  };
}

function countBack(level: Level, rng: Rng): QuestionDraft {
  const back = level === 1 ? rng.int(1, 2) : rng.int(2, 3);
  const start = rng.int(level === 1 ? 4 : 8, level === 1 ? 10 : 20);
  const answer = start - back;
  const prompt = { text: `${start} − ${back}. Start at ${start}. Count back ${back}. Where do you land?`, speak: [{ number: start }, 'minus', { number: back }, '. Start at', { number: start }, '. Count back', { number: back }, '. Where do you land?'] as Say };
  const stimulus: Visual = level === 3 ? equation(start, '-', back, '=', 'blank') : { kind: 'numberLine', min: Math.max(0, start - 6), max: start + 2, step: 1, marked: [start] };
  const base = { mode: 'look' as const, facts: { a: start, b: back }, prompt, stimulus, explanation: backExplanation(start, back) };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 2 };
  // Counting the start as the first step lands one too high.
  const values = numeralChoices(answer, [answer + 1, answer - 1, start + back], 0, 25, rng);
  return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(answer, values) };
}

export const countBackSubtractGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-B18',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'subtract',
  exampleSeed: 919,
  generate: countBack,
  lesson: (make) => lessonOf('To take away a small number, start at the big number and count back.', { kind: 'numberLine', min: 6, max: 12, step: 1, marked: [11] }, make(1, 919), make(2, 920), 'Start big, count back small. Do not count the start.'),
});

// ---- B.19 Go down to ten ----
// 13 − 5: take 3 to get to 10, then 2 more, so 10 − 2. Levels: from 11 to 14 / from 11 to 18, 4 options /
// typed: the answer. Oracles: h1DownToTen, subtract.

function downExplanation(a: number, b: number): Explanation {
  const ones = a - 10;
  const rest = b - ones;
  const lines = [`Take away ${ones} to get to 10: ${a} − ${ones} = 10.`, `Take away ${rest} more: 10 − ${rest} = ${10 - rest}.`, `So ${a} − ${b} = ${a - b}.`];
  return {
    speak: ['Take away', { number: ones }, 'to get to', { number: 10 }, '. Take away', { number: rest }, 'more.', { number: 10 }, 'minus', { number: rest }, 'is', { number: 10 - rest }, '.'],
    steps: lines,
    visual: { kind: 'tenFrame', filled: a, frames: 2 },
  };
}

function downToTen(level: Level, rng: Rng): QuestionDraft {
  const a = rng.int(11, level === 1 ? 14 : 18);
  const ones = a - 10;
  const b = rng.int(ones + 1, 9);
  const rest = b - ones;
  const prompt = { text: `${a} − ${b}. Take away ${ones} first to get to 10. Which one is the same?`, speak: [{ number: a }, 'minus', { number: b }, '. Take away', { number: ones }, 'first to get to', { number: 10 }, '. Which one is the same?'] as Say };
  if (level === 3) {
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { a, b, oracle: 'subtract' },
      prompt: { text: `${a} − ${b} = ?  Go down to 10 first.`, speak: [{ number: a }, 'minus', { number: b }, 'equals what? Go down to', { number: 10 }, 'first.'] },
      stimulus: equation(a, '-', b, '=', 'blank'),
      answer: a - b,
      maxDigits: 1,
      explanation: downExplanation(a, b),
    };
  }
  const right = `10 - ${rest}`;
  const wrong = [...new Set([`10 - ${b}`, `10 - ${ones}`, `10 + ${rest}`, `${a} - ${rest}`])].filter((each) => each !== right);
  const options = rng.shuffle([right, ...rng.sample(wrong, level === 1 ? 2 : 3)]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a, b, options },
    prompt,
    stimulus: { kind: 'tenFrame', filled: a, frames: 2 },
    options: options.map((option) => mathText(option)),
    answerIndex: options.indexOf(right),
    explanation: downExplanation(a, b),
  };
}

export const downToTenGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-B19',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'h1DownToTen',
  exampleSeed: 921,
  generate: downToTen,
  lesson: (make) => lessonOf('To take away past 10, stop at 10 on the way.', { kind: 'tenFrame', filled: 13, frames: 2 }, make(1, 921), make(2, 922), 'Down to 10 first, then take the rest.'),
});

