import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it } from 'vitest';
import { BASE_HEADER, MAX_BACKUP_BYTES, VERSION_HEADER } from '../../worker/backup';
import { BACKUP_KEY, historyKey, memoryBackupStore, r2BackupStore } from '../../worker/store';
import type { Harness } from './harness';
import { makeHarness } from './harness';

let h: Harness;
let cookie: string;
beforeEach(async () => {
  h = makeHarness();
  cookie = await h.signUp();
});

const file = (text: string): Uint8Array => new Uint8Array(gzipSync(Buffer.from(text)));
const DAY = 86_400_000;

function put(body: Uint8Array | string, base: string | null, options: Parameters<Harness['call']>[3] = {}): Promise<Response> {
  return h.call('PUT', '/api/backup', undefined, { cookie, contentType: 'application/gzip', rawBody: body, headers: base === null ? {} : { [BASE_HEADER]: base }, ...options });
}
const get = (have?: string): Promise<Response> => h.call('GET', `/api/backup${have === undefined ? '' : `?have=${encodeURIComponent(have)}`}`, undefined, { cookie });
const version = async (reply: Response): Promise<string> => ((await reply.json()) as { version: string }).version;

describe('the backup routes need a session', () => {
  it('both routes give 401 without one, and store nothing', async () => {
    expect((await h.call('GET', '/api/backup')).status).toBe(401);
    expect((await put(file('{}'), 'none', { cookie: null })).status).toBe(401);
    expect((await put(file('{}'), 'none', { cookie: 'made-up' })).status).toBe(401);
    expect(await h.backup.version()).toBeNull();
  });

  it('a session that has run out no longer reaches the backup', async () => {
    await put(file('one'), 'none');
    h.advance(31 * DAY);
    expect((await get()).status).toBe(401);
    expect((await put(file('two'), 'v1')).status).toBe(401);
    expect(h.backup.writes()).toBe(1);
  });

  it('an upload from another site, or one that is not sent as a gzip file, is refused', async () => {
    expect((await put(file('{}'), 'none', { origin: 'https://evil.example' })).status).toBe(403);
    expect((await put(file('{}'), 'none', { origin: null })).status).toBe(403);
    expect((await put(file('{}'), 'none', { contentType: 'application/json' })).status).toBe(403);
    expect((await put(file('{}'), 'none', { contentType: 'text/plain' })).status).toBe(403);
    expect(await h.backup.version()).toBeNull();
  });

  it('gzip is accepted for the backup upload only', async () => {
    const reply = await h.call('POST', '/api/auth/logout', undefined, { cookie, contentType: 'application/gzip' });
    expect(reply.status).toBe(403);
  });
});

describe('GET /api/backup', () => {
  it('says there is no file yet', async () => {
    const reply = await get();
    expect(reply.status).toBe(200);
    expect(await reply.json()).toEqual({ version: null });
  });

  it('returns the file, byte for byte, with its version, and is never cached', async () => {
    const body = file('{"children":[]}');
    const stored = await version(await put(body, 'none'));
    const reply = await get();
    expect(reply.status).toBe(200);
    expect(reply.headers.get(VERSION_HEADER)).toBe(stored);
    expect(reply.headers.get('Content-Type')).toBe('application/gzip');
    expect(reply.headers.get('Cache-Control')).toBe('no-store');
    expect(new Uint8Array(await reply.arrayBuffer())).toEqual(body);
  });

  it('answers "not changed" to a device that has the current version, and sends the file to one that does not', async () => {
    const first = await version(await put(file('one'), 'none'));
    expect(await (await get(first)).json()).toEqual({ version: first, unchanged: true });
    const second = await version(await put(file('two'), first));
    const reply = await get(first);
    expect(reply.headers.get(VERSION_HEADER)).toBe(second);
  });
});

