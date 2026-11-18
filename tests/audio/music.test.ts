import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { CALM_LEVEL, DUCK_HOLD_MS, MUSIC_VOLUME, gardenMood, musicNow, resetMusic, setMusic, setMusicAudioForTests } from '../../src/audio/music';
import { HIGHEST_NOTE, LOOPS, LOWEST_NOTE, MOODS, barBeats, loopBars, loopEvents, loopSeconds, noteNumber, readBar } from '../../src/audio/musicLoops';
import type { MusicAudio, ParamLike } from '../../src/audio/musicSynth';
import { setMuted } from '../../src/audio/mute';
import { isSpeaking, setSpeaking } from '../../src/audio/speaking';
import { resetSpeech, speak, stop } from '../../src/audio/speech';
import { useMusic } from '../../src/audio/useMusic';
import { childSchema, defaultSettings } from '../../src/storage/schema';
import type { Child } from '../../src/storage/schema';

// Sprout's music (game feel, phase 8). jsdom has no WebAudio, so the engine plays into a small stand-in that
// keeps what each control was last set to and counts the tones made.

class FakeParam implements ParamLike {
  value: number;
  constructor(value = 1) {
    this.value = value;
  }
  setValueAtTime(value: number): this {
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number): this {
    this.value = value;
    return this;
  }
  setTargetAtTime(target: number): this {
    this.value = target;
    return this;
  }
  cancelScheduledValues(): this {
    return this;
  }
}

class FakeNode {
  connected: FakeNode[] = [];
  connect(destination: FakeNode): FakeNode {
    this.connected.push(destination);
    return destination;
  }
  disconnect(): void {
    this.connected = [];
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass';
  frequency = new FakeParam(350);
  Q = new FakeParam(1);
}

class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine';
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
  started: number[] = [];
  start(time: number): void {
    this.started.push(time);
  }
  stop(): void {}
}

class FakeAudio implements MusicAudio {
  currentTime = 0;
  state = 'running';
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  createOscillator(): FakeOscillator {
    const made = new FakeOscillator();
    this.oscillators.push(made);
    return made;
  }
  createGain(): FakeGain {
    const made = new FakeGain();
    this.gains.push(made);
    return made;
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }
}

// The music's own two controls are the first two gains made when a loop starts: the whole loudness, then the dip.
const bus = (fake: FakeAudio): FakeGain => fake.gains[0] as FakeGain;
const duck = (fake: FakeAudio): FakeGain => fake.gains[1] as FakeGain;

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function child(music: boolean, calm = false): Child {
  const at = '2026-11-18T15:00:00.000Z';
  return childSchema.parse({ id: 'kid-1', name: 'Kid', avatar: '🦊', grade: 'K', settings: { ...defaultSettings('K'), music, calm }, resetAt: null, createdAt: at, updatedAt: at, deletedAt: null });
}

let fake: FakeAudio;

beforeEach(() => {
  vi.useFakeTimers();
  fake = new FakeAudio();
  setMusicAudioForTests(fake);
  setMuted(false);
  setSpeaking(false);
});

afterEach(() => {
  resetMusic();
  setMuted(false);
  setSpeaking(false);
  setVisibility('visible');
  vi.useRealTimers();
});

