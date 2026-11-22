import { beforeEach, describe, expect, it } from 'vitest';
import { SOUND_KEYS as APP_SOUND_KEYS } from '../../src/engine/letterSounds';
import { SOUND_FORMS, SOUND_KEYS } from '../../worker/sound';
import type { Harness } from './harness';
import { makeHarness } from './harness';

// Recorded letter sounds: GET /api/sound/<key>/<form> serves sound/<key>/<form>.mp3 from the voice bucket.

let h: Harness;
let cookie: string;
let reads: string[];
const bytes = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer as ArrayBuffer;
const hear = (path: string, options: Parameters<Harness['call']>[3] = {}): Promise<Response> => h.call('GET', path, undefined, { cookie, ...options });

beforeEach(async () => {
  h = makeHarness();
  cookie = await h.signUp();
  reads = [];
  const store = h.voice;
  h.deps.voice = {
    ...store,
    get: async (key) => {
      reads.push(key);
      return store.get(key);
    },
  };
  await store.put('sound/b/once.mp3', bytes('b once'));
  await store.put('sound/b/three.mp3', bytes('b three'));
  await store.put('sound/long-a/three.mp3', bytes('long a three'));
});

describe('GET /api/sound/<key>/<form>', () => {
  it('needs a session, like every /api route', async () => {
    expect((await hear('/api/sound/b/once', { cookie: null })).status).toBe(401);
    expect((await hear('/api/sound/b/once', { cookie: 'not-a-session' })).status).toBe(401);
    expect(reads).toEqual([]);
  });

  it('gives a kept sound as audio: once inside a sentence, three times on its own', async () => {
    const once = await hear('/api/sound/b/once');
    expect(once.status).toBe(200);
    expect(once.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(once.headers.get('Cache-Control')).toBe('no-store');
    expect(new TextDecoder().decode(await once.arrayBuffer())).toBe('b once');
    expect(new TextDecoder().decode(await (await hear('/api/sound/b/three')).arrayBuffer())).toBe('b three');
    expect(new TextDecoder().decode(await (await hear('/api/sound/long-a/three')).arrayBuffer())).toBe('long a three');
    expect(reads).toEqual(['sound/b/once.mp3', 'sound/b/three.mp3', 'sound/long-a/three.mp3']);
  });

  it('says 404 for a sound that is not uploaded yet', async () => {
    const reply = await hear('/api/sound/sh/once');
    expect(reply.status).toBe(404);
    expect(await reply.json()).toEqual({ error: 'no_sound' });
    expect((await hear('/api/sound/long-a/once')).status).toBe(404);
  });

  it('refuses a key or form that is not one of the app\'s, and reads nothing for it', async () => {
    for (const path of ['/api/sound/zz/once', '/api/sound/B/once', '/api/sound/long-q/once', '/api/sound/b.mp3/once', '/api/sound/%62/once', '/api/sound/..%2Fvoice-pack/once', '/api/sound/b/twice', '/api/sound/b/ONCE', '/api/sound/b/once.mp3']) {
      expect((await hear(path)).status, path).toBe(400);
    }
    for (const path of ['/api/sound/b', '/api/sound/b/once/again', '/api/sound//once', '/api/sounds/b/once']) expect((await hear(path)).status, path).toBe(404);
    expect((await h.call('POST', '/api/sound/b/once', {}, { cookie })).status).toBe(404);
    expect(reads).toEqual([]);
  });

  it("knows exactly the app's sound keys, in two forms", () => {
    expect(SOUND_KEYS).toEqual(APP_SOUND_KEYS);
    // 53, then oo and air (Nov 22, 2026).
    expect(SOUND_KEYS).toHaveLength(55);
    expect(SOUND_KEYS).toContain('oo');
    expect(SOUND_KEYS).toContain('air');
    expect(SOUND_FORMS).toEqual(['once', 'three']);
  });
});
