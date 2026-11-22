import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { COUNTABLES, STORY_COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { byWord } from './numbers';

// Math grade 3 C.1 to C.6 (multiplication) and D.1 to D.3 (division).

type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint };
const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });
const groupsPicture = (groups: number, each: number, emoji: string): Visual => ({ kind: 'row', children: Array.from({ length: groups }, (): Visual => ({ kind: 'emojiGroup', emoji, count: each, layout: 'dice' })) });
const array = (rows: number, cols: number, emoji: string): Visual => ({ kind: 'array', rows, cols, emoji });
const times = (a: number, b: number): Say => [{ number: a }, 'times', { number: b }];
const text = (value: string, speak: Say): Visual => ({ kind: 'text', value, size: 'l', speak });
// A sum is asked as it is said (the owner's choice, Nov 22, 2026): "What is 3 × 4?", never "3 × 4 equals what?".
const timesPrompt = (a: number, b: number): { text: string; speak: Say } => ({ text: `What is ${a} × ${b}?`, speak: ['What is', ...times(a, b), '?'] });

// ---- C.1 Equal groups ----
// Levels: groups picture to "3 groups of 4" / to 3 × 4 / how many in all, typed. Oracle: multiply.

function groupsExplanation(groups: number, each: number, emoji: string): Explanation {
  const counts = Array.from({ length: groups }, (_, i) => each * (i + 1));
  return {
    speak: ['There are', { number: groups }, 'groups with', { number: each }, 'in each.', { number: groups }, 'groups of', { number: each }, 'is', ...times(groups, each), ', which is', { number: groups * each }, '.'],
    steps: [`There are ${groups} groups with ${each} in each.`, `Count by ${byWord(each)}: ${counts.join(', ')}.`, `${groups} × ${each} = ${groups * each}.`],
    visual: groupsPicture(groups, each, emoji),
  };
}

// The hints never name the groups or the number in each: finding them is the question.
const GROUPS_HINTS: Record<1 | 2, Hint> = {
  1: { text: 'Count the groups first. Then count how many are in one group.' },
  2: { text: 'The first number is how many groups there are. The second is how many are in each group.' },
};

function distinctPair(rng: Rng, lo: number, hi: number): [number, number] {
  for (;;) {
    const a = rng.int(lo, hi);
    const b = rng.int(lo, hi);
    if (a !== b) return [a, b];
  }
}

function equalGroups(level: Level, rng: Rng): QuestionDraft {
  const [groups, each] = distinctPair(rng, 2, 5);
  const emoji = rng.pick(COUNTABLES).emoji;
  const stimulus = groupsPicture(groups, each, emoji);
  const explanation = groupsExplanation(groups, each, emoji);
  if (level === 3) {
    const prompt = 'How many are there in all?';
    return { type: 'numberPad', mode: 'look', facts: { rows: groups, cols: each, ask: 'total' }, prompt: { text: prompt, speak: [prompt] }, stimulus, answer: groups * each, maxDigits: 2, explanation };
  }
  // The slips: the groups and the number in each swapped (in words: "2 groups of 4" is another picture), or one too
  // many in each. As a times sentence the swap is no slip: 2 × 4 is 8 too, so level 2 offers one group too many.
  const pairs: [number, number][] = rng.shuffle(level === 1 ? [[groups, each], [each, groups], [groups, each + 1]] : [[groups, each], [groups + 1, each], [groups, each + 1]]);
  const asGroups = level === 1;
  const label = ([g, e]: [number, number]): string => (asGroups ? `${g} groups of ${e}` : `${g} × ${e}`);
  const say = ([g, e]: [number, number]): Say => (asGroups ? [{ number: g }, 'groups of', { number: e }] : times(g, e));
  const prompt = asGroups ? 'Which words match the picture?' : 'Which multiplication matches the picture?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { rows: groups, cols: each, ask: asGroups ? 'groupsOf' : 'sentence', options: pairs.map(label) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    options: pairs.map((pair) => text(label(pair), say(pair))),
    answerIndex: pairs.findIndex(([g, e]) => g === groups && e === each),
    explanation: { ...explanation, hint: GROUPS_HINTS[asGroups ? 1 : 2] },
  };
}

