import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOUTHS } from '../../src/cast/types';
import { playBytes, resetClips, stopClip } from '../../src/audio/clips';
import { audioContext } from '../../src/audio/context';
import { resetAudioContext } from '../../src/audio/sfx';
import type { SpokenTiming } from '../../src/audio/voice';
import { TALK_SHAPES, parseTiming, playingTiming, readyVoice, resetVoice, setVoiceOn, shapeAt, timingOf } from '../../src/audio/voice';
import { TIMING_SHAPES, cleanTiming } from '../../worker/voice';

// The timing Piper sends with each sentence (the X-Timing header): kept with the recording, so the friend's mouth
// can follow the sentence while it plays (plan section 20, phase 2).

const HEADER = '{"d":1.25,"v":[[0,"closed"],[0.1,"small"],[0.32,"wide"],[0.6,"round"],[1.1,"closed"]]}';
const TIMING: SpokenTiming = {
  duration: 1.25,
  shapes: [
    { at: 0, shape: 'closed' },
    { at: 0.1, shape: 'small' },
    { at: 0.32, shape: 'wide' },
    { at: 0.6, shape: 'round' },
    { at: 1.1, shape: 'closed' },
  ],
};

let header: string | null;
beforeEach(() => {
  resetVoice();
  header = HEADER;
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const { text } = JSON.parse(String(init.body)) as { text: string };
    return new Response(new TextEncoder().encode(`mp3:${text}`), { status: 200, headers: { 'Content-Type': 'audio/mpeg', ...(header === null ? {} : { 'X-Timing': header }) } });
  });
  setVoiceOn(true);
});
afterEach(() => {
  resetVoice();
  resetClips();
  resetAudioContext();
  Reflect.deleteProperty(window, 'AudioContext');
});

describe('reading the timing', () => {
  it('reads the header into when each mouth shape starts', () => {
    expect(parseTiming(HEADER)).toEqual(TIMING);
    expect(parseTiming('{"d":0.5,"v":[]}')).toEqual({ duration: 0.5, shapes: [] });
  });

  it('gives nothing for a missing header or one that is not a timing, and never throws', () => {
    const bad = [null, '', 'null', '[]', 'not json', '{"v":[]}', '{"d":"1","v":[]}', '{"d":1,"v":[[0]]}', '{"d":1,"v":[[0,"grin"]]}', '{"d":1,"v":[[0.5,"small"],[0.2,"wide"]]}', '{"d":1,"v":[[-1,"small"]]}', '{"d":-1,"v":[]}'];
    for (const each of bad) expect(parseTiming(each), String(each)).toBeNull();
  });

  it('reads whatever the Worker lets through, and the two agree on the mouth shapes', () => {
    expect([...TALK_SHAPES]).toEqual([...TIMING_SHAPES]);
    // They are the four shapes a talking mouth moves through.
    expect(new Set(TALK_SHAPES)).toEqual(new Set(MOUTHS.slice(0, 4)));
    expect(parseTiming(cleanTiming(' { "d" : 1.25 , "v" : [[0, "closed"], [0.1, "small"], [0.32, "wide"], [0.6, "round"], [1.1, "closed"]] } '))).toEqual(TIMING);
  });

  it('says the shape at each moment: the last one started, and closed before the first and after the end', () => {
    expect(shapeAt(TIMING, 0)).toBe('closed');
    expect(shapeAt(TIMING, 0.1)).toBe('small');
    expect(shapeAt(TIMING, 0.31)).toBe('small');
    expect(shapeAt(TIMING, 0.32)).toBe('wide');
    expect(shapeAt(TIMING, 0.9)).toBe('round');
    expect(shapeAt(TIMING, 1.2)).toBe('closed');
    expect(shapeAt(TIMING, 5)).toBe('closed');
    expect(shapeAt({ duration: 2, shapes: [{ at: 0.5, shape: 'wide' }] }, 0.2)).toBe('closed');
    expect(shapeAt({ duration: 2, shapes: [{ at: 0.5, shape: 'small' }, { at: 0.5, shape: 'wide' }] }, 0.5)).toBe('wide');
  });
});

