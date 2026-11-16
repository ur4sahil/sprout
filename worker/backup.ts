import { json } from './auth';
import type { BackupBase, BackupStore } from './store';

// The family backup file. The caller has already checked the session and the Origin.
// The Worker never opens the file: merging happens on the device.

export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
export const VERSION_HEADER = 'X-Backup-Version';
export const BASE_HEADER = 'X-Backup-Base'; // the version an upload was built on, or "none"

const SAFE = { 'Cache-Control': 'no-store', 'Strict-Transport-Security': 'max-age=31536000', 'X-Content-Type-Options': 'nosniff' };

// GET /api/backup. `?have=<version>` lets a device that is up to date skip the download.
export async function getBackup(store: BackupStore, request: Request): Promise<Response> {
  const have = new URL(request.url).searchParams.get('have');
  const version = await store.version();
  if (version === null) return json(200, { version: null });
  if (have !== null && have === version) return json(200, { version, unchanged: true });
  const file = await store.read();
  if (!file) return json(200, { version: null });
  return new Response(file.body, { status: 200, headers: { ...SAFE, 'Content-Type': 'application/gzip', [VERSION_HEADER]: file.version } });
}

function isGzip(body: ArrayBuffer): boolean {
  const start = new Uint8Array(body, 0, Math.min(body.byteLength, 3));
  return start.length === 3 && start[0] === 0x1f && start[1] === 0x8b && start[2] === 0x08;
}

// PUT /api/backup. Stores the file only if it was built on the version that is still current.
export async function putBackup(store: BackupStore, request: Request, now: Date): Promise<Response> {
  const named = request.headers.get(BASE_HEADER);
  if (named === null || named === '') return json(400, { error: 'no_base' });
  const base: BackupBase = named === 'none' ? 'none' : { version: named };

  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BACKUP_BYTES) return json(413, { error: 'too_big' });
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BACKUP_BYTES) return json(413, { error: 'too_big' });
  if (!isGzip(body)) return json(400, { error: 'not_gzip' });

  // Refuse early, before touching history, when another device has uploaded in between.
  const current = await store.version();
  if (base === 'none' ? current !== null : current !== base.version) return json(409, { error: 'version_moved', version: current });

  // Before the first upload of each day, keep a copy of the file as it was.
  await store.keepHistory(now.toISOString().slice(0, 10));

  const version = await store.write(body, base);
  if (version === null) return json(409, { error: 'version_moved', version: await store.version() });
  return json(200, { version });
}
