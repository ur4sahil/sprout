import type { Question, Say } from '../engine/types';
import { sayWords } from './say';
import { openingWords, spokenSteps } from './stepSay';

// The recorded voice. A sentence is asked for from the server, which keeps every sentence it has ever made.
// One that is already kept comes back at once. One that is new is made in the background while the child
// looks at the question, and is there the next time. The app never waits long: when the recorded voice
// is not ready, the device's own voice says the sentence instead.

const MAX_TEXT = 300; // the server's limit
const SAFE_TEXT = /^[A-Za-z0-9 .,:;!?'’-]+$/;
const MAX_HELD = 150; // sentences kept in memory

let on = false; // turned on by the real app at launch. Tests and stories run without it
let gone = false; // this server has no voice machine: stop asking
const held = new Map<string, Promise<ArrayBuffer | null>>();

export function setVoiceOn(value: boolean): void {
  on = value;
}

export function resetVoice(): void {
  on = false;
  gone = false;
  held.clear();
}

// The sentence as the voice machine is given it, or null when it cannot be sent.
export function voiceText(say: Say): string | null {
  const text = sayWords(say).replace(/\s+/g, ' ').trim();
  return text.length > 0 && text.length <= MAX_TEXT && SAFE_TEXT.test(text) ? text : null;
}

async function ask(text: string): Promise<ArrayBuffer | null> {
  try {
    const reply = await fetch('/api/voice', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (reply.status === 503) gone = true;
    if (!reply.ok) return null;
    const body = await reply.arrayBuffer();
    return body.byteLength > 0 ? body : null;
  } catch {
    return null;
  }
}

function fetchVoice(say: Say): Promise<ArrayBuffer | null> | null {
  if (!on || gone) return null;
  const text = voiceText(say);
  if (text === null) return null;
  const known = held.get(text);
  if (known) return known;
  const asked = ask(text).then((bytes) => {
    // A sentence that did not arrive is asked for again next time.
    if (bytes === null) held.delete(text);
    return bytes;
  });
  held.set(text, asked);
  if (held.size > MAX_HELD) {
    const oldest = held.keys().next().value;
    if (oldest !== undefined) held.delete(oldest);
  }
  return asked;
}

// Starts fetching a sentence, so it is ready by the time it is wanted.
export function warm(say: Say): void {
  void fetchVoice(say);
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
export async function readyVoice(say: Say, waitMs: number): Promise<ArrayBuffer | null> {
  const asked = fetchVoice(say);
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
