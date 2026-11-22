import type { D1Database, R2Bucket, SendEmail } from '@cloudflare/workers-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../worker/index';
import { buildDeps } from '../../worker/index';
import { r2VoiceStore } from '../../worker/store';
import type { PiperVoice, Who } from '../../worker/voice';
import { PIPER_VOICE, cleanTiming, piperKey, remotePiperMaker, timingKey, voiceKey } from '../../worker/voice';
import type { Harness } from './harness';
import { makeHarness } from './harness';

// The Piper voice (plan section 20): on a Worker whose VOICE_ENGINE is piper, each friend speaks in its own Piper
// voice at the one slow pace, and every sentence is kept with its timing (when the mouth takes each shape).

const TIMING = '{"d":1.25,"v":[[0,"closed"],[0.1,"small"],[0.32,"wide"],[0.6,"round"],[1.1,"closed"]]}';

let h: Harness;
let cookie: string;
let made: { text: string; voice: PiperVoice }[];
let timing: string | null;
const bytes = (text: string): ArrayBuffer => new TextEncoder().encode(`mp3:${text}`).buffer as ArrayBuffer;
const decode = async (reply: Response): Promise<string> => new TextDecoder().decode(await reply.arrayBuffer());
const ask = (body: Record<string, unknown>, options: Parameters<Harness['call']>[3] = {}): Promise<Response> => h.call('POST', '/api/voice', body, { cookie, ...options });

beforeEach(async () => {
  h = makeHarness();
  cookie = await h.signUp();
  made = [];
  timing = TIMING;
  h.deps.voiceEngine = 'piper';
  h.deps.voiceMaker = {
    async make() {
      throw new Error('Kokoro is never asked on a Piper Worker');
    },
  };
  h.deps.piperMaker = {
    async make(text, voice) {
      made.push({ text, voice });
      return { audio: bytes(`${text}@${voice}`), timing };
    },
  };
});

