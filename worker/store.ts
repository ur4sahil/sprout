import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

// The only way the Worker reaches its database. Tests use memoryStore().

export interface UserRow {
  email: string;
  pwHash: string;
  pwSalt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRow {
  tokenHash: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export interface EmailCodeRow {
  email: string;
  codeHash: string;
  sentAt: string;
  expiresAt: string;
  tries: number;
}

export interface LoginAttemptRow {
  email: string;
  windowStart: string;
  count: number;
}

export interface Store {
  getUser(email: string): Promise<UserRow | null>;
  saveUser(row: UserRow): Promise<void>;
  createSession(row: SessionRow): Promise<void>;
  getSession(tokenHash: string): Promise<SessionRow | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsFor(email: string): Promise<void>;
  getCode(email: string): Promise<EmailCodeRow | null>;
  saveCode(row: EmailCodeRow): Promise<void>;
  // Uses up one try if any are left. Returns false when all tries are gone.
  claimCodeTry(email: string, maxTries: number): Promise<boolean>;
  deleteCode(email: string): Promise<void>;
  getAttempts(email: string): Promise<LoginAttemptRow | null>;
  saveAttempts(row: LoginAttemptRow): Promise<void>;
  clearAttempts(email: string): Promise<void>;
}

export function memoryStore(): Store {
  const users = new Map<string, UserRow>();
  const sessions = new Map<string, SessionRow>();
  const codes = new Map<string, EmailCodeRow>();
  const attempts = new Map<string, LoginAttemptRow>();
  return {
    async getUser(email) {
      const row = users.get(email);
      return row ? { ...row } : null;
    },
    async saveUser(row) {
      const old = users.get(row.email);
      users.set(row.email, { ...row, createdAt: old ? old.createdAt : row.createdAt });
    },
    async createSession(row) {
      sessions.set(row.tokenHash, { ...row });
    },
    async getSession(tokenHash) {
      const row = sessions.get(tokenHash);
      return row ? { ...row } : null;
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
    async deleteSessionsFor(email) {
      for (const [key, row] of sessions) if (row.email === email) sessions.delete(key);
    },
    async getCode(email) {
      const row = codes.get(email);
      return row ? { ...row } : null;
    },
    async saveCode(row) {
      codes.set(row.email, { ...row });
    },
    async claimCodeTry(email, maxTries) {
      const row = codes.get(email);
      if (!row || row.tries >= maxTries) return false;
      row.tries += 1;
      return true;
    },
    async deleteCode(email) {
      codes.delete(email);
    },
    async getAttempts(email) {
      const row = attempts.get(email);
      return row ? { ...row } : null;
    },
    async saveAttempts(row) {
      attempts.set(row.email, { ...row });
    },
    async clearAttempts(email) {
      attempts.delete(email);
    },
  };
}

interface UserRecord {
  email: string;
  pw_hash: string;
  pw_salt: string;
  created_at: string;
  updated_at: string;
}
interface SessionRecord {
  token_hash: string;
  email: string;
  created_at: string;
  expires_at: string;
}
interface CodeRecord {
  email: string;
  code_hash: string;
  sent_at: string;
  expires_at: string;
  tries: number;
}
interface AttemptRecord {
  email: string;
  window_start: string;
  count: number;
}

export function d1Store(db: D1Database): Store {
  return {
    async getUser(email) {
      const r = await db.prepare('select * from users where email = ?').bind(email).first<UserRecord>();
      if (!r) return null;
      return { email: r.email, pwHash: r.pw_hash, pwSalt: r.pw_salt, createdAt: r.created_at, updatedAt: r.updated_at };
    },
    async saveUser(row) {
      await db
        .prepare(
          `insert into users (email, pw_hash, pw_salt, created_at, updated_at) values (?, ?, ?, ?, ?)
           on conflict (email) do update set
             pw_hash = excluded.pw_hash, pw_salt = excluded.pw_salt, updated_at = excluded.updated_at`,
        )
        .bind(row.email, row.pwHash, row.pwSalt, row.createdAt, row.updatedAt)
        .run();
    },
    async createSession(row) {
      await db
        .prepare('insert into sessions (token_hash, email, created_at, expires_at) values (?, ?, ?, ?)')
        .bind(row.tokenHash, row.email, row.createdAt, row.expiresAt)
        .run();
    },
    async getSession(tokenHash) {
      const r = await db.prepare('select * from sessions where token_hash = ?').bind(tokenHash).first<SessionRecord>();
      if (!r) return null;
      return { tokenHash: r.token_hash, email: r.email, createdAt: r.created_at, expiresAt: r.expires_at };
    },
    async deleteSession(tokenHash) {
      await db.prepare('delete from sessions where token_hash = ?').bind(tokenHash).run();
    },
    async deleteSessionsFor(email) {
      await db.prepare('delete from sessions where email = ?').bind(email).run();
    },
    async getCode(email) {
      const r = await db.prepare('select * from email_codes where email = ?').bind(email).first<CodeRecord>();
      if (!r) return null;
      return { email: r.email, codeHash: r.code_hash, sentAt: r.sent_at, expiresAt: r.expires_at, tries: r.tries };
    },
    async saveCode(row) {
      await db
        .prepare(
          `insert into email_codes (email, code_hash, sent_at, expires_at, tries) values (?, ?, ?, ?, ?)
           on conflict (email) do update set
             code_hash = excluded.code_hash, sent_at = excluded.sent_at,
             expires_at = excluded.expires_at, tries = excluded.tries`,
        )
        .bind(row.email, row.codeHash, row.sentAt, row.expiresAt, row.tries)
        .run();
    },
    async claimCodeTry(email, maxTries) {
      const result = await db
        .prepare('update email_codes set tries = tries + 1 where email = ? and tries < ?')
        .bind(email, maxTries)
        .run();
      return result.meta.changes > 0;
    },
    async deleteCode(email) {
      await db.prepare('delete from email_codes where email = ?').bind(email).run();
    },
    async getAttempts(email) {
      const r = await db.prepare('select * from login_attempts where email = ?').bind(email).first<AttemptRecord>();
      if (!r) return null;
      return { email: r.email, windowStart: r.window_start, count: r.count };
    },
    async saveAttempts(row) {
      await db
        .prepare(
          `insert into login_attempts (email, window_start, count) values (?, ?, ?)
           on conflict (email) do update set window_start = excluded.window_start, count = excluded.count`,
        )
        .bind(row.email, row.windowStart, row.count)
        .run();
    },
    async clearAttempts(email) {
      await db.prepare('delete from login_attempts where email = ?').bind(email).run();
    },
  };
}

// ---- The voice pack: one file in R2, served only to a signed-in device ----

export interface PackStore {
  // The pack's version, or null when no pack has been uploaded.
  version(): Promise<string | null>;
  // The pack file and its version, or null when there is none.
  read(): Promise<{ version: string; body: ArrayBuffer } | null>;
}

export const VOICE_PACK_KEY = 'voice-pack.json';

export interface MemoryPackStore extends PackStore {
  put(text: string, version: string): void;
  clear(): void;
}

export function memoryPackStore(): MemoryPackStore {
  let held: { version: string; body: ArrayBuffer } | null = null;
  return {
    put(text, version) {
      held = { version, body: new TextEncoder().encode(text).buffer as ArrayBuffer };
    },
    clear() {
      held = null;
    },
    async version() {
      return held ? held.version : null;
    },
    async read() {
      return held ? { version: held.version, body: held.body.slice(0) } : null;
    },
  };
}

// The version is the R2 object's etag: it changes whenever a new pack is uploaded.
export function r2PackStore(bucket: R2Bucket): PackStore {
  return {
    async version() {
      const head = await bucket.head(VOICE_PACK_KEY);
      return head ? head.etag : null;
    },
    async read() {
      const object = await bucket.get(VOICE_PACK_KEY);
      return object ? { version: object.etag, body: await object.arrayBuffer() } : null;
    },
  };
}

// ---- The family backup: one gzip file in R2, plus one history copy a day ----

export type BackupBase = { version: string } | 'none'; // what an upload was built on

export interface BackupStore {
  version(): Promise<string | null>;
  read(): Promise<{ version: string; body: ArrayBuffer } | null>;
  // Stores the file only if the current one is still the version the upload was built on
  // ('none': only if there is no file yet). Returns the new version, or null when refused.
  write(body: ArrayBuffer, base: BackupBase): Promise<string | null>;
  // Copies the current file to the day's history copy, unless that day already has one. True if it copied.
  keepHistory(day: string): Promise<boolean>;
}

export const BACKUP_KEY = 'family.json.gz';
export const historyKey = (day: string): string => `history/${day}.json.gz`;

export interface MemoryBackupStore extends BackupStore {
  history(): Record<string, ArrayBuffer>;
  writes(): number;
}

export function memoryBackupStore(): MemoryBackupStore {
  let held: { version: string; body: ArrayBuffer } | null = null;
  const kept: Record<string, ArrayBuffer> = {};
  let count = 0;
  return {
    history: () => kept,
    writes: () => count,
    async version() {
      return held ? held.version : null;
    },
    async read() {
      return held ? { version: held.version, body: held.body.slice(0) } : null;
    },
    async write(body, base) {
      if (base === 'none' ? held !== null : held?.version !== base.version) return null;
      count += 1;
      held = { version: `v${count}`, body: body.slice(0) };
      return held.version;
    },
    async keepHistory(day) {
      if (!held || kept[day]) return false;
      kept[day] = held.body.slice(0);
      return true;
    },
  };
}

// The version is the R2 object's etag. R2 checks the condition as part of the write itself,
// so two iPads uploading at the same moment can never both succeed.
export function r2BackupStore(bucket: R2Bucket): BackupStore {
  return {
    async version() {
      const head = await bucket.head(BACKUP_KEY);
      return head ? head.etag : null;
    },
    async read() {
      const object = await bucket.get(BACKUP_KEY);
      return object ? { version: object.etag, body: await object.arrayBuffer() } : null;
    },
    async write(body, base) {
      // "Only if none exists" is the standard If-None-Match: * header, which R2 accepts in place of a condition object.
      const ifNone = new Headers({ 'If-None-Match': '*' }) as unknown as import('@cloudflare/workers-types').Headers;
      const onlyIf = base === 'none' ? ifNone : { etagMatches: base.version };
      const stored = await bucket.put(BACKUP_KEY, body, { onlyIf, httpMetadata: { contentType: 'application/gzip' } });
      return stored ? stored.etag : null;
    },
    async keepHistory(day) {
      if (await bucket.head(historyKey(day))) return false;
      const current = await bucket.get(BACKUP_KEY);
      if (!current) return false;
      await bucket.put(historyKey(day), await current.arrayBuffer(), { httpMetadata: { contentType: 'application/gzip' } });
      return true;
    },
  };
}

// ---- The family's records: the one copy of children, scores, answers and the rest ----

export interface RecordRow {
  store: string;
  key: string;
  value: string; // the record as JSON text, exactly as the app sent it
}

export interface DataStore {
  // Up to `limit` of one family's rows after the given one, ordered by store and then key. Pass null to start.
  page(family: string, after: { store: string; key: string } | null, limit: number): Promise<RecordRow[]>;
  // Every change lands together or not at all.
  apply(family: string, puts: RecordRow[], removes: { store: string; key: string }[], at: string): Promise<void>;
}

export interface MemoryDataStore extends DataStore {
  rows(family?: string): RecordRow[];
  failNext(): void; // the next apply fails, as a database error would
}

const rowOrder = (one: { store: string; key: string }, two: { store: string; key: string }): number => (one.store === two.store ? (one.key < two.key ? -1 : one.key > two.key ? 1 : 0) : one.store < two.store ? -1 : 1);

export function memoryDataStore(): MemoryDataStore {
  const families = new Map<string, Map<string, RecordRow>>();
  let failing = false;
  const id = (row: { store: string; key: string }): string => `${row.store}\u0000${row.key}`;
  const held = (family: string): Map<string, RecordRow> => {
    const found = families.get(family) ?? new Map<string, RecordRow>();
    families.set(family, found);
    return found;
  };
  const sorted = (family: string): RecordRow[] => [...held(family).values()].sort(rowOrder);
  return {
    rows: (family = 'family') => sorted(family).map((row) => ({ ...row })),
    failNext() {
      failing = true;
    },
    async page(family, after, limit) {
      return sorted(family)
        .filter((row) => after === null || rowOrder(row, after) > 0)
        .slice(0, limit)
        .map((row) => ({ ...row }));
    },
    async apply(family, puts, removes) {
      if (failing) {
        failing = false;
        throw new Error('the database is not answering');
      }
      for (const put of puts) held(family).set(id(put), { ...put });
      for (const remove of removes) held(family).delete(id(remove));
    },
  };
}

export function d1DataStore(db: D1Database): DataStore {
  return {
    async page(family, after, limit) {
      const found =
        after === null
          ? await db.prepare('select store, key, value from records where family = ?1 order by store, key limit ?2').bind(family, limit).all<RecordRow>()
          : await db.prepare('select store, key, value from records where family = ?1 and (store > ?2 or (store = ?2 and key > ?3)) order by store, key limit ?4').bind(family, after.store, after.key, limit).all<RecordRow>();
      return found.results;
    },
    async apply(family, puts, removes, at) {
      const upsert = db.prepare('insert into records (family, store, key, value, updated_at) values (?1, ?2, ?3, ?4, ?5) on conflict (family, store, key) do update set value = excluded.value, updated_at = excluded.updated_at');
      const remove = db.prepare('delete from records where family = ?1 and store = ?2 and key = ?3');
      const work = [...puts.map((put) => upsert.bind(family, put.store, put.key, put.value, at)), ...removes.map((each) => remove.bind(family, each.store, each.key))];
      // One batch is one transaction: all of it lands, or none of it.
      if (work.length > 0) await db.batch(work);
    },
  };
}

// ---- The spoken voice: one MP3 for each sentence, in its own R2 bucket ----

export interface MemoryVoiceStore {
  get(key: string): Promise<ArrayBuffer | null>;
  put(key: string, body: ArrayBuffer): Promise<void>;
  keys(): string[];
}

export function memoryVoiceStore(): MemoryVoiceStore {
  const held = new Map<string, ArrayBuffer>();
  return {
    async get(key) {
      return held.get(key)?.slice(0) ?? null;
    },
    async put(key, body) {
      held.set(key, body.slice(0));
    },
    keys: () => [...held.keys()].sort(),
  };
}

export function r2VoiceStore(bucket: R2Bucket): { get(key: string): Promise<ArrayBuffer | null>; put(key: string, body: ArrayBuffer): Promise<void> } {
  return {
    async get(key) {
      const object = await bucket.get(key);
      return object ? await object.arrayBuffer() : null;
    },
    async put(key, body) {
      await bucket.put(key, body, { httpMetadata: { contentType: 'audio/mpeg' } });
    },
  };
}
