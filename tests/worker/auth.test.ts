// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../../worker/crypto';
import type { Harness } from './harness';
import { KEY_A, KEY_B, ORIGIN, OTHER_PARENT, PARENT, STRANGER, cookieFrom, makeHarness } from './harness';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function wrongCode(right: string): string {
  return right === '000000' ? '000001' : '000000';
}

let h: Harness;
beforeEach(() => {
  h = makeHarness();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('asking for a code', () => {
  it('gives an unlisted email the same reply and sends no email', async () => {
    const listed = await h.call('POST', '/api/auth/start', { email: PARENT });
    const unlisted = await h.call('POST', '/api/auth/start', { email: STRANGER });
    expect(unlisted.status).toBe(listed.status);
    expect(await unlisted.text()).toBe(await listed.text());
    expect([...unlisted.headers]).toEqual([...listed.headers]);
    expect(h.mailer.sent.map((m) => m.to)).toEqual([PARENT]);
    expect(await h.store.getCode(STRANGER)).toBeNull();
  });

  it('sends a six-digit code and stores only its hash', async () => {
    await h.call('POST', '/api/auth/start', { email: `  ${PARENT.toUpperCase()} ` });
    const code = h.lastCode();
    expect(code).toMatch(/^\d{6}$/);
    const row = await h.store.getCode(PARENT);
    expect(row).not.toBeNull();
    expect(JSON.stringify(row)).not.toContain(code);
  });

  it('allows a new code once a minute, and the new one replaces the old', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const first = h.lastCode();
    h.advance(59_000);
    await h.call('POST', '/api/auth/start', { email: PARENT });
    expect(h.mailer.sent).toHaveLength(1);
    h.advance(2_000);
    await h.call('POST', '/api/auth/start', { email: PARENT });
    expect(h.mailer.sent).toHaveLength(2);
    const second = h.lastCode();
    if (second !== first) {
      const old = await h.call('POST', '/api/auth/password', { email: PARENT, code: first, passwordKey: KEY_A });
      expect(old.status).toBe(400);
    }
    const fresh = await h.call('POST', '/api/auth/password', { email: PARENT, code: second, passwordKey: KEY_A });
    // One try may have been used by the old code above. The new code still works.
    expect(fresh.status).toBe(200);
  });

  it('still answers the same when the email cannot be sent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.mailer.sendCode = async () => {
      throw new Error('mail is down');
    };
    const reply = await h.call('POST', '/api/auth/start', { email: PARENT });
    expect(reply.status).toBe(200);
    expect(await reply.json()).toEqual({ ok: true });
  });
});

