import { soundOf } from '../engine/letterSounds';
import type { SoundKey } from '../engine/letterSounds';
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

// Whole numbers 0 to 10,000 as words: 47 is 'forty-seven', 2406 is 'two thousand four hundred six'.
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 10000) return String(n);
  if (n >= 1000) {
    const rest = n % 1000;
    const thousands = `${numberWords(Math.floor(n / 1000))} thousand`;
    return rest === 0 ? thousands : `${thousands} ${numberWords(rest)}`;
  }
  if (n < 20) return ONES[n] as string;
  if (n < 100) {
    const ones = n % 10;
    return ones === 0 ? (TENS[Math.floor(n / 10)] as string) : `${TENS[Math.floor(n / 10)]}-${ONES[ones]}`;
  }
  const rest = n % 100;
  const hundreds = `${ONES[Math.floor(n / 100)]} hundred`;
  return rest === 0 ? hundreds : `${hundreds} ${numberWords(rest)}`;
}

// A time is said as a child reads a digital clock (the owner's choice, Nov 22, 2026): 8:00 is 'eight o'clock', 8:05
// 'eight oh five', 8:15 'eight fifteen', 8:30 'eight thirty', 8:45 'eight forty-five'; never 'half past', 'quarter
// past' or 'quarter to'. This is the one place a time is put into words: a `{ time }` part, and a time written in a
// step ("8:30", read by stepSay as a `{ time }` part), are both said by it.
export function timeWords(hour: number, minute: number): string {
  const h = numberWords(hour);
  if (minute === 0) return `${h} o'clock`;
  if (minute < 10) return `${h} oh ${numberWords(minute)}`;
  return `${h} ${numberWords(minute)}`;
}

export function centsWords(cents: number): string {
  return `${numberWords(cents)} ${cents === 1 ? 'cent' : 'cents'}`;
}

export function letterName(letter: string): string {
  return LETTER_NAMES[letter.toLowerCase()] ?? letter;
}

// Letter sounds (the owner's choice, Nov 21, 2026; the list is src/engine/letterSounds.ts). A sound's recording
// is said once inside a sentence and three times when the sound is all there is to say.
export function soundClipKey(key: SoundKey, alone: boolean): string {
  return `sound:${key}:${alone ? 'three' : 'once'}`;
}

// What a sound is said as while it has no recording: its letters by name. "the sound of B", "the sound of S, H",
// "the sound of long A". This is the one place that decides it, so the recorded sounds can replace it.
export function soundFallback(key: SoundKey): Say {
  const sound = soundOf(key);
  const letters = [...sound.letters].flatMap((letter, i): Say => (i === 0 ? [{ letter }] : [',', { letter }]));
  return [sound.long ? 'the sound of long' : 'the sound of', ...letters];
}

// The sound a Say is made of when it is all there is to say (a tapped letter saying its sound), or null.
export function loneSound(say: Say): SoundKey | null {
  const said = say.filter((part) => typeof part !== 'string' || /[A-Za-z0-9]/.test(part));
  const only = said[0];
  return said.length === 1 && typeof only === 'object' && 'sound' in only ? only.sound : null;
}

function segmentOf(part: SayPart, alone: boolean): Segment {
  if (typeof part === 'string') return { kind: 'voice', text: part };
  // Uppercase and lowercase use the same name.
  if ('letter' in part) return { kind: 'clip', key: `letter:${part.letter.toLowerCase()}`, fallback: letterName(part.letter) };
  if ('word' in part) return { kind: 'voice', text: part.word };
  if ('number' in part) return { kind: 'clip', key: `number:${part.number}`, fallback: numberWords(part.number) };
  if ('time' in part) return { kind: 'voice', text: timeWords(part.time.hour, part.time.minute) };
  if ('sound' in part) return { kind: 'clip', key: soundClipKey(part.sound, alone), fallback: sayWords(soundFallback(part.sound)) };
  return { kind: 'voice', text: centsWords(part.cents) };
}

// The segments to play, one after another. Words next to each other are joined into one
// utterance, so a sentence is spoken smoothly. `hasClip` says which clips are on the device:
// a part with no clip is spoken by the device voice, joined with the words around it.
export function saySegments(say: Say, hasClip: (key: string) => boolean = () => false): Segment[] {
  const out: Segment[] = [];
  const alone = loneSound(say) !== null;
  for (const part of say) {
    let segment = segmentOf(part, alone);
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
