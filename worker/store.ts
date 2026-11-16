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