describe('the timing kept with each recording', () => {
  it('a reply with a timing keeps it with its recording', async () => {
    const bytes = await readyVoice(['Count with me.'], 500, 'normal', 'pip');
    expect(bytes).not.toBeNull();
    expect(timingOf(bytes ?? new ArrayBuffer(0))).toEqual(TIMING);
    // Asked for again, it is the same recording, with the same timing.
    expect(await readyVoice(['Count with me.'], 500, 'normal', 'pip')).toBe(bytes);
  });

  it('a reply with no timing, or one that cannot be read, still gives the recording', async () => {
    header = null;
    const plain = await readyVoice(['No timing here.'], 500);
    expect(new TextDecoder().decode(plain ?? new ArrayBuffer(0))).toBe('mp3:No timing here.');
    expect(timingOf(plain ?? new ArrayBuffer(0))).toBeNull();
    header = '{"d":1,"v":[[0,"smile"]]}';
    const odd = await readyVoice(['A strange timing.'], 500);
    expect(new TextDecoder().decode(odd ?? new ArrayBuffer(0))).toBe('mp3:A strange timing.');
    expect(timingOf(odd ?? new ArrayBuffer(0))).toBeNull();
  });
});

describe('the timing of what is playing now', () => {
  // A stand-in for WebAudio: the test moves its clock and ends each sound itself.
  let sources: { onended: (() => void) | null }[];
  beforeEach(() => {
    sources = [];
    class FakeContext {
      state = 'running';
      currentTime = 10;
      destination = {};
      async resume(): Promise<void> {}
      async decodeAudioData(bytes: ArrayBuffer): Promise<{ duration: number; size: number }> {
        return { duration: 1.25, size: bytes.byteLength };
      }
      createBufferSource(): object {
        const source = { buffer: null, playbackRate: { value: 1 }, onended: null as (() => void) | null, connect: () => undefined, stop: () => undefined, start: () => sources.push(source) };
        return source;
      }
    }
    vi.stubGlobal('AudioContext', FakeContext);
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeContext });
  });
  const clock = (): { currentTime: number } => audioContext() as unknown as { currentTime: number };
  const started = async (count: number): Promise<void> => {
    await vi.waitFor(() => expect(sources.length).toBe(count));
  };

  it('gives the sentence\'s timing and how far into it the voice is, then nothing once it ends', async () => {
    const bytes = (await readyVoice(['Count with me.'], 500, 'normal', 'pip')) ?? new ArrayBuffer(0);
    expect(playingTiming()).toBeNull();
    const playing = playBytes(bytes, 1.25);
    await started(1);
    expect(playingTiming()).toEqual({ timing: TIMING, at: 0 });
    // 0.4 s later at 1.25 times the speed, the voice is half a second into the recording.
    clock().currentTime = 10.4;
    const now = playingTiming();
    expect(now?.at).toBeCloseTo(0.5);
    expect(shapeAt(TIMING, now?.at ?? 0)).toBe('wide');
    sources[0]?.onended?.();
    expect(await playing).toBe(true);
    expect(playingTiming()).toBeNull();
  });

  it('gives nothing while a recording with no timing plays, and nothing after a stop', async () => {
    header = null;
    const plain = (await readyVoice(['No timing here.'], 500)) ?? new ArrayBuffer(0);
    void playBytes(plain);
    await started(1);
    expect(playingTiming()).toBeNull();
    header = HEADER;
    const timed = (await readyVoice(['Count with me.'], 500)) ?? new ArrayBuffer(0);
    void playBytes(timed);
    await started(2);
    expect(playingTiming()?.timing).toEqual(TIMING);
    stopClip();
    expect(playingTiming()).toBeNull();
    // A sound that ends after another has started leaves the new one playing.
    void playBytes(timed);
    await started(3);
    sources[1]?.onended?.();
    expect(playingTiming()?.timing).toEqual(TIMING);
  });
});
