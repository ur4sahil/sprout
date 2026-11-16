// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { memoryBackend } from '../../src/storage/backend';
import { DB_VERSION, idbBackend, idbRepo, openSproutDb } from '../../src/storage/idbRepo';
import { memoryRepo } from '../../src/storage/memoryRepo';
import { trackedBackend } from '../../src/storage/online';
import { T, attempt, child, state } from './fixtures';
import { repoContract } from './repo.contract';

let counter = 0;
const freshName = (): string => `sprout-test-${(counter += 1)}`;

repoContract('memory', async () => memoryBackend());
repoContract('IndexedDB', async () => idbBackend(await openSproutDb(freshName())));
// As the app uses it: the device's store with every family change noted for sending.
repoContract('tracked', async () => trackedBackend(memoryBackend()));

describe('memoryRepo', () => {
  it('each one starts empty and keeps to itself', async () => {
    const one = memoryRepo();
    const two = memoryRepo();
    await one.saveChild(child('a'));
    expect((await one.listChildren()).length).toBe(1);
    expect(await two.listChildren()).toEqual([]);
  });

  it('hands back copies, so changing a result cannot change what is saved', async () => {
    const repo = memoryRepo();
    await repo.saveSkillState(state('a', 'S', { recent: [true] }));
    const [first] = await repo.getSkillStates('a');
    first?.recent.push(false);
    expect((await repo.getSkillStates('a'))[0]?.recent).toEqual([true]);
  });
});

describe('idbRepo', () => {
  it('keeps data across closing and opening the database again', async () => {
    const name = freshName();
    const first = await idbRepo(name);
    await first.saveChild(child('a'));
    await first.addAttempt(attempt('att-1', 'a', 'M-K-C4', true, T(3)));
    const again = await idbRepo(name);
    expect((await again.listChildren()).map((c) => c.id)).toEqual(['a']);
    expect((await again.listAttempts('a', {})).map((a) => a.id)).toEqual(['att-1']);
  });

  it('has one object store for each record type plus quarantine, and the three attempt indexes', async () => {
    const db = await openSproutDb(freshName());
    expect([...db.objectStoreNames].sort()).toEqual(
      ['attempts', 'awards', 'children', 'clips', 'device', 'diagnosticProgress', 'diagnostics', 'family', 'flags', 'outbox', 'plans', 'quarantine', 'sessions', 'skillStates'],
    );
    const tx = db.transaction('attempts');
    expect([...tx.store.indexNames].sort()).toEqual(['childCreated', 'childId', 'childSkill']);
    await tx.done;
    expect(db.version).toBe(DB_VERSION);
    db.close();
  });

  it('a write that fails part-way saves none of it', async () => {
    const db = await openSproutDb(freshName());
    const backend = idbBackend(db);
    await expect(
      backend.write({
        puts: [
          { store: 'children', key: 'a', value: child('a') },
          // A function cannot be stored, so this put fails and the whole write must roll back.
          { store: 'children', key: 'b', value: { bad: () => 1 } },
        ],
      }),
    ).rejects.toThrow();
    expect(await backend.all('children')).toEqual([]);
  });

  it('a version 1 database made without this code opens with the newest code', async () => {
    // Built with the plain browser API, exactly as version 1 laid it out.
    const name = freshName();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of ['children', 'skillStates', 'attempts', 'sessions', 'awards', 'plans', 'diagnostics', 'flags', 'diagnosticProgress', 'clips', 'family', 'device', 'quarantine']) {
          const made = db.createObjectStore(store);
          if (['skillStates', 'attempts', 'sessions', 'awards', 'diagnostics', 'flags', 'diagnosticProgress'].includes(store)) made.createIndex('childId', 'childId');
          if (store === 'attempts') {
            made.createIndex('childSkill', ['childId', 'skillId']);
            made.createIndex('childCreated', ['childId', 'createdAt']);
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['children', 'skillStates', 'attempts', 'device'], 'readwrite');
        tx.objectStore('children').put(child('v1-kid'), 'v1-kid');
        tx.objectStore('skillStates').put(state('v1-kid', 'M-K-C4', { score: 52, bestScore: 52 }), 'v1-kid|M-K-C4');
        tx.objectStore('attempts').put(attempt('v1-att', 'v1-kid', 'M-K-C4', true, T(3)), 'v1-att');
        tx.objectStore('device').put({ id: 'device', muted: true }, 'device');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const repo = await idbRepo(name);
    expect((await repo.listChildren()).map((c) => c.id)).toEqual(['v1-kid']);
    expect((await repo.getSkillStates('v1-kid')).map((s) => s.score)).toEqual([52]);
    expect((await repo.listAttempts('v1-kid', { skillId: 'M-K-C4' })).map((a) => a.id)).toEqual(['v1-att']);
    expect(await repo.getDeviceState()).toMatchObject({ muted: true, dirty: false, catalogueVersion: 0 });
    expect(await repo.countQuarantined()).toBe(0);
    // And it can be written to.
    await repo.addAttempt(attempt('new', 'v1-kid', 'M-K-C4', false, T(4)));
    expect((await repo.listAttempts('v1-kid', {})).map((a) => a.id)).toEqual(['v1-att', 'new']);
  });
});
