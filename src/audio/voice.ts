import type { Question, Say } from '../engine/types';
import { loneSound, sayWords, soundClipKey, soundFallback } from './say';
import { hasSoundClip } from './soundClips';
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
    return body.byteLength > 0 ? body : null;
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

// Starts fetching a sentence, so it is ready by the time it is wanted. A letter sound with a recording is not fetched.
export function warm(say: Say, pace: Pace = 'normal', who: Who = 'sprout'): void {
  const alone = loneSound(say) !== null;
  for (const piece of voicePieces(say, pace)) if (soundClipOf(piece, alone) === null) void fetchVoice(piece, pace, false, who);
}

// Starts fetching several sentences, in order.
export function warmAll(says: readonly Say[], pace: Pace = 'normal'): void {
  if (!on || gone) return;
  for (const say of says) warm(say, pace);
}

// Everything a question may say: its prompt, "Not quite" with the first step, and each later step that is said.
export function warmQuestion(question: Question): void {
  if (!on || gone) return;
  warm(question.prompt.speak);
  warm(openingWords(question));
  for (const step of spokenSteps(question).slice(1)) if (step) warm(step);
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
