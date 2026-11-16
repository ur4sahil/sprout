import type { LoggedError } from '../lib/errorLog';
import { connectErrorLog, logError } from '../lib/errorLog';
import { idbRepo } from './idbRepo';
import { memoryRepo } from './memoryRepo';
import type { Repo } from './repo';

// The one Repo the app uses. IndexedDB when it opens; otherwise memory, with a banner.

export interface OpenRepo {
  repo: Repo;
  saved: boolean; // false means progress will not be saved on this device
}

let opened: Promise<OpenRepo> | null = null;

export function openRepo(): Promise<OpenRepo> {
  opened ??= (async () => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available');
      return { repo: await idbRepo(), saved: true };
    } catch (error) {
      logError(error);
      return { repo: memoryRepo(), saved: false };
    }
  })();
  return opened;
}

// For tests: use this repo, or pass null to open afresh.
export function setRepoForTests(repo: Repo | null, saved = true): void {
  opened = repo ? Promise.resolve({ repo, saved }) : null;
}

// Asks the browser not to clear saved data, once, and remembers the answer.
export async function requestPersistence(repo: Repo): Promise<void> {
  const device = await repo.getDeviceState();
  if (device.persistGranted !== null) return;
  let granted: boolean | null = null;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      granted = await navigator.storage.persist();
    }
  } catch (error) {
    logError(error);
  }
  if (granted === null) return; // not supported here: ask again another time
  await repo.updateDeviceState({ persistGranted: granted });
}

// Keeps the last 20 errors in the device record, for the parent data screen.
export async function keepErrorsInDeviceRecord(repo: Repo): Promise<void> {
  let saving = false;
  let waiting: LoggedError[] | null = null;
  const save = (list: LoggedError[]): void => {
    if (saving) {
      waiting = list; // an error raised while saving: save it straight after
      return;
    }
    saving = true;
    void (async () => {
      try {
        await repo.updateDeviceState({ errors: list });
      } catch {
        // Storage itself is failing. The list stays in memory.
      } finally {
        saving = false;
        if (waiting) {
          const next = waiting;
          waiting = null;
          save(next);
        }
      }
    })();
  };
  let saved: LoggedError[] = [];
  try {
    saved = (await repo.getDeviceState()).errors;
  } catch {
    // Start with an empty list.
  }
  connectErrorLog(saved, save);
}
