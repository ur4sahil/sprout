import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceClock } from '../../src/lib/clock';
import { clearErrors, recentErrors } from '../../src/lib/errorLog';
import { setRepoForTests } from '../../src/storage/index';
import { memoryRepo } from '../../src/storage/memoryRepo';
import type { ExportFile, Repo } from '../../src/storage/repo';
import { SYNC_EVERY_MS, SYNC_MESSAGES, onSyncStatus, resetSyncForTests, syncIfDue, syncNow, syncRepo, syncStatus } from '../../src/storage/sync';
import { T, attempt, child, session, state } from './fixtures';
import type { ServerStub } from './serverStub';
import { stubServer } from './serverStub';

let stub: ServerStub;
let ipadA: Repo;
let ipadB: Repo;

beforeEach(async () => {
  stub = stubServer();
  stub.useCookie(await stub.server.signUp());
  stub.calls.length = 0;
  ipadA = memoryRepo();
  ipadB = memoryRepo();
  resetSyncForTests();
});
afterEach(() => {
  resetSyncForTests();
  expect(recentErrors()).toEqual([]);
});

const uploads = (): number => stub.calls.filter((call) => call.method === 'PUT').length;
const device = (repo: Repo) => repo.getDeviceState();

// Everything a device holds, in a fixed order, without the time of the export.
async function everything(repo: Repo): Promise<Omit<ExportFile, 'exportedAt'>> {
  const { exportedAt: _at, ...rest } = await repo.exportAll();
  void _at;
  const copy = JSON.parse(JSON.stringify(rest)) as Omit<ExportFile, 'exportedAt'>;
  copy.children.sort((x, y) => x.id.localeCompare(y.id));
  copy.skillStates.sort((x, y) => `${x.childId}${x.skillId}`.localeCompare(`${y.childId}${y.skillId}`));
  copy.attempts.sort((x, y) => x.id.localeCompare(y.id));
  copy.sessions.sort((x, y) => x.id.localeCompare(y.id));
  return copy;
}

// A child with two answers on one skill.
async function practise(repo: Repo, tag: string, day: number): Promise<void> {
  await repo.saveChild(child('a'));
  await repo.addAttempt(attempt(`${tag}-1`, 'a', 'M-K-C4', true, T(day, 1)));
  await repo.addAttempt(attempt(`${tag}-2`, 'a', 'M-K-C4', false, T(day, 2)));
  await repo.saveSession(session(`${tag}-session`, 'a', T(day)));
  await repo.saveSkillState(state('a', 'M-K-C4', { score: day * 5, bestScore: day * 5, attempts: 2, correct: 1, recent: [true, false], lastPracticedAt: T(day, 2) }));
}

// Lets a test step in just before a request reaches the server.
function before(match: (method: string) => boolean, act: (count: number) => Promise<Response | void>): void {
  const real = globalThis.fetch;
  let count = 0;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (match(init.method ?? 'GET')) {
      count += 1;
      const instead = await act(count);
      if (instead) return instead;
    }
    return real(input, init);
  });
}

