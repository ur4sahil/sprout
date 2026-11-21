import { COOKIE_NAME, familyFor } from '../../worker/auth';
import type { ApiDeps } from '../../worker/index';
import { handleApi } from '../../worker/index';
import type { MemoryMailer } from '../../worker/mailer';
import { memoryMailer } from '../../worker/mailer';
import type { MemoryBackupStore, MemoryDataStore, MemoryPackStore, MemoryVoiceStore, Store } from '../../worker/store';
import { memoryBackupStore, memoryDataStore, memoryPackStore, memoryStore, memoryVoiceStore } from '../../worker/store';

export const ORIGIN = 'https://sprout.test';
export const PARENT = 'parent.one@example.com';
export const OTHER_PARENT = 'parent.two@example.com';
export const STRANGER = 'stranger@example.com';
export const KEY_A = 'a'.repeat(64);
export const KEY_B = 'b'.repeat(64);

export interface CallOptions {
  cookie?: string | null;
  origin?: string | null;
  contentType?: string | null;
  rawBody?: string | Uint8Array;
  headers?: Record<string, string>;
}

export interface Harness {
  store: Store;
  mailer: MemoryMailer;
  pack: MemoryPackStore;
  backup: MemoryBackupStore;
  data: MemoryDataStore;
  voice: MemoryVoiceStore;
  deps: ApiDeps;
  advance(ms: number): void;
  call(method: string, path: string, body?: unknown, options?: CallOptions): Promise<Response>;
  // Waits for the work the Worker put off until after its reply (sending the code).
  flush(): Promise<void>;
  lastCode(): string;
  // Asks for a code and sets a password. Returns the session cookie value.
  signUp(email?: string, passwordKey?: string): Promise<string>;
}

export function cookieFrom(reply: Response): string {
  const header = reply.headers.get('Set-Cookie') ?? '';
  const match = new RegExp(`${COOKIE_NAME}=([^;]*)`).exec(header);
  return match?.[1] ?? '';
}

export function makeHarness(): Harness {
  const store = memoryStore();
  const mailer = memoryMailer();
  const pack = memoryPackStore();
  const backup = memoryBackupStore();
  const data = memoryDataStore();
  const voice = memoryVoiceStore();
  // A real email takes time. The delay makes sure no test passes only because
  // the code happened to be sent before the test looked for it.
  const instant = mailer.sendCode;
  mailer.sendCode = async (to, code) => {
    await new Promise((resolve) => setTimeout(resolve, 15));
    await instant(to, code);
  };
  let clock = new Date('2026-01-10T12:00:00.000Z').getTime();
  const pending: Promise<void>[] = [];
  const deps: ApiDeps = {
    store,
    mailer,
    pepper: 'test-pepper-0123456789abcdef0123456789abcdef',
    parentEmails: [PARENT, OTHER_PARENT],
    now: () => new Date(clock),
    defer: (work) => {
      pending.push(work);
    },
    appOrigin: ORIGIN,
    pack,
    backup,
    data,
    voice,
    voiceMaker: null,
    // As the live Worker does: the first family's parents share 'family'; an invited parent has a family of their own.
    familyOf: (email) => familyFor(deps, email, 'family'),
  };

  async function call(method: string, path: string, body?: unknown, options: CallOptions = {}) {
    const headers = new Headers();
    const write = method !== 'GET' && method !== 'HEAD';
    const origin = options.origin === undefined ? ORIGIN : options.origin;
    const contentType = options.contentType === undefined ? 'application/json' : options.contentType;
    if (write && origin !== null) headers.set('Origin', origin);
    if (write && contentType !== null) headers.set('Content-Type', contentType);
    for (const [name, value] of Object.entries(options.headers ?? {})) headers.set(name, value);
    if (options.cookie) headers.set('Cookie', `${COOKIE_NAME}=${options.cookie}`);
    const init: RequestInit = { method, headers };
    if (write) init.body = (options.rawBody ?? JSON.stringify(body ?? {})) as BodyInit;
    const reply = await handleApi(new Request(`${ORIGIN}${path}`, init), deps);
    await flush();
    return reply;
  }

  async function flush(): Promise<void> {
    while (pending.length > 0) await Promise.all(pending.splice(0));
  }

  function lastCode(): string {
    const last = mailer.sent[mailer.sent.length - 1];
    if (!last) throw new Error('no code was sent');
    return last.code;
  }

  async function signUp(email = PARENT, passwordKey = KEY_A): Promise<string> {
    clock += 61_000; // past the one-a-minute limit
    await call('POST', '/api/auth/start', { email });
    const reply = await call('POST', '/api/auth/password', { email, code: lastCode(), passwordKey });
    if (reply.status !== 200) throw new Error(`sign-up failed with ${reply.status}`);
    return cookieFrom(reply);
  }

  return {
    store,
    mailer,
    pack,
    backup,
    data,
    voice,
    deps,
    advance: (ms) => {
      clock += ms;
    },
    call,
    flush,
    lastCode,
    signUp,
  };
}
