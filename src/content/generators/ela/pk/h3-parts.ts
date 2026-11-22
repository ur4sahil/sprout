import type { SoundKey } from '../../../../engine/letterSounds';
import { isSoundKey, soundOf } from '../../../../engine/letterSounds';
import type { Explanation, LessonStep, Say, Visual } from '../../../../engine/types';

// Pieces the Language Arts pre-K and kindergarten generators share (plan section 8, and section 15 wave H3).

export type Line = { text: string; speak: Say };
export type Beat = Line & { visual: Visual };

// A line shown one way and said another: letters, numbers and sounds are typed parts.
export const spoken = (text: string, speak: Say): Line => ({ text, speak });

// A letter sound (the owner's choice, Nov 21, 2026): written /b/ on screen, said from its recording.
// Phonics steps say the sound first and the letter second: "Cat starts with /k/. The letter c says /k/."
export function sound(key: string): { sound: SoundKey } {
  if (!isSoundKey(key)) throw new Error(`there is no letter sound "${key}"`);
  return { sound: key };
}
export const soundText = (key: string): string => soundOf(sound(key).sound).shown;
// The sounds one after another, as a child sounds out a word: /p/ /a/ /n/. Recorded sounds play back to back (the
// short stops between them are dropped); said by their letters, until the recordings exist, the stops keep them apart.
export const soundsText = (keys: readonly string[]): string => keys.map(soundText).join(' ');
export const soundsSay = (keys: readonly string[]): Say => keys.flatMap((key, i): Say => [...(i === 0 ? [] : [',']), sound(key)]);
// Letters spelled out one by one, with a short stop between them, so "c a t" is never read as the word cat.
export const spelledSay = (letters: readonly string[]): Say => letters.flatMap((letter, i): Say => [...(i === 0 ? [] : [',']), { letter }]);
// "The letter c says /k/." The same words in every skill.
export const letterSays = (letter: string): Line => spoken(`The letter ${letter} says ${soundText(letter.toLowerCase())}.`, ['The letter', { letter }, 'says', sound(letter.toLowerCase()), '.']);

const asWritten = (each: Line): boolean => each.speak.length === 1 && each.speak[0] === each.text;
const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// A sentence is said as it is written, with a capital at the start: "Mouse and moon...", never "mouse and moon...".
function sentence(say: Say): Say {
  const [first, ...rest] = say;
  if (typeof first === 'string') return [capital(first), ...rest];
  if (first !== undefined && 'word' in first) return [{ word: capital(first.word) }, ...rest];
  return [...say];
}

// An explanation with its picture.
export type Told = Explanation & { visual: Visual };

// An explanation built from its steps, each shown and said. A step said exactly as it is written is read by stepSay;
// any other step carries its own speech in `stepsSay`. The whole speech is the steps one after another, so a lesson's
// example says what the steps say. The hint is the nudge offered before the child answers: a way to work it out,
// never the answer (validation rule 18).
export function working(steps: readonly Line[], visual: Visual, hint?: Line): Told {
  return {
    speak: steps.flatMap((each) => sentence(each.speak)),
    steps: steps.map((each) => each.text),
    visual,
    ...(steps.every(asWritten) ? {} : { stepsSay: steps.map((each) => (asWritten(each) ? null : sentence(each.speak))) }),
    ...(hint === undefined ? {} : { hint: asWritten(hint) ? { text: hint.text } : { text: hint.text, say: sentence(hint.speak) } }),
  };
}

// A picture with no spoken label, for listen and read questions.
export const silent = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });

// Text a child must read or look at: it never speaks.
export const plain = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });

// Text that says itself when tapped.
export const said = (value: string, speak: Say, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak });

// A line whose words are all spoken as written, with no letters or numbers in them.
export const line = (text: string): Line => ({ text, speak: [text] });

// The four beats of a lesson (plan section 8): see it, watch me, try it together, remember.
export function beats(see: Beat, watch: Beat, tryIt: Beat, reveal: Beat, remember: Beat): LessonStep[] {
  return [
    { beat: 'see', ...see },
    { beat: 'watch', ...watch },
    { beat: 'try', ...tryIt, reveal },
    { beat: 'remember', ...remember },
  ];
}

// Joins lines into one: their texts with spaces, their speech one after the other.
export function joined(...lines: Line[]): Line {
  return { text: lines.map((each) => each.text).join(' '), speak: lines.flatMap((each) => each.speak) };
}

// A letter list as text, "M, I, A", and as letter parts with a short pause between them, so "J, A, Y" is never
// read as the name Jay.
export function letters(values: readonly string[]): Line {
  return { text: values.join(', '), speak: values.flatMap((letter, i): Say => [...(i === 0 ? [] : [',']), { letter }]) };
}
