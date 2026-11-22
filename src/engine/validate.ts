import { stepSay } from '../audio/stepSay';
import { canonicalJson, canonicalVisual, questionKey } from './canonical';
import { sayText } from './describe';
import { FIGURES } from './figures';
import { givesAway } from './giveaway';
import { isSoundKey } from './letterSounds';
import type { OracleId, Question, Say, SkillGrade, Visual } from './types';
import { ORACLE_FACTS } from './types';

// The invariants every question must satisfy (plan section 5).
// Each problem starts with the number of the invariant it breaks.

export interface ValidateOptions {
  grade?: SkillGrade; // turns on invariant 12
  oracle?: OracleId; // the skill's oracle, unless the question names its own in facts.oracle
  soundAlikes?: readonly (readonly string[])[]; // groups of words that sound the same, for tiles
}

const BANNED_IN_SPEECH = /[0-9+=□<>_]/;

export function isSay(value: unknown): value is Say {
  return Array.isArray(value);
}

function checkSay(say: Say, where: string, problems: string[]): void {
  if (say.length === 0) problems.push(`1: ${where} is empty`);
  for (const part of say) {
    if (typeof part === 'string') {
      if (part.trim().length === 0) problems.push(`1: ${where} has an empty string part`);
      if (BANNED_IN_SPEECH.test(part)) {
        problems.push(`1: ${where} has a digit or symbol in plain words: "${part}"`);
      }
    } else if ('letter' in part) {
      if (!/^[A-Za-z]$/.test(part.letter)) problems.push(`1: ${where} has a letter part that is not one letter`);
    } else if ('word' in part) {
      if (!/^[A-Za-z][A-Za-z' -]*$/.test(part.word)) problems.push(`1: ${where} has a word part that is not a word`);
    } else if ('number' in part) {
      if (!Number.isInteger(part.number) || part.number < 0 || part.number > 10000) {
        problems.push(`1: ${where} has a number part outside 0 to 10,000`);
      }
    } else if ('time' in part) {
      const { hour, minute } = part.time;
      if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
        problems.push(`1: ${where} has a time part that is not a clock time`);
      }
    } else if ('cents' in part) {
      if (!Number.isInteger(part.cents) || part.cents < 0) problems.push(`1: ${where} has a cents part that is not a whole amount`);
    } else if ('sound' in part) {
      if (!isSoundKey(part.sound)) problems.push(`1: ${where} has a sound part that is not in the list of letter sounds`);
    } else {
      problems.push(`1: ${where} has a part of an unknown kind`);
    }
  }
}

// Invariant 2, and every Say found on the way.
function walk(value: unknown, where: string, problems: string[]): void {
  if (value === undefined) {
    problems.push(`2: ${where} is undefined`);
    return;
  }
  if (typeof value === 'number' && Number.isNaN(value)) {
    problems.push(`2: ${where} is NaN`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) problems.push(`2: ${where} is an empty array`);
    value.forEach((item, i) => walk(item, `${where}[${i}]`, problems));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [name, inner] of Object.entries(value)) {
      const path = `${where}.${name}`;
      if (name === 'speak' && isSay(inner)) checkSay(inner, path, problems);
      // A Say part such as { word: 'cat' } is checked by checkSay, not walked.
      if (name === 'speak' && isSay(inner)) {
        if (inner.length === 0) problems.push(`2: ${path} is an empty array`);
        continue;
      }
      walk(inner, path, problems);
    }
  }
}

function visualsIn(visual: Visual | 'blank', out: Visual[]): void {
  if (visual === 'blank') return;
  out.push(visual);
  if (visual.kind === 'row') visual.children.forEach((child) => visualsIn(child, out));
  if (visual.kind === 'sequence') visual.items.forEach((item) => visualsIn(item, out));
  if (visual.kind === 'matrix') visual.cells.forEach((cell) => visualsIn(cell, out));
}

// Every visual the child can see while answering: the stimulus and the things to tap.
function answerVisuals(question: Question): Visual[] {
  const tops: Visual[] = [];
  if (question.stimulus) tops.push(question.stimulus);
  if (question.type === 'choice' || question.type === 'multiSelect' || question.type === 'dragWord') tops.push(...question.options);
  if (question.type === 'order' || question.type === 'sort') tops.push(...question.items);
  if (question.type === 'match') tops.push(...question.left, ...question.right);
  const all: Visual[] = [];
  tops.forEach((visual) => visualsIn(visual, all));
  return all;
}