describe('setting a password with a code', () => {
  it('signs the parent in with a cookie that has every flag', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const reply = await h.call('POST', '/api/auth/password', {
      email: PARENT,
      code: h.lastCode(),
      passwordKey: KEY_A,
    });
    expect(reply.status).toBe(200);
    const header = reply.headers.get('Set-Cookie') ?? '';
    const parts = header.split(';').map((p) => p.trim());
    expect(parts[0]).toMatch(/^__Host-sprout=[A-Za-z0-9_-]{43}$/);
    expect(parts).toContain('Secure');
    expect(parts).toContain('HttpOnly');
    expect(parts).toContain('SameSite=Strict');
    expect(parts).toContain('Path=/');
    expect(parts).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
    expect(header).not.toMatch(/Domain=/i);
    const body = (await reply.json()) as { email: string; expiresAt: string };
    expect(body.email).toBe(PARENT);
    expect(new Date(body.expiresAt).getTime()).toBe(h.deps.now().getTime() + 30 * DAY);
  });

  it('stores only a hash of the session cookie and of the password key', async () => {
    const cookie = await h.signUp();
    expect(await h.store.getSession(cookie)).toBeNull();
    expect(await h.store.getSession(await sha256Hex(cookie))).not.toBeNull();
    const user = await h.store.getUser(PARENT);
    expect(user).not.toBeNull();
    expect(JSON.stringify(user)).not.toContain(KEY_A);
  });

  it('refuses a code after 10 minutes', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const code = h.lastCode();
    h.advance(10 * MINUTE);
    const reply = await h.call('POST', '/api/auth/password', { email: PARENT, code, passwordKey: KEY_A });
    expect(reply.status).toBe(400);
    expect(await reply.json()).toEqual({ error: 'bad_code' });
    expect(await h.store.getUser(PARENT)).toBeNull();
  });

  it('accepts a code just inside 10 minutes', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const code = h.lastCode();
    h.advance(10 * MINUTE - 1);
    const reply = await h.call('POST', '/api/auth/password', { email: PARENT, code, passwordKey: KEY_A });
    expect(reply.status).toBe(200);
  });

  it('refuses even the right code after 5 wrong tries', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const code = h.lastCode();
    for (let i = 0; i < 5; i += 1) {
      const wrong = await h.call('POST', '/api/auth/password', {
        email: PARENT,
        code: wrongCode(code),
        passwordKey: KEY_A,
      });
      expect(wrong.status).toBe(400);
    }
    const right = await h.call('POST', '/api/auth/password', { email: PARENT, code, passwordKey: KEY_A });
    expect(right.status).toBe(400);
    expect(await h.store.getUser(PARENT)).toBeNull();
  });

  it('accepts the right code on the fifth try', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const code = h.lastCode();
    for (let i = 0; i < 4; i += 1) {
      await h.call('POST', '/api/auth/password', { email: PARENT, code: wrongCode(code), passwordKey: KEY_A });
    }
    const right = await h.call('POST', '/api/auth/password', { email: PARENT, code, passwordKey: KEY_A });
    expect(right.status).toBe(200);
  });

  it('cannot use a code twice', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const code = h.lastCode();
    await h.call('POST', '/api/auth/password', { email: PARENT, code, passwordKey: KEY_A });
    const again = await h.call('POST', '/api/auth/password', { email: PARENT, code, passwordKey: KEY_B });
    expect(again.status).toBe(400);
  });

  it("does not accept one parent's code for the other parent", async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const code = h.lastCode();
    const reply = await h.call('POST', '/api/auth/password', { email: OTHER_PARENT, code, passwordKey: KEY_A });
    expect(reply.status).toBe(400);
  });

  it('gives an unlisted email the same refusal as a wrong code', async () => {
    await h.call('POST', '/api/auth/start', { email: PARENT });
    const wrong = await h.call('POST', '/api/auth/password', {
      email: PARENT,
      code: wrongCode(h.lastCode()),
      passwordKey: KEY_A,
    });
    const unlisted = await h.call('POST', '/api/auth/password', {
      email: STRANGER,
      code: '123456',
      passwordKey: KEY_A,
    });
    expect(unlisted.status).toBe(wrong.status);
    expect(await unlisted.text()).toBe(await wrong.text());
  });

  it('ends every older session for that email', async () => {
    const first = await h.signUp(PARENT, KEY_A);
    const login = await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A });
    const second = cookieFrom(login);
    const others = await h.signUp(OTHER_PARENT, KEY_A);
    const third = await h.signUp(PARENT, KEY_B);

    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: first })).status).toBe(401);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: second })).status).toBe(401);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: third })).status).toBe(200);
    // The other parent is untouched.
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: others })).status).toBe(200);
    // The old password no longer works, the new one does.
    expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A })).status).toBe(401);
    expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B })).status).toBe(200);
  });
});

