import type { Explanation, Say, SayPart, Visual } from '../../../engine/types';

// What the Reasoning generators share (the wording audit, Nov 22, 2026): a sentence made once for the screen and
// the voice, an explanation made of such sentences with its hint, and the way each turnable shape points.

// A piece of a sentence: plain words, a number (said as a number part), a word (a picture's name, said as a word
// part), or a letter on its own, such as the L of the L shape (said as a letter part).
export type Piece = string | number | { word: string } | { letter: string };

export interface Line {
  text: string;
  speak: Say;
}

const STOP = /^[.,?!:;]/;

// Every sentence starts with a capital: "a dress and a scarf are clothes." is shown "A dress and a scarf are clothes."
const capitals = (text: string): string => text.replace(/(^|[.?!]\s+)([a-z])/g, (_, before: string, first: string) => `${before}${first.toUpperCase()}`);

export function line(...pieces: Piece[]): Line {
  let text = '';
  const speak: SayPart[] = [];
  for (const piece of pieces) {
    const shown = typeof piece === 'string' ? piece : typeof piece === 'number' ? String(piece) : 'word' in piece ? piece.word : piece.letter.toUpperCase();
    text += text === '' || STOP.test(shown) ? shown : ` ${shown}`;
    const part: SayPart = typeof piece === 'string' ? piece : typeof piece === 'number' ? { number: piece } : 'word' in piece ? { word: piece.word } : { letter: piece.letter.toLowerCase() };
    const last = speak.at(-1);
    if (typeof part === 'string' && typeof last === 'string') speak[speak.length - 1] = STOP.test(part) ? `${last}${part}` : `${last} ${part}`;
    else speak.push(part);
  }
  return { text: capitals(text), speak };
}

// The steps after a wrong answer, said one at a time, and the hint offered before an answer. Each step names what
// it talks about, because after a miss the screen shows only the child's answer and the right one.
export function explained(lines: readonly Line[], visual: Visual, hint: string): Explanation {
  return { speak: lines.flatMap((each) => each.speak), steps: lines.map((each) => each.text), visual, hint: { text: hint } };
}

// The shapes that turn, and which way each points at each quarter turn clockwise (the app turns shapes clockwise):
// the arrow's tip, the foot of the L, the flag's cloth. Turn 0 is how the shape is drawn: the arrow points up.
export type Turning = 'arrow' | 'lShape' | 'flag';
export const POINTS: Record<Turning, readonly [string, string, string, string]> = {
  arrow: ['up', 'right', 'down', 'left'],
  lShape: ['right', 'down', 'left', 'up'],
  flag: ['right', 'down', 'left', 'up'],
};

// What a sentence about a turning shape starts with: "The arrow points up", "The foot of the L points right".
export function pointer(form: Turning): Piece[] {
  return form === 'lShape' ? ['the foot of the', { letter: 'l' }] : [`the ${form}`];
}
