import type { MouthShape } from '../cast/types';
import type { Question, Say } from '../engine/types';
import { playingClip } from './playing';
import { loneSound, sayWords, soundClipKey, soundFallback } from './say';
import { hasSoundClip, soundClipBytes } from './soundClips';
import { openingWords, spokenSteps } from './stepSay';

// The recorded voice. A sentence is asked for from the server, which keeps every sentence it has ever made.
// One that is already kept comes back at once; one that is new is made by the voice machine first.
// The app waits for it either way (the owner's choice, Nov 17, 2026). The device's own voice speaks only when
// the recorded one cannot come: no network, a server error, a sentence it cannot take, or the safety limit.

const MAX_TEXT = 300; // the server's limit
// Quotation marks are allowed, for sentences such as: Which word can take the place of "did not"?
const SAFE_TEXT = /^[A-Za-z0-9 .,:;!?'’"“”-]+$/;
// Early asks at the same time. The voice machine makes one sentence at a time, so a sentence wanted now
// waits behind at most this many being made.
const AT_ONCE = 2;
const MAX_HELD = 150; // sentences kept in memory

// Questions at the normal pace; lessons and their examples slower, each sentence on its own (worker/voice.ts PACES).
export type Pace = 'normal' | 'lesson';
// Whose voice says a line: each character of the cast has its own (worker/voice.ts WHO_VOICE). Sprout is the teaching voice.
export type Who = 'sprout' | 'pip' | 'olive' | 'finn';

let on = false; // turned on by the real app at launch. Tests and stories run without it
let gone = false; // this server has no voice machine: stop asking
const held = new Map<string, Promise<ArrayBuffer | null>>();
let inFlight = 0;
const queue: (() => void)[] = [];

// When the mouth takes each shape while a recorded sentence plays (plan section 20): Piper sends it with every
// sentence, in the reply's X-Timing header, as {"d": seconds, "v": [[seconds, shape], ...]}. `duration` is the
// sentence's length in seconds; each shape holds from its `at` until the next one starts. The shapes are the four
// a talking mouth moves through (src/cast/types.ts). Kept with the recording, in memory only.
export type TalkShape = Extract<MouthShape, 'closed' | 'small' | 'round' | 'wide'>;
export const TALK_SHAPES: readonly TalkShape[] = ['closed', 'small', 'round', 'wide'];
export interface SpokenTiming {
  duration: number;
  shapes: { at: number; shape: TalkShape }[];
}
// Each recording that came with a timing, by the bytes the voice hands over to be played.
const timings = new WeakMap<ArrayBuffer, SpokenTiming>();
const isSeconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isTalkShape = (value: unknown): value is TalkShape => typeof value === 'string' && (TALK_SHAPES as readonly string[]).includes(value);

// The X-Timing header as the app keeps it, or null when there is none or it is not a timing. Never throws: a
// sentence without a timing plays all the same, and the friend's mouth then follows the loudness.
export function parseTiming(header: string | null): SpokenTiming | null {
  if (header === null || header.length === 0) return null;
  let value: unknown;
  try {
    value = JSON.parse(header);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { d, v } = value as { d?: unknown; v?: unknown };
  if (!isSeconds(d) || !Array.isArray(v)) return null;
  const shapes: SpokenTiming['shapes'] = [];
  for (const mark of v as unknown[]) {
    if (!Array.isArray(mark) || mark.length !== 2) return null;
    const [at, shape] = mark as [unknown, unknown];
    const before = shapes[shapes.length - 1];
    if (!isSeconds(at) || !isTalkShape(shape) || (before && at < before.at)) return null;
    shapes.push({ at, shape });
  }
  return { duration: d, shapes };
}

// Keeps a timing with the recording it came with.
export function keepTiming(bytes: ArrayBuffer, timing: SpokenTiming): void {
  timings.set(bytes, timing);
}

// The timing that came with a recording, or null.
export function timingOf(bytes: ArrayBuffer): SpokenTiming | null {
  return timings.get(bytes) ?? null;
}

// The mouth's shape `seconds` into a sentence: the last shape that has started. Closed before the first and once
// the sentence is over.
export function shapeAt(timing: SpokenTiming, seconds: number): TalkShape {
  if (seconds >= timing.duration) return 'closed';
  let shape: TalkShape = 'closed';
  for (const mark of timing.shapes) {
    if (mark.at > seconds) break;
    shape = mark.shape;
  }
  return shape;
}

// The recorded sentence playing now, with its timing and how far into it the voice is (seconds of the recording),
// for the friend's mouth (plan section 20, phase 2). Null when nothing is playing, or what plays has no timing:
// a letter sound, a sentence from a voice machine that sends none, or the device's own voice.
export function playingTiming(): { timing: SpokenTiming; at: number } | null {
  const clip = playingClip();
  if (!clip) return null;
  const timing = timings.get(clip.bytes);
  return timing ? { timing, at: clip.at } : null;
}

export function setVoiceOn(value: boolean): void {
  on = value;
}

export function resetVoice(): void {
  on = false;
  gone = false;
  held.clear();
  inFlight = 0;
  queue.length = 0;
}

// The words as the recorded voice reads them. A letter is sent as its capital ("the letter A"): the voice
// reads a capital as the letter's name, while it misreads some spelled names ("ay" as "aye", "eff" as "ee-eff-eff").
// The device voice keeps the spelled names (sayWords), which it reads correctly. A letter sound that reaches the
// voice has no recording to play (voicePieces splits out those that do), so its letters are said instead.
function recordedWords(say: Say): string {
  const plain = say.flatMap((part) => (typeof part === 'object' && 'sound' in part ? soundFallback(part.sound) : [part]));
  return sayWords(plain.map((part) => (typeof part === 'object' && 'letter' in part ? part.letter.toUpperCase() : part)));
}

// The recording to play for a piece that is one letter sound with a recording on hand, or null. `alone`: the
// sound is all the speech says, so it is said three times, not once.
export function soundClipOf(piece: Say, alone: boolean): string | null {
  const only = piece.length === 1 ? piece[0] : undefined;
  if (typeof only !== 'object' || !('sound' in only)) return null;
  const key = soundClipKey(only.sound, alone);
  return hasSoundClip(key) ? key : null;
}

// The sentence as the voice machine is given it, or null when it cannot be sent.
export function voiceText(say: Say): string | null {
  const text = recordedWords(say).replace(/\s+/g, ' ').trim();
  return text.length > 0 && text.length <= MAX_TEXT && SAFE_TEXT.test(text) ? text : null;
}

// Early asks wait for a free place; a sentence wanted now (`urgent`) goes straight away.
async function ask(text: string, pace: Pace, urgent: boolean, who: Who): Promise<ArrayBuffer | null> {
  if (!urgent && inFlight >= AT_ONCE) await new Promise<void>((resolve) => queue.push(resolve));
  inFlight += 1;
  try {
    return await send(text, pace, who);
  } finally {
    inFlight -= 1;
    queue.shift()?.();
  }
}

async function send(text: string, pace: Pace, who: Who): Promise<ArrayBuffer | null> {
  try {
    const reply = await fetch('/api/voice', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, ...(pace === 'normal' ? {} : { pace }), ...(who === 'sprout' ? {} : { who }) }) });
    if (reply.status === 503) gone = true;
    if (!reply.ok) return null;
    const body = await reply.arrayBuffer();
    if (body.byteLength === 0) return null;
    const timing = parseTiming(reply.headers.get('X-Timing'));
    if (timing) keepTiming(body, timing);
    return body;
  } catch {
    return null;
  }
}

