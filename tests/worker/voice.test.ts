import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_VOICE_TEXT, PACES, VOICE_ID, remoteVoiceMaker, voiceKey } from '../../worker/voice';
import type { Harness } from './harness';
import { makeHarness } from './harness';

// The spoken voice: a sentence is made once by the voice machine, kept, and served from the store after that.

let h: Harness;
let cookie: string;
let made: string[];
let speeds: number[];
const bytes = (text: string): ArrayBuffer => new TextEncoder().encode(`mp3:${text}`).buffer as ArrayBuffer;
const say = (text: unknown, options: Parameters<Harness['call']>[3] = {}): Promise<Response> => h.call('POST', '/api/voice', { text }, { cookie, ...options });

beforeEach(async () => {
  h = makeHarness();
  cookie = await h.signUp();
  made = [];
  speeds = [];
  h.deps.voiceMaker = {
    async make(text, speed) {
      made.push(text);
      speeds.push(speed);
      return bytes(`${text}@${speed}`);
    },
  };
});

describe('POST /api/voice', () => {
  it('needs a session and the app itself', async () => {
    expect((await say('Start at eight.', { cookie: null })).status).toBe(401);
    expect((await say('Start at eight.', { origin: 'https://evil.example' })).status).toBe(403);
    expect(made).toEqual([]);
  });

  it('makes a sentence once, keeps it, and serves the kept copy after that', async () => {
    const first = await say('Start at eight.');
    expect(first.status).toBe(200);
    expect(first.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(first.headers.get('X-Voice')).toBe('made');
    expect(new TextDecoder().decode(await first.arrayBuffer())).toBe('mp3:Start at eight.@0.9');
    await h.flush();
    expect(h.voice.keys()).toEqual([await voiceKey('Start at eight.')]);
    expect(h.voice.keys()[0]?.startsWith(`${VOICE_ID}/`)).toBe(true);

    const second = await say('  Start   at eight. ');
    expect(second.headers.get('X-Voice')).toBe('saved');
    expect(new TextDecoder().decode(await second.arrayBuffer())).toBe('mp3:Start at eight.@0.9');
    expect(made).toEqual(['Start at eight.']);
  });

  it('a lesson sentence is made slower and kept apart from the same sentence at the normal pace', async () => {
    const lesson = await h.call('POST', '/api/voice', { text: 'Count the dots.', pace: 'lesson' }, { cookie });
    expect(new TextDecoder().decode(await lesson.arrayBuffer())).toBe('mp3:Count the dots.@0.8');
    await say('Count the dots.');
    await h.flush();
    expect(speeds).toEqual([PACES.lesson.speed, PACES.normal.speed]);
    expect(new Set(h.voice.keys())).toEqual(new Set([await voiceKey('Count the dots.', 'lesson'), await voiceKey('Count the dots.')]));
    expect((await voiceKey('Count the dots.', 'lesson')).startsWith('kokoro-af_heart-0.8/')).toBe(true);
    // Asked again, each comes from its own kept copy.
    const again = await h.call('POST', '/api/voice', { text: 'Count the dots.', pace: 'lesson' }, { cookie });
    expect(again.headers.get('X-Voice')).toBe('saved');
    expect(made).toEqual(['Count the dots.', 'Count the dots.']);
    // Only the two paces exist.
    expect((await h.call('POST', '/api/voice', { text: 'Count the dots.', pace: 'fast' }, { cookie })).status).toBe(400);
  });

  it('refuses text that is not a plain sentence, and makes nothing', async () => {
    for (const bad of ['', '   ', 42, null, 'x'.repeat(MAX_VOICE_TEXT + 1), '<script>', 'a/b', 'line\u0000break', 'ten % off']) {
      expect((await say(bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await h.call('POST', '/api/voice', undefined, { cookie, rawBody: 'not json' })).status).toBe(400);
    expect(made).toEqual([]);
    expect(h.voice.keys()).toEqual([]);
  });

  it('says 503 where there is no voice machine, and 502 when the machine does not answer; neither is kept', async () => {
    h.deps.voiceMaker = null;
    expect((await say('Start at eight.')).status).toBe(503);
    h.deps.voiceMaker = { make: async () => null };
    expect((await say('Start at eight.')).status).toBe(502);
    await h.flush();
    expect(h.voice.keys()).toEqual([]);
  });

  it('a kept sentence is served even when the machine is gone', async () => {
    await say('Count on three more.');
    await h.flush();
    h.deps.voiceMaker = null;
    const reply = await say('Count on three more.');
    expect(reply.status).toBe(200);
    expect(reply.headers.get('X-Voice')).toBe('saved');
  });
});

describe('the link to the voice machine', () => {
  it('sends the sentence with the key, and gives the audio back', async () => {
    const seen: { url: string; key: string | null; body: string }[] = [];
    const maker = remoteVoiceMaker('https://voice.test/', 'the-key', async (input, init) => {
      seen.push({ url: String(input), key: new Headers(init?.headers).get('X-Voice-Key'), body: String(init?.body) });
      return new Response(bytes('hi'), { headers: { 'Content-Type': 'audio/mpeg' } });
    });
    expect(new TextDecoder().decode((await maker.make('hi', 0.8)) ?? new ArrayBuffer(0))).toBe('mp3:hi');
    expect(seen).toEqual([{ url: 'https://voice.test/tts', key: 'the-key', body: '{"text":"hi","speed":0.8}' }]);
  });

  it('gives null for a refusal, a page that is not audio, an empty reply or a failure', async () => {
    const replies: (() => Promise<Response>)[] = [
      async () => new Response('{}', { status: 403 }),
      async () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }),
      async () => new Response(new ArrayBuffer(0), { headers: { 'Content-Type': 'audio/mpeg' } }),
      async () => {
        throw new Error('offline');
      },
    ];
    for (const reply of replies) expect(await remoteVoiceMaker('https://voice.test', 'k', reply).make('hi', 0.9)).toBeNull();
  });
});
