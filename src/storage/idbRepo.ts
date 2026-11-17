import type { IDBPDatabase, IDBPTransaction } from 'idb';
import { openDB } from 'idb';
import type { Backend, Row, StoreName } from './backend';
import { CHILD_STORES, STORES } from './backend';
import type { QuarantinedItem, Repo } from './repo';
import { makeRepo } from './repoCore';

// IndexedDB: database `sprout`, one object store for each record type, plus `quarantine`.

export const DB_NAME = 'sprout';
const QUARANTINE = 'quarantine';

type UpgradeTx = IDBPTransaction<unknown, string[], 'versionchange'>;

// The numbered upgrade steps. Opening an older database runs the missing steps in order.
// Step N takes the database from version N - 1 to version N. Never edit a step that has shipped: add a new one.
const UPGRADES: ((db: IDBPDatabase, tx: UpgradeTx) => void)[] = [
  // Version 1
  (db) => {
    // The stores as they were in version 1. Later steps add the rest.
    for (const name of STORES.filter((each) => each !== 'outbox' && each !== 'factStates')) {
      const store = db.createObjectStore(name);
      if (CHILD_STORES.includes(name)) store.createIndex('childId', 'childId');
      if (name === 'attempts') {
        store.createIndex('childSkill', ['childId', 'skillId']);
        store.createIndex('childCreated', ['childId', 'createdAt']);
      }
    }
    db.createObjectStore(QUARANTINE);
  },
  // Version 2: the list of records waiting to be sent to the server.
  (db) => {
    db.createObjectStore('outbox');
  },
  // Version 3: one row for each number fact a child has answered.
  (db) => {
    db.createObjectStore('factStates').createIndex('childId', 'childId');
  },
];

export const DB_VERSION = UPGRADES.length;

export async function openSproutDb(name = DB_NAME): Promise<IDBPDatabase> {
  return openDB(name, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      for (let version = oldVersion; version < DB_VERSION; version += 1) {
        (UPGRADES[version] as (db: IDBPDatabase, tx: UpgradeTx) => void)(db, tx as unknown as UpgradeTx);
      }
    },
  });
}

export function idbBackend(db: IDBPDatabase): Backend {
  async function rows(store: StoreName, index?: string, query?: IDBValidKey): Promise<Row[]> {
    const tx = db.transaction(store, 'readonly');
    const source = index ? tx.store.index(index) : tx.store;
    const out: Row[] = [];
    let cursor = await source.openCursor(query);
    while (cursor) {
      out.push({ key: String(cursor.primaryKey), value: cursor.value as unknown });
      cursor = await cursor.continue();
    }
    await tx.done;
    return out;
  }
  return {
    all: (store) => rows(store),
    byChild: (store, childId) => (CHILD_STORES.includes(store) ? rows(store, 'childId', childId) : Promise.resolve([])),
    async get(store, key) {
      return (await db.get(store, key)) as unknown;
    },
    async keys(store) {
      return (await db.getAllKeys(store)).map(String);
    },
    async write(changes) {
      const puts = changes.puts ?? [];
      const removes = changes.removes ?? [];
      const names = [...new Set([...puts.map((put) => put.store), ...removes.map((remove) => remove.store)])];
      if (names.length === 0) return;
      const tx = db.transaction(names, 'readwrite');
      try {
        // A request that fails later rejects tx.done. The catch here stops it also being reported as unhandled.
        for (const put of puts) tx.objectStore(put.store).put(put.value, put.key).catch(() => undefined);
        for (const remove of removes) tx.objectStore(remove.store).delete(remove.key).catch(() => undefined);
      } catch (error) {
        // A value that cannot be stored throws at once. Undo the writes already queued, or they would be saved alone.
        tx.abort();
        await tx.done.catch(() => undefined);
        throw error;
      }
      await tx.done; // rejects, and rolls everything back, if any write failed
    },
    async quarantine(item) {
      const id = `${item.store}|${item.key}`;
      const tx = db.transaction(QUARANTINE, 'readwrite');
      if ((await tx.store.get(id)) === undefined) await tx.store.put(item, id);
      await tx.done;
    },
    async quarantined() {
      return (await db.getAll(QUARANTINE)) as QuarantinedItem[];
    },
  };
}

export async function idbRepo(name = DB_NAME): Promise<Repo> {
  return makeRepo(idbBackend(await openSproutDb(name)));
}