// The pieces a Say is recorded in: the whole of it when it fits, otherwise one piece for each sentence,
// played one after another. A piece the voice cannot take is still returned; it is said by the device voice.
// A lesson is always one piece for each sentence, so the app can pause between them.
// The split is made between parts, so letters, sounds and numbers stay typed parts: the device voice can still say them.
// A letter sound with a recording on hand is a piece of its own, played from its recording, and the words around
// it are recorded as before. One with no recording stays inside its sentence, said by its letters.
export function voicePieces(say: Say, pace: Pace = 'normal'): Say[] {
  const alone = loneSound(say) !== null;
  const runs: Say[] = [];
  let run: Say = [];
  for (const part of say) {
    if (soundClipOf([part], alone) === null) {
      run.push(part);
      continue;
    }
    runs.push(run, [part]);
    run = [];
  }
  if (runs.length === 0) return sentencePieces(say, pace);
  runs.push(run);
  return runs.flatMap((each, i) => {
    if (soundClipOf(each, alone) !== null) return [each];
    // Words straight after a sound start without its stop ("Bat starts with /b/. Then..." goes on with "Then...").
    const words = i > 0 ? trimStart(each) : each;
    return words.some((part) => typeof part !== 'string' || /[A-Za-z0-9]/.test(part)) ? sentencePieces(words, pace) : [];
  });
}