export const equalGroupsGenerator: SkillGenerator = {
  skillId: 'M-3-C1',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: equalGroups,
  exampleSeed: 321,
  example: () => equalGroups(1, makeRng(321)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Equal groups have the same number in each group.', speak: ['Equal groups have the same number in each group.'], visual: groupsPicture(3, 4, '🍎') },
    { beat: 'watch', text: groupsExplanation(3, 4, '🍎').steps.join(' '), speak: groupsExplanation(3, 4, '🍎').speak, visual: groupsExplanation(3, 4, '🍎').visual },
    { beat: 'try', text: 'How many are there in all?', speak: ['How many are there in all?'], visual: groupsPicture(4, 2, '⭐'), reveal: { text: groupsExplanation(4, 2, '⭐').steps.join(' '), speak: groupsExplanation(4, 2, '⭐').speak, visual: groupsExplanation(4, 2, '⭐').visual } },
    { beat: 'remember', text: 'Groups times the number in each group gives how many in all.', speak: ['Groups times the number in each group gives how many in all.'], visual: equation(3, '×', 4, '=', 12) },
  ],
  oracle: 'multiply',
};

// ---- C.2 Arrays ----
// Levels: array to rows times columns / product, typed / 3 × 4 is the same as 4 × 3. Oracle: multiply.

function arrayExplanation(rows: number, cols: number, emoji: string): Explanation {
  return {
    speak: ['There are', { number: rows }, 'rows with', { number: cols }, 'in each row.', ...times(rows, cols), 'is', { number: rows * cols }, '.'],
    steps: [`There are ${rows} rows with ${cols} in each row.`, `${rows} × ${cols} = ${rows * cols}.`],
    visual: array(rows, cols, emoji),
  };
}

