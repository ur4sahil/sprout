import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';

// Math grade 2 B.1 to B.7: adding and subtracting within 100 and within 1,000, by places.

export type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint; stepsSay?: (Say | null)[] };
export const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });
// A sum is asked the natural way, "What is 21 plus 4?" (the owner's choice, Nov 22, 2026). Grade 3 asks with these too.
export const plusPrompt = (a: number, b: number): { text: string; speak: Say } => ({ text: `What is ${a} plus ${b}?`, speak: ['What is', { number: a }, 'plus', { number: b }, '?'] });
export const minusPrompt = (a: number, b: number): { text: string; speak: Say } => ({ text: `What is ${a} minus ${b}?`, speak: ['What is', { number: a }, 'minus', { number: b }, '?'] });

// One sentence, written and spoken. Numbers are said as numbers, and a sign written on its own is said as its
// word: "1 + 4 = 5." is "one plus four is five". A piece that starts with a stop or a comma joins the word before it.
interface Line {
  text: string;
  speak: Say;
}
const SIGN_SAID: Record<string, string> = { '+': 'plus', '−': 'minus', '-': 'minus', '=': 'is' };
export function line(...pieces: (string | number)[]): Line {
  let text = '';
  const speak: Say = [];
  for (const piece of pieces) {
    const word = String(piece);
    text += text.length === 0 || /^[.,:;?!]/.test(word) ? word : ` ${word}`;
    speak.push(typeof piece === 'number' ? { number: piece } : (SIGN_SAID[piece] ?? piece));
  }
  return { text, speak };
}
// Several sentences shown as one step.
const merge = (lines: Line[]): Line => ({ text: lines.map((each) => each.text).join(' '), speak: lines.flatMap((each) => each.speak) });
export const together = (lines: Line[], visual: Visual, hint?: Hint): Explanation => ({ speak: lines.flatMap((each) => each.speak), steps: lines.map((each) => each.text), visual, ...(hint ? { hint } : {}) });

const PLACES = ['ones', 'tens', 'hundreds'] as const;
const ONE_OF = ['one', 'ten', 'hundred', 'thousand'] as const;
const digit = (n: number, place: number): number => Math.floor(n / 10 ** place) % 10;
const placeName = (place: number): string => PLACES[place] as string;
const oneName = (place: number): string => ONE_OF[place] as string;
const stayLine = (place: number): Line => line(`The ${placeName(place)} stay the same.`);

// What a place does in a sum: its line, and whether anything changes there.
interface PlaceStep {
  place: number;
  changes: boolean;
  line: Line;
}

// When only one place changes, the walk says so first, so its first line works nothing out: "Only the ones
// change." Otherwise each place gets its line, ones first, then the answer. Never more than four steps.
function walk(work: PlaceStep[], regroups: boolean, answer: Line, visual: Visual, hint: string): Explanation {
  const changed = work.filter((each) => each.changes);
  const only = changed[0];
  if (changed.length === 1 && only && !regroups) {
    const lead = line(`Only the ${placeName(only.place)} change.`);
    return together([lead, only.line, answer], visual, { text: lead.text });
  }
  return together([...work.map((each) => each.line), answer], visual, { text: hint });
}

// "That is 1 ten and 2 ones." With none left it says so, and "1 ten and 1 one" is said "1 ten and 1 more".
function regroupLine(left: number, place: number): Line {
  const next = oneName(place + 1);
  if (left === 0) return line('That is', 1, `${next} and no ${placeName(place)}.`);
  if (left === 1 && place === 0) return line('That is', 1, `${next} and`, 1, 'more.');
  return line('That is', 1, `${next} and`, left, `${left === 1 ? oneName(place) : placeName(place)}.`);
}

// The places where adding a and b makes a new ten or a new hundred.
export function carries(a: number, b: number): number[] {
  const at: number[] = [];
  let carry = 0;
  for (let place = 0; place < 3; place += 1) {
    carry = digit(a, place) + digit(b, place) + carry >= 10 ? 1 : 0;
    if (carry === 1) at.push(place);
  }
  return at;
}

