// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import type { Harness } from './harness';
import { makeHarness } from './harness';

const PACK = JSON.stringify({ version: 'pack-1', mimeType: 'audio/mp4', clips: { 'letter:a': 'AAAA', 'number:7': 'BBBB' } });

let h: Harness;
beforeEach(() => {
  h = makeHarness();
});

describe('GET /api/voice-pack', () => {
  it('gives 401 without a session, whether or not a pack exists', async () => {
    expect((await h.call('GET', '/api/voice-pack')).status).toBe(401);
    h.pack.put(PACK, 'etag-1');
    const reply = await h.call('GET', '/api/voice-pack');
    expect(reply.status).toBe(401);
    expect(await reply.text()).not.toContain('AAAA');
  });

  it('gives 404 with a session when no pack has been uploaded', async () => {
    const cookie = await h.signUp();
    const reply = await h.call('GET', '/api/voice-pack', undefined, { cookie });
    expect(reply.status).toBe(404);
    expect(await reply.json()).toEqual({ error: 'no_pack' });
  });

  it('serves the pack to a signed-in device, with its version and no caching', async () => {
    const cookie = await h.signUp();
    h.pack.put(PACK, 'etag-1');
    const reply = await h.call('GET', '/api/voice-pack', undefined, { cookie });
    expect(reply.status).toBe(200);
    expect(reply.headers.get('X-Pack-Version')).toBe('etag-1');
    expect(reply.headers.get('Cache-Control')).toBe('no-store');
    expect(reply.headers.get('Content-Type')).toBe('application/json');
    expect(await reply.json()).toEqual(JSON.parse(PACK));
  });

  it('skips the download for a device that already has this version', async () => {
    const cookie = await h.signUp();
    h.pack.put(PACK, 'etag-1');
    const same = await h.call('GET', '/api/voice-pack?have=etag-1', undefined, { cookie });
    expect(await same.json()).toEqual({ version: 'etag-1', unchanged: true });
    const older = await h.call('GET', '/api/voice-pack?have=etag-0', undefined, { cookie });
    expect(older.headers.get('X-Pack-Version')).toBe('etag-1');
    expect(((await older.json()) as { clips: object }).clips).toBeDefined();
  });

  it('serves the new pack after one is uploaded', async () => {
    const cookie = await h.signUp();
    h.pack.put(PACK, 'etag-1');
    h.pack.put(PACK.replace('pack-1', 'pack-2'), 'etag-2');
    const reply = await h.call('GET', '/api/voice-pack?have=etag-1', undefined, { cookie });
    expect(reply.headers.get('X-Pack-Version')).toBe('etag-2');
    expect(((await reply.json()) as { version: string }).version).toBe('pack-2');
  });

  it('cannot be written through the API', async () => {
    const cookie = await h.signUp();
    for (const method of ['POST', 'PUT', 'DELETE']) {
      expect((await h.call(method, '/api/voice-pack', {}, { cookie })).status, method).toBe(404);
    }
  });
});