describe('the notes', () => {
  // The key of each loop: every note is in its major scale (which holds its pentatonic one).
  const KEY: Record<string, number> = { garden: 0, practice: 5, night: 7 }; // C, F and G
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];

  it('reads pitches, rests and chords', () => {
    expect(noteNumber('C4')).toBe(60);
    expect(noteNumber('A4')).toBe(69);
    expect(noteNumber('F#3')).toBe(54);
    expect(noteNumber('Bb2')).toBe(46);
    expect(noteNumber('H4')).toBeNull();
    expect(readBar('C4+E4+G4:2 -:1 D5:1')).toEqual([
      { beat: 0, beats: 2, notes: [60, 64, 67] },
      { beat: 2, beats: 1, notes: [] },
      { beat: 3, beats: 1, notes: [74] },
    ]);
    expect(() => readBar('C4:x')).toThrow();
    expect(() => readBar('Q4:1')).toThrow();
  });

  for (const mood of MOODS) {
    describe(mood, () => {
      const loop = LOOPS[mood];

      it('is 8 to 16 whole bars long, the same in every part, at a slow pace', () => {
        const bars = loopBars(loop);
        expect(bars).toBeGreaterThanOrEqual(8);
        expect(bars).toBeLessThanOrEqual(16);
        expect(loop.bpm).toBeLessThanOrEqual(80);
        for (const track of loop.tracks) {
          expect(track.bars).toHaveLength(bars);
          for (const bar of track.bars) expect(barBeats(bar), `${track.instrument}: "${bar}"`).toBe(loop.beatsPerBar);
        }
        expect(loopSeconds(loop)).toBeCloseTo((bars * loop.beatsPerBar * 60) / loop.bpm);
      });

      it('keeps every note in range and in its key, and every part soft', () => {
        const events = loopEvents(loop);
        expect(events.length).toBeGreaterThan(0);
        for (const event of events) {
          expect(event.note).toBeGreaterThanOrEqual(LOWEST_NOTE);
          expect(event.note).toBeLessThanOrEqual(HIGHEST_NOTE);
          expect(MAJOR).toContain((((event.note - (KEY[mood] ?? 0)) % 12) + 12) % 12);
          expect(event.gain).toBeGreaterThan(0);
          expect(event.gain).toBeLessThanOrEqual(0.6);
          // Every note starts inside the loop, so the next time round starts cleanly.
          expect(event.at).toBeGreaterThanOrEqual(0);
          expect(event.at).toBeLessThan(loopSeconds(loop));
        }
        expect(loop.duck).toBeGreaterThanOrEqual(0);
        expect(loop.duck).toBeLessThan(1);
      });

      it('plays the same way every time', () => {
        expect(loopEvents(loop)).toEqual(loopEvents(loop));
      });
    });
  }

  it('the volume is well under the voice and the touch sounds', () => {
    expect(MUSIC_VOLUME).toBeLessThanOrEqual(0.1);
    expect(CALM_LEVEL).toBeLessThan(1);
  });

  it('the garden plays the lullaby from 7 in the evening until morning', () => {
    const at = (hour: number): Date => new Date(2026, 10, 18, hour, 30);
    expect(gardenMood(at(9))).toBe('garden');
    expect(gardenMood(at(18))).toBe('garden');
    expect(gardenMood(at(19))).toBe('night');
    expect(gardenMood(at(23))).toBe('night');
    expect(gardenMood(at(3))).toBe('night');
    expect(gardenMood(at(6))).toBe('garden');
  });
});

