import { logError } from '../lib/errorLog';
import { nowIso } from '../lib/clock';
import { EXPORT_FORMAT, EXPORT_VERSION } from './exportFile';
import type { DataApi, OutboxEntry, ServerRow, TrackedBackend } from './online';
import { MAX_CHANGES, OfflineError, outboxKey, ServerError } from './online';
import type { ExportFile, Repo } from './repo';
import {
  attemptSchema,
  awardEarnedSchema,
  childSchema,
  diagnosticProgressSchema,
  diagnosticResultSchema,
  familySchema,
  flagSchema,
  planSchema,
  sessionSchema,
  skillStateSchema,
} from './schema';

// Keeping this device and the server the same, record by record.
//
//   fetch  every record on the server is merged into the device with the rules a backup import
//          uses: the later copy of a record wins, answers are only ever added, and a score is
//          recounted from the joined answers. A record that fails its check is left out.
//   send   every record in the device's outbox goes to the server, as it is on the device now.
//
// One run fetches, then sends. It runs when the app opens, when it comes back to the front, on
// the picker and home, and straight after any change. With no internet nothing is lost: the
// outbox keeps what is waiting, and the next run sends it.

export type SyncOutcome = 'done' | 'offline' | 'signedOut' | 'failed';

export interface SyncResult {
  outcome: SyncOutcome;
  changed: boolean; // records from the server changed what is on this device
  sent: number; // records sent to the server
}

const SCHEMAS = {
  children: childSchema,
  skillStates: skillStateSchema,
  attempts: attemptSchema,
  sessions: sessionSchema,
  awards: awardEarnedSchema,
  plans: planSchema,
  diagnostics: diagnosticResultSchema,
  flags: flagSchema,
  diagnosticProgress: diagnosticProgressSchema,
} as const;

// The server's rows as an import file. A row that does not pass its schema is left out and logged.
export async function fileFrom(rows: readonly ServerRow[], repo: Repo): Promise<ExportFile> {
  const read = <K extends keyof typeof SCHEMAS>(store: K): ExportFile[K] => {
    const out: unknown[] = [];
    for (const row of rows) {
      if (row.store !== store) continue;
      const parsed = SCHEMAS[store].safeParse(row.value);
      if (parsed.success) out.push(parsed.data);
      else logError(new Error(`A ${store} record from the server could not be read (${row.key})`));
    }
    return out as ExportFile[K];
  };
  const family = rows.find((row) => row.store === 'family' && row.key === 'family');
  const parsedFamily = family ? familySchema.safeParse(family.value) : null;
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: nowIso(),
    children: read('children'),
    skillStates: read('skillStates'),
    attempts: read('attempts'),
    sessions: read('sessions'),
    awards: read('awards'),
    plans: read('plans'),
    diagnostics: read('diagnostics'),
    flags: read('flags'),
    diagnosticProgress: read('diagnosticProgress'),
    // With no family record on the server yet, the device's own stands.
    family: parsedFamily?.success ? parsedFamily.data : await repo.getFamily(),
    quarantined: [],
  };
}

export interface Syncer {
  run(): Promise<SyncResult>; // fetch, then send. A second call while one is running joins it
  send(): Promise<SyncResult>; // send only: used straight after a change
  waiting(): Promise<number>; // records not yet sent
}

export function makeSyncer(repo: Repo, backend: TrackedBackend, api: DataApi): Syncer {
  let running: Promise<SyncResult> | null = null;

  async function fetchAndMerge(): Promise<boolean> {
    const rows = await api.load();
    const file = await fileFrom(rows, repo);
    backend.mergingFrom(new Map(rows.map((row) => [outboxKey(row.store, row.key), row.value])));
    try {
      const report = await repo.importAll(file);
      return report.added + report.updated > 0;
    } finally {
      backend.mergingFrom(null);
    }
  }

  async function send(): Promise<number> {
    let sent = 0;
    for (;;) {
      const entries = (await backend.waiting()).slice(0, MAX_CHANGES);
      if (entries.length === 0) return sent;
      const puts: ServerRow[] = [];
      const removes: { store: string; key: string }[] = [];
      for (const entry of entries) {
        // The record as it is on the device now. One that is gone is removed on the server too.
        const value = entry.removed ? undefined : await backend.get(entry.store, entry.key);
        if (value === undefined) removes.push({ store: entry.store, key: entry.key });
        else puts.push({ store: entry.store, key: entry.key, value });
      }
      await api.save({ puts, removes });
      await backend.sent(entries as OutboxEntry[]);
      sent += entries.length;
    }
  }

  async function once(): Promise<SyncResult> {
    let changed = false;
    let sent = 0;
    try {
      changed = await fetchAndMerge();
      // A device joining online storage sends up everything it holds, once.
      if (!(await repo.getDeviceState()).movedOnline) {
        await backend.noteEverything();
        await repo.updateDeviceState({ movedOnline: true });
      }
      sent = await send();
      await repo.updateDeviceState({ lastSyncAt: nowIso() });
      return { outcome: 'done', changed, sent };
    } catch (error) {
      if (error instanceof OfflineError) return { outcome: 'offline', changed, sent };
      if (error instanceof ServerError && error.status === 401) return { outcome: 'signedOut', changed, sent };
      logError(error);
      return { outcome: 'failed', changed, sent };
    }
  }

  async function sendOnly(): Promise<SyncResult> {
    try {
      return { outcome: 'done', changed: false, sent: await send() };
    } catch (error) {
      if (error instanceof OfflineError) return { outcome: 'offline', changed: false, sent: 0 };
      if (error instanceof ServerError && error.status === 401) return { outcome: 'signedOut', changed: false, sent: 0 };
      logError(error);
      return { outcome: 'failed', changed: false, sent: 0 };
    }
  }

  // One job at a time: a send never runs in the middle of a fetch and merge.
  let last: Promise<unknown> = Promise.resolve();
  const queued = <T>(work: () => Promise<T>): Promise<T> => {
    const next = last.then(work, work);
    last = next.catch(() => undefined);
    return next;
  };

  return {
    run() {
      running ??= queued(once).finally(() => {
        running = null;
      });
      return running;
    },
    send: () => queued(sendOnly),
    async waiting() {
      return (await backend.waiting()).length;
    },
  };
}
