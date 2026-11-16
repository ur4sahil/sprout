import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadClipKeys, resetClips, syncVoicePack } from '../../src/audio/clips';
import { setMuted } from '../../src/audio/mute';
import { SFX, playSfx, resetAudioContext, unlockAudio } from '../../src/audio/sfx';
import { isSpeechAvailable, pickVoice, resetSpeech, speak, stop } from '../../src/audio/speech';
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
    createBufferSource(): { buffer: unknown; connect: () => void; start: () => void; stop: () => void; onended: (() => void) | null } {
      const source = {
        buffer: null as { size: number } | null,
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
  await loadClipKeys();
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
});

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

  it('with no voice pack on the device, every part uses the device voice', async () => {
    installSpeech();
    installAudio();
    await loadClipKeys();
    await speak(['Find the letter', { letter: 'b' }, 'and', { number: 7 }, '.']);
    expect(events).toEqual(['cancel', 'say:Find the letter bee and seven.']);
  });

  it('plays the parts in order, with a clip in the middle', async () => {
    installSpeech();
    installAudio();
    await putClips({ 'letter:b': 111 });
    expect(await speak(['Find the letter', { letter: 'B' }, 'in the box.'])).toBe(true);
    expect(events).toEqual(['cancel', 'say:Find the letter', 'clip:111', 'say:in the box.']);
  });

  it('falls back to the device voice for a part when its clip cannot play', async () => {
    installSpeech();
    await putClips({ 'number:7': 77 }); // the clip is there, but this device has no WebAudio
    await speak(['The number', { number: 7 }]);
    expect(events).toEqual(['cancel', 'say:The number', 'say:seven']);
  });

  it('still plays clips on a device with no speech at all', async () => {
    removeSpeech();
    installAudio();
    await putClips({ 'number:7': 77 });
    expect(await speak([{ number: 7 }])).toBe(true);
    expect(events).toEqual(['clip:77']);
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
});

describe('getting the voice pack', () => {
  const pack = (version: string, clips: Record<string, string>): string => JSON.stringify({ version, mimeType: 'audio/mp4', clips });
  function serve(reply: () => Response | Promise<Response>): string[] {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return reply();
    });
    return urls;
  }

  it('downloads the pack once and stores every clip as bytes', async () => {
    serve(() => new Response(pack('p1', { 'letter:a': btoa('abc'), 'number:7': btoa('seven!') }), { headers: { 'X-Pack-Version': 'etag-1' } }));
    expect(await syncVoicePack()).toBe('downloaded');
    const { repo } = await openRepo();
    expect(await repo.listClipKeys()).toEqual(['letter:a', 'number:7']);
    const clip = await repo.getClip('number:7');
    expect(String.fromCharCode(...new Uint8Array(clip?.bytes ?? new ArrayBuffer(0)))).toBe('seven!');
    expect(clip?.packVersion).toBe('etag-1');
    expect((await repo.getDeviceState()).voicePackVersion).toBe('etag-1');
    // Clips stay on the device: storing them is not a change to back up.
    expect((await repo.getDeviceState()).dirty).toBe(false);
  });

  it('asks with the version it has, and downloads nothing when that is current', async () => {
    serve(() => new Response(pack('p1', { 'letter:a': btoa('abc') }), { headers: { 'X-Pack-Version': 'etag-1' } }));
    await syncVoicePack();
    const urls = serve(() => new Response(JSON.stringify({ version: 'etag-1', unchanged: true })));
    expect(await syncVoicePack()).toBe('upToDate');
    expect(urls).toEqual(['/api/voice-pack?have=etag-1']);
  });

  it('a new pack replaces the old clips, and removes ones it no longer has', async () => {
    serve(() => new Response(pack('p1', { 'letter:a': btoa('old'), 'letter:b': btoa('gone') }), { headers: { 'X-Pack-Version': 'etag-1' } }));
    await syncVoicePack();
    serve(() => new Response(pack('p2', { 'letter:a': btoa('new') }), { headers: { 'X-Pack-Version': 'etag-2' } }));
    expect(await syncVoicePack()).toBe('downloaded');
    const { repo } = await openRepo();
    expect(await repo.listClipKeys()).toEqual(['letter:a']);
    expect(String.fromCharCode(...new Uint8Array((await repo.getClip('letter:a'))?.bytes ?? new ArrayBuffer(0)))).toBe('new');
  });

  it('with no pack, no network, a server fault or a damaged file, the device is left as it was', async () => {
    const { repo } = await openRepo();
    serve(() => new Response('{"error":"no_pack"}', { status: 404 }));
    expect(await syncVoicePack()).toBe('noPack');
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Load failed');
    });
    expect(await syncVoicePack()).toBe('offline');
    serve(() => new Response('{}', { status: 500 }));
    expect(await syncVoicePack()).toBe('failed');
    serve(() => new Response('{"version":"x","clips":"nope"}'));
    expect(await syncVoicePack()).toBe('failed');
    serve(() => new Response('<html>not json</html>'));
    expect(await syncVoicePack()).toBe('failed');
    expect(await repo.listClipKeys()).toEqual([]);
    expect((await repo.getDeviceState()).voicePackVersion).toBeNull();
  });
});