// The places where taking b from a needs a ten or a hundred broken up.
export function borrows(a: number, b: number): number[] {
  const at: number[] = [];
  let borrow = 0;
  for (let place = 0; place < 3; place += 1) {
    borrow = digit(a, place) - borrow < digit(b, place) ? 1 : 0;
    if (borrow === 1) at.push(place);
  }
  return at;
}

// Adding place by place, ones first. A place with nothing to add stays the same, and a new ten or hundred is
// added in the next place: "Add the new ten: 5 + 1 = 6." Number sentences are written with their signs.
export function addExplanation(a: number, b: number): Explanation {
  const work: PlaceStep[] = [];
  let carry = 0;
  let firstCarry = -1;
  for (let place = 0; place < 3 && (a >= 10 ** place || b >= 10 ** place || carry === 1); place += 1) {
    const [x, y] = [digit(a, place), digit(b, place)];
    if (y === 0 && carry === 0) {
      work.push({ place, changes: false, line: stayLine(place) });
      continue;
    }
    const total = x + y + carry;
    const added =
      y === 0 && a < 10 ** place
        ? line(`The new ${oneName(place)} makes`, 1, `${oneName(place)}.`)
        : y === 0
          ? line(`Add the new ${oneName(place)}:`, x, '+', 1, '=', total, '.')
          : carry === 1
            ? line(`Add the ${placeName(place)} and the new ${oneName(place)}:`, x, '+', y, '+', 1, '=', total, '.')
            : line(`Add the ${placeName(place)}:`, x, '+', y, '=', total, '.');
    carry = total >= 10 ? 1 : 0;
    if (carry === 1 && firstCarry === -1) firstCarry = place;
    work.push({ place, changes: true, line: carry === 1 ? merge([added, regroupLine(total - 10, place)]) : added });
  }
  // The hint is the move, never its result. It never says "one" or "ten": the answer can be 1 or 10.
  const hint = firstCarry === 0 ? 'Add the ones first. 10 ones make a new ten.' : firstCarry === 1 ? 'Add place by place, starting with the ones. 10 tens make a new hundred.' : 'Add place by place, starting with the ones.';
  return walk(work, firstCarry !== -1, line('The answer is', a + b, '.'), equation(a, '+', b, '=', a + b), hint);
}

// Subtracting place by place, ones first. When a place has too few, one of the next place is broken up and the
// step says how many there are now: "There are not enough ones, so break a ten. Now there are 13 ones: 13 − 5 = 8."
export function subtractExplanation(a: number, b: number): Explanation {
  const work: PlaceStep[] = [];
  let borrow = 0;
  let firstBorrow = -1;
  for (let place = 0; place < 3 && a >= 10 ** place; place += 1) {
    const [x, y] = [digit(a, place) - borrow, digit(b, place)];
    if (y === 0 && borrow === 0) {
      work.push({ place, changes: false, line: stayLine(place) });
      continue;
    }
    const name = placeName(place);
    const lent = borrow === 1;
    // After lending one to the place before: "Now there are 4 tens."
    const now = x === 0 ? line(`Now there are no ${name}.`) : line('Now there', x === 1 ? 'is' : 'are', x, `${x === 1 ? oneName(place) : name}.`);
    borrow = x < y ? 1 : 0;
    if (borrow === 1 && firstBorrow === -1) firstBorrow = place;
    let step: Line;
    if (borrow === 1) {
      const broken = line('Now there are', x + 10, `${name}:`, x + 10, '−', y, '=', x + 10 - y, '.');
      step = lent ? merge([now, line(`That is not enough, so break a ${oneName(place + 1)}.`), broken]) : merge([line(`There are not enough ${name}, so break a ${oneName(place + 1)}.`), broken]);
    } else if (y > 0) {
      const taken = line(`Subtract the ${name}:`, x, '−', y, '=', x - y, '.');
      step = lent ? merge([now, taken]) : taken;
    } else step = now;
    work.push({ place, changes: true, line: step });
  }
  const hint = firstBorrow === 0 ? 'Start with the ones. If there are not enough, break a ten.' : firstBorrow === 1 ? 'Start with the ones, then the tens. If there are not enough tens, break a hundred.' : 'Subtract place by place, starting with the ones.';
  return walk(work, firstBorrow !== -1, line('The answer is', a - b, '.'), equation(a, '-', b, '=', a - b), hint);
}