describe('PUT /api/backup', () => {
  it('the first upload says "only if none exists", and is refused once a file is there', async () => {
    const first = await put(file('one'), 'none');
    expect(first.status).toBe(200);
    const again = await put(file('other ipad'), 'none');
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: 'version_moved', version: 'v1' });
    expect(h.backup.writes()).toBe(1);
  });

  it('an upload built on an old version is refused, and the file is left as it was', async () => {
    const v1 = await version(await put(file('one'), 'none'));
    const v2 = await version(await put(file('two'), v1));
    const stale = await put(file('built on one'), v1);
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ error: 'version_moved', version: v2 });
    expect(new Uint8Array((await h.backup.read())?.body ?? new ArrayBuffer(0))).toEqual(file('two'));
    // Built on the current version, it goes through.
    expect((await put(file('three'), v2)).status).toBe(200);
  });

  it('an upload that names a version when there is no file is refused', async () => {
    expect((await put(file('one'), 'v9')).status).toBe(409);
    expect(await h.backup.version()).toBeNull();
  });

  it('an upload that does not say what it was built on is refused', async () => {
    expect((await put(file('one'), null)).status).toBe(400);
    expect((await put(file('one'), '')).status).toBe(400);
    expect(await h.backup.version()).toBeNull();
  });

  it('something that is not a gzip file is refused, whatever it calls itself', async () => {
    for (const body of ['{"children":[]}', '', 'PK\u0003\u0004 a zip file']) {
      const reply = await put(body, 'none');
      expect(reply.status).toBe(400);
      expect(await reply.json()).toEqual({ error: 'not_gzip' });
    }
    expect((await put(new Uint8Array([0x1f, 0x8b]), 'none')).status).toBe(400);
    expect(await h.backup.version()).toBeNull();
  });

  it('a file over 25 MB is refused', async () => {
    const big = new Uint8Array(MAX_BACKUP_BYTES + 1);
    big.set([0x1f, 0x8b, 0x08]);
    const reply = await put(big, 'none');
    expect(reply.status).toBe(413);
    expect(await h.backup.version()).toBeNull();
    const fits = new Uint8Array(MAX_BACKUP_BYTES);
    fits.set([0x1f, 0x8b, 0x08]);
    expect((await put(fits, 'none')).status).toBe(200);
  });

  it('the first upload of a day keeps a history copy of the file as it was, and the second does not', async () => {
    const v1 = await version(await put(file('monday 1'), 'none'));
    expect(Object.keys(h.backup.history())).toEqual([]); // there was nothing to keep yet
    const v2 = await version(await put(file('monday 2'), v1));
    expect(Object.keys(h.backup.history())).toEqual(['2026-01-10']);
    expect(new Uint8Array(h.backup.history()['2026-01-10'] ?? new ArrayBuffer(0))).toEqual(file('monday 1'));
    const v3 = await version(await put(file('monday 3'), v2));
    expect(new Uint8Array(h.backup.history()['2026-01-10'] ?? new ArrayBuffer(0))).toEqual(file('monday 1'));

    h.advance(DAY);
    await put(file('tuesday 1'), v3);
    expect(Object.keys(h.backup.history())).toEqual(['2026-01-10', '2026-01-11']);
    expect(new Uint8Array(h.backup.history()['2026-01-11'] ?? new ArrayBuffer(0))).toEqual(file('monday 3'));
  });

  it('a refused upload makes no history copy', async () => {
    const v1 = await version(await put(file('one'), 'none'));
    await put(file('two'), v1);
    h.advance(DAY);
    expect((await put(file('stale'), v1)).status).toBe(409);
    expect((await put('not gzip', 'v2')).status).toBe(400);
    expect(Object.keys(h.backup.history())).toEqual(['2026-01-10']);
  });

  it('both parents share the one family file', async () => {
    const other = await h.signUp('parent.two@example.com');
    const v1 = await version(await put(file('from parent one'), 'none'));
    const reply = await h.call('GET', '/api/backup', undefined, { cookie: other });
    expect(reply.headers.get(VERSION_HEADER)).toBe(v1);
  });
});

describe('the backup store itself refuses a stale write', () => {
  const bytes = (text: string): ArrayBuffer => file(text).buffer as ArrayBuffer;

  it('in memory', async () => {
    const store = memoryBackupStore();
    expect(await store.write(bytes('one'), { version: 'v0' })).toBeNull();
    expect(await store.write(bytes('one'), 'none')).toBe('v1');
    expect(await store.write(bytes('two'), 'none')).toBeNull();
    expect(await store.write(bytes('two'), { version: 'v0' })).toBeNull();
    expect(await store.write(bytes('two'), { version: 'v1' })).toBe('v2');
    expect(await store.write(bytes('three'), { version: 'v1' })).toBeNull();
    expect(store.writes()).toBe(2);
  });

  it('in R2: the condition is part of the write, so two uploads at once cannot both land', async () => {
    const puts: { key: string; onlyIf: unknown }[] = [];
    const objects = new Map<string, { etag: string; body: ArrayBuffer }>();
    let n = 0;
    // A stand-in for the R2 bucket that applies the conditions the way R2 documents them.
    const bucket = {
      async head(key: string) {
        return objects.get(key) ?? null;
      },
      async get(key: string) {
        const found = objects.get(key);
        return found ? { etag: found.etag, arrayBuffer: async () => found.body } : null;
      },
      async put(key: string, body: ArrayBuffer, options: { onlyIf?: Headers | { etagMatches?: string } } = {}) {
        puts.push({ key, onlyIf: options.onlyIf });
        const current = objects.get(key);
        const onlyIf = options.onlyIf;
        if (onlyIf instanceof Headers) {
          if (onlyIf.get('If-None-Match') === '*' && current) return null;
        } else if (onlyIf?.etagMatches !== undefined && current?.etag !== onlyIf.etagMatches) return null;
        n += 1;
        const stored = { etag: `etag-${n}`, body };
        objects.set(key, stored);
        return stored;
      },
    };
    const store = r2BackupStore(bucket as unknown as Parameters<typeof r2BackupStore>[0]);
    expect(await store.version()).toBeNull();
    expect(await store.read()).toBeNull();
    expect(await store.keepHistory('2026-01-10')).toBe(false); // nothing to keep yet

    expect(await store.write(bytes('one'), 'none')).toBe('etag-1');
    expect((puts[0]?.onlyIf as Headers).get('If-None-Match')).toBe('*');
    expect(await store.write(bytes('again'), 'none')).toBeNull();

    expect(await store.write(bytes('two'), { version: 'etag-1' })).toBe('etag-2');
    expect(puts.at(-1)).toEqual({ key: BACKUP_KEY, onlyIf: { etagMatches: 'etag-1' } });
    expect(await store.write(bytes('stale'), { version: 'etag-1' })).toBeNull();
    expect(await store.version()).toBe('etag-2');
    expect(new Uint8Array((await store.read())?.body ?? new ArrayBuffer(0))).toEqual(file('two'));

    // One history copy a day, of the file as it was, under history/<day>.json.gz.
    expect(await store.keepHistory('2026-01-10')).toBe(true);
    expect(await store.keepHistory('2026-01-10')).toBe(false);
    expect([...objects.keys()].sort()).toEqual([BACKUP_KEY, historyKey('2026-01-10')]);
    expect(historyKey('2026-01-10')).toBe('history/2026-01-10.json.gz');
    expect(new Uint8Array(objects.get(historyKey('2026-01-10'))?.body ?? new ArrayBuffer(0))).toEqual(file('two'));
    // The history copy is written with no condition.
    expect(puts.at(-1)?.onlyIf).toBeUndefined();
  });
});
