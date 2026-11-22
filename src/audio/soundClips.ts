// Recorded letter sounds (the owner's choice, Nov 21, 2026): each sound is recorded once, as "sound:<key>:once"
// (said inside a sentence) and "sound:<key>:three" (said three times, on its own). The recordings do not exist yet,
// so no source is set and every sound part is said by its letters (`soundFallback` in say.ts). When they exist,
// the app sets a source here at launch; voicePieces and speak then play them with no other change.

export interface SoundClipSource {
  has: (key: string) => boolean; // whether this device can play the recording now
  get: (key: string) => Promise<ArrayBuffer | null>;
}

let source: SoundClipSource | null = null;

export function setSoundClips(next: SoundClipSource | null): void {
  source = next;
}

export function hasSoundClip(key: string): boolean {
  return source?.has(key) ?? false;
}

// The recording's bytes, or null when it cannot be had. Never throws.
export async function soundClipBytes(key: string): Promise<ArrayBuffer | null> {
  try {
    return (await source?.get(key)) ?? null;
  } catch {
    return null;
  }
}
