import { isMuted } from './mute';

// Short tones made with WebAudio. No audio files. There is no sound for a wrong answer.

type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;

function contextClass(): AudioContextClass | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

// The shared audio context, or null where WebAudio does not exist. Never throws.
export function audioContext(): AudioContext | null {
  if (context) return context;
  const Class = contextClass();
  if (!Class) return null;
  try {
    context = new Class();
  } catch {
    context = null;
  }
  return context;
}

// Must be called inside a tap, or sound stays silent on an iPad. The profile tap does this.
export async function unlockAudio(): Promise<void> {
  const ctx = audioContext();
  if (!ctx || ctx.state !== 'suspended') return;
  try {
    await ctx.resume();
  } catch {
    // Sound effects stay off. The app carries on.
  }
}

export type SfxName = 'chime' | 'fanfare' | 'clap';

interface Note {
  at: number; // seconds from the start
  hz: number;
  seconds: number;
  type: OscillatorType;
  gain: number;
}

export const SFX: Record<SfxName, Note[]> = {
  // Two rising notes.
  chime: [
    { at: 0, hz: 784, seconds: 0.16, type: 'sine', gain: 0.22 },
    { at: 0.12, hz: 1175, seconds: 0.3, type: 'sine', gain: 0.22 },
  ],
  // A short rising run that ends on a held note.
  fanfare: [
    { at: 0, hz: 523, seconds: 0.14, type: 'triangle', gain: 0.24 },
    { at: 0.14, hz: 659, seconds: 0.14, type: 'triangle', gain: 0.24 },
    { at: 0.28, hz: 784, seconds: 0.14, type: 'triangle', gain: 0.24 },
    { at: 0.42, hz: 1047, seconds: 0.5, type: 'triangle', gain: 0.26 },
  ],
  // A soft, low thump for clapping out syllables.
  clap: [{ at: 0, hz: 180, seconds: 0.09, type: 'square', gain: 0.12 }],
};

// Plays a sound effect. Does nothing when muted or where WebAudio does not exist.
export function playSfx(name: SfxName): void {
  if (isMuted()) return;
  const ctx = audioContext();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + 0.01;
    for (const note of SFX[name]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = note.type;
      oscillator.frequency.value = note.hz;
      // A quick fade in and out, so the tone never clicks.
      gain.gain.setValueAtTime(0, start + note.at);
      gain.gain.linearRampToValueAtTime(note.gain, start + note.at + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + note.at + note.seconds);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start + note.at);
      oscillator.stop(start + note.at + note.seconds + 0.02);
    }
  } catch {
    // A sound that cannot play is never worth stopping a question for.
  }
}

// For tests.
export function resetAudioContext(): void {
  context = null;
}
