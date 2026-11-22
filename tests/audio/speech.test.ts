import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeOldClips, resetClips } from '../../src/audio/clips';
import { setMuted } from '../../src/audio/mute';
import { audioContext, wakeAudioOnTaps } from '../../src/audio/context';
import { SFX, playSfx, resetAudioContext, unlockAudio } from '../../src/audio/sfx';
import { LESSON_PAUSE_MS, isSpeechAvailable, pickVoice, resetSpeech, speak, stop } from '../../src/audio/speech';
import { setSoundClips } from '../../src/audio/soundClips';
import { openRepo } from '../../src/storage/index';

// A stand-in for the browser's speech and audio, recording everything in one timeline.
let events: string[];
let cancelledAt: number[];
let spokeAt: number[];

class FakeUtterance {
  text: string;
  rate = 1;
  lang = '';
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function installSpeech(options: { voices?: Partial<SpeechSynthesisVoice>[]; never?: boolean } = {}): void {
  const engine = {
    getVoices: () => (options.voices ?? [{ name: 'Samantha', lang: 'en-US', localService: true }]) as SpeechSynthesisVoice[],
    cancel: () => {
      events.push('cancel');
      cancelledAt.push(Date.now());
    },
    speak: (utterance: FakeUtterance) => {
      events.push(`say:${utterance.text}`);
      spokeAt.push(Date.now());
      if (!options.never) setTimeout(() => utterance.onend?.(), 5);
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  vi.stubGlobal('speechSynthesis', engine);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: engine });
}

function removeSpeech(): void {
  // jsdom has no speech at all: make sure of it.
  Reflect.deleteProperty(window, 'speechSynthesis');
  vi.stubGlobal('SpeechSynthesisUtterance', undefined);
}

function installAudio(): void {
  class FakeContext {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    async resume(): Promise<void> {
      this.state = 'running';
      events.push('resume');
    }
    async decodeAudioData(bytes: ArrayBuffer): Promise<{ duration: number; size: number }> {
      return { duration: 0.01, size: bytes.byteLength };
    }
    createBufferSource(): { buffer: unknown; playbackRate: { value: number }; connect: () => void; start: () => void; stop: () => void; onended: (() => void) | null } {
      const source = {
        buffer: null as { size: number } | null,
        playbackRate: { value: 1 },
        onended: null as (() => void) | null,
        connect: () => undefined,
        stop: () => undefined,
        start: () => {
          events.push(`clip:${source.buffer?.size}`);
          setTimeout(() => source.onended?.(), 5);
        },
      };
      return source;
    }
    createOscillator(): { type: string; frequency: { value: number }; connect: () => void; start: () => void; stop: () => void } {
      const oscillator = { type: '', frequency: { value: 0 }, connect: () => undefined, start: () => events.push(`tone:${oscillator.frequency.value}`), stop: () => undefined };
      return oscillator;
    }
    createGain(): { gain: { setValueAtTime: () => void; linearRampToValueAtTime: () => void }; connect: () => void } {
      return { gain: { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined }, connect: () => undefined };
    }
  }
  vi.stubGlobal('AudioContext', FakeContext);
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeContext });
}

async function putClips(keys: Record<string, number>): Promise<void> {
  const { repo } = await openRepo();
  for (const [key, size] of Object.entries(keys)) await repo.saveClip({ key, bytes: new ArrayBuffer(size), mimeType: 'audio/mp4', packVersion: 'v1' });
}

beforeEach(() => {
  events = [];
  cancelledAt = [];
  spokeAt = [];
  resetSpeech();
  resetClips();
  resetAudioContext();
  setMuted(false);
});
afterEach(() => {
  Reflect.deleteProperty(window, 'speechSynthesis');
  Reflect.deleteProperty(window, 'AudioContext');
  setSoundClips(null);
});

