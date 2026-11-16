// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { memoryBackend } from '../../src/storage/backend';
import type { FakeDataApi, TrackedBackend } from '../../src/storage/online';
import { fakeDataApi, MAX_CHANGES, trackedBackend } from '../../src/storage/online';
import type { Repo } from '../../src/storage/repo';
import { makeRepo } from '../../src/storage/repoCore';
import type { Syncer } from '../../src/storage/sync';
import { makeSyncer } from '../../src/storage/sync';
import { clearErrors, recentErrors } from '../../src/lib/errorLog';
import { T, attempt, child, session, state } from './fixtures';

// The server holds the main copy of the family's records. Each device keeps its own copy, notes
// every change in its outbox, and sends it at once or when the internet is back.

interface Device {
  repo: Repo;
  backend: TrackedBackend;
  sync: Syncer;
}
let api: FakeDataApi;
function device(): Device {
  const backend = trackedBackend(memoryBackend());
  const repo = makeRepo(backend);
  return { repo, backend, sync: makeSyncer(repo, backend, api) };
}
const onServer = (store: string): string[] => api.rows().filter((row) => row.store === store).map((row) => row.key).sort();
const valueOnServer = (store: string, key: string): unknown => api.rows().find((row) => row.store === store && row.key === key)?.value;

beforeEach(() => {
  api = fakeDataApi();
  clearErrors();
});

describe('one device', () => {
  it('saves on the device at once, and a run sends it to the server', async () => {
    const a = device();
    await a.repo.saveChild(child('a'));
    await a.repo.saveAnswer({ attempt: attempt('att-1', 'a', 'M-K-C4', true, T(3)), states: [state('a', 'M-K-C4', { score: 10 })], session: session('s-1', 'a', T(3)) });
    expect(await a.repo.listAttempts('a', {})).toHaveLength(1);
    expect(api.rows()).toEqual([]);
    expect(await a.sync.waiting()).toBe(4);
    expect(await a.sync.run()).toMatchObject({ outcome: 'done', sent: 4 });
    expect(onServer('children')).toEqual(['a']);
    expect(onServer('attempts')).toEqual(['att-1']);
    expect(onServer('skillStates')).toEqual(['a|M-K-C4']);
    expect(await a.sync.waiting()).toBe(0);
  });

  it("never sends what belongs to the device: its settings, its sign-in, its voice clips", async () => {
    const a = device();
    await a.repo.updateDeviceState({ muted: true, signedInEmail: 'parent.one@example.com' });
    await a.repo.saveClip({ key: 'letter:a', packVersion: 'v1', mimeType: 'audio/mp4', bytes: new Uint8Array([1]).buffer as ArrayBuffer });
    await a.sync.run();
    expect(api.rows()).toEqual([]);
    expect(await a.sync.waiting()).toBe(0);
  });

  it('with no internet everything still works, and it all goes up when the internet is back', async () => {
    const a = device();
    api.offline = true;
    await a.repo.saveChild(child('a'));
    for (let i = 0; i < 5; i += 1) await a.repo.addAttempt(attempt(`att-${i}`, 'a', 'M-K-C4', true, T(3, i)));
    expect(await a.sync.run()).toMatchObject({ outcome: 'offline', sent: 0 });
    expect(await a.sync.send()).toMatchObject({ outcome: 'offline' });
    // Nothing is lost while it waits.
    expect(await a.repo.listAttempts('a', {})).toHaveLength(5);
    expect(await a.sync.waiting()).toBe(6);
    api.offline = false;
    expect(await a.sync.run()).toMatchObject({ outcome: 'done', sent: 6 });
    expect(onServer('attempts')).toHaveLength(5);
  });

  it('a record changed twice before sending goes up once, as it is now', async () => {
    const a = device();
    await a.repo.saveChild(child('a', { name: 'First' }));
    await a.repo.saveChild(child('a', { name: 'Second', updatedAt: T(2) }));
    expect(await a.sync.waiting()).toBe(1);
    await a.sync.run();
    expect(valueOnServer('children', 'a')).toMatchObject({ name: 'Second' });
    expect(api.saves).toBe(1);
  });

  it('a record changed while it is being sent is not forgotten: it goes up again', async () => {
    const a = device();
    await a.repo.saveChild(child('a', { name: 'First' }));
    const realSave = api.save.bind(api);
    let once = true;
    api.save = async (changes) => {
      await realSave(changes);
      if (once) {
        once = false;
        // The child is renamed just as the first copy lands.
        await a.repo.saveChild(child('a', { name: 'Second', updatedAt: T(2) }));
      }
    };
    await a.sync.run();
    expect(valueOnServer('children', 'a')).toMatchObject({ name: 'Second' });
    expect(await a.sync.waiting()).toBe(0);
  });

  it('a reset removes that child\'s rows on the server too', async () => {
    const a = device();
    await a.repo.saveChild(child('a'));
    await a.repo.addAttempt(attempt('att-1', 'a', 'M-K-C4', true, T(3)));
    await a.repo.saveSkillState(state('a', 'M-K-C4', { score: 30 }));
    await a.sync.run();
    await a.repo.resetChild('a');
    await a.sync.run();
    expect(onServer('attempts')).toEqual([]);
    expect(onServer('skillStates')).toEqual([]);
    expect(onServer('children')).toEqual(['a']);
  });

  it('a very large change goes up in several requests', async () => {
    const a = device();
    await a.repo.saveChild(child('a'));
    const total = MAX_CHANGES * 2 + 30;
    for (let i = 0; i < total; i += 1) await a.repo.addAttempt(attempt(`att-${String(i).padStart(4, '0')}`, 'a', 'M-K-C4', true, T(3, i % 60)));
    expect((await a.sync.run()).sent).toBe(total + 1);
    expect(onServer('attempts')).toHaveLength(total);
    expect(api.saves).toBe(3);
  });
});

