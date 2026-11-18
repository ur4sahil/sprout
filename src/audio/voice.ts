import type { Question, Say } from '../engine/types';
import { sayWords } from './say';
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

// The sentence as the voice machine is given it, or null when it cannot be sent.
export function voiceText(say: Say): string | null {
  const text = sayWords(say).replace(/\s+/g, ' ').trim();
  return text.length > 0 && text.length <= MAX_TEXT && SAFE_TEXT.test(text) ? text : null;
}

// Early asks wait for a free place; a sentence wanted now (`urgent`) goes straight away.
async function ask(text: string, pace: Pace, urgent: boolean): Promise<ArrayBuffer | null> {
  if (!urgent && inFlight >= AT_ONCE) await new Promise<void>((resolve) => queue.push(resolve));
  inFlight += 1;
  try {
    return await send(text, pace);
  } finally {
    inFlight -= 1;
    queue.shift()?.();
  }
}

async function send(text: string, pace: Pace): Promise<ArrayBuffer | null> {
  try {
    const reply = await fetch('/api/voice', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pace === 'normal' ? { text } : { text, pace }) });
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
export function voicePieces(say: Say, pace: Pace = 'normal'): Say[] {
  const words = sayWords(say).replace(/\s+/g, ' ').trim();
  if (pace === 'normal' && (voiceText(say) !== null || words.length <= MAX_TEXT)) return [say];
  const sentences = words.match(/[^.?!]+[.?!]+["”]?|[^.?!]+$/g) ?? [words];
  return sentences.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0).map((sentence) => [sentence]);
}

function fetchVoice(say: Say, pace: Pace, urgent: boolean): Promise<ArrayBuffer | null> | null {
  if (!on || gone) return null;
  const text = voiceText(say);
  if (text === null) return null;
  const id = `${pace}|${text}`;
  const known = held.get(id);
  if (known) return known;
  const asked = ask(text, pace, urgent).then((bytes) => {
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

// Starts fetching a sentence, so it is ready by the time it is wanted.
export function warm(say: Say, pace: Pace = 'normal'): void {
  for (const piece of voicePieces(say, pace)) void fetchVoice(piece, pace, false);
}

// Starts fetching several sentences, in order.
export function warmAll(says: readonly Say[], pace: Pace = 'normal'): void {
  if (!on || gone) return;
  for (const say of says) warm(say, pace);
}

// Everything a question may say: its prompt, "Not quite" with the first step, and each later step.
export function warmQuestion(question: Question): void {
  if (!on || gone) return;
  warm(question.prompt.speak);
  warm(openingWords(question));
  const steps = spokenSteps(question);
  if (steps) for (const step of steps.slice(1)) warm(step);
  else warm(question.explanation.speak);
}

// The recorded sentence if it arrives within `waitMs`, otherwise null (and it keeps arriving in the background).
export async function readyVoice(say: Say, waitMs: number, pace: Pace = 'normal'): Promise<ArrayBuffer | null> {
  const asked = fetchVoice(say, pace, true);
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