describe('one device', () => {
  it('with nothing on the device and nothing on the server, nothing is uploaded', async () => {
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'upToDate', merged: false });
    expect(uploads()).toBe(0);
    expect(await stub.server.backup.version()).toBeNull();
    expect((await device(ipadA)).lastSyncAt).not.toBeNull();
  });

  it('the first upload says "only if none exists", then the device is clean and remembers the version', async () => {
    await practise(ipadA, 'a', 3);
    expect((await device(ipadA)).dirty).toBe(true);
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'uploaded', merged: false });
    expect(await device(ipadA)).toMatchObject({ dirty: false, backupVersion: 'v1' });
    expect(new Uint8Array((await stub.server.backup.read())?.body ?? new ArrayBuffer(0)).slice(0, 2)).toEqual(new Uint8Array([0x1f, 0x8b]));
  });

  it('a second run with nothing changed uploads nothing', async () => {
    await practise(ipadA, 'a', 3);
    await syncRepo(ipadA);
    const held = await everything(ipadA);
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'upToDate', merged: false });
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'upToDate', merged: false });
    expect(uploads()).toBe(1);
    expect(stub.server.backup.writes()).toBe(1);
    expect(await everything(ipadA)).toEqual(held);
  });

  it('a later change is uploaded on top of the version this device last saw', async () => {
    await practise(ipadA, 'a', 3);
    await syncRepo(ipadA);
    await ipadA.addAttempt(attempt('a-3', 'a', 'M-K-C4', true, T(4, 1)));
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'uploaded', merged: false });
    expect((await device(ipadA)).backupVersion).toBe('v2');
  });

  it('a change made while the upload is on its way is not forgotten', async () => {
    await practise(ipadA, 'a', 3);
    before((method) => method === 'PUT', async () => {
      await ipadA.addAttempt(attempt('late', 'a', 'M-K-C4', true, T(4, 1)));
    });
    expect((await syncRepo(ipadA)).outcome).toBe('uploaded');
    expect((await device(ipadA)).dirty).toBe(true);
    expect((await syncRepo(ipadA)).outcome).toBe('uploaded');
    expect((await device(ipadA)).dirty).toBe(false);
  });
});