describe('POST /api/voice with Piper', () => {
  it('needs a session and the app itself', async () => {
    expect((await ask({ text: 'Start at eight.' }, { cookie: null })).status).toBe(401);
    expect((await ask({ text: 'Start at eight.' }, { origin: 'https://evil.example' })).status).toBe(403);
    expect(made).toEqual([]);
  });

  it('makes a sentence in the friend\'s voice, keeps the MP3 with its timing beside it, and sends the timing', async () => {
    const reply = await ask({ text: 'Start at eight.', who: 'pip' });
    expect(reply.status).toBe(200);
    expect(reply.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(reply.headers.get('X-Voice')).toBe('made');
    expect(reply.headers.get('X-Timing')).toBe(TIMING);
    expect(await decode(reply)).toBe('mp3:Start at eight.@ryan');
    expect(made).toEqual([{ text: 'Start at eight.', voice: 'ryan' }]);
    await h.flush();
    const key = await piperKey('Start at eight.', 'pip');
    expect(key).toMatch(/^piper-ryan-1\.6\/[0-9a-f]{64}\.mp3$/);
    expect(h.voice.keys()).toEqual([timingKey(key), key].sort());
    expect(timingKey(key)).toMatch(/^piper-ryan-1\.6\/[0-9a-f]{64}\.json$/);
    expect(h.voice.typeOf(key)).toBe('audio/mpeg');
    expect(h.voice.typeOf(timingKey(key))).toBe('application/json');
    expect(await h.voice.getJson(timingKey(key))).toBe(TIMING);
  });

  it('serves a kept sentence with its timing, even when the voice machine is gone', async () => {
    await ask({ text: '  Count   on three more. ' });
    h.deps.piperMaker = null;
    const reply = await ask({ text: 'Count on three more.' });
    expect(reply.status).toBe(200);
    expect(reply.headers.get('X-Voice')).toBe('saved');
    expect(reply.headers.get('X-Timing')).toBe(TIMING);
    expect(await decode(reply)).toBe('mp3:Count on three more.@amy');
    expect(made).toHaveLength(1);
  });

  it('each friend has its own voice and folder: Sprout Amy, Pip Ryan, Olive Kristin, Finn Joe', async () => {
    expect(PIPER_VOICE).toEqual({ sprout: 'amy', pip: 'ryan', olive: 'kristin', finn: 'joe' });
    const who: Who[] = ['sprout', 'pip', 'olive', 'finn'];
    for (const each of who) await ask({ text: 'Well done.', who: each });
    expect(made.map((each) => each.voice)).toEqual(['amy', 'ryan', 'kristin', 'joe']);
    // A line with no speaker named is Sprout's.
    expect(await piperKey('Well done.')).toBe(await piperKey('Well done.', 'sprout'));
    const folders = (await Promise.all(who.map((each) => piperKey('Well done.', each)))).map((key) => key.split('/')[0]);
    expect(folders).toEqual(['piper-amy-1.6', 'piper-ryan-1.6', 'piper-kristin-1.6', 'piper-joe-1.6']);
    expect((await ask({ text: 'Well done.', who: 'nobody' })).status).toBe(400);
  });

  it('both paces are the one slow pace: one folder, made once, and the machine is never sent a speed', async () => {
    const lesson = await ask({ text: 'Count the dots.', pace: 'lesson', who: 'olive' });
    expect(lesson.headers.get('X-Voice')).toBe('made');
    const normal = await ask({ text: 'Count the dots.', who: 'olive' });
    expect(normal.headers.get('X-Voice')).toBe('saved');
    expect(made).toEqual([{ text: 'Count the dots.', voice: 'kristin' }]);
    expect((await ask({ text: 'Count the dots.', pace: 'fast' })).status).toBe(400);
  });

  it('a sentence with no timing is still served and kept, with no timing file', async () => {
    timing = null;
    const reply = await ask({ text: 'Tap the cat.' });
    expect(reply.status).toBe(200);
    expect(reply.headers.has('X-Timing')).toBe(false);
    await h.flush();
    expect(h.voice.keys()).toEqual([await piperKey('Tap the cat.')]);
    const again = await ask({ text: 'Tap the cat.' });
    expect(again.headers.get('X-Voice')).toBe('saved');
    expect(again.headers.has('X-Timing')).toBe(false);
  });

  it('a timing that is not a timing is dropped, and the audio still served', async () => {
    for (const [i, bad] of ['nonsense', '{"d":1}', '{"d":1,"v":[[0,"grin"]]}', '{"d":1,"v":[[0.5,"small"],[0.2,"wide"]]}', '{"d":-1,"v":[]}', `{"d":1,"v":[${'[0,"small"],'.repeat(2000)}[0,"small"]]}`].entries()) {
      timing = bad;
      const reply = await ask({ text: `Sentence number ${i}.` });
      expect(reply.status, bad.slice(0, 40)).toBe(200);
      expect(reply.headers.has('X-Timing'), bad.slice(0, 40)).toBe(false);
    }
    await h.flush();
    expect(h.voice.keys().some((key) => key.endsWith('.json'))).toBe(false);
  });

  it('a timing file that cannot be read or saved never fails the audio', async () => {
    const store = h.voice;
    h.deps.voice = {
      ...store,
      getJson: async () => {
        throw new Error('R2 is not answering');
      },
      putJson: async () => {
        throw new Error('R2 is not answering');
      },
    };
    const first = await ask({ text: 'Find the red one.' });
    expect(first.status).toBe(200);
    expect(first.headers.get('X-Timing')).toBe(TIMING);
    await h.flush();
    // The MP3 is kept although its timing could not be.
    expect(store.keys()).toEqual([await piperKey('Find the red one.')]);
    const again = await ask({ text: 'Find the red one.' });
    expect(again.status).toBe(200);
    expect(again.headers.get('X-Voice')).toBe('saved');
    expect(again.headers.has('X-Timing')).toBe(false);
  });

  it('a kept timing file that is damaged is not sent', async () => {
    const key = await piperKey('Look again.');
    await h.voice.put(key, bytes('kept'));
    await h.voice.putJson(timingKey(key), '{"d":1,"v":[[0,"small"]\nX-Evil: 1');
    const reply = await ask({ text: 'Look again.' });
    expect(reply.status).toBe(200);
    expect(reply.headers.get('X-Voice')).toBe('saved');
    expect(reply.headers.has('X-Timing')).toBe(false);
    expect(reply.headers.has('X-Evil')).toBe(false);
  });

  it('never serves a Kokoro recording for a Piper sentence', async () => {
    await h.voice.put(await voiceKey('Start at nine.'), bytes('kokoro'));
    const reply = await ask({ text: 'Start at nine.' });
    expect(reply.headers.get('X-Voice')).toBe('made');
    expect(await decode(reply)).toBe('mp3:Start at nine.@amy');
  });

  it('refuses what Kokoro refuses, says 503 with no voice machine and 502 when it does not answer, and keeps nothing', async () => {
    for (const bad of ['', '   ', 42, null, 'x'.repeat(301), '<script>', 'ten % off']) expect((await ask({ text: bad })).status, JSON.stringify(bad)).toBe(400);
    expect((await h.call('POST', '/api/voice', undefined, { cookie, rawBody: 'not json' })).status).toBe(400);
    h.deps.piperMaker = null;
    expect((await ask({ text: 'Start at eight.' })).status).toBe(503);
    h.deps.piperMaker = { make: async () => null };
    expect((await ask({ text: 'Start at eight.' })).status).toBe(502);
    await h.flush();
    expect(made).toEqual([]);
    expect(h.voice.keys()).toEqual([]);
  });
});

describe('the Kokoro Worker (VOICE_ENGINE kokoro)', () => {
  it('never asks Piper and never serves a Piper recording', async () => {
    h.deps.voiceEngine = 'kokoro';
    const kokoro: string[] = [];
    h.deps.voiceMaker = {
      async make(text) {
        kokoro.push(text);
        return bytes(`${text}@kokoro`);
      },
    };
    await h.voice.put(await piperKey('Start at nine.'), bytes('piper'));
    const reply = await ask({ text: 'Start at nine.' });
    expect(reply.headers.get('X-Voice')).toBe('made');
    expect(reply.headers.has('X-Timing')).toBe(false);
    expect(await decode(reply)).toBe('mp3:Start at nine.@kokoro');
    expect(kokoro).toEqual(['Start at nine.']);
    expect(made).toEqual([]);
  });
});

describe('cleanTiming', () => {
  it('keeps a timing, written out again compactly', () => {
    expect(cleanTiming(TIMING)).toBe(TIMING);
    expect(cleanTiming(' { "d" : 2, "v" : [ [ 0, "closed" ], [ 0.5, "round" ] ] } ')).toBe('{"d":2,"v":[[0,"closed"],[0.5,"round"]]}');
    expect(cleanTiming('{"d":0.4,"v":[]}')).toBe('{"d":0.4,"v":[]}');
    // Two shapes may start at the same moment; the later one is meant.
    expect(cleanTiming('{"d":1,"v":[[0.2,"small"],[0.2,"wide"]]}')).toBe('{"d":1,"v":[[0.2,"small"],[0.2,"wide"]]}');
  });

  it('refuses anything else', () => {
    const bad: (string | null | undefined)[] = [
      null,
      undefined,
      '',
      'null',
      '[]',
      '"d"',
      '{"v":[]}',
      '{"d":"1","v":[]}',
      '{"d":1,"v":{}}',
      '{"d":1,"v":[[0]]}',
      '{"d":1,"v":[[0,"small",1]]}',
      '{"d":1,"v":[["0","small"]]}',
      '{"d":1,"v":[[-0.1,"small"]]}',
      '{"d":1,"v":[[0,"smile"]]}',
      '{"d":1,"v":[[0.3,"small"],[0.1,"wide"]]}',
      '{"d":1,"v":[[0,"small"]]',
      `{"d":1,"v":[${'[0,"small"],'.repeat(1500)}[0,"small"]]}`,
    ];
    for (const each of bad) expect(cleanTiming(each), String(each).slice(0, 40)).toBeNull();
  });
});

describe('the link to the Piper voice machine', () => {
  it('sends the text and the voice with the key, and no speed; gives back the audio and its timing', async () => {
    const seen: { url: string; key: string | null; body: string }[] = [];
    const maker = remotePiperMaker('https://piper.test/', 'the-key', async (input, init) => {
      seen.push({ url: String(input), key: new Headers(init?.headers).get('X-Voice-Key'), body: String(init?.body) });
      return new Response(bytes('hi'), { headers: { 'Content-Type': 'audio/mpeg', 'X-Timing': TIMING } });
    });
    const result = await maker.make('hi', 'ryan');
    expect(new TextDecoder().decode(result?.audio ?? new ArrayBuffer(0))).toBe('mp3:hi');
    expect(result?.timing).toBe(TIMING);
    expect(seen).toEqual([{ url: 'https://piper.test/tts', key: 'the-key', body: '{"text":"hi","voice":"ryan"}' }]);
  });

  it('gives no timing when the machine sends none', async () => {
    const maker = remotePiperMaker('https://piper.test', 'k', async () => new Response(bytes('hi'), { headers: { 'Content-Type': 'audio/mpeg' } }));
    expect((await maker.make('hi', 'amy'))?.timing).toBeNull();
  });

  it('gives null for a refusal, a page that is not audio, an empty reply or a failure', async () => {
    const replies: (() => Promise<Response>)[] = [
      async () => new Response('{}', { status: 400 }),
      async () => new Response('{}', { status: 403 }),
      async () => new Response('{}', { status: 500 }),
      async () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }),
      async () => new Response(new ArrayBuffer(0), { headers: { 'Content-Type': 'audio/mpeg' } }),
      async () => {
        throw new Error('offline');
      },
    ];
    for (const reply of replies) expect(await remotePiperMaker('https://piper.test', 'k', reply).make('hi', 'joe')).toBeNull();
  });
});

