import type { SoundKey } from '../../../../engine/letterSounds';
import { soundOf } from '../../../../engine/letterSounds';
import type { Explanation, Hint, Say, SayPart } from '../../../../engine/types';

// Wording pieces for Language Arts grades 1 and 2 (the wording audit, Nov 22, 2026). A voice reads a letter
// group or a word ending ("ed", "igh", "mb") as if it were a word, so a step that shows one says it with typed
// parts in `explanation.stepsSay`: its letters one by one, and its sound as a `{ sound }` part.

// Letters said one by one, with a short pause between: "E, D".
export function spell(letters: string): Say {
  return [...letters].flatMap((letter, i): SayPart[] => (i === 0 ? [{ letter }] : [',', { letter }]));
}

// Letter groups in a list, each group's letters said together and a pause between groups: "E R, I R and U R".
// Inside a list, "E, R, I, R" would run the groups together.
export function groups(list: readonly string[], last = 'and'): Say {
  return list.flatMap((group, i): SayPart[] => {
    const letters = [...group].map((letter): SayPart => ({ letter }));
    if (i === 0) return letters;
    return [i === list.length - 1 ? (list.length > 2 ? `, ${last}` : last) : ',', ...letters];
  });
}

// A sound as it is written on screen: /sh/.
export const shownSound = (key: SoundKey): string => soundOf(key).shown;

// Sounds one after another: shown "/k/ /l/", said with a short pause between.
export function soundRun(keys: readonly SoundKey[]): { text: string; say: Say } {
  return {
    text: keys.map(shownSound).join(' '),
    say: keys.flatMap((key, i): SayPart[] => (i === 0 ? [{ sound: key }] : [',', { sound: key }])),
  };
}

// A step: its text alone when stepSay reads it right, or its text with how it is said.
export type Line = string | { text: string; say: Say };

export const line = (text: string, say: Say): Line => ({ text, say });

// The steps of an explanation, and their speech when any step needs its own.
export function stepsOf(lines: readonly Line[]): Pick<Explanation, 'steps' | 'stepsSay'> {
  const steps = lines.map((each) => (typeof each === 'string' ? each : each.text));
  const own = lines.map((each) => (typeof each === 'string' ? null : each.say));
  return own.some((each) => each !== null) ? { steps, stepsSay: own } : { steps };
}

// The hint's nudge (validation rule 18 checks it never gives the answer away).
export const hint = (text: string, say?: Say): Hint => (say ? { text, say } : { text });

// The gap of a fill-in sentence ("___") is said as a short pause, never as the word "blank". A full stop
// right after the gap goes with it, so "Ben is ___." is said "Ben is ...".
export const gapSay = (sentence: string): string => sentence.replace(/_+\.?/g, '...');

// "foot, arm and knee": a list said and written the way a sentence lists things.
export function listed(words: readonly string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}
