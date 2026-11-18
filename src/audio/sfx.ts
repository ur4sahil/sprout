import { currentWorld } from '../worlds';
import { audioContext, resetAudioContext, unlockAudio } from './context';
import { isMuted } from './mute';
import { hasSound, playSound } from './sounds';

// Short tones made with WebAudio, and the recorded sounds that replace some of them (./sounds). There is no sound for a wrong answer.

export { audioContext, resetAudioContext, unlockAudio };

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
// `step` lifts a recorded sound's pitch: a run of right answers climbs.
export function playSfx(name: SfxName, step = 0): void {
  if (isMuted()) return;
  // The chime for a right answer is the world's recorded sound once it has arrived; the tone below stands in until then.
  if (name === 'chime' && hasSound(currentWorld().sounds.right)) {
    playSound(currentWorld().sounds.right, step);
    return;
  }
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
