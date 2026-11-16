import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { codeAfter, listedEmail, logAfter, logMark, strangerEmail } from './support/fixtures';
import { BASE_URL } from './support/paths';

// Talks to the running Worker and its real local database, with no browser.
const WRITE = { Origin: BASE_URL, 'Content-Type': 'application/json' };
const KEY = 'c'.repeat(64);

async function signUp(request: APIRequestContext, email: string, passwordKey = KEY) {
  const mark = logMark();
  await request.post('/api/auth/start', { headers: WRITE, data: { email } });
  const code = await codeAfter(mark);
  return request.post('/api/auth/password', { headers: WRITE, data: { email, code, passwordKey } });
}

test.describe('static files', () => {
  test('the app page is served at the root and at any deep link', async ({ request }) => {
    for (const path of ['/', '/parent/dashboard', '/skill/M-K-B3/learn', '/no/such/page']) {
      const reply = await request.get(path);
      expect(reply.status(), path).toBe(200);
      expect(reply.headers()['content-type'], path).toContain('text/html');
      expect(await reply.text(), path).toContain('<div id="root"></div>');
    }
  });

  test('the manifest and every icon it names are served', async ({ request }) => {
    const reply = await request.get('/manifest.webmanifest');
    expect(reply.status()).toBe(200);
    const manifest = (await reply.json()) as { name: string; display: string; icons: { src: string }[] };
    expect(manifest.name).toBe('Sprout');
    expect(manifest.display).toBe('standalone');
    for (const icon of [...manifest.icons.map((i) => i.src), '/icons/apple-touch-icon.png']) {
      const image = await request.get(icon);
      expect(image.status(), icon).toBe(200);
      expect(image.headers()['content-type'], icon).toBe('image/png');
    }
  });

  test('the scripts and styles the page names are served', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const files = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1] ?? '');
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const file of files) expect((await request.get(file)).status(), file).toBe(200);
  });
});

test.describe('safety headers', () => {
  test('pages, files and API replies all carry them', async ({ request }) => {
    for (const path of ['/', '/parent/dashboard', '/manifest.webmanifest', '/icons/icon-192.png']) {
      const headers = (await request.get(path)).headers();
      expect(headers['strict-transport-security'], path).toBe('max-age=31536000');
      expect(headers['x-content-type-options'], path).toBe('nosniff');
      expect(headers['x-frame-options'], path).toBe('DENY');
      expect(headers['referrer-policy'], path).toBe('same-origin');
    }
    const api = (await request.get('/api/auth/session')).headers();
    expect(api['strict-transport-security']).toBe('max-age=31536000');
    expect(api['x-content-type-options']).toBe('nosniff');
  });

  test('the headers file itself is not served as a page', async ({ request }) => {
    const reply = await request.get('/_headers');
    expect(await reply.text()).not.toContain('Strict-Transport-Security');
  });
});