describe('two devices', () => {
  it('a child added on one appears on the other at its next run', async () => {
    const [a, b] = [device(), device()];
    await a.repo.saveChild(child('a', { name: 'Preana' }));
    await a.sync.run();
    expect(await b.repo.listChildren()).toEqual([]);
    expect(await b.sync.run()).toMatchObject({ outcome: 'done', changed: true });
    expect((await b.repo.listChildren()).map((each) => each.name)).toEqual(['Preana']);
    await b.repo.saveChild(child('b', { name: 'Jaivik' }));
    await b.sync.run();
    await a.sync.run();
    expect((await a.repo.listChildren()).map((each) => each.name).sort()).toEqual(['Jaivik', 'Preana']);
  });

  it('what a device fetched is not sent straight back', async () => {
    const [a, b] = [device(), device()];
    await a.repo.saveChild(child('a'));
    await a.repo.addAttempt(attempt('att-1', 'a', 'M-K-C4', true, T(3)));
    await a.sync.run();
    await b.repo.updateDeviceState({ movedOnline: true }); // not its first run
    const saves = api.saves;
    expect(await b.sync.run()).toMatchObject({ changed: true, sent: 0 });
    expect(api.saves).toBe(saves);
    expect(await b.sync.waiting()).toBe(0);
  });

  it('answers given on both while offline are all kept, and the score is recounted from them', async () => {
    const [a, b] = [device(), device()];
    await a.repo.saveChild(child('a'));
    await a.sync.run();
    await b.sync.run();
    api.offline = true;
    await a.repo.saveAnswer({ attempt: attempt('att-a1', 'a', 'M-K-C4', true, T(3, 1)), states: [state('a', 'M-K-C4', { score: 10, attempts: 1, correct: 1, recent: [true], updatedAt: T(3, 1) })] });
    await a.repo.saveAnswer({ attempt: attempt('att-a2', 'a', 'M-K-C4', true, T(3, 2)), states: [state('a', 'M-K-C4', { score: 20, attempts: 2, correct: 2, recent: [true, true], updatedAt: T(3, 2) })] });
    await b.repo.saveAnswer({ attempt: attempt('att-b1', 'a', 'M-K-C4', false, T(3, 3)), states: [state('a', 'M-K-C4', { score: 0, attempts: 1, correct: 0, recent: [false], updatedAt: T(3, 3) })] });
    api.offline = false;
    await a.sync.run();
    await b.sync.run();
    await a.sync.run();
    for (const each of [a, b]) {
      expect((await each.repo.listAttempts('a', {})).map((row) => row.id)).toEqual(['att-a1', 'att-a2', 'att-b1']);
      const [merged] = await each.repo.getSkillStates('a');
      expect(merged).toMatchObject({ attempts: 3, correct: 2 });
    }
    expect((await a.repo.getSkillStates('a'))[0]).toEqual((await b.repo.getSkillStates('a'))[0]);
    expect(valueOnServer('skillStates', 'a|M-K-C4')).toEqual((await a.repo.getSkillStates('a'))[0]);
  });

  it('an old copy sent late never replaces a newer one for good: both devices end the same', async () => {
    const [a, b] = [device(), device()];
    await a.repo.saveChild(child('a', { name: 'Old', updatedAt: T(1) }));
    await a.sync.run();
    await b.sync.run();
    // B renames the child. A, offline, changes something older about the same child.
    await b.repo.saveChild(child('a', { name: 'New', updatedAt: T(5) }));
    await b.sync.run();
    api.offline = true;
    await a.repo.saveChild(child('a', { name: 'Stale', updatedAt: T(2) }));
    api.offline = false;
    await a.sync.run();
    await b.sync.run();
    expect((await a.repo.listChildren())[0]?.name).toBe('New');
    expect((await b.repo.listChildren())[0]?.name).toBe('New');
    expect(valueOnServer('children', 'a')).toMatchObject({ name: 'New' });
  });

  it('a child removed on one device is gone on the other, and does not come back', async () => {
    const [a, b] = [device(), device()];
    await a.repo.saveChild(child('a'));
    await a.sync.run();
    await b.sync.run();
    await a.repo.saveChild(child('a', { deletedAt: T(4), updatedAt: T(4) }));
    await a.sync.run();
    await b.sync.run();
    await a.sync.run();
    expect(await b.repo.listChildren()).toEqual([]);
    expect(await a.repo.listChildren()).toEqual([]);
  });

  it('a reset on one device clears the other device\'s older rows for that child', async () => {
    const [a, b] = [device(), device()];
    await a.repo.saveChild(child('a'));
    await a.repo.addAttempt(attempt('att-1', 'a', 'M-K-C4', true, T(3)));
    await a.sync.run();
    await b.sync.run();
    expect(await b.repo.listAttempts('a', {})).toHaveLength(1);
    await a.repo.resetChild('a');
    await a.sync.run();
    await b.sync.run();
    expect(await b.repo.listAttempts('a', {})).toEqual([]);
  });
});