// Words a picture prints for the child to read: a text picture's value, the caption under a picture, a graph's title.
function printedWords(visual: Visual): string | undefined {
  if (visual.kind === 'text') return visual.value;
  if (visual.kind === 'emojiGroup') return visual.caption;
  if (visual.kind === 'graph') return visual.title;
  return undefined;
}

function sameForm(a: Visual, b: Visual): boolean {
  return canonicalJson(canonicalVisual(a)) === canonicalJson(canonicalVisual(b));
}

function isIndexList(list: number[], size: number): boolean {
  return list.every((i) => Number.isInteger(i) && i >= 0 && i < size);
}

function coversOnce(list: number[], size: number): boolean {
  return list.length === size && new Set(list).size === size && isIndexList(list, size);
}

function sayWords(say: Say): string[] {
  const words: string[] = [];
  for (const part of say) {
    const text = typeof part === 'string' ? part : 'word' in part ? part.word : '';
    words.push(...text.toLowerCase().split(/[^a-z']+/).filter((word) => word.length > 0));
  }
  return words;
}

function stringList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

// Whether the text can be spelled with exactly `slots` tiles from the bank, each used once.
function canBuild(text: string, bank: readonly string[], slots: number): boolean {
  if (slots === 0) return text.length === 0;
  for (let i = 0; i < bank.length; i += 1) {
    const tile = bank[i] ?? '';
    if (tile.length === 0 || !text.startsWith(tile)) continue;
    if (canBuild(text.slice(tile.length), bank.slice(0, i).concat(bank.slice(i + 1)), slots - 1)) return true;
  }
  return false;
}

// Every way to fill the slots with tiles from the bank, each tile used at most once.
function arrangements(bank: string[], slots: number, limit: number): Set<string> {
  const found = new Set<string>();
  const used = new Array<boolean>(bank.length).fill(false);
  function fill(built: string, left: number): void {
    if (found.size >= limit) return;
    if (left === 0) {
      found.add(built);
      return;
    }
    for (let i = 0; i < bank.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      fill(built + (bank[i] ?? ''), left - 1);
      used[i] = false;
    }
  }
  fill('', slots);
  return found;
}

export function validateQuestion(question: Question, options: ValidateOptions = {}): string[] {
  const problems: string[] = [];
  const q = question;

  // 1 and 2
  walk(q, 'question', problems);
  if (!isSay(q.prompt?.speak) || q.prompt.speak.length === 0) problems.push('1: prompt.speak is missing');
  if (!isSay(q.explanation?.speak) || q.explanation.speak.length === 0) problems.push('1: explanation.speak is missing');
  if (typeof q.prompt?.text !== 'string' || q.prompt.text.trim().length === 0) problems.push('2: prompt.text is empty');
  const steps = q.explanation?.steps ?? [];
  if (steps.length < 1 || steps.length > 4) problems.push('2: explanation.steps must hold 1 to 4 lines');
  if (![1, 2, 3, 4].includes(q.level)) problems.push('2: level must be 1 to 4');

  switch (q.type) {
    case 'choice': {
      const n = q.options.length;
      if (n < 2 || n > 4) problems.push(`3: a choice has ${n} options, not 2 to 4`);
      if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= n) {
        problems.push('3: answerIndex is out of range');
        break;
      }
      const answer = q.options[q.answerIndex] as Visual;
      if (q.twins) {
        const wrong = q.options.filter((_, i) => i !== q.answerIndex);
        const first = wrong[0];
        if (wrong.length < 2) problems.push('3: a twins question needs at least two matching wrong options');
        if (first && !wrong.every((option) => sameForm(option, first))) {
          problems.push('3: in a twins question the wrong options must all be the same picture');
        }
        if (first && sameForm(answer, first)) problems.push('3: in a twins question the answer must differ from the others');
      } else {
        for (let i = 0; i < n; i += 1) {
          for (let j = i + 1; j < n; j += 1) {
            if (sameForm(q.options[i] as Visual, q.options[j] as Visual)) {
              problems.push(`3: options ${i} and ${j} are the same picture`);
            }
          }
        }
      }
      if (options.grade) {
        const most = options.grade === 'PK' || options.grade === 'K' ? 3 : options.grade === 'all' ? (q.level <= 2 ? 3 : 4) : 4;
        if (n > most) problems.push(`12: ${n} options is more than ${most} for this grade and level`);
      }
      break;
    }
    case 'multiSelect': {
      const n = q.options.length;
      const right = q.answerIndexes;
      if (right.length < 1) problems.push('4: a multiSelect needs at least one right option');
      if (new Set(right).size !== right.length || !isIndexList(right, n)) problems.push('4: answerIndexes are not valid');
      if (right.length >= n) problems.push('4: a multiSelect needs at least one wrong option');
      break;
    }
    case 'tapCount':
      if (!(Number.isInteger(q.answer) && Number.isInteger(q.shown) && q.answer >= 1 && q.answer <= q.shown && q.shown <= 12)) {
        problems.push('5: tapCount needs 1 <= answer <= shown <= 12');
      }
      break;
    case 'numberPad':
      if (!Number.isInteger(q.answer) || q.answer < 0) problems.push('6: the answer must be a whole number, zero or more');
      if (!Number.isInteger(q.maxDigits) || q.maxDigits < 1 || String(q.answer).length > q.maxDigits) {
        problems.push('6: the answer does not fit maxDigits');
      }
      break;
    case 'order':
      if (q.items.length < 2 || !coversOnce(q.answerOrder, q.items.length)) {
        problems.push('7: answerOrder must name every item exactly once');
      }
      break;
    case 'sort': {
      if (q.answerBin.length !== q.items.length || !isIndexList(q.answerBin, q.bins.length)) {
        problems.push('7: answerBin must give one bin for every item');
      }
      if (q.bins.length < 2) problems.push('7: a sort needs at least two bins');
      if (new Set(q.answerBin).size !== q.bins.length) problems.push('7: every bin must be used at least once');
      break;
    }
    case 'match': {
      const lefts = q.answerPairs.map(([l]) => l);
      const rights = q.answerPairs.map(([, r]) => r);
      if (q.left.length !== q.right.length || !coversOnce(lefts, q.left.length) || !coversOnce(rights, q.right.length)) {
        problems.push('7: answerPairs must use every left and right item exactly once');
      }
      break;
    }
    // Rule 17: the five types from plan section 15.4.
    case 'numberLineTap': {
      const { min, max, step } = q.line;
      const marks = (max - min) / step;
      if (!(step > 0 && max > min && Number.isInteger(marks))) problems.push('17: the line must run from min to max in whole steps');
      else if (marks > 20) problems.push('17: a line has at most 21 marks, or they are too close to tell apart');
      if (!(q.answer >= min && q.answer <= max && Number.isInteger((q.answer - min) / step))) problems.push('17: the answer must be a mark on the line');
      break;
    }
    case 'fillShape': {
      const figure = FIGURES[q.figure];
      if (!figure) problems.push('17: fillShape names a figure that does not exist');
      else if (q.answer !== figure.slots.length) problems.push('17: the answer must be the number of pieces that fill the figure');
      break;
    }
    case 'setClock': {
      const valid = (t: { hour: number; minute: number }): boolean => Number.isInteger(t.hour) && t.hour >= 1 && t.hour <= 12 && Number.isInteger(t.minute) && t.minute >= 0 && t.minute <= 59 && t.minute % q.minuteStep === 0;
      if (!valid(q.answer) || !valid(q.start)) problems.push('17: the times must be clock times on the minute step');
      if (q.answer.hour === q.start.hour && q.answer.minute === q.start.minute) problems.push('17: the hands must not start at the answer');
      break;
    }
    case 'buildBar': {
      const scale = q.scale ?? 1;
      if (q.categories.length < 2 || q.categories.length > 5) problems.push('17: a bar graph has 2 to 5 bars');
      if (q.answer.length !== q.categories.length) problems.push('17: one answer value for each bar');
      if (!q.answer.every((value) => Number.isInteger(value) && value >= 0 && value <= q.max && value % scale === 0)) problems.push('17: each value must be a step of the scale, from 0 to max');
      if (q.max / scale > 10) problems.push('17: a bar has at most 10 steps');
      if (q.answer.every((value) => value === 0)) problems.push('17: at least one bar must go up');
      break;
    }
    case 'columnSum': {
      const right = q.op === '+' ? q.top + q.bottom : q.top - q.bottom;
      if (q.answer !== right || right < 0) problems.push('17: the answer must be the sum or difference, zero or more');
      if (!(Number.isInteger(q.top) && Number.isInteger(q.bottom) && q.top <= 9999 && q.bottom >= 0)) problems.push('17: column sums use whole numbers to 9,999');
      break;
    }
    case 'dragWord': {
      const n = q.options.length;
      if (n < 2 || n > 4) problems.push(`17: a gap has ${n} words to choose from, not 2 to 4`);
      if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= n) problems.push('17: answerIndex is out of range');
      if (q.before.trim().length === 0 && q.after.trim().length === 0) problems.push('17: the gap needs words around it');
      for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) if (sameForm(q.options[i] as Visual, q.options[j] as Visual)) problems.push(`17: words ${i} and ${j} are the same`);
      break;
    }
    case 'tiles': {
      const buildable = canBuild(q.answer, q.bank, q.slots);
      if (!buildable) problems.push('8: the answer cannot be built from the bank in the given slots');
      else if (q.bank.length - q.slots < 2) problems.push('8: the bank needs at least 2 tiles that are not needed');
      const needed = buildable ? q.slots : null;
      if (!Number.isInteger(q.slots) || q.slots < 1) problems.push('8: slots must be 1 or more');
      const group = (options.soundAlikes ?? []).find((words) => words.includes(q.answer));
      if (group && needed !== null) {
        const built = arrangements(q.bank, q.slots, 5000);
        for (const word of group) {
          if (word !== q.answer && built.has(word)) problems.push(`8: the bank can also spell "${word}", which sounds like the answer`);
        }
      }
      break;
    }
  }

  // 13
  const facts = q.facts;
  if (facts === null || typeof facts !== 'object' || Array.isArray(facts) || Object.keys(facts).length === 0) {
    problems.push('13: facts is missing');
  } else {
    const named = typeof facts.oracle === 'string' ? (facts.oracle as OracleId) : options.oracle;
    if (typeof facts.oracle === 'string' && !(facts.oracle in ORACLE_FACTS)) problems.push(`13: facts.oracle names no oracle: ${facts.oracle}`);
    if (named && named in ORACLE_FACTS) {
      for (const name of ORACLE_FACTS[named]) {
        if (!(name in facts)) problems.push(`13: facts is missing "${name}", which the ${named} oracle needs`);
      }
    }
    if ((q.type === 'choice' || q.type === 'multiSelect' || q.type === 'dragWord') && named !== 'authored') {
      if (!Array.isArray(facts.options) || facts.options.length !== q.options.length) {
        problems.push('13: facts.options must list the plain value of every option, in order');
      }
    }
    if (q.key !== questionKey(q.skillId, q.level, facts)) problems.push('13: key does not match the facts');
  }

  const seen = answerVisuals(q);

  // 14
  if (q.mode === 'listen') {
    const target = facts && typeof facts === 'object' ? facts.target : undefined;
    if (target === undefined) problems.push('14: a listen question needs facts.target');
    else {
      const shown = q.prompt.text.toLowerCase();
      const word = String(target).toLowerCase();
      const pattern = new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
      if (pattern.test(shown)) problems.push('14: the on-screen prompt of a listen question shows the target');
      // Words printed under a picture, or over a graph, are on screen too.
      for (const visual of seen) {
        const printed = visual.kind === 'text' ? undefined : printedWords(visual);
        if (printed !== undefined && pattern.test(printed.toLowerCase())) problems.push(`14: a picture's printed words show the target of a listen question: "${printed}"`);
      }
    }
    if (seen.some((visual) => visual.speak !== undefined)) problems.push('14: a listen question has a visual with a spoken label');
    if (q.type === 'sort' && q.bins.some((bin) => bin.icon?.speak !== undefined)) problems.push('14: a listen question has a bin icon with a spoken label');
  }

  // 15
  if (q.mode === 'read') {
    const toRead = stringList(facts && typeof facts === 'object' ? facts.read : undefined).map((word) => word.toLowerCase());
    if (toRead.length === 0) problems.push('15: a read question needs facts.read');
    const readWords = new Set(toRead.flatMap((text) => text.split(/[^a-z']+/).filter((word) => word.length > 0)));
    for (const visual of seen) {
      // A text picture, or a picture with words printed under it, that speaks on tap.
      const printed = printedWords(visual);
      if (printed === undefined || visual.kind === 'graph' || visual.speak === undefined) continue;
      const shown = printed.toLowerCase();
      if (toRead.includes(shown) || shown.split(/[^a-z']+/).some((word) => readWords.has(word))) {
        problems.push(`15: the words to read are spoken on tap: "${printed}"`);
      }
    }
    const spoken = sayWords(q.prompt.speak);
    for (const text of toRead) {
      const words = text.split(/[^a-z']+/).filter((word) => word.length > 0);
      const whole = words.length > 0 && words.every((word) => spoken.includes(word));
      // One-word targets must not be spoken at all. A sentence must not be spoken in full.
      if (whole) problems.push(`15: the spoken prompt says the words to read: "${text}"`);
    }
  }

  // 16
  const singles = new Set<string>();
  for (const visual of seen) {
    if (visual.kind === 'text' && visual.value.length === 1) singles.add(visual.value);
  }
  if (q.type === 'tiles') q.bank.filter((tile) => tile.length === 1).forEach((tile) => singles.add(tile));
  if (singles.has('I') && (singles.has('l') || singles.has('1'))) problems.push('16: capital I sits beside lowercase l or the digit 1');
  if (singles.has('l') && singles.has('1')) problems.push('16: lowercase l sits beside the digit 1');
  if ((singles.has('O') || singles.has('o')) && singles.has('0')) problems.push('16: the letter O sits beside the digit 0');

  // 18: every step is said (by its own entry in stepsSay, or read by stepSay), and the hint is said and gives
  // nothing away
  const { stepsSay, hint } = q.explanation ?? {};
  if (stepsSay !== undefined) {
    if (stepsSay.length !== steps.length) problems.push('18: explanation.stepsSay needs one entry for each step');
    stepsSay.forEach((say, i) => {
      if (say !== null) checkSay(say, `explanation.stepsSay[${i}]`, problems);
    });
  }
  steps.forEach((step, i) => {
    if ((stepsSay?.[i] ?? null) === null && stepSay(step) === null) problems.push(`18: step ${i + 1} cannot be read aloud, so it needs explanation.stepsSay[${i}]: "${step}"`);
  });
  if (hint !== undefined) {
    if (typeof hint.text !== 'string' || hint.text.trim().length === 0) problems.push('18: explanation.hint.text is empty');
    else {
      if (hint.say !== undefined) checkSay(hint.say, 'explanation.hint.say', problems);
      else if (stepSay(hint.text) === null) problems.push(`18: the hint cannot be read aloud, so it needs hint.say: "${hint.text}"`);
      if (givesAway(q, hint.text, hint.say ? sayText(hint.say) : null)) problems.push(`18: the hint gives the answer away: "${hint.text}"`);
    }
  }

  return problems;
}

// Invariant 9: the same skill, level and seed always give a deeply equal question.
export function validateRepeatable(first: Question, second: Question): string[] {
  return canonicalJson(first) === canonicalJson(second) ? [] : ['9: the same seed gave two different questions'];
}

// Invariants 10 and 11, over the questions one level gave for many seeds.
export function validateSeries(questions: Question[], pool?: number): string[] {
  const problems: string[] = [];
  const keys = new Set(questions.map((question) => question.key));
  const least = pool === undefined ? 8 : Math.min(8, pool);
  if (keys.size < least) problems.push(`10: only ${keys.size} different questions, fewer than ${least}`);
  if (pool !== undefined && keys.size > pool) problems.push(`10: ${keys.size} different questions, more than the declared pool of ${pool}`);

  const groups = new Map<string, number[]>();
  for (const question of questions) {
    if (question.type !== 'choice' && question.type !== 'dragWord') continue;
    const n = question.options.length;
    const name = `${question.type === 'choice' && question.fixedOrder ? 'fixed' : 'free'}:${n}`;
    const counts = groups.get(name) ?? new Array<number>(n).fill(0);
    counts[question.answerIndex] = (counts[question.answerIndex] ?? 0) + 1;
    groups.set(name, counts);
  }
  for (const [name, counts] of groups) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    // Too few questions of one shape to judge a spread.
    if (total < 30) continue;
    const n = counts.length;
    counts.forEach((count, index) => {
      const share = count / total;
      if (name.startsWith('fixed')) {
        if (share < 0.1) problems.push(`11: option ${index} of a fixed-order question is right only ${Math.round(share * 100)}% of the time`);
      } else if (share > 1 / n + 0.15) {
        problems.push(`11: the answer sits at option ${index} of ${n} in ${Math.round(share * 100)}% of questions`);
      }
    });
  }
  return problems;
}
