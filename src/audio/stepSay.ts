import type { Question, Say, SayPart } from '../engine/types';
import { numberWords } from './say';

// Turns a written explanation step into something a voice reads correctly: numbers, fractions, clock times and
// money as typed parts, signs as their words, a letter on its own as its name, quotation marks and brackets left
// out (what is inside them is read). A step it cannot read safely gives null: that step is shown but not said, and
// every other step is still said. A step that needs saying another way (letter groups, word endings, sounds) is
// given its own speech in `explanation.stepsSay`.

// A sign inside a number sentence ("2/6 < 4/6" is "two sixths is less than four sixths"), and named on its own
// ("The sign is <." is "The sign is less than.").
const SIGNS: Record<string, { inside: string; named: string }> = {
  '+': { inside: 'plus', named: 'plus' },
  '−': { inside: 'minus', named: 'minus' },
  '×': { inside: 'times', named: 'times' },
  '÷': { inside: 'divided by', named: 'divided by' },
  '=': { inside: 'equals', named: 'equals' },
  '<': { inside: 'is less than', named: 'less than' },
  '>': { inside: 'is greater than', named: 'greater than' },
};
// The missing number of a number sentence: "1 + ? = 8" is "one plus what equals eight". A box is a blank.
const UNKNOWNS: Record<string, string> = { '?': 'what', '□': 'blank' };
// After one of these, a lone a, A or I is the letter: "small a", "the a is short".
const LETTER_CUES = new Set(['big', 'small', 'letter', 'letters', 'capital', 'the']);
// Words that never follow the word "a", so a lone a, A or I before one is the letter: "a is a vowel", "A comes first".
const NOT_AFTER_ARTICLE = new Set(['is', 'are', 'was', 'and', 'or', 'comes', 'goes', 'makes', 'says', 'sounds', 'stands', 'has']);
const MAX_NUMBER = 10_000; // the largest number part (validation rule 1)
const MAX_PLURAL = 1000; // "counting by 100s" is "hundreds"; plurals above 1,000 are not read

// Halves to twentieths, and hundredths. A fraction over 1 is said "over one": 7/1 is "seven over one".
const PART_NAMES: Record<number, [string, string]> = {
  2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'], 11: ['eleventh', 'elevenths'],
  12: ['twelfth', 'twelfths'], 13: ['thirteenth', 'thirteenths'], 14: ['fourteenth', 'fourteenths'], 15: ['fifteenth', 'fifteenths'],
  16: ['sixteenth', 'sixteenths'], 17: ['seventeenth', 'seventeenths'], 18: ['eighteenth', 'eighteenths'], 19: ['nineteenth', 'nineteenths'],
  20: ['twentieth', 'twentieths'], 100: ['hundredth', 'hundredths'],
};

// "5s" is "fives", "10s" "tens", "20s" "twenties", "100s" "hundreds".
export function pluralWord(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > MAX_PLURAL) return null;
  if (n === 100) return 'hundreds';
  if (n === 1000) return 'thousands';
  return numberWords(n).replace(/[a-z]+$/, (last) => (last.endsWith('x') ? `${last}es` : last.endsWith('y') ? `${last.slice(0, -1)}ies` : `${last}s`));
}

// 1/2 is "one half", 3/4 "three fourths", 7/1 "seven over one". Null for a fraction it has no name for.
export function fractionSay(n: number, d: number): Say | null {
  if (n > MAX_NUMBER) return null;
  if (d === 1) return [{ number: n }, 'over', { number: 1 }];
  const names = PART_NAMES[d];
  return names ? [{ number: n }, n === 1 ? names[0] : names[1]] : null;
}

// 3:30 is "three thirty", 7:05 "seven oh five", 12:00 "twelve o'clock": as the time is written.
export function clockSay(hour: number, minute: number): Say | null {
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (minute === 0) return [{ number: hour }, "o'clock"];
  return minute < 10 ? [{ number: hour }, 'oh', { number: minute }] : [{ number: hour }, { number: minute }];
}