function trimStart(say: Say): Say {
  const out = [...say];
  while (typeof out[0] === 'string') {
    const rest = out[0].replace(/^[\s.,;:!?]+/, '');
    if (rest.length > 0) {
      out[0] = rest;
      break;
    }
    out.shift();
  }
  return out;
}

function sentencePieces(say: Say, pace: Pace): Say[] {
  const words = recordedWords(say).replace(/\s+/g, ' ').trim();
  if (pace === 'normal' && (voiceText(say) !== null || words.length <= MAX_TEXT)) return [say];
  const pieces: Say[] = [];
  let current: Say = [];
  const close = (): void => {
    if (current.some((part) => typeof part !== 'string' || part.trim().length > 0)) pieces.push(current);
    current = [];
  };
  for (const part of say) {
    if (typeof part !== 'string') {
      current.push(part);
      continue;
    }
    // A sentence ends at . ? or ! (and a closing quotation mark after it) followed by a space or the end.
    const bits = part.split(/(?<=[.?!]["”]?)\s+/);
    bits.forEach((bit, i) => {
      if (bit.trim().length > 0) current.push(bit.trim());
      if (i < bits.length - 1 || /[.?!]["”]?\s*$/.test(bit)) close();
    });
  }
  close();
  return pieces.length > 0 ? pieces : [say];
}

function fetchVoice(say: Say, pace: Pace, urgent: boolean, who: Who = 'sprout'): Promise<ArrayBuffer | null> | null {
  if (!on || gone) return null;
  const text = voiceText(say);
  if (text === null) return null;
  const id = who === 'sprout' ? `${pace}|${text}` : `${who}|${pace}|${text}`;
  const known = held.get(id);
  if (known) return known;
  const asked = ask(text, pace, urgent, who).then((bytes) => {
    // A sentence that did not arrive is asked for again next time.
    if (bytes === null) held.delete(id);
    return bytes;
  });
  held.set(id, asked);
  if (held.size > MAX_HELD) {
    const oldest = held.keys().next().value;
    if (oldest !== undefined) held.delete(oldest);
  }
  return asked;
}

// Starts fetching a sentence, so it is ready by the time it is wanted. `who` must be the character who will say it,
// or the early fetch is of another voice and is wasted. A letter sound with a recording is never sent to the voice
// machine: its recording is fetched early instead (soundClips.ts holds it in memory).
export function warm(say: Say, pace: Pace = 'normal', who: Who = 'sprout'): void {
  const alone = loneSound(say) !== null;
  for (const piece of voicePieces(say, pace)) {
    const sound = soundClipOf(piece, alone);
    if (sound === null) void fetchVoice(piece, pace, false, who);
    else if (on) void soundClipBytes(sound);
  }
}

// Starts fetching several sentences, in order, all said by `who`.
export function warmAll(says: readonly Say[], pace: Pace = 'normal', who: Who = 'sprout'): void {
  if (!on || gone) return;
  for (const say of says) warm(say, pace, who);
}

// Everything a question may say: its prompt, "Not quite" with the first step, and each later step that is said.
// `who`: the friend of the question's subject, who says all of it (plan section 20).
export function warmQuestion(question: Question, who: Who = 'sprout'): void {
  if (!on || gone) return;
  warm(question.prompt.speak, 'normal', who);
  warm(openingWords(question), 'normal', who);
  for (const step of spokenSteps(question).slice(1)) if (step) warm(step, 'normal', who);
}

// The recorded sentence if it arrives within `waitMs`, otherwise null (and it keeps arriving in the background).
export async function readyVoice(say: Say, waitMs: number, pace: Pace = 'normal', who: Who = 'sprout'): Promise<ArrayBuffer | null> {
  const asked = fetchVoice(say, pace, true, who);
  if (!asked) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), waitMs);
  });
  try {
    return await Promise.race([asked, late]);
  } finally {
    clearTimeout(timer);
  }
}