export function addQuestion(a: number, b: number, typed: boolean, rng: Rng, named = false): QuestionDraft {
  const sum = a + b;
  const hi = sum > 100 ? 999 : 120;
  // The oracle is named on the question when the skill uses two.
  const facts: QuestionDraft['facts'] = named ? { a, b, oracle: 'add' } : { a, b };
  const base = { mode: 'look' as const, prompt: plusPrompt(a, b), stimulus: equation(a, '+', b, '=', 'blank'), explanation: addExplanation(a, b) };
  if (typed) return { ...base, type: 'numberPad', facts, answer: sum, maxDigits: 3 };
  // The slips: a new ten or hundred forgotten or counted twice, or a small number added in the wrong place.
  const values = numeralChoices(sum, [sum - 10, sum + 10, ...(sum > 100 ? [sum - 100, sum + 100] : []), ...(b < 10 ? [a + b * 10] : [])], 1, hi, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(sum) };
}

export function subtractQuestion(a: number, b: number, typed: boolean, rng: Rng, named = false): QuestionDraft {
  const answer = a - b;
  // The oracle is named on the question when the skill uses two.
  const facts: QuestionDraft['facts'] = named ? { a, b, oracle: 'subtract' } : { a, b };
  const base = { mode: 'look' as const, prompt: minusPrompt(a, b), stimulus: equation(a, '-', b, '=', 'blank'), explanation: subtractExplanation(a, b) };
  if (typed) return { ...base, type: 'numberPad', facts, answer, maxDigits: 3 };
  // The slips: ten or a hundred out, or the smaller digit taken from the bigger one in each place.
  const flipped = [0, 1, 2].reduce((sum, place) => sum + Math.abs(digit(a, place) - digit(b, place)) * 10 ** place, 0);
  const values = numeralChoices(answer, [answer - 10, answer + 10, flipped, ...(a > 100 ? [answer - 100, answer + 100] : [])], 0, a > 100 ? 999 : 120, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

// Two numbers that fit a rule, found by trying.
function find(pick: () => [number, number], fits: (a: number, b: number) => boolean): [number, number] {
  for (;;) {
    const [a, b] = pick();
    if (fits(a, b)) return [a, b];
  }
}

// ---- B.1 and B.2 Add within 100 ----
// Levels: two-digit plus one-digit / two-digit plus two-digit / typed. Oracle: add.

function addWithin100(regroup: boolean): (level: Level, rng: Rng) => QuestionDraft {
  return (level, rng) => {
    const twoDigit = level === 2 || (level === 3 && rng.bool());
    // No regrouping: no new ten. Regrouping: a new ten from the ones. The sum stays below 100.
    const [a, b] = find(
      () => [rng.int(11, 89), twoDigit ? rng.int(11, 79) : rng.int(1, 9)],
      (x, y) => x + y <= 99 && x % 10 !== 0 && carries(x, y).length === (regroup ? 1 : 0),
    );
    return addQuestion(a, b, level === 3, rng);
  };
}

const addLesson = (see: string, watch: [number, number], attempt: [number, number], remember: string): (() => LessonStep[]) => () => [
  { beat: 'see', text: see, speak: [see], visual: equation(watch[0], '+', watch[1]) },
  { beat: 'watch', text: `${watch[0]} plus ${watch[1]}. ${addExplanation(...watch).steps.join(' ')}`, speak: [{ number: watch[0] }, 'plus', { number: watch[1] }, '.', ...addExplanation(...watch).speak], visual: addExplanation(...watch).visual },
  { beat: 'try', text: plusPrompt(...attempt).text, speak: plusPrompt(...attempt).speak, visual: equation(attempt[0], '+', attempt[1], '=', 'blank'), reveal: { text: addExplanation(...attempt).steps.join(' '), speak: addExplanation(...attempt).speak, visual: addExplanation(...attempt).visual } },
  { beat: 'remember', text: remember, speak: [remember], visual: addExplanation(...watch).visual },
];
const subtractLesson = (see: string, watch: [number, number], attempt: [number, number], remember: string): (() => LessonStep[]) => () => [
  { beat: 'see', text: see, speak: [see], visual: equation(watch[0], '-', watch[1]) },
  { beat: 'watch', text: `${watch[0]} minus ${watch[1]}. ${subtractExplanation(...watch).steps.join(' ')}`, speak: [{ number: watch[0] }, 'minus', { number: watch[1] }, '.', ...subtractExplanation(...watch).speak], visual: subtractExplanation(...watch).visual },
  { beat: 'try', text: minusPrompt(...attempt).text, speak: minusPrompt(...attempt).speak, visual: equation(attempt[0], '-', attempt[1], '=', 'blank'), reveal: { text: subtractExplanation(...attempt).steps.join(' '), speak: subtractExplanation(...attempt).speak, visual: subtractExplanation(...attempt).visual } },
  { beat: 'remember', text: remember, speak: [remember], visual: subtractExplanation(...watch).visual },
];

const addNoRegroup = addWithin100(false);
export const addNoRegroupGenerator: SkillGenerator = {
  skillId: 'M-2-B1',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addNoRegroup,
  exampleSeed: 211,
  example: () => addNoRegroup(1, makeRng(211)),
  lesson: addLesson('To add big numbers, add the ones, then add the tens.', [42, 35], [51, 27], 'Ones with ones, tens with tens.'),
  oracle: 'add',
};

const addRegroup = addWithin100(true);
export const addRegroupGenerator: SkillGenerator = {
  skillId: 'M-2-B2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addRegroup,
  exampleSeed: 212,
  example: () => addRegroup(1, makeRng(212)),
  lesson: addLesson('When the ones make ten or more, they make a new ten.', [27, 5], [38, 24], 'Ten ones make a new ten.'),
  oracle: 'add',
};

// ---- B.3 and B.4 Subtract within 100 ----
// Levels: minus one-digit / minus two-digit / typed. Oracle: subtract.

function subtractWithin100(regroup: boolean): (level: Level, rng: Rng) => QuestionDraft {
  return (level, rng) => {
    const twoDigit = level === 2 || (level === 3 && rng.bool());
    const [a, b] = find(
      () => [rng.int(21, 99), twoDigit ? rng.int(11, 89) : rng.int(1, 9)],
      (x, y) => x - y >= 1 && borrows(x, y).length === (regroup ? 1 : 0) && (regroup || y % 10 !== 0),
    );
    return subtractQuestion(a, b, level === 3, rng);
  };
}

const subtractNoRegroup = subtractWithin100(false);
export const subtractNoRegroupGenerator: SkillGenerator = {
  skillId: 'M-2-B3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractNoRegroup,
  exampleSeed: 213,
  example: () => subtractNoRegroup(1, makeRng(213)),
  lesson: subtractLesson('To subtract big numbers, take away the ones, then the tens.', [68, 25], [79, 34], 'Ones from ones, tens from tens.'),
  oracle: 'subtract',
};

const subtractRegroup = subtractWithin100(true);
export const subtractRegroupGenerator: SkillGenerator = {
  skillId: 'M-2-B4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractRegroup,
  exampleSeed: 214,
  example: () => subtractRegroup(1, makeRng(214)),
  lesson: subtractLesson('When there are not enough ones, break a ten into ten ones.', [42, 7], [53, 26], 'Not enough ones? Break a ten.'),
  oracle: 'subtract',
};

// ---- B.5 Add within 1,000 and B.6 Subtract within 1,000 ----
// Levels: plus or minus hundreds / no regrouping / one regroup, typed. Oracles: add, subtract.

function addWithin1000(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const a = rng.int(101, 899);
    return addQuestion(a, 100 * rng.int(1, 9 - Math.floor(a / 100)), false, rng);
  }
  const [a, b] = find(
    () => [rng.int(101, 899), rng.int(11, 799)],
    (x, y) => x + y <= 999 && y % 100 !== 0 && carries(x, y).length === (level === 3 ? 1 : 0),
  );
  return addQuestion(a, b, level === 3, rng);
}

export const addWithin1000Generator: SkillGenerator = {
  skillId: 'M-2-B5',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addWithin1000,
  exampleSeed: 215,
  example: () => addWithin1000(1, makeRng(215)),
  lesson: addLesson('Three-digit numbers add the same way: ones, then tens, then hundreds.', [342, 215], [431, 200], 'Ones, then tens, then hundreds.'),
  oracle: 'add',
};

function subtractWithin1000(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const a = rng.int(201, 999);
    return subtractQuestion(a, 100 * rng.int(1, Math.floor(a / 100) - 1), false, rng);
  }
  const [a, b] = find(
    () => [rng.int(201, 999), rng.int(11, 899)],
    (x, y) => x - y >= 1 && y % 100 !== 0 && borrows(x, y).length === (level === 3 ? 1 : 0),
  );
  return subtractQuestion(a, b, level === 3, rng);
}