test.describe('the guard over /api', () => {
  const paths = ['/api', '/api/', '/api/nothing', '/api/auth', '/api/backup', '/api/voice-pack', '/api/auth/session/x'];

  test('without a session every path answers 401 in JSON, never the app page', async ({ request }) => {
    for (const path of paths) {
      for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const) {
        const reply = await request.fetch(path, { method, headers: WRITE, data: method === 'GET' ? undefined : {} });
        expect(reply.status(), `${method} ${path}`).toBe(401);
        expect(reply.headers()['content-type'], `${method} ${path}`).toBe('application/json');
        expect(await reply.json()).toEqual({ error: 'signed_out' });
        expect(reply.headers()['cache-control']).toBe('no-store');
      }
    }
    expect((await request.head('/api/auth/session')).status()).toBe(401);
  });

  test('with a session an unknown path answers 404 in JSON', async ({ playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    expect((await signUp(request, listedEmail())).status()).toBe(200);
    for (const path of paths) {
      const reply = await request.get(path);
      expect(reply.status(), path).toBe(404);
      expect(reply.headers()['content-type'], path).toBe('application/json');
    }
    await request.dispose();
  });

  test('a write must be JSON and come from the app itself', async ({ playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    expect((await signUp(request, listedEmail())).status()).toBe(200);
    const bad: Record<string, string>[] = [
      { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
      // The local dev server rewrites the scheme of its own host, so the wrong-scheme
      // case is covered by the Worker unit tests and the live checks instead.
      { Origin: 'https://localhost:8798', 'Content-Type': 'application/json' },
      { Origin: 'https://localhost.example.com', 'Content-Type': 'application/json' },
      { Origin: 'null', 'Content-Type': 'application/json' },
      { 'Content-Type': 'application/json' },
      { Origin: BASE_URL, 'Content-Type': 'text/plain' },
      { Origin: BASE_URL, 'Content-Type': 'application/x-www-form-urlencoded' },
    ];
    for (const headers of bad) {
      const label = JSON.stringify(headers);
      const mark = logMark();
      const open = await request.post('/api/auth/start', { headers, data: JSON.stringify({ email: listedEmail() }) });
      expect(open.status(), label).toBe(403);
      const login = await request.post('/api/auth/login', { headers, data: JSON.stringify({ email: 'a@example.com', passwordKey: KEY }) });
      expect(login.status(), label).toBe(403);
      const guarded = await request.post('/api/auth/logout-all', { headers, data: '{}' });
      expect(guarded.status(), label).toBe(403);
      expect(logAfter(mark), label).not.toContain('sign-in code');
    }
    // The session survived every refused write.
    expect((await request.get('/api/auth/session')).status()).toBe(200);
    await request.dispose();
  });
});

test.describe('sign-in routes', () => {
  test('a listed and an unlisted address get the same reply to a code request', async ({ request }) => {
    const mark = logMark();
    const listed = await request.post('/api/auth/start', { headers: WRITE, data: { email: listedEmail() } });
    await codeAfter(mark);
    const unlisted = await request.post('/api/auth/start', { headers: WRITE, data: { email: strangerEmail() } });
    expect(unlisted.status()).toBe(listed.status());
    expect(await unlisted.text()).toBe(await listed.text());
    expect(unlisted.headers()['set-cookie']).toBeUndefined();
  });

  test('setting a password answers with a session cookie that has every flag', async ({ playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    const email = listedEmail();
    const reply = await signUp(request, email);
    expect(reply.status()).toBe(200);
    const cookie = reply.headers()['set-cookie'] ?? '';
    const parts = cookie.split(';').map((p) => p.trim());
    expect(parts[0]).toMatch(/^__Host-sprout=[A-Za-z0-9_-]{43}$/);
    for (const flag of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=2592000']) expect(parts).toContain(flag);
    expect(cookie).not.toMatch(/Domain=/i);
    const body = (await reply.json()) as { email: string; expiresAt: string };
    expect(body.email).toBe(email);
    const days = (new Date(body.expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.99);
    expect(days).toBeLessThanOrEqual(30);

    const session = await request.get('/api/auth/session');
    expect(await session.json()).toEqual(body);
    await request.dispose();
  });

  test('wrong password, no account and unlisted address get the same reply', async ({ playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    const email = listedEmail();
    await signUp(request, email);
    const fresh = await playwright.request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    const replies = [
      await fresh.post('/api/auth/login', { headers: WRITE, data: { email, passwordKey: 'd'.repeat(64) } }),
      await fresh.post('/api/auth/login', { headers: WRITE, data: { email: listedEmail(), passwordKey: KEY } }),
      await fresh.post('/api/auth/login', { headers: WRITE, data: { email: strangerEmail(), passwordKey: KEY } }),
    ];
    for (const reply of replies) {
      expect(reply.status()).toBe(401);
      expect(await reply.json()).toEqual({ error: 'invalid' });
      expect(reply.headers()['set-cookie']).toBeUndefined();
    }
    const good = await fresh.post('/api/auth/login', { headers: WRITE, data: { email, passwordKey: KEY } });
    expect(good.status()).toBe(200);
    await request.dispose();
    await fresh.dispose();
  });

  test('five wrong passwords lock the address, listed or not, and four do not', async ({ request }) => {
    for (const email of [listedEmail(), strangerEmail()]) {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i += 1) {
        const reply = await request.post('/api/auth/login', { headers: WRITE, data: { email, passwordKey: KEY } });
        statuses.push(reply.status());
      }
      expect(statuses, email).toEqual([401, 401, 401, 401, 429, 429]);
    }
  });

  test('a body of the wrong shape is refused with 400 and changes nothing', async ({ request }) => {
    const email = listedEmail();
    const bodies: [string, unknown][] = [
      ['/api/auth/start', {}],
      ['/api/auth/start', { email: 7 }],
      ['/api/auth/start', { email: 'x'.repeat(300) }],
      ['/api/auth/login', { email }],
      ['/api/auth/login', { email, passwordKey: 'short' }],
      ['/api/auth/login', { email, passwordKey: 'Z'.repeat(64) }],
      ['/api/auth/password', { email, code: '12345', passwordKey: KEY }],
      ['/api/auth/password', { email, code: '1234567', passwordKey: KEY }],
      ['/api/auth/password', { email, code: 'abcdef', passwordKey: KEY }],
      ['/api/auth/password', { email, code: '123456' }],
    ];
    for (const [path, data] of bodies) {
      const reply = await request.post(path, { headers: WRITE, data });
      expect(reply.status(), `${path} ${JSON.stringify(data)}`).toBe(400);
      expect(await reply.json()).toEqual({ error: 'bad_request' });
    }
    const broken = await request.post('/api/auth/login', { headers: WRITE, data: '{not json' });
    expect(broken.status()).toBe(400);
    // None of that counted as a wrong password.
    const after = await request.post('/api/auth/login', { headers: WRITE, data: { email, passwordKey: KEY } });
    expect(after.status()).toBe(401);
  });

  test('odd input in the email cannot break a query', async ({ request }) => {
    for (const email of ["a'; drop table users; --@example.com", '"><script>alert(1)</script>@example.com', 'a@example.com\u0000']) {
      const start = await request.post('/api/auth/start', { headers: WRITE, data: { email } });
      expect(start.status(), email).toBe(200);
      const login = await request.post('/api/auth/login', { headers: WRITE, data: { email, passwordKey: KEY } });
      expect(login.status(), email).toBe(401);
    }
    // The tables are all still there.
    const again = await request.post('/api/auth/login', { headers: WRITE, data: { email: listedEmail(), passwordKey: KEY } });
    expect(again.status()).toBe(401);
  });

  test('many code requests at once make one code', async ({ request }) => {
    const email = listedEmail();
    const mark = logMark();
    const replies = await Promise.all(
      Array.from({ length: 8 }, () => request.post('/api/auth/start', { headers: WRITE, data: { email } })),
    );
    for (const reply of replies) expect(reply.status()).toBe(200);
    await codeAfter(mark);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const text = logAfter(mark);
    expect([...text.matchAll(/sign-in code: \d{6}/g)].length).toBeLessThanOrEqual(2);
  });

  test('guessing a code in parallel cannot get more than five tries', async ({ playwright, request }) => {
    const email = listedEmail();
    const mark = logMark();
    await request.post('/api/auth/start', { headers: WRITE, data: { email } });
    const code = await codeAfter(mark);
    const wrong = code === '000000' ? '000001' : '000000';
    const guesses = await Promise.all(
      Array.from({ length: 20 }, () =>
        request.post('/api/auth/password', { headers: WRITE, data: { email, code: wrong, passwordKey: KEY } }),
      ),
    );
    for (const guess of guesses) expect(guess.status()).toBe(400);
    const fresh = await playwright.request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    const right = await fresh.post('/api/auth/password', { headers: WRITE, data: { email, code, passwordKey: KEY } });
    expect(right.status()).toBe(400);
    await fresh.dispose();
  });

  test('the Worker log never shows an address, a password key or a cookie', async ({ playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    const email = listedEmail();
    const mark = logMark();
    const reply = await signUp(request, email, 'e'.repeat(64));
    const token = /__Host-sprout=([^;]+)/.exec(reply.headers()['set-cookie'] ?? '')?.[1] ?? 'missing';
    await request.post('/api/auth/login', { headers: WRITE, data: { email, passwordKey: 'f'.repeat(64) } });
    await request.post('/api/auth/logout', { headers: WRITE, data: {} });
    const text = logAfter(mark);
    for (const secret of [email, 'e'.repeat(64), 'f'.repeat(64), token]) expect(text).not.toContain(secret);
    await request.dispose();
  });
});
