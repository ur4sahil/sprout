import { isMuted } from './mute';
import { audioContext } from './context';

// Recorded sound effects (plan section 19, phase 1): short files in /sounds, from Kenney's CC0 interface packs
// (see the credits). Each is fetched once, kept decoded, and played at once on a touch. Silent when muted, where
// WebAudio does not exist, or until a file has arrived: a missing sound never holds anything up.

export const SOUND_NAMES = ['tap', 'pick', 'drop', 'toggle', 'right', 'notyet', 'whoosh-in', 'whoosh-out', 'pop', 'star', 'tick', 'open', 'close'] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

// How loud each one is, 0 to 1. Touch sounds are quiet: a child hears hundreds of them.
const VOLUME: Record<SoundName, number> = { tap: 0.25, pick: 0.3, drop: 0.35, toggle: 0.3, right: 0.5, notyet: 0.35, 'whoosh-in': 0.25, 'whoosh-out': 0.25, pop: 0.4, star: 0.45, tick: 0.25, open: 0.3, close: 0.3 };

const buffers = new Map<SoundName, AudioBuffer>();
const asked = new Set<SoundName>();

async function load(name: SoundName): Promise<void> {
  if (asked.has(name)) return;
  asked.add(name);
  const ctx = audioContext();
  if (!ctx || typeof fetch !== 'function') return;
  try {
    const response = await fetch(`/sounds/${name}.mp3`);
    if (!response.ok) return;
    buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
  } catch {
    asked.delete(name); // tried again the next time it is wanted
  }
}

export function hasSound(name: SoundName): boolean {
  return buffers.has(name);
}

// Fetches every sound. Called once a child is picked, inside that tap, so the first touch already has its sound.
export function loadSounds(): void {
  for (const name of SOUND_NAMES) void load(name);
}

// The rate that lifts a sound by this many steps of a major scale: a run of right answers climbs.
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
export function stepRate(step: number): number {
  const at = Math.max(0, Math.min(step, SCALE.length - 1));
  return 2 ** ((SCALE[at] as number) / 12);
}

// Plays a sound now. `step` lifts its pitch (0 = as recorded). Never throws.
export function playSound(name: SoundName, step = 0): void {
  if (isMuted()) return;
  const ctx = audioContext();
  const buffer = buffers.get(name);
  if (!ctx || !buffer) {
    void load(name);
    return;
  }
  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = stepRate(step);
    gain.gain.value = VOLUME[name];
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // A sound that cannot play is never worth stopping a question for.
  }
}

// For tests.
export function resetSounds(): void {
  buffers.clear();
  asked.clear();
}
