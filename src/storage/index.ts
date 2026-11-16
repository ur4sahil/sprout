import type { LoggedError } from '../lib/errorLog';
import { connectErrorLog, logError } from '../lib/errorLog';
import type { Backend } from './backend';
import { memoryBackend } from './backend';
import { idbBackend, openSproutDb } from './idbRepo';
import type { DataApi } from './online';
import { httpDataApi, trackedBackend } from './online';
import type { Repo } from './repo';
import { makeRepo } from './repoCore';
import type { SyncResult, Syncer } from './sync';
import { makeSyncer } from './sync';

// The one Repo the app uses. The device keeps a copy of the family's records, so the app opens
// and works with no internet. The server holds the main copy: every change is noted in the
// device's outbox and sent at once, or when the internet is back. See online.ts and sync.ts.

export interface OpenRepo {
  repo: Repo;
  saved: boolean; // false means nothing can be kept on this device between visits
}

interface Opened extends OpenRepo {
  syncer: Syncer | null; // null in unit tests that run with no server
}

let opened: Promise<Opened> | null = null;
// Unit tests have no server. A test that wants one passes a stand-in here, with the device database to use.
let testApi: DataApi | null = null;
let testDevice: Backend | null = null;
// Told after every run: the app shows whether the device is in step with the server.
let onResult: ((result: SyncResult) => void) | null = null;
export function watchSync(listener: ((result: SyncResult) => void) | null): void {
  onResult = listener;
}

// A change is sent a moment after it is made, so several changes made together go in one request.
export const SEND_AFTER_MS = 300;
let sendTimer: ReturnType<typeof setTimeout> | null = null;

function serverApi(): DataApi | null {
  if (import.meta.env.MODE === 'test') return testApi;
  return httpDataApi();
}

function open(): Promise<Opened> {
  opened ??= (async () => {
    let device: Backend;
    let saved = true;
    try {
      if (testDevice) device = testDevice;
      else {
        if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available');
        device = idbBackend(await openSproutDb());
      }
    } catch (error) {
      logError(error);
      device = memoryBackend();
      saved = false;
    }
    const tracked = trackedBackend(device);
    const repo = makeRepo(tracked);
    const api = serverApi();
    const syncer = api ? makeSyncer(repo, tracked, api) : null;
    if (syncer) {
      tracked.onChange(() => {
        if (sendTimer) clearTimeout(sendTimer);
        sendTimer = setTimeout(() => {
          sendTimer = null;
          void syncer.send().then((result) => onResult?.(result));
        }, SEND_AFTER_MS);
      });
    }
    return { repo, saved, syncer };
  })();
  return opened;
}

export function openRepo(): Promise<OpenRepo> {
  return open();
}

// For tests: use this repo, or pass null to open afresh.
export function setRepoForTests(repo: Repo | null, saved = true): void {
  opened = repo ? Promise.resolve({ repo, saved, syncer: null }) : null;
}

// For tests: the app talks to this stand-in for the server. Pass null for none. Opens afresh.
export function setDataApiForTests(api: DataApi | null, device: Backend | null = null): void {
  testApi = api;
  testDevice = device;
  opened = null;
  if (sendTimer) clearTimeout(sendTimer);
  sendTimer = null;
}

const NOTHING: SyncResult = { outcome: 'done', changed: false, sent: 0 };

// Fetches what other devices have saved, then sends what this device has waiting.
export async function syncFamily(): Promise<SyncResult> {
  const { syncer } = await open();
  if (!syncer) return NOTHING;
  const result = await syncer.run();
  onResult?.(result);
  return result;
}

// How many records on this device are still waiting to be sent.
export async function waitingToSend(): Promise<number> {
  const { syncer } = await open();
  return syncer ? syncer.waiting() : 0;
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