describe('signing in with a password', () => {
  it('gives a wrong email, a wrong password and an unlisted email the same reply', async () => {
    await h.signUp(PARENT, KEY_A);
    const wrongPassword = await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B });
    const noAccount = await h.call('POST', '/api/auth/login', { email: OTHER_PARENT, passwordKey: KEY_A });
    const unlisted = await h.call('POST', '/api/auth/login', { email: STRANGER, passwordKey: KEY_A });
    const expected = await wrongPassword.text();
    expect(wrongPassword.status).toBe(401);
    for (const reply of [noAccount, unlisted]) {
      expect(reply.status).toBe(401);
      expect(await reply.text()).toBe(expected);
      expect(reply.headers.get('Set-Cookie')).toBeNull();
    }
  });

  it('locks after five wrong passwords, for 15 minutes', async () => {
    await h.signUp(PARENT, KEY_A);
    for (let i = 0; i < 4; i += 1) {
      const reply = await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B });
      expect(reply.status).toBe(401);
    }
    const fifth = await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B });
    expect(fifth.status).toBe(429);
    expect(await fifth.json()).toEqual({ error: 'locked' });

    // Even the right password is refused while locked.
    const locked = await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A });
    expect(locked.status).toBe(429);
    expect(locked.headers.get('Set-Cookie')).toBeNull();

    h.advance(15 * MINUTE - 1);
    expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A })).status).toBe(429);
    h.advance(1);
    expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A })).status).toBe(200);
  });

  it('locks an unlisted email in the same way, so the lock tells nothing', async () => {
    const replies: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      replies.push((await h.call('POST', '/api/auth/login', { email: STRANGER, passwordKey: KEY_B })).status);
    }
    expect(replies).toEqual([401, 401, 401, 401, 429, 429]);
  });

  it('four wrong tries do not lock, and a good sign-in clears the count', async () => {
    await h.signUp(PARENT, KEY_A);
    for (let i = 0; i < 4; i += 1) await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B });
    expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A })).status).toBe(200);
    for (let i = 0; i < 4; i += 1) {
      expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B })).status).toBe(401);
    }
  });

  it('a new password by emailed code clears the lock', async () => {
    await h.signUp(PARENT, KEY_A);
    for (let i = 0; i < 5; i += 1) await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B });
    expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A })).status).toBe(429);
    await h.signUp(PARENT, KEY_B);
    expect((await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B })).status).toBe(200);
  });

  it('refuses a body that is not the expected shape', async () => {
    const short = await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: 'abc' });
    expect(short.status).toBe(400);
    const broken = await h.call('POST', '/api/auth/login', undefined, { rawBody: '{not json' });
    expect(broken.status).toBe(400);
  });
});

describe('sessions', () => {
  it('returns the email and the end date, and lasts a fixed 30 days', async () => {
    const cookie = await h.signUp();
    const start = h.deps.now().getTime();
    const first = await h.call('GET', '/api/auth/session', undefined, { cookie });
    expect(first.status).toBe(200);
    const body = (await first.json()) as { email: string; expiresAt: string };
    expect(body).toEqual({ email: PARENT, expiresAt: new Date(start + 30 * DAY).toISOString(), canInvite: true });

    // Using the session never extends it.
    h.advance(29 * DAY);
    const later = await h.call('GET', '/api/auth/session', undefined, { cookie });
    expect(((await later.json()) as { expiresAt: string }).expiresAt).toBe(body.expiresAt);
    expect(later.headers.get('Set-Cookie')).toBeNull();

    h.advance(DAY);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie })).status).toBe(401);
  });

  it('logout ends only this session', async () => {
    const one = await h.signUp();
    const two = cookieFrom(await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A }));
    const out = await h.call('POST', '/api/auth/logout', {}, { cookie: one });
    expect(out.status).toBe(200);
    expect(out.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: one })).status).toBe(401);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: two })).status).toBe(200);
  });

  it('logout-all ends every session for that email and no one else', async () => {
    const one = await h.signUp();
    const two = cookieFrom(await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A }));
    const other = await h.signUp(OTHER_PARENT, KEY_B);
    expect((await h.call('POST', '/api/auth/logout-all', {}, { cookie: one })).status).toBe(200);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: one })).status).toBe(401);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: two })).status).toBe(401);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie: other })).status).toBe(200);
  });

  it('ends the session of an email that is taken off the family list', async () => {
    const cookie = await h.signUp();
    h.deps.parentEmails = [OTHER_PARENT];
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie })).status).toBe(401);
  });

  it('refuses a made-up cookie', async () => {
    const reply = await h.call('GET', '/api/auth/session', undefined, { cookie: 'x'.repeat(43) });
    expect(reply.status).toBe(401);
  });
});