export const subtractWithin1000Generator: SkillGenerator = {
  skillId: 'M-2-B6',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractWithin1000,
  exampleSeed: 216,
  example: () => subtractWithin1000(1, makeRng(216)),
  lesson: subtractLesson('Three-digit numbers subtract the same way: ones, then tens, then hundreds.', [568, 245], [749, 300], 'Ones, then tens, then hundreds.'),
  oracle: 'subtract',
};

// ---- B.7 Add or subtract 10 or 100 ----
// Levels: plus or minus 10 / plus or minus 100 / across a hundred, typed. Oracles: add, subtract.

function tenOrHundred(level: Level, rng: Rng): QuestionDraft {
  const plus = rng.bool();
  if (level === 2) {
    const a = plus ? rng.int(101, 899) : rng.int(201, 999);
    return plus ? addQuestion(a, 100, false, rng, true) : subtractQuestion(a, 100, false, rng, true);
  }
  // Level 1 stays inside its hundred. Level 3 crosses into the next one: 295 plus 10, 304 minus 10.
  const cross = level === 3;
  const hundreds = rng.int(1, cross && plus ? 8 : 9) * 100;
  const tens = cross ? (plus ? 9 : 0) : plus ? rng.int(0, 8) : rng.int(1, 9);
  const a = hundreds + tens * 10 + rng.int(0, 9);
  return plus ? addQuestion(a, 10, cross, rng, true) : subtractQuestion(a, 10, cross, rng, true);
}

