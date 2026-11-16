import { vi } from 'vitest';
import { freezeClock } from '../../src/lib/clock';
import { COOKIE_NAME } from '../../worker/auth';
import { handleApi } from '../../worker/index';
import type { Harness } from '../worker/harness';
import { ORIGIN, cookieFrom, makeHarness } from '../worker/harness';

export interface ServerStub {
  server: Harness;
  calls: { method: string; path: string; body: string | null }[];
  cookie(): string | null;
  goOffline(): void;
  goOnline(): void;
}

// Replaces fetch with the real Worker code and an in-memory store.
// It plays the browser's part: it adds the Origin header and keeps the cookie.
export function stubServer(): ServerStub {
  const server = makeHarness();
  // The device and the server agree on what time it is.
  freezeClock(server.deps.now());
  const calls: ServerStub['calls'] = [];
  let cookie: string | null = null;
  let offline = false;

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (offline) throw new TypeError('Load failed');
    const path = String(input);
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? init.body : null;
    calls.push({ method, path, body });
    const headers = new Headers(init.headers);
    if (method !== 'GET') headers.set('Origin', ORIGIN);
    if (cookie) headers.set('Cookie', `${COOKIE_NAME}=${cookie}`);
    const reply = await handleApi(new Request(`${ORIGIN}${path}`, { method, headers, body }), server.deps);
    // Like the Worker runtime, finish the put-off work before the request is over.
    await server.flush();
    const setCookie = reply.headers.get('Set-Cookie');
    if (setCookie) cookie = cookieFrom(reply) || null;
    return reply;
  });

  return {
    server,
    calls,
    cookie: () => cookie,
    goOffline: () => {
      offline = true;
    },
    goOnline: () => {
      offline = false;
    },
  };
}