function arrays(level: Level, rng: Rng): QuestionDraft {
  const [rows, cols] = distinctPair(rng, 2, level === 1 ? 5 : 6);
  const emoji = rng.pick(COUNTABLES).emoji;
  const stimulus = array(rows, cols, emoji);
  if (level === 2) {
    const prompt = 'How many are there in all?';
    return { type: 'numberPad', mode: 'look', facts: { rows, cols, ask: 'total' }, prompt: { text: prompt, speak: [prompt] }, stimulus, answer: rows * cols, maxDigits: 2, explanation: arrayExplanation(rows, cols, emoji) };
  }
  if (level === 3) {
    // Turning an array round gives the same total: 3 × 4 is the same as 4 × 3.
    const choices = rng.shuffle([`${cols} × ${rows}`, `${rows} + ${cols}`, `${rows} × ${cols + 1}`]);
    const speakOf = (label: string): Say => {
      const [x, sign, y] = label.split(' ');
      return [{ number: Number(x) }, sign === '×' ? 'times' : 'plus', { number: Number(y) }];
    };
    const prompt = `Which is the same as ${rows} × ${cols}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { rows, cols, ask: 'turnaround', options: choices },
      prompt: { text: prompt, speak: ['Which is the same as', ...times(rows, cols), '?'] },
      stimulus,
      options: choices.map((label) => text(label, speakOf(label))),
      answerIndex: choices.indexOf(`${cols} × ${rows}`),
      explanation: {
        speak: ['Turn the array on its side. It has', { number: cols }, 'rows of', { number: rows }, 'now, and still', { number: rows * cols }, 'in all. So', ...times(rows, cols), 'is the same as', ...times(cols, rows), '.'],
        steps: [`Turn the array on its side: ${cols} rows of ${rows}.`, `There are still ${rows * cols} in all.`, `So ${rows} × ${cols} = ${cols} × ${rows}.`],
        visual: array(cols, rows, emoji),
        // The first step names the turned array, which is the answer: the hint only says how to find it.
        hint: { text: 'Picture the array turned on its side. How many rows would it have?' },
      },
    };
  }
  // The slips: one row too many, or adding instead of multiplying.
  const choices = rng.shuffle([`${rows} × ${cols}`, `${rows + 1} × ${cols}`, `${rows} + ${cols}`]);
  const prompt = 'Which multiplication matches the array?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { rows, cols, ask: 'sentence', options: choices },
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    options: choices.map((label) => {
      const [x, sign, y] = label.split(' ');
      return text(label, [{ number: Number(x) }, sign === '×' ? 'times' : 'plus', { number: Number(y) }]);
    }),
    answerIndex: choices.indexOf(`${rows} × ${cols}`),
    explanation: arrayExplanation(rows, cols, emoji),
  };
}

export const arrays3Generator: SkillGenerator = {
  skillId: 'M-3-C2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: arrays,
  exampleSeed: 322,
  example: () => arrays(1, makeRng(322)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'An array has rows. Every row has the same number.', speak: ['An array has rows. Every row has the same number.'], visual: array(3, 5, '🍓') },
    { beat: 'watch', text: arrayExplanation(3, 5, '🍓').steps.join(' '), speak: arrayExplanation(3, 5, '🍓').speak, visual: arrayExplanation(3, 5, '🍓').visual },
    { beat: 'try', text: 'How many are there in all?', speak: ['How many are there in all?'], visual: array(4, 6, '⭐'), reveal: { text: arrayExplanation(4, 6, '⭐').steps.join(' '), speak: arrayExplanation(4, 6, '⭐').speak, visual: arrayExplanation(4, 6, '⭐').visual } },
    { beat: 'remember', text: 'Rows times the number in each row. Turning the array on its side gives the same total.', speak: ['Rows times the number in each row. Turning the array on its side gives the same total.'], visual: equation(3, '×', 5, '=', 5, '×', 3) },
  ],
  oracle: 'multiply',
};

// ---- C.3 to C.5 Times tables ----
// Levels: some of the tables / the others / mixed, typed. Oracle: multiply.

// A way to work out a × b from facts a child already knows, one for each table. The first step says the way, so it
// is also the hint; the numbers follow; the last step is the question's own sum, in its order (x × y).
function tableExplanation(a: number, b: number, order: [number, number] = [a, b]): Explanation {
  const p = a * b;
  const [x, y] = order;
  const end = `So ${x} × ${y} = ${p}.`;
  const endSay: Say = ['So', ...times(x, y), 'is', { number: p }, '.'];
  const table: Record<number, () => { steps: string[]; speak: Say }> = {
    2: () => ({ steps: [`Times 2 is a double: ${b} + ${b} = ${p}.`], speak: ['Times two is a double.', { number: b }, 'plus', { number: b }, 'is', { number: p }, '.'] }),
    3: () => ({ steps: ['Times 3 is a double, then one more group.', `Double ${b} is ${2 * b}. One more ${b}: ${2 * b} + ${b} = ${p}.`], speak: ['Times three is a double, then one more group. Double', { number: b }, 'is', { number: 2 * b }, '. One more', { number: b }, 'makes', { number: p }, '.'] }),
    4: () => ({ steps: ['Times 4 is a double, then double again.', `Double ${b} is ${2 * b}. Double again: ${2 * b} + ${2 * b} = ${p}.`], speak: ['Times four is a double, then double again. Double', { number: b }, 'is', { number: 2 * b }, '. Double again is', { number: p }, '.'] }),
    5: () => ({ steps: ['Times 5 is half of times 10.', `10 × ${b} = ${10 * b}. Half of ${10 * b} is ${p}.`], speak: ['Times five is half of times ten.', ...times(10, b), 'is', { number: 10 * b }, '. Half of that is', { number: p }, '.'] }),
    6: () => ({ steps: ['Times 6 is times 5 and one more group.', `5 × ${b} = ${5 * b}. One more ${b}: ${5 * b} + ${b} = ${p}.`], speak: ['Times six is times five and one more group.', ...times(5, b), 'is', { number: 5 * b }, '. One more', { number: b }, 'makes', { number: p }, '.'] }),
    7: () => ({ steps: ['Split 7 into 5 and 2.', `5 × ${b} = ${5 * b} and 2 × ${b} = ${2 * b}.`, `${5 * b} + ${2 * b} = ${p}.`], speak: ['Split seven into five and two.', ...times(5, b), 'is', { number: 5 * b }, '.', ...times(2, b), 'is', { number: 2 * b }, '. Together they make', { number: p }, '.'] }),
    8: () => ({ steps: ['Times 8 is times 4, then double.', `4 × ${b} = ${4 * b}. Double it: ${4 * b} + ${4 * b} = ${p}.`], speak: ['Times eight is times four, then double.', ...times(4, b), 'is', { number: 4 * b }, '. Double it to make', { number: p }, '.'] }),
    9: () => ({ steps: ['Times 9 is times 10, take away one group.', `10 × ${b} = ${10 * b}. Take away one ${b}: ${10 * b} − ${b} = ${p}.`], speak: ['Times nine is times ten, take away one group.', ...times(10, b), 'is', { number: 10 * b }, '. Take away one', { number: b }, 'to make', { number: p }, '.'] }),
    10: () => ({ steps: [`${b} tens make ${p}.`], speak: [{ number: b }, 'tens make', { number: p }, '.'] }),
  };
  const way = (table[a] as () => { steps: string[]; speak: Say })();
  return { speak: [...way.speak, ...endSay], steps: [...way.steps, end], visual: equation(x, '×', y, '=', p) };
}

function tablesSkill(easy: number[], hard: number[]): (level: Level, rng: Rng) => QuestionDraft {
  return (level, rng) => {
    const a = rng.pick(level === 1 ? easy : level === 2 ? hard : [...easy, ...hard]);
    const b = rng.int(2, 10);
    const p = a * b;
    // The table's number is on either side, as it is in a book.
    const [x, y] = rng.bool() ? [a, b] : [b, a];
    const base = { mode: 'look' as const, prompt: timesPrompt(x, y), stimulus: equation(x, '×', y, '=', 'blank'), explanation: tableExplanation(a, b, [x, y]) };
    const facts = { rows: x, cols: y, ask: 'total' };
    if (level === 3) return { ...base, type: 'numberPad', facts, answer: p, maxDigits: 3 };
    // The slips: one group too many or too few, of either number.
    const values = numeralChoices(p, [p + a, p - a, p + b, p - b], 1, 100, rng);
    return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(p) };
  };
}

// `see` is written with digits for the screen and said with the numbers as words.
function tablesLesson(a: number, b: number, c: number, see: string, seeSaid: string): () => LessonStep[] {
  return () => [
    { beat: 'see', text: see, speak: [seeSaid], visual: equation(a, '×', b) },
    { beat: 'watch', text: tableExplanation(a, b).steps.join(' '), speak: tableExplanation(a, b).speak, visual: tableExplanation(a, b).visual },
    { beat: 'try', text: timesPrompt(a, c).text, speak: timesPrompt(a, c).speak, visual: equation(a, '×', c, '=', 'blank'), reveal: { text: tableExplanation(a, c).steps.join(' '), speak: tableExplanation(a, c).speak, visual: tableExplanation(a, c).visual } },
    { beat: 'remember', text: 'Use a fact you know to find one you do not.', speak: ['Use a fact you know to find one you do not.'], visual: tableExplanation(a, b).visual },
  ];
}

const by2510 = tablesSkill([2, 10], [5]);
export const times2510Generator: SkillGenerator = {
  skillId: 'M-3-C3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: by2510,
  exampleSeed: 323,
  example: () => by2510(1, makeRng(323)),
  lesson: tablesLesson(5, 6, 8, 'Times 2 is a double. Times 10 adds a zero. Times 5 is half of times 10.', 'Times two is a double. Times ten adds a zero. Times five is half of times ten.'),
  oracle: 'multiply',
};

const by34 = tablesSkill([3], [4]);
export const times34Generator: SkillGenerator = {
  skillId: 'M-3-C4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: by34,
  exampleSeed: 324,
  example: () => by34(1, makeRng(324)),
  lesson: tablesLesson(4, 6, 7, 'Times 3 is a double and one more. Times 4 is double, then double again.', 'Times three is a double and one more. Times four is double, then double again.'),
  oracle: 'multiply',
};

const by6789 = tablesSkill([6, 7], [8, 9]);
export const times6789Generator: SkillGenerator = {
  skillId: 'M-3-C5',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: by6789,
  exampleSeed: 325,
  example: () => by6789(1, makeRng(325)),
  lesson: tablesLesson(9, 6, 7, 'Big tables come from small ones: times 6 is times 5 and one more group, times 9 is times 10 take away one group.', 'Big tables come from small ones: times six is times five and one more group, times nine is times ten take away one group.'),
  oracle: 'multiply',
};

// ---- C.6 Missing factor ----
// Levels: ? × 4 = 12 with an array / no picture / typed. Oracle: multiply.

function missingExplanation(rows: number, cols: number, blank: 'rows' | 'cols'): Explanation {
  const known = blank === 'rows' ? cols : rows;
  const wanted = blank === 'rows' ? rows : cols;
  const p = rows * cols;
  const counts = Array.from({ length: wanted }, (_, i) => known * (i + 1));
  return {
    speak: [`Count by ${byWord(known)} to`, { number: p }, '.', 'That takes', { number: wanted }, 'counts. The missing number is', { number: wanted }, '.'],
    steps: [`Count by ${byWord(known)} to ${p}: ${counts.join(', ')}.`, `That is ${wanted} counts.`, `So ${rows} × ${cols} = ${p}.`],
    visual: equation(rows, '×', cols, '=', p),
    // The first step lists the counts, so counting them would give the answer: the hint says only what to do.
    hint: { text: `Count by ${byWord(known)} until you reach ${p}. Keep track of how many numbers you say.` },
  };
}

function missingFactor(level: Level, rng: Rng): QuestionDraft {
  const rows = rng.int(2, level === 1 ? 5 : 9);
  const cols = rng.int(2, level === 1 ? 6 : 10);
  const blank = rng.pick<'rows' | 'cols'>(['rows', 'cols']);
  const p = rows * cols;
  const wanted = blank === 'rows' ? rows : cols;
  const prompt = blank === 'rows' ? { text: `What number times ${cols} equals ${p}?`, speak: ['What number times', { number: cols }, 'equals', { number: p }, '?'] as Say } : { text: `${rows} times what number equals ${p}?`, speak: [{ number: rows }, 'times what number equals', { number: p }, '?'] as Say };
  const eq = blank === 'rows' ? equation('blank', '×', cols, '=', p) : equation(rows, '×', 'blank', '=', p);
  const stimulus: Visual = level === 1 ? { kind: 'row', children: [eq, array(rows, cols, rng.pick(COUNTABLES).emoji)] } : eq;
  const base = { mode: 'look' as const, prompt, stimulus, explanation: missingExplanation(rows, cols, blank) };
  const facts = { rows, cols, ask: 'missing', blank };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer: wanted, maxDigits: 2 };
  const other = blank === 'rows' ? cols : rows;
  const values = numeralChoices(wanted, [other, wanted + 1, wanted - 1, p - other], 1, 10, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(wanted) };
}

export const missingFactorGenerator: SkillGenerator = {
  skillId: 'M-3-C6',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: missingFactor,
  exampleSeed: 326,
  example: () => missingFactor(1, makeRng(326)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A box stands for a number we do not know yet.', speak: ['A box stands for a number we do not know yet.'], visual: equation('blank', '×', 4, '=', 12) },
    { beat: 'watch', text: missingExplanation(3, 4, 'rows').steps.join(' '), speak: missingExplanation(3, 4, 'rows').speak, visual: missingExplanation(3, 4, 'rows').visual },
    { beat: 'try', text: '5 times what number equals 30?', speak: [{ number: 5 }, 'times what number equals', { number: 30 }, '?'], visual: equation(5, '×', 'blank', '=', 30), reveal: { text: missingExplanation(5, 6, 'cols').steps.join(' '), speak: missingExplanation(5, 6, 'cols').speak, visual: missingExplanation(5, 6, 'cols').visual } },
    { beat: 'remember', text: 'Count by the number you know until you reach the total.', speak: ['Count by the number you know until you reach the total.'], visual: equation(3, '×', 4, '=', 12) },
  ],
  oracle: 'multiply',
};

// ---- D.1 Share equally ----
// Levels: share a picture group into 2 or 3 / into up to 5 / typed. Oracle: multiply (quotient).

function shareExplanation(total: number, groups: number, emoji: string): Explanation {
  const each = total / groups;
  return {
    speak: ['Give one to each group, and keep going until none are left. Each group gets', { number: each }, '.'],
    steps: ['Give one to each group, and keep going until none are left.', `Each group gets ${each}.`, `${groups} × ${each} = ${total}, so ${total} ÷ ${groups} = ${each}.`],
    visual: groupsPicture(groups, each, emoji),
  };
}

function share(level: Level, rng: Rng): QuestionDraft {
  const groups = rng.int(2, level === 1 ? 3 : 5);
  const each = rng.int(2, level === 1 ? 5 : 6);
  const total = groups * each;
  const thing = rng.pick(STORY_COUNTABLES);
  const prompt = { text: `Put ${total} ${thing.many} into ${groups} equal groups. How many go in each group?`, speak: ['Put', { number: total }, `${thing.many} into`, { number: groups }, 'equal groups. How many go in each group?'] as Say };
  const base = { mode: 'look' as const, prompt, stimulus: { kind: 'emojiGroup', emoji: thing.emoji, count: total, layout: 'grid5' } as Visual, explanation: shareExplanation(total, groups, thing.emoji) };
  const facts = { rows: groups, cols: each, total, by: groups, ask: 'quotient' };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer: each, maxDigits: 2 };
  const values = numeralChoices(each, [groups, each + 1, each - 1], 1, 30, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(each) };
}

export const shareEquallyGenerator: SkillGenerator = {
  skillId: 'M-3-D1',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: share,
  exampleSeed: 331,
  example: () => share(1, makeRng(331)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Sharing equally means every group gets the same.', speak: ['Sharing equally means every group gets the same.'], visual: { kind: 'emojiGroup', emoji: '🍪', count: 12, layout: 'grid5' } },
    { beat: 'watch', text: shareExplanation(12, 3, '🍪').steps.join(' '), speak: shareExplanation(12, 3, '🍪').speak, visual: shareExplanation(12, 3, '🍪').visual },
    { beat: 'try', text: 'Put 10 apples into 2 equal groups. How many go in each group?', speak: ['Put', { number: 10 }, 'apples into', { number: 2 }, 'equal groups. How many go in each group?'], visual: { kind: 'emojiGroup', emoji: '🍎', count: 10, layout: 'grid5' }, reveal: { text: shareExplanation(10, 2, '🍎').steps.join(' '), speak: shareExplanation(10, 2, '🍎').speak, visual: shareExplanation(10, 2, '🍎').visual } },
    { beat: 'remember', text: 'Dividing is sharing equally.', speak: ['Dividing is sharing equally.'], visual: equation(12, '÷', 3, '=', 4) },
  ],
  oracle: 'multiply',
};

// ---- D.2 Division facts ----
// Levels: divide by 2, 5, 10 / by 3, 4 / by 6 to 9, typed. Oracle: multiply (quotient).

const dividePrompt = (t: number, d: number): { text: string; speak: Say } => ({ text: `What is ${t} ÷ ${d}?`, speak: ['What is', { number: t }, 'divided by', { number: d }, '?'] });

function divideExplanation(t: number, d: number): Explanation {
  const q = t / d;
  return {
    speak: ['Think:', { number: d }, 'times what is', { number: t }, '?', ...times(d, q), 'is', { number: t }, '. So', { number: t }, 'divided by', { number: d }, 'is', { number: q }, '.'],
    steps: [`Think: ${d} times what is ${t}?`, `${d} × ${q} = ${t}.`, `So ${t} ÷ ${d} = ${q}.`],
    visual: equation(t, '÷', d, '=', q),
  };
}

function divisionFacts(level: Level, rng: Rng): QuestionDraft {
  const d = rng.pick(level === 1 ? [2, 5, 10] : level === 2 ? [3, 4] : [6, 7, 8, 9]);
  const q = rng.int(2, 10);
  const t = d * q;
  const base = { mode: 'look' as const, prompt: dividePrompt(t, d), stimulus: equation(t, '÷', d, '=', 'blank'), explanation: divideExplanation(t, d) };
  const facts = { rows: d, cols: q, total: t, by: d, ask: 'quotient' };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer: q, maxDigits: 2 };
  const values = numeralChoices(q, [q + 1, q - 1, d, q + 2, q - 2].filter((value) => value !== q), 1, 20, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(q) };
}

export const divisionFactsGenerator: SkillGenerator = {
  skillId: 'M-3-D2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: divisionFacts,
  exampleSeed: 332,
  example: () => divisionFacts(1, makeRng(332)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Every division has a multiplication that matches it.', speak: ['Every division has a multiplication that matches it.'], visual: equation(20, '÷', 5) },
    { beat: 'watch', text: divideExplanation(20, 5).steps.join(' '), speak: divideExplanation(20, 5).speak, visual: divideExplanation(20, 5).visual },
    { beat: 'try', text: dividePrompt(24, 4).text, speak: dividePrompt(24, 4).speak, visual: equation(24, '÷', 4, '=', 'blank'), reveal: { text: divideExplanation(24, 4).steps.join(' '), speak: divideExplanation(24, 4).speak, visual: divideExplanation(24, 4).visual } },
    { beat: 'remember', text: 'To divide, think of the times table.', speak: ['To divide, think of the times table.'], visual: divideExplanation(20, 5).visual },
  ],
  oracle: 'multiply',
};

// ---- D.3 Fact families ----
// Levels: the division that goes with 3 × 4 = 12 / the missing member / which does not belong. Oracle: multiply.

const sentence = (x: number, sign: '×' | '÷', y: number, z: number): string => `${x} ${sign} ${y} = ${z}`;
const sentenceSay = (label: string): Say => {
  const [x, sign, y, , z] = label.split(' ');
  return [{ number: Number(x) }, sign === '×' ? 'times' : 'divided by', { number: Number(y) }, 'equals', { number: Number(z) }];
};

function familyExplanation(a: number, b: number): Explanation {
  const p = a * b;
  return {
    speak: ['The numbers', { number: a }, ',', { number: b }, 'and', { number: p }, 'make a family of four facts. Two times and two divided by, all with the same three numbers.'],
    steps: [`A fact family uses the same three numbers: ${a}, ${b} and ${p}.`, `${sentence(a, '×', b, p)} and ${sentence(b, '×', a, p)}.`, `${sentence(p, '÷', a, b)} and ${sentence(p, '÷', b, a)}.`],
    visual: { kind: 'text', value: [sentence(a, '×', b, p), sentence(b, '×', a, p), sentence(p, '÷', a, b), sentence(p, '÷', b, a)].join('   '), size: 'm' },
  };
}

function factFamilies(level: Level, rng: Rng): QuestionDraft {
  const [a, b] = distinctPair(rng, 2, 9);
  const p = a * b;
  const explanation = familyExplanation(a, b);
  if (level === 2) {
    const prompt = { text: `${sentence(a, '×', b, p)}. So what is ${p} ÷ ${a}?`, speak: [...sentenceSay(sentence(a, '×', b, p)), '. So what is', { number: p }, 'divided by', { number: a }, '?'] as Say };
    const values = numeralChoices(b, [a, b + 1, b - 1], 1, 20, rng);
    // The family's first step names the answer, so the hint asks the times question instead.
    return { type: 'choice', mode: 'look', facts: { rows: a, cols: b, total: p, by: a, ask: 'quotient', options: values }, prompt, stimulus: equation(p, '÷', a, '=', 'blank'), options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(b), explanation: { ...explanation, hint: { text: `Think: ${a} times what is ${p}?` } } };
  }
  if (level === 3) {
    // Three of the family, and one true fact with other numbers.
    const outsider = sentence(a, '×', b + 1, a * (b + 1));
    const choices = rng.shuffle([sentence(a, '×', b, p), sentence(b, '×', a, p), sentence(p, '÷', a, b), outsider]);
    const prompt = { text: `Which one is not in the family of ${a}, ${b} and ${p}?`, speak: ['Which one is not in the family of', { number: a }, ',', { number: b }, 'and', { number: p }, '?'] as Say };
    return { type: 'choice', mode: 'look', facts: { rows: a, cols: b, ask: 'notInFamily', options: choices }, prompt, options: choices.map((label) => text(label, sentenceSay(label))), answerIndex: choices.indexOf(outsider), explanation: { ...explanation, hint: { text: 'A fact family uses only its own three numbers. Look for the fact with a different number.' } } };
  }
  // The division that belongs, a wrong one with the same numbers, and a true one with other numbers.
  const choices = rng.shuffle([sentence(p, '÷', a, b), sentence(p, '÷', a, b + 1), sentence(p + a, '÷', a, b + 1)]);
  const prompt = { text: `Which division goes with ${sentence(a, '×', b, p)}?`, speak: ['Which division goes with', ...sentenceSay(sentence(a, '×', b, p)), '?'] as Say };
  return { type: 'choice', mode: 'look', facts: { rows: a, cols: b, ask: 'inFamily', options: choices }, prompt, options: choices.map((label) => text(label, sentenceSay(label))), answerIndex: choices.indexOf(sentence(p, '÷', a, b)), explanation: { ...explanation, hint: { text: `A fact family uses the same three numbers. Find the division that uses only ${a}, ${b} and ${p}.` } } };
}

export const factFamiliesGenerator: SkillGenerator = {
  skillId: 'M-3-D3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: factFamilies,
  exampleSeed: 333,
  example: () => factFamilies(1, makeRng(333)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Three numbers can make four facts.', speak: ['Three numbers can make four facts.'], visual: equation(3, '×', 4, '=', 12) },
    { beat: 'watch', text: familyExplanation(3, 4).steps.join(' '), speak: familyExplanation(3, 4).speak, visual: familyExplanation(3, 4).visual },
    { beat: 'try', text: 'Which division goes with 5 × 6 = 30?', speak: ['Which division goes with', ...sentenceSay('5 × 6 = 30'), '?'], visual: equation(5, '×', 6, '=', 30), reveal: { text: familyExplanation(5, 6).steps.join(' '), speak: familyExplanation(5, 6).speak, visual: familyExplanation(5, 6).visual } },
    { beat: 'remember', text: 'A fact family uses the same three numbers.', speak: ['A fact family uses the same three numbers.'], visual: familyExplanation(3, 4).visual },
  ],
  oracle: 'multiply',
};
