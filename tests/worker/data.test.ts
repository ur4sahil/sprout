import { beforeEach, describe, expect, it } from 'vitest';
import { DATA_STORES, MAX_CHANGES, MAX_KEY_LENGTH, MAX_VALUE_BYTES, PAGE_ROWS } from '../../worker/data';
import type { Harness } from './harness';
import { makeHarness } from './harness';

// The family's records on the server: the one copy of children, scores, answers and the rest.

let h: Harness;
let cookie: string;
beforeEach(async () => {
  h = makeHarness();
  cookie = await h.signUp();
});

type Page = { rows: { store: string; key: string; value: unknown }[]; next: string | null };
const save = (body: unknown, options: Parameters<Harness['call']>[3] = {}): Promise<Response> => h.call('POST', '/api/data', body, { cookie, ...options });
const load = async (after?: string): Promise<Page> => (await (await h.call('GET', `/api/data${after === undefined ? '' : `?after=${encodeURIComponent(after)}`}`, undefined, { cookie })).json()) as Page;
const child = (id: string, name = 'Robin'): { store: string; key: string; value: unknown } => ({ store: 'children', key: id, value: { id, name } });

describe('both routes need a session and the app itself', () => {
  it('give 401 without a session, and save nothing', async () => {
    expect((await h.call('GET', '/api/data')).status).toBe(401);
    expect((await save({ puts: [child('kid-1')] }, { cookie: null })).status).toBe(401);
    expect((await save({ puts: [child('kid-1')] }, { cookie: 'made-up' })).status).toBe(401);
    expect(h.data.rows()).toEqual([]);
  });

  it('refuse a save from another site, or one that is not JSON', async () => {
    expect((await save({ puts: [child('kid-1')] }, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await save({ puts: [child('kid-1')] }, { origin: null })).status).toBe(403);
    expect((await save({ puts: [child('kid-1')] }, { contentType: 'text/plain' })).status).toBe(403);
    expect(h.data.rows()).toEqual([]);
  });
});

describe('saving', () => {
  it('keeps each record as it was sent, and a second save of the same key replaces it', async () => {
    const reply = await save({ puts: [child('kid-1'), { store: 'attempts', key: 'a-1', value: { id: 'a-1', childId: 'kid-1', correct: true } }] });
    expect(reply.status).toBe(200);
    expect(await reply.json()).toEqual({ saved: 2, removed: 0 });
    expect(h.data.rows()).toEqual([
      { store: 'attempts', key: 'a-1', value: '{"id":"a-1","childId":"kid-1","correct":true}' },
      { store: 'children', key: 'kid-1', value: '{"id":"kid-1","name":"Robin"}' },
    ]);
    await save({ puts: [child('kid-1', 'Robyn')] });
    expect(h.data.rows().find((row) => row.key === 'kid-1')?.value).toBe('{"id":"kid-1","name":"Robyn"}');
    expect(h.data.rows()).toHaveLength(2);
  });

  it('removes records, in the same request as saves', async () => {
    await save({ puts: [child('kid-1'), child('kid-2')] });
    expect(await (await save({ puts: [child('kid-3')], removes: [{ store: 'children', key: 'kid-1' }] })).json()).toEqual({ saved: 1, removed: 1 });
    expect(h.data.rows().map((row) => row.key)).toEqual(['kid-2', 'kid-3']);
  });

  it('accepts every kind of family record, and no other kind', async () => {
    for (const store of DATA_STORES) expect((await save({ puts: [{ store, key: 'x', value: { id: 'x' } }] })).status, store).toBe(200);
    // Things that belong to one device are never stored here, and neither are the sign-in tables.
    for (const store of ['device', 'clips', 'users', 'sessions2', '', 'records']) expect((await save({ puts: [{ store, key: 'x', value: {} }] })).status, store).toBe(400);
    expect(h.data.rows()).toHaveLength(DATA_STORES.length);
  });

  it('refuses a record that is not an object, a missing or over-long key, and an empty request', async () => {
    for (const value of ['text', 7, null, [1, 2], undefined]) expect((await save({ puts: [{ store: 'children', key: 'kid-1', value }] })).status).toBe(400);
    expect((await save({ puts: [{ store: 'children', key: '', value: {} }] })).status).toBe(400);
    expect((await save({ puts: [{ store: 'children', key: 'k'.repeat(MAX_KEY_LENGTH + 1), value: {} }] })).status).toBe(400);
    expect((await save({ puts: [{ store: 'children', key: 'k'.repeat(MAX_KEY_LENGTH), value: {} }] })).status).toBe(200);
    expect((await save({ puts: [{ store: 'children', key: 5, value: {} }] })).status).toBe(400);
    expect((await save({ removes: [{ store: 'device', key: 'x' }] })).status).toBe(400);
    expect((await save({})).status).toBe(400);
    expect((await save({ puts: 'all of them' })).status).toBe(400);
    expect((await save(undefined, { rawBody: '{not json' })).status).toBe(400);
    expect((await save(undefined, { rawBody: '[]' })).status).toBe(400);
  });

  it('refuses too many changes or a record that is too big, and saves none of that request', async () => {
    const many = Array.from({ length: MAX_CHANGES + 1 }, (_, i) => child(`kid-${i}`));
    expect((await save({ puts: many })).status).toBe(413);
    expect((await save({ puts: many.slice(0, MAX_CHANGES) })).status).toBe(200);
    expect(h.data.rows()).toHaveLength(MAX_CHANGES);
    const before = h.data.rows().length;
    expect((await save({ puts: [child('ok'), { store: 'children', key: 'big', value: { text: 'x'.repeat(MAX_VALUE_BYTES) } }] })).status).toBe(413);
    // One bad record refuses the whole request: the good one beside it is not saved either.
    expect(h.data.rows()).toHaveLength(before);
  });

  it('says so when the database fails, and has saved nothing', async () => {
    h.data.failNext();
    expect((await save({ puts: [child('kid-1')] })).status).toBe(500);
    expect(h.data.rows()).toEqual([]);
    expect((await save({ puts: [child('kid-1')] })).status).toBe(200);
  });
});

describe('loading', () => {
  it('gives an empty list before anything is saved', async () => {
    expect(await load()).toEqual({ rows: [], next: null });
  });

  it('gives back every record with its value as it was saved', async () => {
    const tricky = { id: 'kid-1', name: 'Zoë "Z" O\'Neil', nested: { list: [1, 2, { deep: true }], nothing: null }, text: 'line\nbreak \\ and  ' };
    await save({ puts: [{ store: 'children', key: 'kid-1', value: tricky }, { store: 'family', key: 'family', value: { id: 'family', pinHash: null } }] });
    const page = await load();
    expect(page.next).toBeNull();
    expect(page.rows).toEqual([
      { store: 'children', key: 'kid-1', value: tricky },
      { store: 'family', key: 'family', value: { id: 'family', pinHash: null } },
    ]);
  });

  it('pages through more records than fit in one reply, each exactly once', async () => {
    const total = PAGE_ROWS * 2 + 7;
    for (let from = 0; from < total; from += MAX_CHANGES) {
      const puts = Array.from({ length: Math.min(MAX_CHANGES, total - from) }, (_, i) => ({ store: 'attempts', key: `a-${String(from + i).padStart(6, '0')}`, value: { n: from + i } }));
      expect((await save({ puts })).status).toBe(200);
    }
    const seen: string[] = [];
    let after: string | undefined;
    let pages = 0;
    for (;;) {
      const page = await load(after);
      pages += 1;
      seen.push(...page.rows.map((row) => row.key));
      if (page.next === null) break;
      after = page.next;
    }
    expect(pages).toBe(3);
    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);
    expect(seen).toEqual([...seen].sort());
  });

  it('refuses a cursor it did not make', async () => {
    expect((await h.call('GET', '/api/data?after=not-a-cursor', undefined, { cookie })).status).toBe(400);
    expect((await h.call('GET', `/api/data?after=${btoa('[1,2]')}`, undefined, { cookie })).status).toBe(400);
  });

  it('is never cached', async () => {
    const reply = await h.call('GET', '/api/data', undefined, { cookie });
    expect(reply.headers.get('Cache-Control')).toBe('no-store');
    expect(reply.headers.get('Content-Type')).toBe('application/json');
  });
});

describe('whose records they are', () => {
  it('every listed parent reads and writes the same family', async () => {
    await save({ puts: [child('kid-1')] });
    const second = await h.signUp('parent.two@example.com');
    const page = (await (await h.call('GET', '/api/data', undefined, { cookie: second })).json()) as Page;
    expect(page.rows.map((row) => row.key)).toEqual(['kid-1']);
  });

  it('where accounts are kept apart, one never sees or changes another\'s records', async () => {
    h.deps.familyOf = async (email) => email;
    await save({ puts: [child('kid-1')] });
    const second = await h.signUp('parent.two@example.com');
    expect(((await (await h.call('GET', '/api/data', undefined, { cookie: second })).json()) as Page).rows).toEqual([]);
    await h.call('POST', '/api/data', { puts: [child('kid-1', 'Other')], removes: [] }, { cookie: second });
    expect(h.data.rows('parent.one@example.com').map((row) => row.value)).toEqual(['{"id":"kid-1","name":"Robin"}']);
    expect(h.data.rows('parent.two@example.com').map((row) => row.value)).toEqual(['{"id":"kid-1","name":"Other"}']);
  });
});
