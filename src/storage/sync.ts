import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { parseExportText } from './exportFile';
import { gunzip, gzip } from './gzip';
import { openRepo } from './index';
import type { Repo } from './repo';

// Backup sync (plan section 4). The whole family's progress is one gzip file on the server.
// The device is always what the app reads and writes. Sync runs in the background:
//   1. ask for the file, saying which version this device last saw
//   2. if a newer one came back, check it and merge it in, with the same code import uses
//   3. if this device has changes, upload, naming the version the upload was built on
//   4. if another device uploaded in between, go back to 1. After 3 rounds, wait for the next run
//   5. on success, clear `dirty` and remember the version and the time
// A failed run leaves the device's records as they were, and is tried again next time.

export const SYNC_EVERY_MS = 5 * 60_000;
export const SYNC_ROUNDS = 3;
const VERSION_HEADER = 'X-Backup-Version';
const BASE_HEADER = 'X-Backup-Base';

export type SyncOutcome =
  | 'uploaded' // this device's changes are on the server
  | 'upToDate' // nothing to send
  | 'offline'
  | 'signedOut'
  | 'gaveUp' // other devices kept uploading first. Nothing is lost: next run tries again
  | 'badFile' // the server's file could not be read, so it was not merged
  | 'failed';

export interface SyncResult {
  outcome: SyncOutcome;
  merged: boolean; // a newer file from the server was merged into this device
}

// What a parent reads on the data screen.
export const SYNC_MESSAGES: Record<SyncOutcome, string> = {
  uploaded: 'Backed up.',
  upToDate: 'Backed up.',
  offline: 'No internet. The backup will run when this device is online again.',
  signedOut: 'Sign in again to back up.',
  gaveUp: 'Another device was backing up at the same time. It will try again soon.',
  badFile: 'The backup on the server could not be read, so it was left alone. Export a copy from this device.',
  failed: 'The backup did not work. It will try again soon.',
};

type Pulled = { kind: 'none' } | { kind: 'same' } | { kind: 'file'; version: string; text: string } | { kind: 'stop'; outcome: SyncOutcome };

async function pull(have: string | null): Promise<Pulled> {
  let reply: Response;
  try {
    reply = await fetch(`/api/backup${have ? `?have=${encodeURIComponent(have)}` : ''}`, { credentials: 'same-origin' });
  } catch {
    return { kind: 'stop', outcome: 'offline' };
  }
  if (reply.status === 401) return { kind: 'stop', outcome: 'signedOut' };
  if (!reply.ok) return { kind: 'stop', outcome: 'failed' };
  const version = reply.headers.get(VERSION_HEADER);
  if (version === null) {
    const body = (await reply.json().catch(() => null)) as { version?: unknown; unchanged?: unknown } | null;
    if (body && body.version === null) return { kind: 'none' };
    if (body && body.unchanged === true && typeof body.version === 'string' && body.version === have) return { kind: 'same' };
    return { kind: 'stop', outcome: 'failed' };
  }
  try {
    return { kind: 'file', version, text: await gunzip(new Uint8Array(await reply.arrayBuffer())) };
  } catch {
    return { kind: 'stop', outcome: 'badFile' };
  }
}

type Pushed = { kind: 'stored'; version: string } | { kind: 'moved' } | { kind: 'stop'; outcome: SyncOutcome };

async function push(bytes: Uint8Array, base: string | null): Promise<Pushed> {
  let reply: Response;
  try {
    reply = await fetch('/api/backup', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/gzip', [BASE_HEADER]: base ?? 'none' },
      body: bytes as BodyInit,
    });
  } catch {
    return { kind: 'stop', outcome: 'offline' };
  }
  if (reply.status === 409) return { kind: 'moved' };
  if (reply.status === 401) return { kind: 'stop', outcome: 'signedOut' };
  if (!reply.ok) return { kind: 'stop', outcome: 'failed' };
  const body = (await reply.json().catch(() => null)) as { version?: unknown } | null;
  return body && typeof body.version === 'string' ? { kind: 'stored', version: body.version } : { kind: 'stop', outcome: 'failed' };
}

// One sync run on one device.
export async function syncRepo(repo: Repo): Promise<SyncResult> {
  let merged = false;
  for (let round = 0; round < SYNC_ROUNDS; round += 1) {
    const before = await repo.getDeviceState();
    const pulled = await pull(before.backupVersion);
    if (pulled.kind === 'stop') return { outcome: pulled.outcome, merged };

    let serverVersion = pulled.kind === 'none' ? null : before.backupVersion;
    if (pulled.kind === 'file') {
      // Checked in full before anything changes. A file that does not pass is never merged.
      let file;
      try {
        file = parseExportText(pulled.text);
      } catch {
        return { outcome: 'badFile', merged };
      }
      // Read just before the merge, so practice saved while the file was downloading still counts as a change.
      const wasDirty = (await repo.getDeviceState()).dirty;
      await repo.importAll(file);
      merged = true;
      serverVersion = pulled.version;
      // Merging writes records, which marks the device as changed. If it had nothing of its own
      // to send before the merge, it still has nothing to send.
      await repo.updateDeviceState({ backupVersion: pulled.version, dirty: wasDirty });
    }

    const device = await repo.getDeviceState();
    // The server has no file but this device once backed up: send everything again.
    const lostFile = pulled.kind === 'none' && device.backupVersion !== null;
    if (!device.dirty && !lostFile) {
      await repo.updateDeviceState({ lastSyncAt: now().toISOString() });
      return { outcome: 'upToDate', merged };
    }

    // `dirty` is cleared before the export, so a change made while the upload is on its way sets it again.
    await repo.updateDeviceState({ dirty: false });
    const bytes = await gzip(JSON.stringify(await repo.exportAll()));
    const pushed = await push(bytes, serverVersion);
    if (pushed.kind !== 'stored') {
      await repo.updateDeviceState({ dirty: true });
      if (pushed.kind === 'stop') return { outcome: pushed.outcome, merged };
      continue; // another device uploaded in between: fetch its file, merge, try again
    }
    await repo.updateDeviceState({ backupVersion: pushed.version, lastSyncAt: now().toISOString() });
    return { outcome: 'uploaded', merged };
  }
  return { outcome: 'gaveUp', merged };
}

// ---- The app's one sync at a time ----

export interface SyncStatus {
  running: boolean;
  last: SyncOutcome | null; // the result of the last run since the app opened
}

let running: Promise<SyncResult> | null = null;
let lastRunAt = 0;
let status: SyncStatus = { running: false, last: null };
const listeners = new Set<(status: SyncStatus) => void>();

function setStatus(next: SyncStatus): void {
  status = next;
  listeners.forEach((listener) => listener(status));
}

export function syncStatus(): SyncStatus {
  return status;
}

export function onSyncStatus(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Runs a sync now. A second call while one is running joins it.
export function syncNow(): Promise<SyncResult> {
  running ??= (async () => {
    lastRunAt = now().getTime();
    setStatus({ ...status, running: true });
    let result: SyncResult;
    try {
      result = await syncRepo((await openRepo()).repo);
    } catch (error) {
      logError(error);
      result = { outcome: 'failed', merged: false };
    }
    running = null;
    setStatus({ running: false, last: result.outcome });
    return result;
  })();
  return running;
}

// Runs a sync unless one ran in the last 5 minutes.
export function syncIfDue(): void {
  if (running || now().getTime() - lastRunAt < SYNC_EVERY_MS) return;
  void syncNow();
}

export function resetSyncForTests(): void {
  running = null;
  lastRunAt = 0;
  status = { running: false, last: null };
  listeners.clear();
}