describe('the guard over /api', () => {
  const unknownPaths = ['/api/nothing-here', '/api', '/api/auth', '/api/backup', '/api/backup/history', '/api/voice-pack', '/api/auth/session/x'];

  it('answers 401 in JSON on any unknown path without a session, never the app page', async () => {
    for (const path of unknownPaths) {
      for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
        const reply = await h.call(method, path);
        expect(reply.status, `${method} ${path}`).toBe(401);
        expect(reply.headers.get('Content-Type')).toBe('application/json');
        expect(await reply.json()).toEqual({ error: 'signed_out' });
      }
    }
  });

  it('answers 404 on an unknown path with a session', async () => {
    const cookie = await h.signUp();
    for (const path of unknownPaths.filter((p) => p !== '/api/voice-pack' && p !== '/api/backup')) {
      const reply = await h.call('GET', path, undefined, { cookie });
      expect(reply.status, path).toBe(404);
      expect(reply.headers.get('Content-Type')).toBe('application/json');
    }
  });

  it('checks the session before anything else on a guarded route', async () => {
    // No session and a foreign origin: the answer is still "signed out".
    const reply = await h.call('POST', '/api/auth/logout', {}, { origin: 'https://evil.example.com' });
    expect(reply.status).toBe(401);
  });

  it('needs a session for the sign-in routes under any other method', async () => {
    for (const path of ['/api/auth/start', '/api/auth/password', '/api/auth/login']) {
      expect((await h.call('GET', path)).status).toBe(401);
    }
    expect((await h.call('GET', '/api/auth/logout')).status).toBe(401);
  });

  it('refuses a write from another origin, with no origin, or that is not JSON', async () => {
    const cookie = await h.signUp();
    const sentBefore = h.mailer.sent.length;
    h.advance(61_000);
    const cases = [
      { origin: 'https://evil.example.com' },
      { origin: ORIGIN.replace('https://', 'http://') },
      { origin: `${ORIGIN}:8443` },
      { origin: `${ORIGIN}.example.com` },
      { origin: 'null' },
      { origin: null },
      { contentType: 'text/plain' },
      { contentType: 'application/x-www-form-urlencoded' },
      { contentType: null },
    ];
    for (const options of cases) {
      const open = await h.call('POST', '/api/auth/start', { email: PARENT }, options);
      expect(open.status, JSON.stringify(options)).toBe(403);
      const guarded = await h.call('POST', '/api/auth/logout-all', {}, { ...options, cookie });
      expect(guarded.status, JSON.stringify(options)).toBe(403);
    }
    expect(h.mailer.sent).toHaveLength(sentBefore);
    expect((await h.call('GET', '/api/auth/session', undefined, { cookie })).status).toBe(200);
  });

  it('never caches a reply, and sends the safety headers', async () => {
    const reply = await h.call('POST', '/api/auth/start', { email: PARENT });
    expect(reply.headers.get('Cache-Control')).toBe('no-store');
    expect(reply.headers.get('Strict-Transport-Security')).toBe('max-age=31536000');
    expect(reply.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('answers 500 without detail when the store fails, and logs nothing private', async () => {
    const logged: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    h.store.getAttempts = async () => {
      throw new Error(`cannot read ${PARENT}`);
    };
    const reply = await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_A });
    expect(reply.status).toBe(500);
    expect(await reply.json()).toEqual({ error: 'server' });
    expect(logged.join('\n')).not.toContain(PARENT);
    expect(logged.join('\n')).not.toContain(KEY_A);
  });
});

describe('what gets logged', () => {
  it('carries no email, code, password key or cookie through a whole sign-in', async () => {
    const lines: string[] = [];
    for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(' '));
      });
    }
    const cookie = await h.signUp(PARENT, KEY_A);
    const code = h.lastCode();
    await h.call('POST', '/api/auth/login', { email: PARENT, passwordKey: KEY_B });
    await h.call('POST', '/api/auth/login', { email: STRANGER, passwordKey: KEY_B });
    await h.call('GET', '/api/auth/session', undefined, { cookie });
    await h.call('POST', '/api/auth/logout', {}, { cookie });
    const all = lines.join('\n');
    for (const secret of [PARENT, STRANGER, code, KEY_A, KEY_B, cookie]) expect(all).not.toContain(secret);
    expect(ORIGIN).toBe(h.deps.appOrigin);
  });
});
