import type { MusicEvent } from './musicLoops';
import { hertz } from './musicLoops';

// How each instrument of Sprout's music is made, from plain sine and triangle tones with gentle rises and fades,
// so nothing clicks or buzzes. No music files: everything is made on the device.

// The few parts of WebAudio the music uses. The browser's own AudioContext fits this shape; the tests use a small
// stand-in of their own.
export interface ParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  setTargetAtTime(target: number, time: number, timeConstant: number): unknown;
  cancelScheduledValues(time: number): unknown;
}

export interface NodeLike {
  connect(destination: NodeLike): unknown;
  disconnect(): void;
}

export interface OscillatorLike extends NodeLike {
  type: OscillatorType;
  frequency: ParamLike;
  detune: ParamLike;
  start(time: number): void;
  stop(time: number): void;
}

export interface GainLike extends NodeLike {
  gain: ParamLike;
}

export interface FilterLike extends NodeLike {
  type: BiquadFilterType;
  frequency: ParamLike;
  Q: ParamLike;
}

export interface MusicAudio {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: NodeLike;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  createBiquadFilter(): FilterLike;
}

// One tone with its own loudness, joined to `out`, sounding from `start` to `end`. Returns its loudness control.
function tone(ctx: MusicAudio, out: NodeLike, type: OscillatorType, hz: number, start: number, end: number, cents = 0): GainLike {
  const oscillator = ctx.createOscillator();
  const level = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = hz;
  oscillator.detune.value = cents;
  level.gain.setValueAtTime(0, start);
  oscillator.connect(level);
  level.connect(out);
  oscillator.start(start);
  oscillator.stop(end);
  return level;
}

// Plays one note of a loop at `at` (seconds on the audio clock), into `out`.
export function playNote(ctx: MusicAudio, out: NodeLike, event: MusicEvent, at: number): void {
  const hz = hertz(event.note);
  const peak = event.gain;
  const end = at + event.seconds;
  switch (event.instrument) {
    case 'pad': {
      // Two triangle tones a hair apart, softened by a filter: a slow swell, held, then a long fade that overlaps
      // the next chord, so the chords flow into each other.
      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 900;
      soft.Q.value = 0.5;
      soft.connect(out);
      const rise = Math.min(0.8, event.seconds / 2);
      for (const cents of [-5, 5]) {
        const level = tone(ctx, soft, 'triangle', hz, at, end + 2.5, cents);
        level.gain.linearRampToValueAtTime(peak / 2, at + rise);
        level.gain.setValueAtTime(peak / 2, end);
        level.gain.setTargetAtTime(0, end, 0.45);
      }
      return;
    }
    case 'marimba': {
      // A sine that starts at once and dies away, with a faint, quicker knock four times higher for the wood.
      const body = tone(ctx, out, 'sine', hz, at, at + 2);
      body.gain.linearRampToValueAtTime(peak, at + 0.008);
      body.gain.setTargetAtTime(0, at + 0.012, 0.3);
      const knock = tone(ctx, out, 'sine', hz * 4, at, at + 0.5);
      knock.gain.linearRampToValueAtTime(peak * 0.06, at + 0.004);
      knock.gain.setTargetAtTime(0, at + 0.006, 0.05);
      return;
    }
    case 'bell': {
      // A music-box note: a sine with a soft ring an octave up, both fading slowly.
      const body = tone(ctx, out, 'sine', hz, at, at + 3.2);
      body.gain.linearRampToValueAtTime(peak, at + 0.006);
      body.gain.setTargetAtTime(0, at + 0.01, 0.65);
      const ring = tone(ctx, out, 'sine', hz * 2, at, at + 1.5);
      ring.gain.linearRampToValueAtTime(peak * 0.2, at + 0.005);
      ring.gain.setTargetAtTime(0, at + 0.008, 0.25);
      return;
    }
    case 'bass': {
      // A low sine that swells in, settles to half and lets go at the end of its note.
      const level = tone(ctx, out, 'sine', hz, at, end + 1);
      level.gain.linearRampToValueAtTime(peak, at + 0.06);
      level.gain.setTargetAtTime(peak * 0.5, at + 0.1, 0.5);
      level.gain.setTargetAtTime(0, end, 0.15);
      return;
    }
  }
}
