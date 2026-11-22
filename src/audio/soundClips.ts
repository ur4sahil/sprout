import { isSoundKey } from '../engine/letterSounds';
import { newVoicesOn } from './engine';

// Recorded letter sounds (the owner's choice, Nov 21, 2026): each sound is recorded once, as "sound:<key>:once"
// (said inside a sentence) and "sound:<key>:three" (said three times, on its own). The app sets a source at launch
// (`serverSoundClips`, in main.tsx); voicePieces and speak then play the recordings. Where a recording cannot be had,
// the sound is said by its letters (`soundFallback` in say.ts). Tests run with no source, or one of their own.

export interface SoundClipSource {
  has: (key: string) => boolean; // whether the recording can be played now, as far as is known
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

// Where the server keeps a recording: "sound:b:once" is /api/sound/b/once. Null for anything that is not one of
// the app's sounds in one of its two forms.
export function soundAddress(clip: string): string | null {
  const [kind, key, form, ...rest] = clip.split(':');
  if (kind !== 'sound' || !isSoundKey(key) || (form !== 'once' && form !== 'three') || rest.length > 0) return null;
  return `/api/sound/${key}/${form}`;
}

const online = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

// The recordings on the server (GET /api/sound/<key>/<form>). Each is fetched the first time it is wanted and held
// in memory while the app is open: nothing is kept on the device (the owner's choice, Nov 22, 2026). A sound the
// server does not have (404) is not asked for again until the app next opens, so its sentences stay whole and say it
// by its letters. One that cannot be fetched now (offline, a server error) is asked for again the next time.
// They are part of the new voices: until the server speaks with them (src/audio/engine.ts), no sound is counted on
// or fetched, and every sound is said by its letters, as before the switch.
export function serverSoundClips(): SoundClipSource {
  const arrived = new Map<string, ArrayBuffer>();
  const asking = new Map<string, Promise<ArrayBuffer | null>>();
  const missing = new Set<string>();

  async function fetchSound(key: string, address: string): Promise<ArrayBuffer | null> {
    try {
      const reply = await fetch(address, { credentials: 'same-origin' });
      if (reply.status === 404) missing.add(key);
      if (!reply.ok) return null;
      const bytes = await reply.arrayBuffer();
      return bytes.byteLength > 0 ? bytes : null;
    } catch {
      return null;
    }
  }

  return {
    has: (key) => newVoicesOn() && (arrived.has(key) || (!missing.has(key) && soundAddress(key) !== null && online())),
    get: (key) => {
      if (!newVoicesOn()) return Promise.resolve(null);
      const bytes = arrived.get(key);
      if (bytes) return Promise.resolve(bytes);
      const address = soundAddress(key);
      if (address === null || missing.has(key)) return Promise.resolve(null);
      const known = asking.get(key);
      if (known) return known;
      const asked = fetchSound(key, address).then((found) => {
        asking.delete(key);
        if (found) arrived.set(key, found);
        return found;
      });
      asking.set(key, asked);
      return asked;
    },
  };
}
