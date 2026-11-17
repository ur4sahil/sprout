import type { Question, Say, SayPart } from '../engine/types';

// Turns a written explanation step into something a voice reads correctly: numbers as numbers,
// signs as their words, a letter on its own as its name. A step it cannot read safely gives null,
// and the screen falls back to the explanation's own spoken summary.

const SIGNS: Record<string, string> = { '+': 'plus', '=': 'equals', '×': 'times', '÷': 'divided by', '−': 'minus' };
// Before one of these, "a" or "A" is the letter, not the word.
const LETTER_CUES = new Set(['big', 'small', 'letter', 'letters', 'capital']);

function plural(n: number): SayPart[] {
  // "counting by 5s" is said "fives".
  return [{ number: n }, 's'];
}

export function stepSay(step: string): Say | null {
  if (!/^[A-Za-z0-9 '.,:+=·!?×÷−-]+$/.test(step)) return null;
  const parts: SayPart[] = [];
  let words: string[] = [];
  const flush = (): void => {
    if (words.length > 0) parts.push(words.join(' '));
    words = [];
  };
  let before = '';
  for (const token of step.split(/\s+/).filter((each) => each !== '')) {
    const [, lead = '', core = '', tail = ''] = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/.exec(token) ?? [];
    const pause = /[.,:!?]/.test(tail) ? tail.replace(/[^.,:!?]/g, '') : '';
    if (core === '' && token in SIGNS) words.push(SIGNS[token] as string);
    else if (core === '') {
      // A dot between the parts of a word is a short stop.
      if (token === '·') words.push(',');
    } else if (/^\d+$/.test(core) || /^\d+s$/.test(core) || /^\d{1,2},\d{3}$/.test(core)) {
      const n = Number.parseInt(core.replace(',', ''), 10);
      if (n > 10000) return null;
      flush();
      parts.push(...(core.endsWith('s') ? plural(n) : [{ number: n }]));
      if (pause) words.push(pause);
    } else if (/\d/.test(core)) return null;
    else if (core.length === 1 && (!/^[aAI]$/.test(core) || LETTER_CUES.has(before))) {
      flush();
      parts.push({ letter: core.toLowerCase() });
      if (pause) words.push(pause);
    } else words.push(`${lead}${core}${tail}`.replace(/·/g, ''));
    before = core.toLowerCase();
  }
  flush();
  // A stop on its own is joined to what came before it, so the voice pauses there.
  const joined: SayPart[] = [];
  for (const part of parts) {
    const last = joined.at(-1);
    if (typeof part === 'string' && typeof last === 'string') joined[joined.length - 1] = `${last} ${part}`;
    else joined.push(part);
  }
  return joined.length > 0 ? joined : null;
}

// One spoken line for each step, or null when any step cannot be read safely.
export function spokenSteps(question: Question): Say[] | null {
  const said = question.explanation.steps.map(stepSay);
  return said.every((each): each is Say => each !== null) ? said : null;
}

// What is said as the explanation opens: "Not quite", then the first step, or the summary.
export function openingWords(question: Question): Say {
  return ['Not quite.', ...(spokenSteps(question)?.[0] ?? question.explanation.speak)];
}
