import type { Say, SayPart } from '../engine/types';

// Turns Say parts into things a voice reads correctly (plan section 9).
// Each part says what it is, so the letter a, the word "a" and the "a" inside
// "Tap a balloon" can never be mixed up.

export type Segment =
  | { kind: 'voice'; text: string } // read by the device voice
  | { kind: 'clip'; key: string; fallback: string }; // a voice-pack clip, or the fallback through the device voice

const LETTER_NAMES: Record<string, string> = {
  a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'eff', g: 'jee', h: 'aitch', i: 'eye',
  j: 'jay', k: 'kay', l: 'el', m: 'em', n: 'en', o: 'oh', p: 'pee', q: 'cue', r: 'are',
  s: 'ess', t: 'tee', u: 'you', v: 'vee', w: 'double you', x: 'ex', y: 'why', z: 'zee',
};

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// Whole numbers 0 to 1,000 as words: 47 is 'forty-seven'.
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1000) return String(n);
  if (n < 20) return ONES[n] as string;
  if (n < 100) {
    const ones = n % 10;
    return ones === 0 ? (TENS[Math.floor(n / 10)] as string) : `${TENS[Math.floor(n / 10)]}-${ONES[ones]}`;
  }
  if (n === 1000) return 'one thousand';
  const rest = n % 100;
  const hundreds = `${ONES[Math.floor(n / 100)]} hundred`;
  return rest === 0 ? hundreds : `${hundreds} ${numberWords(rest)}`;
}

// 3:00 is 'three o'clock', 3:30 is 'half past three', 3:15 is 'three fifteen', 3:05 is 'three oh five'.
export function timeWords(hour: number, minute: number): string {
  const h = numberWords(hour);
  if (minute === 0) return `${h} o'clock`;
  if (minute === 30) return `half past ${h}`;
  if (minute < 10) return `${h} oh ${numberWords(minute)}`;
  return `${h} ${numberWords(minute)}`;
}

export function centsWords(cents: number): string {
  return `${numberWords(cents)} ${cents === 1 ? 'cent' : 'cents'}`;
}

export function letterName(letter: string): string {
  return LETTER_NAMES[letter.toLowerCase()] ?? letter;
}

function segmentOf(part: SayPart): Segment {
  if (typeof part === 'string') return { kind: 'voice', text: part };
  // Uppercase and lowercase use the same name.
  if ('letter' in part) return { kind: 'clip', key: `letter:${part.letter.toLowerCase()}`, fallback: letterName(part.letter) };
  if ('word' in part) return { kind: 'voice', text: part.word };
  if ('number' in part) return { kind: 'clip', key: `number:${part.number}`, fallback: numberWords(part.number) };
  if ('time' in part) return { kind: 'voice', text: timeWords(part.time.hour, part.time.minute) };
  return { kind: 'voice', text: centsWords(part.cents) };
}

// The segments to play, one after another. Words next to each other are joined into one
// utterance, so a sentence is spoken smoothly. `hasClip` says which clips are on the device:
// a part with no clip is spoken by the device voice, joined with the words around it.
export function saySegments(say: Say, hasClip: (key: string) => boolean = () => false): Segment[] {
  const out: Segment[] = [];
  for (const part of say) {
    let segment = segmentOf(part);
    if (segment.kind === 'clip' && !hasClip(segment.key)) segment = { kind: 'voice', text: segment.fallback };
    const last = out[out.length - 1];
    if (segment.kind === 'voice' && last && last.kind === 'voice') {
      const joiner = /^[.,!?;:]/.test(segment.text) ? '' : ' ';
      last.text = `${last.text}${joiner}${segment.text}`;
    } else {
      out.push(segment);
    }
  }
  return out.filter((segment) => segment.kind === 'clip' || segment.text.trim().length > 0).flatMap((segment) => (segment.kind === 'voice' ? sentences(segment.text) : [segment]));
}

// Long speech, such as a story, is said one sentence at a time. Some phones cut off an utterance
// that runs too long (plan section 9), and a pause between sentences helps a child follow.
const LONG_WORDS = 12;

function sentences(text: string): Segment[] {
  if (text.trim().split(/\s+/).length <= LONG_WORDS) return [{ kind: 'voice', text }];
  const parts = text.match(/[^.?!]+[.?!]+|[^.?!]+$/g) ?? [text];
  return parts.map((part) => part.trim()).filter((part) => part.length > 0).map((part) => ({ kind: 'voice', text: part }));
}

// The whole thing as one string for the device voice, with no clips.
export function sayWords(say: Say): string {
  return saySegments(say)
    .map((segment) => (segment.kind === 'voice' ? segment.text : segment.fallback))
    .join(' ');
}

export const PRAISE: { key: string; say: Say }[] = [
  { key: 'phrase:great-job', say: ['Great job.'] },
  { key: 'phrase:you-got-it', say: ['You got it.'] },
  { key: 'phrase:nice-work', say: ['Nice work.'] },
  { key: 'phrase:thats-right', say: ["That's right."] },
  { key: 'phrase:well-done', say: ['Well done.'] },
];