describe('the R2 voice store', () => {
  it('keeps an MP3 as audio and a timing file as JSON', async () => {
    const objects = new Map<string, { body: unknown; type: string | undefined }>();
    const bucket = {
      async put(key: string, body: unknown, options?: { httpMetadata?: { contentType?: string } }) {
        objects.set(key, { body, type: options?.httpMetadata?.contentType });
        return {};
      },
      async get(key: string) {
        const found = objects.get(key);
        if (!found) return null;
        return {
          text: async () => String(found.body),
          arrayBuffer: async () => found.body,
        };
      },
    } as unknown as R2Bucket;
    const store = r2VoiceStore(bucket);
    await store.put('piper-amy-1.6/abc.mp3', bytes('x'));
    await store.putJson('piper-amy-1.6/abc.json', TIMING);
    expect(objects.get('piper-amy-1.6/abc.mp3')?.type).toBe('audio/mpeg');
    expect(objects.get('piper-amy-1.6/abc.json')).toEqual({ body: TIMING, type: 'application/json' });
    expect(await store.getJson('piper-amy-1.6/abc.json')).toBe(TIMING);
    expect(await store.getJson('piper-amy-1.6/none.json')).toBeNull();
    expect(await store.get('piper-amy-1.6/none.mp3')).toBeNull();
  });
});