describe('two devices', () => {
  it('a new iPad gets the children and their scores, and uploads nothing', async () => {
    await practise(ipadA, 'a', 3);
    await syncRepo(ipadA);
    expect(await syncRepo(ipadB)).toEqual({ outcome: 'upToDate', merged: true });
    expect(await everything(ipadB)).toEqual(await everything(ipadA));
    expect(await device(ipadB)).toMatchObject({ dirty: false, backupVersion: 'v1' });
    expect(uploads()).toBe(1);
  });

  it('two devices that both practised end with both sets of attempts and the same skill state', async () => {
    await practise(ipadA, 'a', 3);
    await practise(ipadB, 'b', 5); // later, on the other iPad, before either has synced
    await syncRepo(ipadA);
    expect(await syncRepo(ipadB)).toEqual({ outcome: 'uploaded', merged: true });
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'upToDate', merged: true });

    const a = await everything(ipadA);
    expect(a).toEqual(await everything(ipadB));
    expect(a.attempts.map((row) => row.id)).toEqual(['a-1', 'a-2', 'b-1', 'b-2']);
    expect(a.sessions.map((row) => row.id)).toEqual(['a-session', 'b-session']);
    // Counts come from the attempt log, the score from the device that practised last.
    expect(a.skillStates).toHaveLength(1);
    expect(a.skillStates[0]).toMatchObject({ attempts: 4, correct: 2, score: 25, bestScore: 25, lastPracticedAt: T(5, 2) });
    // Settled: another round on each uploads nothing more.
    const writes = stub.server.backup.writes();
    await syncRepo(ipadB);
    await syncRepo(ipadA);
    expect(stub.server.backup.writes()).toBe(writes);
  });

  it('a refused upload merges the other device\'s file and retries', async () => {
    await practise(ipadA, 'a', 3);
    await syncRepo(ipadA);
    await syncRepo(ipadB);
    await ipadA.addAttempt(attempt('a-3', 'a', 'M-K-C4', true, T(6, 1)));
    await ipadB.addAttempt(attempt('b-3', 'a', 'M-K-C4', true, T(6, 2)));
    // The other iPad uploads in the gap between this one's download and its upload.
    before((method) => method === 'PUT', async (count) => {
      if (count === 1) {
        vi.stubGlobal('fetch', realFetch);
        await syncRepo(ipadB);
        vi.stubGlobal('fetch', hooked);
      }
    });
    const hooked = globalThis.fetch;
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'uploaded', merged: true });
    expect((await everything(ipadA)).attempts.map((row) => row.id)).toEqual(['a-1', 'a-2', 'a-3', 'b-3']);
    expect(await device(ipadA)).toMatchObject({ dirty: false, backupVersion: 'v3' });
    vi.stubGlobal('fetch', realFetch);
    await syncRepo(ipadB);
    expect(await everything(ipadB)).toEqual(await everything(ipadA));
  });

  it('gives up after 3 rounds without losing anything, and gets through on the next run', async () => {
    await practise(ipadA, 'a', 3);
    await syncRepo(ipadA);
    await ipadA.addAttempt(attempt('a-3', 'a', 'M-K-C4', true, T(6, 1)));
    const held = await everything(ipadA);
    let n = 0;
    before((method) => method === 'PUT', async () => {
      // Another device gets in first, every time.
      n += 1;
      const current = (await stub.server.backup.version()) ?? '';
      const other = memoryRepo();
      await other.saveChild(child(`other-${n}`));
      await stub.server.backup.write(new Uint8Array(gzipSync(Buffer.from(JSON.stringify(await other.exportAll())))).buffer as ArrayBuffer, { version: current });
    });
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'gaveUp', merged: true });
    expect(uploads()).toBe(1 + 3);
    expect((await device(ipadA)).dirty).toBe(true);
    const now = await everything(ipadA);
    expect(now.attempts).toEqual(held.attempts);
    expect(now.skillStates).toEqual(held.skillStates);
    expect(now.children.map((row) => row.id)).toEqual(['a', 'other-1', 'other-2']);

    vi.stubGlobal('fetch', realFetch);
    expect((await syncRepo(ipadA)).outcome).toBe('uploaded');
    expect((await device(ipadA)).dirty).toBe(false);
  });

  it('a reset on one device removes the child\'s old rows on the other', async () => {
    await practise(ipadA, 'a', 3);
    await syncRepo(ipadA);
    await syncRepo(ipadB);
    expect((await everything(ipadB)).attempts).toHaveLength(2);
    advanceClock(100 * 86_400_000); // the practice above is dated in March. The reset comes after it
    await ipadA.resetChild('a');
    await syncRepo(ipadA);
    await syncRepo(ipadB);
    const b = await everything(ipadB);
    expect(b.attempts).toEqual([]);
    expect(b.sessions).toEqual([]);
    expect(b.skillStates).toEqual([]);
    expect(b.children.map((row) => row.id)).toEqual(['a']);
    // And the other device never sends the old rows back.
    await ipadB.addAttempt(attempt('b-new', 'a', 'M-K-C4', true, new Date(Date.parse((await ipadB.listChildren())[0]?.resetAt ?? '') + 1000).toISOString()));
    await syncRepo(ipadB);
    await syncRepo(ipadA);
    expect((await everything(ipadA)).attempts.map((row) => row.id)).toEqual(['b-new']);
  });
});

let realFetch: typeof fetch;
beforeEach(() => {
  realFetch = globalThis.fetch;
});