// Recorded letter sounds, as a source would hand them over: each recording's size tells which one played.
function soundRecordings(sizes: Record<string, number>): void {
  setSoundClips({ has: (key) => key in sizes, get: async (key) => (sizes[key] === undefined ? null : new ArrayBuffer(sizes[key])) });
}

describe('speak', () => {
  it('cancels anything playing, then waits at least 60 ms before speaking', async () => {
    installSpeech();
    expect(await speak(['Hello there.'])).toBe(true);
    expect(events).toEqual(['cancel', 'say:Hello there.']);
    expect((spokeAt[0] as number) - (cancelledAt[0] as number)).toBeGreaterThanOrEqual(58);
  });

  it('never throws when the speech API is missing, and says so by returning false', async () => {
    removeSpeech();
    expect(isSpeechAvailable()).toBe(false);
    await expect(speak(['Hello.'])).resolves.toBe(false);
    expect(() => stop()).not.toThrow();
  });

  it('never throws when the speech API itself throws', async () => {
    installSpeech();
    (window.speechSynthesis as unknown as { speak: () => void }).speak = () => {
      throw new Error('not allowed');
    };
    (window.speechSynthesis as unknown as { cancel: () => void }).cancel = () => {
      throw new Error('not allowed');
    };
    await expect(speak(['Hello.'])).resolves.toBeTypeOf('boolean');
    expect(() => stop()).not.toThrow();
  });

  it('without the recorded voice, every part is said by the device voice, letters by their names', async () => {
    installSpeech();
    installAudio();
    await speak(['Find the letter', { letter: 'b' }, 'and', { number: 7 }, '.']);
    expect(events).toEqual(['cancel', 'say:Find the letter bee and seven.']);
  });

  it('a lesson is said a sentence at a time, with a pause between sentences', async () => {
    installSpeech();
    await speak(['Count the dots. Then say the number.'], 0.85, 'lesson');
    expect(events).toEqual(['cancel', 'say:Count the dots.', 'say:Then say the number.']);
    expect((spokeAt[1] as number) - (spokeAt[0] as number)).toBeGreaterThanOrEqual(LESSON_PAUSE_MS - 5);
  });

  it('says a letter sound by its letters while there is no recording of it', async () => {
    installSpeech();
    installAudio();
    await speak(['Bat starts with', { sound: 'b' }, '.']);
    expect(events).toEqual(['cancel', 'say:Bat starts with the sound of bee.']);
  });

  it('plays a recorded letter sound in its place: once inside a sentence, three times on its own', async () => {
    installSpeech();
    installAudio();
    soundRecordings({ 'sound:b:once': 11, 'sound:b:three': 33 });
    await speak(['Bat starts with', { sound: 'b' }, '.']);
    expect(events).toEqual(['cancel', 'say:Bat starts with', 'clip:11']);
    events = [];
    await speak([{ sound: 'b' }]);
    expect(events).toEqual(['cancel', 'clip:33']);
  });

  it('a recording that cannot be had falls back to the letters', async () => {
    installSpeech();
    installAudio();
    setSoundClips({ has: () => true, get: async () => null });
    await speak(['Bat starts with', { sound: 'b' }, '.']);
    expect(events).toEqual(['cancel', 'say:Bat starts with', 'say:the sound of bee']);
  });

  it('in a lesson, a recorded sound is said with no pause around it, and a new sentence after it still gets one', async () => {
    installSpeech();
    installAudio();
    soundRecordings({ 'sound:b:once': 11 });
    let start = Date.now();
    await speak(['Bat starts with', { sound: 'b' }, ', as in ball.'], 0.85, 'lesson');
    expect(events).toEqual(['cancel', 'say:Bat starts with', 'clip:11', 'say:as in ball.']);
    expect(Date.now() - start).toBeLessThan(LESSON_PAUSE_MS);
    events = [];
    start = Date.now();
    await speak(['Bat starts with', { sound: 'b' }, '. Say it.'], 0.85, 'lesson');
    expect(events).toEqual(['cancel', 'say:Bat starts with', 'clip:11', 'say:Say it.']);
    expect(Date.now() - start).toBeGreaterThanOrEqual(LESSON_PAUSE_MS - 5);
  });

  it('never plays an old voice-pack clip, even one still on the device', async () => {
    installSpeech();
    installAudio();
    await putClips({ 'letter:b': 111, 'number:7': 77 });
    expect(await speak(['Find the letter', { letter: 'B' }, 'in the box.'])).toBe(true);
    expect(events).toEqual(['cancel', 'say:Find the letter bee in the box.']);
  });

  it('a newer speak cuts off an older one, so a prompt is never said over another', async () => {
    installSpeech();
    const first = speak(['The first sentence.', { number: 1 }, 'and more of it.']);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = speak(['The second sentence.']);
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(events.filter((e) => e.startsWith('say:'))).toEqual(['say:The second sentence.']);
  });

  it('stop cancels what is being said and what was about to be', async () => {
    installSpeech();
    const speaking = speak(['Something long.']);
    stop();
    expect(await speaking).toBe(false);
    expect(events.filter((e) => e.startsWith('say:'))).toEqual([]);
    expect(events.filter((e) => e === 'cancel').length).toBeGreaterThanOrEqual(2);
  });

  it('says nothing when muted, and nothing for empty speech', async () => {
    installSpeech();
    setMuted(true);
    expect(await speak(['Hello.'])).toBe(false);
    setMuted(false);
    expect(await speak([])).toBe(false);
    expect(events.filter((e) => e.startsWith('say:'))).toEqual([]);
  });

  it('uses the rate it is given, and speaks in English', async () => {
    const seen: FakeUtterance[] = [];
    installSpeech();
    (window.speechSynthesis as unknown as { speak: (u: FakeUtterance) => void }).speak = (utterance) => {
      seen.push(utterance);
      setTimeout(() => utterance.onend?.(), 1);
    };
    await speak(['Hi.'], 0.7);
    expect(seen[0]?.rate).toBe(0.7);
    expect(seen[0]?.lang).toBe('en-US');
    expect((seen[0]?.voice as { name: string }).name).toBe('Samantha');
  });

  it('gives up on an utterance that never ends, instead of hanging the question', async () => {
    vi.useFakeTimers();
    try {
      installSpeech({ never: true });
      const speaking = speak(['Stuck.']);
      await vi.advanceTimersByTimeAsync(13_000);
      await expect(speaking).resolves.toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('pickVoice', () => {
  const v = (name: string, lang: string, localService = true): SpeechSynthesisVoice => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

  it('prefers Samantha, then Ava, then Allison', () => {
    expect(pickVoice([v('Daniel', 'en-GB'), v('Allison', 'en-US'), v('Ava', 'en-US'), v('Samantha', 'en-US')])?.name).toBe('Samantha');
    expect(pickVoice([v('Allison', 'en-US'), v('Ava (Enhanced)', 'en-US')])?.name).toBe('Ava (Enhanced)');
    expect(pickVoice([v('Fred', 'en-US'), v('Allison', 'en-US')])?.name).toBe('Allison');
  });

  it('then a local English (US) voice, then any US voice, then any English voice', () => {
    expect(pickVoice([v('Cloud', 'en-US', false), v('Local', 'en-US', true)])?.name).toBe('Local');
    expect(pickVoice([v('Cloud', 'en-US', false), v('Daniel', 'en-GB')])?.name).toBe('Cloud');
    expect(pickVoice([v('Thomas', 'fr-FR'), v('Daniel', 'en-GB')])?.name).toBe('Daniel');
    expect(pickVoice([v('Samantha', 'en_US')])?.name).toBe('Samantha');
  });

  it('gives nothing when there is no English voice', () => {
    expect(pickVoice([v('Thomas', 'fr-FR')])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});

describe('sound effects', () => {
  it('has a chime, a fanfare and a clap, and no sound for wrong', () => {
    expect(Object.keys(SFX).sort()).toEqual(['chime', 'clap', 'fanfare']);
    for (const notes of Object.values(SFX)) {
      expect(notes.length).toBeGreaterThan(0);
      for (const note of notes) {
        expect(note.gain).toBeLessThanOrEqual(0.3); // never loud
        expect(note.seconds).toBeLessThanOrEqual(0.6); // always short
      }
    }
  });

  it('plays one tone for each note', () => {
    installAudio();
    playSfx('fanfare');
    expect(events).toEqual(['tone:523', 'tone:659', 'tone:784', 'tone:1047']);
  });

  it('is silent when muted, and never throws where WebAudio does not exist', () => {
    installAudio();
    setMuted(true);
    playSfx('chime');
    expect(events).toEqual([]);
    setMuted(false);
    resetAudioContext();
    Reflect.deleteProperty(window, 'AudioContext');
    vi.stubGlobal('AudioContext', undefined);
    expect(() => playSfx('chime')).not.toThrow();
  });

  it('the first tap resumes the audio context, once', async () => {
    installAudio();
    await unlockAudio();
    await unlockAudio();
    expect(events).toEqual(['resume']);
  });

  it('a tap anywhere wakes the sound again after the iPad stopped it, suspended or interrupted', async () => {
    installAudio();
    const stopListening = wakeAudioOnTaps();
    try {
      const ctx = audioContext() as unknown as { state: string };
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await Promise.resolve();
      expect(events).toEqual(['resume']);
      // Running: a tap does nothing.
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await Promise.resolve();
      expect(events).toEqual(['resume']);
      // The screen locked: Safari says "interrupted". The next tap, touch or key brings it back.
      ctx.state = 'interrupted';
      document.body.dispatchEvent(new Event('touchend', { bubbles: true }));
      await Promise.resolve();
      ctx.state = 'suspended';
      document.body.dispatchEvent(new Event('keydown', { bubbles: true }));
      await Promise.resolve();
      expect(events).toEqual(['resume', 'resume', 'resume']);
    } finally {
      stopListening();
    }
  });

  it('a tap a screen stops still wakes the sound, because the listener runs first', async () => {
    installAudio();
    const stopListening = wakeAudioOnTaps();
    const button = document.createElement('div');
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    document.body.append(button);
    try {
      button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await Promise.resolve();
      expect(events).toEqual(['resume']);
    } finally {
      button.remove();
      stopListening();
    }
  });

  it('a closed context is left alone, and calling it twice listens once', async () => {
    installAudio();
    const first = wakeAudioOnTaps();
    const second = wakeAudioOnTaps();
    try {
      (audioContext() as unknown as { state: string }).state = 'closed';
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await Promise.resolve();
      expect(events).toEqual([]);
    } finally {
      second();
      first();
    }
  });

  it('asks the device to play Sprout as media, so the silent switch does not mute it', () => {
    const session = { type: 'auto' };
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as object, { audioSession: session }));
    const stopListening = wakeAudioOnTaps();
    stopListening();
    expect(session.type).toBe('playback');
  });

  it('the first tap says one silent, empty word, so the device voice may speak later', () => {
    installAudio();
    const said: { text: string; volume: number }[] = [];
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; volume = 1; constructor(text: string) { this.text = text; } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: (word: { text: string; volume: number }) => said.push(word) } });
    const stopListening = wakeAudioOnTaps();
    try {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(said).toEqual([{ text: '', volume: 0 }]);
    } finally {
      stopListening();
      Reflect.deleteProperty(window, 'speechSynthesis');
    }
  });
});

describe('the old voice pack', () => {
  it('clips left on the device are removed', async () => {
    await putClips({ 'letter:a': 1, 'number:7': 2 });
    await removeOldClips();
    const { repo } = await openRepo();
    expect(await repo.listClipKeys()).toEqual([]);
  });
});