export const tenOrHundredGenerator: SkillGenerator = {
  skillId: 'M-2-B7',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: tenOrHundred,
  exampleSeed: 217,
  example: () => tenOrHundred(1, makeRng(217)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Adding 10 changes the tens digit. Adding 100 changes the hundreds digit.', speak: ['Adding', { number: 10 }, 'changes the tens digit. Adding', { number: 100 }, 'changes the hundreds digit.'], visual: { kind: 'baseTen', hundreds: 2, tens: 4, ones: 3 } },
    { beat: 'watch', text: `243 plus 10. ${addExplanation(243, 10).steps.join(' ')}`, speak: [{ number: 243 }, 'plus', { number: 10 }, '.', ...addExplanation(243, 10).speak], visual: addExplanation(243, 10).visual },
    { beat: 'try', text: minusPrompt(567, 100).text, speak: minusPrompt(567, 100).speak, visual: equation(567, '-', 100, '=', 'blank'), reveal: { text: subtractExplanation(567, 100).steps.join(' '), speak: subtractExplanation(567, 100).speak, visual: subtractExplanation(567, 100).visual } },
    { beat: 'remember', text: 'Change only the place you add to.', speak: ['Change only the place you add to.'], visual: addExplanation(243, 10).visual },
  ],
  oracle: 'add',
};
