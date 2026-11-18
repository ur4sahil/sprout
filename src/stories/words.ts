import { DEFAULT_RATE, LESSON_PAUSE_MS } from '../audio/speech';
import { sayWords } from '../audio/say';
import type { Say, SayPart } from '../engine/types';
import type { Episode } from './types';

// The words of a story page: what is shown, what a tap on each word says, and when each word lights up while
// Olive reads. Everything here is pure, so it is tested on its own.

// How fast the lesson voice reads, in words a second at the usual speech rate. The same figure the lesson tests
// use (tests/lessons/lessons.test.ts), because stories are read at the lesson pace.
export const WORDS_PER_SECOND = 1.9;

// A word on the page.
export interface StoryWord {
  shown: string; // the word as printed, with any punctuation stuck to it
  say: Say; // what a tap on it says: the word alone
  spoken: number; // how many words the voice says for it ("17" is "seventeen", one; "3 o'clock" is two)
}

// A non-breaking space: a time such as "3 o'clock" stays one word on the page, so it lights up as one.
const KEEP_TOGETHER = ' ';

// How a typed part is printed. Numbers as numerals, letters as capitals, times as "3 o'clock".
function shownPart(part: Exclude<SayPart, string>): string {
  if ('number' in part) return String(part.number);
  if ('letter' in part) return part.letter.toUpperCase();
  if ('word' in part) return part.word;
  if ('time' in part) return part.time.minute === 0 ? `${part.time.hour}${KEEP_TOGETHER}o'clock` : `${part.time.hour}:${String(part.time.minute).padStart(2, '0')}`;
  return `${part.cents}${KEEP_TOGETHER}cents`;
}

// The words of a Say, in order. Punctuation that touches a number, letter or time stays with it ("3,").
export function storyWords(say: Say): StoryWord[] {
  // Write the whole line out, noting where each typed part sits in it.
  let text = '';
  const typed: { from: number; to: number; part: Exclude<SayPart, string> }[] = [];
  for (const part of say) {
    if (typeof part === 'string') {
      text += part;
      continue;
    }
    const shown = shownPart(part);
    typed.push({ from: text.length, to: text.length + shown.length, part });
    text += shown;
  }
  // Split on ordinary spaces only, so a kept-together time stays whole.
  const words: StoryWord[] = [];
  for (const match of text.matchAll(/[^ \t\n]+/g)) {
    const from = match.index;
    const to = from + match[0].length;
    const inside = typed.find((each) => each.from < to && each.to > from);
    if (inside) {
      words.push({ shown: match[0], say: [inside.part], spoken: sayWords([inside.part]).split(/\s+/).filter(Boolean).length });
      continue;
    }
    const bare = match[0].replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
    // A lone mark, such as a dash on its own, joins the word before it.
    const last = words[words.length - 1];
    if (bare.length === 0 && last) {
      last.shown += match[0];
      continue;
    }
    words.push({ shown: match[0], say: bare.length > 0 ? [{ word: bare }] : [], spoken: bare.length > 0 ? 1 : 0 });
  }
  return words;
}

// The line as printed on the page.
export function storyText(say: Say): string {
  return storyWords(say)
    .map((word) => word.shown)
    .join(' ');
}

// True when a printed word ends a sentence the way the voice hears it: the lesson voice pauses after it.
export function endsSentence(shown: string): boolean {
  return /[.?!]["”]?$/.test(shown);
}

// The sentences a reader sees. A sentence ends at . ? or ! when the next word starts a new sentence (a capital,
// a numeral or an opening quote); "“Yes!” said Pip." is one sentence.
export function sentencesOf(words: readonly StoryWord[]): StoryWord[][] {
  const out: StoryWord[][] = [];
  let current: StoryWord[] = [];
  words.forEach((word, i) => {
    current.push(word);
    const next = words[i + 1];
    if (!next || (endsSentence(word.shown) && /^[A-Z0-9“"]/.test(next.shown))) {
      out.push(current);
      current = [];
    }
  });
  return out;
}

// When each word lights up, in milliseconds from the moment the voice starts.
export interface ReadingPlan {
  starts: number[];
  ends: number[];
  total: number;
}

// The audio does not tell the app when each word is said, so the line's reading time is shared out evenly:
// each word gets time for the words the voice says for it, and the voice's pause after a sentence (lesson pace)
// keeps the last word of the sentence lit. `rate` is the child's speech rate: a faster voice, shorter times.
export function readingPlan(words: readonly StoryWord[], rate: number = DEFAULT_RATE): ReadingPlan {
  const perWord = 1000 / (WORDS_PER_SECOND * (rate / DEFAULT_RATE));
  const starts: number[] = [];
  const ends: number[] = [];
  let at = 0;
  words.forEach((word, i) => {
    starts.push(at);
    at += word.spoken * perWord;
    ends.push(at);
    if (i < words.length - 1 && endsSentence(word.shown)) at += LESSON_PAUSE_MS;
  });
  return { starts, ends, total: at };
}

// The word lit at a moment: the last word whose time has started, until the line is over. Null before the
// first word and after the last.
export function wordAt(plan: ReadingPlan, elapsed: number): number | null {
  if (elapsed < 0 || elapsed >= plan.total) return null;
  let lit: number | null = null;
  plan.starts.forEach((start, i) => {
    if (start <= elapsed) lit = i;
  });
  return lit;
}

// What Olive says after any answer to the closing question: the story's own answer, warmly, then "The end."
// The question is never scored, so no answer is called wrong.
export function replySay(episode: Episode, chosen: number): Say {
  const opener = chosen === episode.question.answer ? 'Yes!' : 'Good thinking!';
  return [`${opener} `, ...episode.question.reply, ' The end.'];
}