describe('the music engine', () => {
  it('plays, fading in, and lines up notes as time goes by', () => {
    setMusic({ mood: 'garden', hush: false, calm: false });
    expect(musicNow()).toEqual({ mood: 'garden', level: 1, duck: 1 });
    expect(bus(fake).gain.value).toBeCloseTo(MUSIC_VOLUME);
    const first = fake.oscillators.length;
    expect(first).toBeGreaterThan(0);
    fake.currentTime = 5;
    vi.advanceTimersByTime(200);
    expect(fake.oscillators.length).toBeGreaterThan(first);
  });

  it('loops with no gap: the second time round starts exactly one loop later', () => {
    setMusic({ mood: 'practice', hush: false, calm: false });
    const seconds = loopSeconds(LOOPS.practice);
    for (let t = 0; t < seconds + 2; t += 0.2) {
      fake.currentTime = t;
      vi.advanceTimersByTime(200);
    }
    const starts = fake.oscillators.flatMap((oscillator) => oscillator.started);
    const firstNote = Math.min(...starts);
    expect(starts.some((at) => Math.abs(at - (firstNote + seconds)) < 1e-6)).toBe(true);
  });

  it('dips to a third while the voice speaks, and comes back after', () => {
    setMusic({ mood: 'garden', hush: false, calm: false });
    setSpeaking(true);
    expect(musicNow().duck).toBeCloseTo(1 / 3);
    expect(duck(fake).gain.value).toBeCloseTo(1 / 3);
    setSpeaking(false);
    // A short wait first, so it does not swell between two sentences.
    vi.advanceTimersByTime(DUCK_HOLD_MS - 50);
    expect(duck(fake).gain.value).toBeCloseTo(1 / 3);
    vi.advanceTimersByTime(100);
    expect(musicNow().duck).toBe(1);
    expect(duck(fake).gain.value).toBe(1);
  });

  it('under a practice question it dips to nothing while the voice speaks', () => {
    setMusic({ mood: 'practice', hush: false, calm: false });
    setSpeaking(true);
    expect(duck(fake).gain.value).toBe(0);
    setSpeaking(false);
    vi.advanceTimersByTime(DUCK_HOLD_MS + 50);
    expect(duck(fake).gain.value).toBe(1);
  });

  it('a hush keeps the loop but makes no sound, and Calm mode is quieter', () => {
    setMusic({ mood: 'practice', hush: true, calm: false });
    expect(musicNow().level).toBe(0);
    expect(fake.oscillators).toHaveLength(0);
    setMusic({ mood: 'practice', hush: false, calm: true });
    expect(musicNow().level).toBe(CALM_LEVEL);
    expect(bus(fake).gain.value).toBeCloseTo(MUSIC_VOLUME * CALM_LEVEL);
  });

  it('starts nothing when the device is muted, and stops when it is muted', () => {
    setMuted(true);
    setMusic({ mood: 'garden', hush: false, calm: false });
    vi.advanceTimersByTime(1000);
    expect(musicNow().mood).toBeNull();
    expect(fake.oscillators).toHaveLength(0);
    setMuted(false);
    vi.advanceTimersByTime(200);
    expect(musicNow().mood).toBe('garden');
    setMuted(true);
    vi.advanceTimersByTime(200);
    expect(musicNow().mood).toBeNull();
    expect(bus(fake).gain.value).toBe(0);
  });

  it('starts nothing before the iPad allows sound, then starts once it does', () => {
    fake.state = 'suspended';
    setMusic({ mood: 'garden', hush: false, calm: false });
    vi.advanceTimersByTime(1000);
    expect(musicNow().mood).toBeNull();
    expect(fake.oscillators).toHaveLength(0);
    fake.state = 'running'; // the profile tap unlocked it
    vi.advanceTimersByTime(200);
    expect(musicNow().mood).toBe('garden');
  });

  it('starts nothing where WebAudio does not exist', () => {
    setMusicAudioForTests(null);
    setMusic({ mood: 'garden', hush: false, calm: false });
    vi.advanceTimersByTime(1000);
    expect(musicNow().mood).toBeNull();
  });

  it('stops when the app leaves the front, and comes back when it returns', () => {
    setMusic({ mood: 'garden', hush: false, calm: false });
    setVisibility('hidden');
    expect(musicNow().mood).toBeNull();
    expect(bus(fake).gain.value).toBe(0);
    const made = fake.oscillators.length;
    vi.advanceTimersByTime(2000);
    expect(fake.oscillators).toHaveLength(made);
    setVisibility('visible');
    expect(musicNow().mood).toBe('garden');
  });

  it('fades out and lets go when the screen wants none, and changes mood by fading across', () => {
    setMusic({ mood: 'garden', hush: false, calm: false });
    const gardenBus = bus(fake);
    setMusic({ mood: 'night', hush: false, calm: false });
    expect(musicNow().mood).toBe('night');
    expect(gardenBus.gain.value).toBe(0);
    setMusic({ mood: null, hush: false, calm: false });
    expect(musicNow().mood).toBeNull();
    const made = fake.oscillators.length;
    vi.advanceTimersByTime(5000);
    expect(fake.oscillators).toHaveLength(made);
  });
});

describe('useMusic', () => {
  it('plays only while a child is playing with Music on, and stops when the screen goes', () => {
    const { rerender, unmount } = renderHook(({ mood }: { mood: 'garden' | null }) => useMusic(mood), { initialProps: { mood: 'garden' as 'garden' | null } });
    expect(musicNow().mood).toBeNull(); // no child: the grown-ups' pages
    act(() => useAppStore.getState().setChild(child(true)));
    expect(musicNow().mood).toBe('garden');
    rerender({ mood: null });
    expect(musicNow().mood).toBeNull();
    rerender({ mood: 'garden' });
    expect(musicNow().mood).toBe('garden');
    unmount();
    expect(musicNow().mood).toBeNull();
  });

  it("plays nothing when the child's Music setting is off", () => {
    act(() => useAppStore.getState().setChild(child(false)));
    renderHook(() => useMusic('garden'));
    vi.advanceTimersByTime(1000);
    expect(musicNow().mood).toBeNull();
    expect(fake.oscillators).toHaveLength(0);
  });

  it('is quieter in Calm mode', () => {
    act(() => useAppStore.getState().setChild(child(true, true)));
    renderHook(() => useMusic('garden'));
    expect(musicNow().level).toBe(CALM_LEVEL);
  });
});

describe('the speaking signal', () => {
  afterEach(() => resetSpeech());

  it('speak sets it while speaking and clears it after; stop clears it', async () => {
    vi.useRealTimers();
    const done = speak(['Hello there.']);
    expect(isSpeaking()).toBe(true);
    await done;
    expect(isSpeaking()).toBe(false);
    void speak(['Hello again.']);
    expect(isSpeaking()).toBe(true);
    stop();
    expect(isSpeaking()).toBe(false);
  });

  it('a muted device never says it is speaking', async () => {
    vi.useRealTimers();
    setMuted(true);
    await speak(['Hello there.']);
    expect(isSpeaking()).toBe(false);
  });
});
