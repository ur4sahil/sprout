// A small signal that says whether the voice is speaking right now (Bella, the cast or the device's own voice).
// `speak` in speech.ts sets it and clears it; the music listens, and dips while anyone is talking.

type Listener = (speaking: boolean) => void;

let speaking = false;
const listeners = new Set<Listener>();

export function isSpeaking(): boolean {
  return speaking;
}

export function setSpeaking(value: boolean): void {
  if (value === speaking) return;
  speaking = value;
  for (const listener of listeners) listener(value);
}

// Calls `listener` each time speaking starts or stops. Returns how to stop listening.
export function onSpeaking(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