describe('when a run fails', () => {
  async function ready(): Promise<Omit<ExportFile, 'exportedAt'>> {
    await practise(ipadA, 'a', 3);
    await syncRepo(ipadA);
    await ipadA.addAttempt(attempt('a-3', 'a', 'M-K-C4', true, T(6, 1)));
    return everything(ipadA);
  }

  it('a server error on upload leaves the device as it was, still waiting to upload', async () => {
    const held = await ready();
    const was = await device(ipadA);
    before((method) => method === 'PUT', async () => new Response('{"error":"server"}', { status: 500 }));
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'failed', merged: false });
    expect(await everything(ipadA)).toEqual(held);
    expect(await device(ipadA)).toEqual(was);
    vi.stubGlobal('fetch', realFetch);
    expect((await syncRepo(ipadA)).outcome).toBe('uploaded');
  });

  it('with no network nothing changes', async () => {
    const held = await ready();
    const was = await device(ipadA);
    stub.goOffline();
    expect(await syncRepo(ipadA)).toEqual({ outcome: 'offline', merged: false });
    expect(await everything(ipadA)).toEqual(held);
    expect(await device(ipadA)).toEqual(was);
  });

  it('the network dropping in the middle of the upload changes nothing', async () => {
    const held = await ready();
    const was = await device(ipadA);
    before((method) => method === 'PUT', async () => {
      throw new TypeError('Load failed');
    });
    expect((await syncRepo(ipadA)).outcome).toBe('offline');
    expect(await everything(ipadA)).toEqual(held);
    expect(await device(ipadA)).toEqual(was);
  });

  it('a session that has ended is reported, and nothing changes', async () => {
    const held = await ready();
    stub.useCookie(null);
    expect((await syncRepo(ipadA)).outcome).toBe('signedOut');
    expect(await everything(ipadA)).toEqual(held);
    expect((await device(ipadA)).dirty).toBe(true);
  });

  it('a corrupt file from the server is refused, never merged, and never overwritten from here', async () => {
    const gz = (text: string): ArrayBuffer => new Uint8Array(gzipSync(Buffer.from(text))).buffer as ArrayBuffer;
    const good = JSON.stringify(await (async () => {
      const other = memoryRepo();
      await other.saveChild(child('z'));
      return other.exportAll();
    })());
    const bad: ArrayBuffer[] = [
      gz('this is not json'),
      gz('{"format":"something-else","version":1}'),
      gz(good.replace('"grade":"K"', '"grade":"12"')),
      gz(good.replace('"version":1', '"version":99')),
      new Uint8Array([0x1f, 0x8b, 0x08, 1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer as ArrayBuffer, // a broken gzip stream
    ];
    await practise(ipadA, 'a', 3);
    const held = await everything(ipadA);
    for (const body of bad) {
      const fresh = memoryRepo();
      await practise(fresh, 'a', 3);
      const store = stub.server.backup;
      const current = await store.version();
      await store.write(body, current === null ? 'none' : { version: current });
      const writes = store.writes();
      expect(await syncRepo(fresh), `file ${bad.indexOf(body)}`).toEqual({ outcome: 'badFile', merged: false });
      expect(await everything(fresh)).toEqual(held);
      expect(await device(fresh)).toMatchObject({ dirty: true, backupVersion: null });
      expect(store.writes()).toBe(writes);
    }
    expect(SYNC_MESSAGES.badFile).toContain('could not be read');
  });
});

describe('the app\'s sync', () => {
  beforeEach(() => setRepoForTests(ipadA));

  it('runs one at a time: a second call joins the first', async () => {
    await practise(ipadA, 'a', 3);
    const seen: boolean[] = [];
    onSyncStatus((status) => seen.push(status.running));
    const [one, two] = await Promise.all([syncNow(), syncNow()]);
    expect(one).toEqual({ outcome: 'uploaded', merged: false });
    expect(two).toBe(one);
    expect(uploads()).toBe(1);
    expect(seen).toEqual([true, false]);
    expect(syncStatus()).toEqual({ running: false, last: 'uploaded' });
  });

  it('runs at most once every 5 minutes unless asked to run now', async () => {
    const gets = (): number => stub.calls.filter((call) => call.method === 'GET').length;
    syncIfDue();
    await vi.waitFor(() => expect(syncStatus().last).toBe('upToDate'));
    expect(gets()).toBe(1);
    syncIfDue();
    advanceClock(SYNC_EVERY_MS - 1);
    syncIfDue();
    await Promise.resolve();
    expect(gets()).toBe(1);
    advanceClock(1);
    syncIfDue();
    await vi.waitFor(() => expect(gets()).toBe(2));
    await syncNow();
    expect(gets()).toBe(3);
  });

  it('an unexpected error is logged and reported as a failure, not thrown', async () => {
    setRepoForTests({ ...ipadA, getDeviceState: async () => Promise.reject(new Error('storage is gone')) });
    expect(await syncNow()).toEqual({ outcome: 'failed', merged: false });
    expect(recentErrors().length).toBe(1);
    clearErrors();
  });
});
