import { canonicalJson } from '../engine/canonical';
import { now } from '../lib/clock';
import type { Backend, StoreName } from './backend';

// The server and the device (decided Nov 16, 2026). The server holds the main copy of the family's
// records: children, scores, answers, stickers, plans and check-in results. Each device keeps its
// own copy too, so the app opens and works with no internet. A change is saved on the device at
// once, noted in the device's outbox, and sent to the server straight away, or as soon as the
// internet is back. See sync.ts for the sending and fetching.
//
// What belongs to one device never leaves it: the sign-in, the mute switch, the voice clips.

export const DEVICE_STORES: readonly StoreName[] = ['device', 'clips', 'outbox'];
export const MAX_CHANGES = 250; // the most the server takes in one request
export const isFamilyStore = (store: StoreName): boolean => !DEVICE_STORES.includes(store);

export interface ServerRow {
  store: string;
  key: string;
  value: unknown;
}

// The server could not be reached. Nothing is lost: the device keeps the change and tries again.
export class OfflineError extends Error {
  constructor(message = 'The server could not be reached') {
    super(message);
    this.name = 'OfflineError';
  }
}

// The server answered, and said no: signed out, or a request it would not take.
export class ServerError extends Error {
  status: number;
  constructor(status: number) {
    super(`The server answered ${status}`);
    this.name = 'ServerError';
    this.status = status;
  }
}

export interface DataApi {
  load(): Promise<ServerRow[]>; // every record
  save(changes: { puts: ServerRow[]; removes: { store: string; key: string }[] }): Promise<void>;
}

async function ask(path: string, init?: RequestInit): Promise<Response> {
  let reply: Response;
  try {
    reply = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
  } catch {
    throw new OfflineError();
  }
  // A server that is down or overloaded is treated like no internet: keep the change and try again.
  if (reply.status >= 500) throw new OfflineError(`The server answered ${reply.status}`);
  if (!reply.ok) throw new ServerError(reply.status);
  return reply;
}