// $1.25 is "one dollar and twenty-five cents", $5 "five dollars", $0.50 "fifty cents".
export function dollarSay(dollars: number, cents: number): Say | null {
  if (dollars > MAX_NUMBER) return null;
  if (dollars === 0 && cents > 0) return [{ cents }];
  const unit = dollars === 1 ? 'dollar' : 'dollars';
  return cents === 0 ? [{ number: dollars }, unit] : [{ number: dollars }, `${unit} and`, { cents }];
}

interface Token {
  lead: string; // opening quotation marks and brackets
  core: string;
  stop: string; // the full stops, commas and the like after it, in order
  open: boolean; // opens a bracket
  close: boolean; // closes a bracket
  quoted: boolean; // its stop is inside closing quotation marks: "I like my bed." is a sentence.
}

function tokenOf(raw: string): Token {
  const lead = /^[("“”‘’']*/.exec(raw)?.[0] ?? '';
  const rest = raw.slice(lead.length);
  const tail = /[)"“”‘’'.,:;!?]*$/.exec(rest)?.[0] ?? '';
  return {
    lead,
    core: rest.slice(0, rest.length - tail.length),
    stop: tail.replace(/[^.,:;!?]/g, ''),
    open: lead.includes('('),
    close: tail.includes(')'),
    quoted: /[.,:;!?]["”’']/.test(tail),
  };
}

const isNumber = (core: string): boolean => /^\d+$/.test(core) || /^\d{1,3}(,\d{3})+$/.test(core);
const isFraction = (core: string): boolean => /^\d+\/\d+$/.test(core);
const isOneLetter = (token: Token | undefined): boolean => token !== undefined && /^[A-Za-z]$/.test(token.core);
const isCapital = (token: Token | undefined): boolean => isOneLetter(token) && token?.core === token?.core.toUpperCase();
// Something a sign works on, so the sign sits inside a number sentence.
const isOperand = (token: Token | undefined): boolean =>
  token !== undefined && (token.open || token.core in UNKNOWNS || /^[\d$]/.test(token.core) || (token.core === '' && token.stop.startsWith('?')));

// Whether a lone a, A or I is the letter rather than the word: "Hand is spelled H, a, N, D." and "the a is short"
// are letters; "This is a square." and "A square has 4 sides." are words. Every other lone letter is a letter.
function isLetter(tokens: readonly Token[], i: number): boolean {
  const token = tokens[i] as Token;
  if (!/^[aAI]$/.test(token.core)) return true;
  const before = tokens[i - 1];
  const after = tokens[i + 1];
  const startsSentence = before === undefined || /[.!?:]/.test(before.stop) || token.lead !== '';
  if (token.stop !== '' || after === undefined) return true; // the word "a" never ends a sentence or takes a comma
  if (before && before.stop === '' && LETTER_CUES.has(before.core.toLowerCase())) return true;
  if (isOneLetter(before) && (isOneLetter(after) || before?.stop.includes(','))) return true; // "c a t", "S, a Y"
  if (NOT_AFTER_ARTICLE.has(after.core.toLowerCase())) return true;
  if (token.core === 'A' && !startsSentence) return true; // a capital A inside a sentence: "Both repeat A A B."
  return token.core !== 'a' && isCapital(after); // "A B C", "I J K"
}

export function stepSay(step: string): Say | null {
  const tokens = step
    .replace(/(?<=[A-Za-z])[’‘](?=[A-Za-z])/g, "'")
    .split(/\s+/)
    .filter((each) => each !== '')
    .map(tokenOf);
  const parts: SayPart[] = [];
  // What was said last: a sign is not followed by the pause that sets off a bracket.
  const said: { last: 'word' | 'sign' | 'none' } = { last: 'none' };
  const word = (text: string, kind: 'word' | 'sign' = 'word'): void => {
    const previous = parts.at(-1);
    if (typeof previous === 'string') parts[parts.length - 1] = `${previous} ${text}`;
    else parts.push(text);
    said.last = kind;
  };
  const typed = (say: Say): void => {
    for (const part of say) {
      if (typeof part === 'string') word(part);
      else parts.push(part);
    }
    said.last = 'word';
  };
  const pause = (marks: string): void => {
    const previous = parts.at(-1);
    if (typeof previous === 'string') parts[parts.length - 1] = `${previous}${marks}`;
    else parts.push(marks);
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] as Token;
    const { core } = token;
    const before = tokens[i - 1];
    // What is inside brackets is set off by a short pause: "I (1) see (2)" is "I, one, see, two".
    if (token.open && said.last === 'word' && before?.stop === '') pause(',');
    // A full stop inside quotation marks, with the sentence going on after them, is only a short pause.
    let stop = token.quoted && i + 1 < tokens.length ? token.stop.replace(/\./g, ',') : token.stop;
    if (core === '' && stop.startsWith('?')) {
      word(UNKNOWNS['?'] as string);
      stop = stop.slice(1);
    } else if (core === '') {
      // Only marks: a stop on its own, or a quotation mark or bracket standing apart.
    } else if (core in UNKNOWNS) word(UNKNOWNS[core] as string);
    else if (core === '·') pause(','); // a dot between the parts of a word is a short stop
    else if (core in SIGNS) {
      const sign = SIGNS[core] as { inside: string; named: string };
      const named = stop !== '' || !isOperand(tokens[i + 1]) || before?.core.toLowerCase() === 'is';
      word(named ? sign.named : sign.inside, 'sign');
    } else if (isNumber(core)) {
      const n = Number.parseInt(core.replace(/,/g, ''), 10);
      if (n > MAX_NUMBER) return null;
      const next = tokens[i + 1];
      const [top, bottom] = next && stop === '' && !token.close && !next.open && isFraction(next.core) ? next.core.split('/').map(Number) : [];
      if (top !== undefined && bottom !== undefined && top > 0 && top < bottom) {
        // A mixed number: 8 1/2 is "eight and a half", 6 3/4 "six and three fourths".
        const part = top === 1 && bottom === 2 ? ['a half'] : fractionSay(top, bottom);
        if (part === null) return null;
        typed([{ number: n }, 'and', ...part]);
        stop = (next as Token).stop;
        if ((next as Token).close && i + 2 < tokens.length && stop === '') stop = ',';
        i += 1;
      } else typed([{ number: n }]);
    } else if (/^(\d+|\d{1,3}(,\d{3})+)s$/.test(core)) {
      const plural = pluralWord(Number.parseInt(core.replace(/[,s]/g, ''), 10));
      if (plural === null) return null;
      word(plural);
    } else if (isFraction(core)) {
      const [top, bottom] = core.split('/').map(Number) as [number, number];
      const fraction = fractionSay(top, bottom);
      if (fraction === null) return null;
      typed(fraction);
    } else if (/^\d{1,2}:\d{2}$/.test(core)) {
      const [hour, minute] = core.split(':').map(Number) as [number, number];
      const time = clockSay(hour, minute);
      if (time === null) return null;
      typed(time);
    } else if (/^\d+¢$/.test(core)) {
      const cents = Number.parseInt(core, 10);
      if (cents > MAX_NUMBER) return null;
      typed([{ cents }]);
    } else if (/^\$\d+(\.\d{2})?$/.test(core)) {
      const [dollars, cents = 0] = core.slice(1).split('.').map(Number) as [number, number | undefined];
      const money = dollarSay(dollars, cents);
      if (money === null) return null;
      typed(money);
    } else if (/^[A-Za-z]$/.test(core) && isLetter(tokens, i)) typed([{ letter: core.toLowerCase() }]);
    else if (/^[A-Za-z](?:[A-Za-z'·-]|\.(?=[A-Za-z]))*$/.test(core)) word(core.replace(/·/g, ''));
    else return null;
    if (stop !== '') pause(stop);
    else if (token.close && i + 1 < tokens.length) pause(',');
  }
  return parts.some((part) => typeof part !== 'string' || /[A-Za-z]/.test(part)) ? parts : null;
}

// One spoken line for each step: the step's own speech from `explanation.stepsSay` when it has one, otherwise
// the step read by stepSay. null for a step that cannot be said safely: it is shown, and not said.
export function spokenSteps(question: Question): (Say | null)[] {
  const given = question.explanation.stepsSay;
  return question.explanation.steps.map((step, i) => given?.[i] ?? stepSay(step));
}

// What is said as the explanation opens: "Not quite", then the first step when it can be said.
export function openingWords(question: Question): Say {
  return ['Not quite.', ...(spokenSteps(question)[0] ?? [])];
}