describe('a device joining for the first time', () => {
  it('sends up everything it already holds, once, joined with what is on the server', async () => {
    const [a, b] = [device(), device()];
    await a.repo.saveChild(child('b', { name: 'Jaivik' }));
    await a.sync.run();
    // B has records from before, saved with no outbox (as the old app did).
    const oldBackend = memoryBackend();
    const old = makeRepo(oldBackend);
    await old.saveChild(child('a', { name: 'Preana' }));
    await old.saveSkillState(state('a', 'M-K-C4', { score: 40 }));
    const joining = trackedBackend(oldBackend);
    const repo = makeRepo(joining);
    const sync = makeSyncer(repo, joining, api);
    expect(await sync.waiting()).toBe(0);
    expect((await sync.run()).sent).toBeGreaterThanOrEqual(2);
    expect(onServer('children')).toEqual(['a', 'b']);
    expect(valueOnServer('skillStates', 'a|M-K-C4')).toMatchObject({ score: 40 });
    expect((await repo.listChildren()).map((each) => each.name).sort()).toEqual(['Jaivik', 'Preana']);
    expect((await repo.getDeviceState()).movedOnline).toBe(true);
    // A later run sends nothing more.
    expect((await sync.run()).sent).toBe(0);
    void b;
  });

  it('with no internet it waits, and joins at the next run', async () => {
    const a = device();
    await a.repo.saveChild(child('a'));
    api.offline = true;
    expect((await a.sync.run()).outcome).toBe('offline');
    expect((await a.repo.getDeviceState()).movedOnline).toBe(false);
    api.offline = false;
    await a.sync.run();
    expect((await a.repo.getDeviceState()).movedOnline).toBe(true);
    expect(onServer('children')).toEqual(['a']);
  });
});

describe('a damaged record on the server', () => {
  it('is left out and logged, and every good record still arrives', async () => {
    const a = device();
    api.put({ store: 'children', key: 'bad', value: { id: 'bad', name: 7 } });
    api.put({ store: 'children', key: 'a', value: child('a', { name: 'Preana' }) });
    api.put({ store: 'family', key: 'family', value: 'not a record' });
    expect((await a.sync.run()).outcome).toBe('done');
    expect((await a.repo.listChildren()).map((each) => each.name)).toEqual(['Preana']);
    expect(recentErrors().some((error) => error.message.includes('children record from the server could not be read'))).toBe(true);
  });

  it('a run that is told it is signed out says so', async () => {
    const a = device();
    const { ServerError } = await import('../../src/storage/online');
    api.load = async () => {
      throw new ServerError(401);
    };
    expect((await a.sync.run()).outcome).toBe('signedOut');
  });
});

describe('two runs at once', () => {
  it('a second call joins the first: the server is asked once', async () => {
    const a = device();
    await a.repo.saveChild(child('a'));
    const [one, two] = await Promise.all([a.sync.run(), a.sync.run()]);
    expect(one).toBe(two);
    expect(api.loads).toBe(1);
  });
});