export function httpDataApi(): DataApi {
  return {
    async load() {
      const rows: ServerRow[] = [];
      let after: string | null = null;
      do {
        const reply = await ask(`/api/data${after === null ? '' : `?after=${encodeURIComponent(after)}`}`);
        const page = (await reply.json()) as { rows: ServerRow[]; next: string | null };
        rows.push(...page.rows);
        after = page.next;
      } while (after !== null);
      return rows;
    },
    async save(changes) {
      await ask('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
    },
  };
}

// ---- The outbox: which records this device has changed and not yet sent ----

export interface OutboxEntry {
  store: StoreName;
  key: string;
  removed: boolean;
  mark: number; // goes up with every change. An entry is cleared only if it has not changed since it was read
}

export const outboxKey = (store: string, key: string): string => `${store}\n${key}`;

export interface TrackedBackend extends Backend {
  // While records fetched from the server are being merged in, a record that ends up the same as
  // the server's copy is not noted: there is nothing to send back.
  mergingFrom(server: ReadonlyMap<string, unknown> | null): void;
  // The records waiting to be sent, oldest change first.
  waiting(): Promise<OutboxEntry[]>;
  // Clears entries that were sent, unless the record changed again while it was on its way.
  sent(entries: readonly OutboxEntry[]): Promise<void>;
  // Notes every family record on the device as waiting. Used once, when a device first joins online storage.
  noteEverything(): Promise<void>;
  // Called after a change is noted.
  onChange(listener: (() => void) | null): void;
}

export function trackedBackend(device: Backend): TrackedBackend {
  let server: ReadonlyMap<string, unknown> | null = null;
  let listener: (() => void) | null = null;
  let mark = now().getTime();
  // Writes take turns, so a note is never cleared between being read and being checked.
  let turn: Promise<unknown> = Promise.resolve();
  function inTurn<T>(work: () => Promise<T>): Promise<T> {
    const next = turn.then(work, work);
    turn = next.catch(() => undefined);
    return next;
  }
  const note = (store: StoreName, key: string, removed: boolean): { store: StoreName; key: string; value: OutboxEntry } => {
    mark += 1;
    return { store: 'outbox', key: outboxKey(store, key), value: { store, key, removed, mark } };
  };

  return {
    all: (store) => device.all(store),
    byChild: (store, childId) => device.byChild(store, childId),
    get: (store, key) => device.get(store, key),
    keys: (store) => device.keys(store),
    quarantine: (item) => device.quarantine(item),
    quarantined: () => device.quarantined(),
    mergingFrom(rows) {
      server = rows;
    },
    onChange(next) {
      listener = next;
    },
    write(changes) {
      return inTurn(async () => {
        const puts = changes.puts ?? [];
        const removes = changes.removes ?? [];
        const notes = [
          ...puts
            .filter((put) => isFamilyStore(put.store))
            // Merged in from the server and identical to its copy: nothing to send back.
            .filter((put) => !(server && server.has(outboxKey(put.store, put.key)) && canonicalJson(server.get(outboxKey(put.store, put.key))) === canonicalJson(put.value)))
            .map((put) => note(put.store, put.key, false)),
          ...removes.filter((remove) => isFamilyStore(remove.store)).map((remove) => note(remove.store, remove.key, true)),
        ];
        // The record and its note are saved together, or not at all.
        await device.write({ puts: [...puts, ...notes], removes });
        if (notes.length > 0) listener?.();
      });
    },
    async waiting() {
      return (await device.all('outbox')).map((row) => row.value as OutboxEntry).sort((one, two) => one.mark - two.mark);
    },
    sent(entries) {
      return inTurn(async () => {
        const removes: { store: StoreName; key: string }[] = [];
        for (const entry of entries) {
          const now = (await device.get('outbox', outboxKey(entry.store, entry.key))) as OutboxEntry | undefined;
          if (now && now.mark === entry.mark) removes.push({ store: 'outbox', key: outboxKey(entry.store, entry.key) });
        }
        if (removes.length > 0) await device.write({ removes });
      });
    },
    noteEverything() {
      return inTurn(async () => {
        const notes = [];
        for (const store of ['children', 'skillStates', 'attempts', 'sessions', 'awards', 'plans', 'diagnostics', 'flags', 'diagnosticProgress', 'family'] as StoreName[]) {
          for (const key of await device.keys(store)) notes.push(note(store, key, false));
        }
        if (notes.length > 0) await device.write({ puts: notes });
        if (notes.length > 0) listener?.();
      });
    },
  };
}

// A stand-in for the server, for tests: it keeps the records in memory and can be told to fail.
export interface FakeDataApi extends DataApi {
  rows(): ServerRow[];
  put(row: ServerRow): void; // as if another device had saved it
  offline: boolean; // while true, every call fails as it would with no internet
  loads: number;
  saves: number;
}

export function fakeDataApi(): FakeDataApi {
  const held = new Map<string, ServerRow>();
  const copy = <T>(value: T): T => structuredClone(value);
  const api: FakeDataApi = {
    offline: false,
    loads: 0,
    saves: 0,
    rows: () => [...held.values()].map(copy),
    put(row) {
      held.set(outboxKey(row.store, row.key), copy(row));
    },
    async load() {
      if (api.offline) throw new OfflineError();
      api.loads += 1;
      return [...held.values()].map(copy);
    },
    async save(changes) {
      if (api.offline) throw new OfflineError();
      if (changes.puts.length + changes.removes.length > MAX_CHANGES) throw new ServerError(413);
      api.saves += 1;
      // Through JSON, as on the wire: what cannot be sent cannot be saved.
      for (const put of changes.puts) held.set(outboxKey(put.store, put.key), JSON.parse(JSON.stringify(put)) as ServerRow);
      for (const remove of changes.removes) held.delete(outboxKey(remove.store, remove.key));
    },
  };
  return api;
}
