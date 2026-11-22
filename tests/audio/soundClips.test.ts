import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasSoundClip, serverSoundClips, setSoundClips, soundAddress, soundClipBytes } from '../../src/audio/soundClips';
import { SOUND_KEYS } from '../../src/engine/letterSounds';

// Recorded letter sounds come from the server (GET /api/sound/<key>/<form>), are held in memory while the app is
// open, and are never kept on the device (the owner's choice, Nov 22, 2026).

let asked: string[];
let reply: (url: string) => Promise<Response>;
const audio = (url: string): Response => new Response(new TextEncoder().encode(`mp3:${url}`), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
const text = (bytes: ArrayBuffer | null): string | null => (bytes ? new TextDecoder().decode(bytes) : null);

function goOffline(): void {
  const offline = Object.create(navigator) as Navigator;
  Object.defineProperty(offline, 'onLine', { value: false });
  vi.stubGlobal('navigator', offline);
}

beforeEach(() => {
  asked = [];
  reply = async (url) => audio(url);
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    asked.push(`${url} ${init?.credentials ?? ''}`.trim());
    return reply(url);
  });
  setSoundClips(serverSoundClips());
});
afterEach(() => setSoundClips(null));

describe('where a recorded sound is', () => {
  it('is /api/sound/<key>/<form> for each of the app\'s sounds, in both forms', () => {
    expect(soundAddress('sound:b:once')).toBe('/api/sound/b/once');
    expect(soundAddress('sound:long-a:three')).toBe('/api/sound/long-a/three');
    for (const key of SOUND_KEYS) {
      expect(soundAddress(`sound:${key}:once`)).toBe(`/api/sound/${key}/once`);
      expect(soundAddress(`sound:${key}:three`)).toBe(`/api/sound/${key}/three`);
    }
  });

  it('is nowhere for anything else, and nothing is asked for it', async () => {
    for (const bad of ['sound:zz:once', 'sound:B:once', 'sound:b:twice', 'sound:b', 'letter:b:once', 'sound:b:once:again', '', 'sound::once', 'number:7']) {
      expect(soundAddress(bad), bad).toBeNull();
      expect(hasSoundClip(bad), bad).toBe(false);
      expect(await soundClipBytes(bad), bad).toBeNull();
    }
    expect(asked).toEqual([]);
  });
});

describe('recorded sounds from the server', () => {
  it('fetches a sound the first time it is wanted, then has it in memory', async () => {
    expect(hasSoundClip('sound:b:once')).toBe(true);
    expect(text(await soundClipBytes('sound:b:once'))).toBe('mp3:/api/sound/b/once');
    expect(text(await soundClipBytes('sound:b:three'))).toBe('mp3:/api/sound/b/three');
    expect(text(await soundClipBytes('sound:b:once'))).toBe('mp3:/api/sound/b/once');
    expect(asked).toEqual(['/api/sound/b/once same-origin', '/api/sound/b/three same-origin']);
  });

  it('two asks at the same moment make one fetch', async () => {
    const [one, two] = await Promise.all([soundClipBytes('sound:sh:once'), soundClipBytes('sound:sh:once')]);
    expect(text(one)).toBe('mp3:/api/sound/sh/once');
    expect(two).toBe(one);
    expect(asked).toHaveLength(1);
  });

  it('a sound the server does not have is not asked for again, so its sentences stay whole', async () => {
    reply = async () => new Response('{"error":"no_sound"}', { status: 404 });
    expect(hasSoundClip('sound:ch:once')).toBe(true);
    expect(await soundClipBytes('sound:ch:once')).toBeNull();
    expect(hasSoundClip('sound:ch:once')).toBe(false);
    expect(await soundClipBytes('sound:ch:once')).toBeNull();
    expect(asked).toHaveLength(1);
    // The other form is another recording, asked for on its own.
    expect(hasSoundClip('sound:ch:three')).toBe(true);
  });

  it('offline or a server error: nothing now, and asked for again the next time', async () => {
    reply = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await soundClipBytes('sound:m:once')).toBeNull();
    reply = async () => new Response('{}', { status: 500 });
    expect(await soundClipBytes('sound:m:once')).toBeNull();
    reply = async () => new Response('{}', { status: 401 });
    expect(await soundClipBytes('sound:m:once')).toBeNull();
    reply = async () => new Response(new ArrayBuffer(0), { status: 200 });
    expect(await soundClipBytes('sound:m:once')).toBeNull();
    expect(hasSoundClip('sound:m:once')).toBe(true);
    reply = async (url) => audio(url);
    expect(text(await soundClipBytes('sound:m:once'))).toBe('mp3:/api/sound/m/once');
    expect(asked).toHaveLength(5);
  });

  it('with the device offline, a sound not fetched yet is not counted on; one in memory still is', async () => {
    await soundClipBytes('sound:a:once');
    goOffline();
    expect(hasSoundClip('sound:a:once')).toBe(true);
    expect(hasSoundClip('sound:e:once')).toBe(false);
  });

  it('keeps nothing beyond this launch: a new source asks again', async () => {
    await soundClipBytes('sound:t:once');
    setSoundClips(serverSoundClips());
    await soundClipBytes('sound:t:once');
    expect(asked).toEqual(['/api/sound/t/once same-origin', '/api/sound/t/once same-origin']);
  });
});