describe('the VOICE_ENGINE setting', () => {
  const env = (vars: Partial<Env>): Env => ({
    DB: {} as unknown as D1Database,
    MAIL: {} as unknown as SendEmail,
    BACKUPS: {} as unknown as R2Bucket,
    ASSETS: { fetch: async () => new Response('') },
    ENVIRONMENT: 'dev',
    APP_ORIGIN: 'https://sprout.test',
    AUTH_PEPPER: 'test-pepper-0123456789abcdef0123456789abcdef',
    VOICE_URL: 'https://voice.test',
    VOICE_KEY: 'the-key',
    ...vars,
  });
  const ctx = { waitUntil: () => undefined };
  afterEach(() => vi.unstubAllGlobals());

  it('is Kokoro when left out or set to anything but piper, and Kokoro talks to VOICE_URL', () => {
    for (const setting of [undefined, 'kokoro', 'Piper', 'piper ', '']) {
      const deps = buildDeps(env({ VOICE_ENGINE: setting }), ctx);
      expect(deps?.voiceEngine, String(setting)).toBe('kokoro');
      expect(deps?.voiceMaker, String(setting)).not.toBeNull();
      expect(deps?.piperMaker, String(setting)).toBeNull();
    }
  });

  it('piper sends new sentences to the Piper machine at VOICE_URL, with the key', async () => {
    const seen: { url: string; key: string | null }[] = [];
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
      seen.push({ url: String(input), key: new Headers(init?.headers).get('X-Voice-Key') });
      return new Response(bytes('hi'), { headers: { 'Content-Type': 'audio/mpeg' } });
    });
    const deps = buildDeps(env({ VOICE_ENGINE: 'piper', VOICE_URL: 'https://sprout-piper.test' }), ctx);
    expect(deps?.voiceEngine).toBe('piper');
    expect(deps?.voiceMaker).toBeNull();
    expect(await deps?.piperMaker?.make('hi', 'amy')).toMatchObject({ timing: null });
    expect(seen).toEqual([{ url: 'https://sprout-piper.test/tts', key: 'the-key' }]);
  });

  it('with no voice machine set up, neither engine has a maker', () => {
    for (const setting of ['kokoro', 'piper']) {
      const deps = buildDeps(env({ VOICE_ENGINE: setting, VOICE_URL: undefined }), ctx);
      expect(deps?.voiceMaker).toBeNull();
      expect(deps?.piperMaker).toBeNull();
    }
  });
});
