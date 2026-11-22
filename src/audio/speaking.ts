// A small signal that says whether the voice is speaking right now (Bella, the cast or the device's own voice).
// `speak` in speech.ts sets it and clears it; the music listens, and dips while anyone is talking.

import type { Who } from './voice';

type Listener = (speaking: boolean) => void;

let speaking = false;
let speaker: Who | null = null;
const listeners = new Set<Listener>();

export function isSpeaking(): boolean {
  return speaking;
}

// Whose voice is speaking now, or null while nobody is: the friend on the question screen moves its mouth only
// for its own voice (plan section 20, phase 2).
export function speakingAs(): Who | null {
  return speaking ? speaker : null;
}

export function setSpeaking(value: boolean, who: Who = 'sprout'): void {
  const by = value ? who : null;
  if (value === speaking && by === speaker) return;
  speaking = value;
  speaker = by;
  for (const listener of listeners) listener(value);
}

// Calls `listener` each time speaking starts or stops. Returns how to stop listening.
export function onSpeaking(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
