import { beforeEach, describe, expect, it } from 'vitest';
import { INVITE_DAYS } from '../../worker/auth';
import type { Harness } from './harness';
import { KEY_A, KEY_B, ORIGIN, PARENT, STRANGER, cookieFrom, makeHarness } from './harness';

// Invites (the owner's choice, Nov 21, 2026): a parent of the first family makes a one-time link; another family's
// parent uses it to make an account with a password, and gets a family of their own that nobody else can see.

const DAY = 24 * 60 * 60 * 1000;
const NEW_PARENT = 'new.parent@example.com';
const child = (id: string, name: string) => ({ store: 'children', key: id, value: { id, name } });
type Page = { rows: { key: string; value: unknown }[] };

let h: Harness;
beforeEach(() => {
  h = makeHarness();
});

async function invite(cookie: string): Promise<string> {
  const reply = await h.call('POST', '/api/invites', {}, { cookie });
  expect(reply.status).toBe(200);
  const body = (await reply.json()) as { url: string; expiresAt: string };
  expect(body.url.startsWith(`${ORIGIN}/join#`)).toBe(true);
  return body.url.split('#')[1] as string;
}

const joinWith = (token: string, email = NEW_PARENT, passwordKey = KEY_B) => h.call('POST', '/api/auth/join', { token, email, passwordKey });

async function rows(cookie: string): Promise<Page['rows']> {
  return ((await (await h.call('GET', '/api/data', undefined, { cookie })).json()) as Page).rows;
}

describe('invites', () => {
  it('a parent of the first family makes a link; another parent joins with it into a family of their own', async () => {
    const owner = await h.signUp();
    await h.call('POST', '/api/data', { puts: [child('kid-1', 'Robin')], removes: [] }, { cookie: owner });
    const token = await invite(owner);

    const joined = await joinWith(token);
    expect(joined.status).toBe(200);
    const newcomer = cookieFrom(joined);
    // The newcomer's family starts empty, and their records never reach the first family.
    expect(await rows(newcomer)).toEqual([]);
    await h.call('POST', '/api/data', { puts: [child('kid-9', 'Sam')], removes: [] }, { cookie: newcomer });
    expect((await rows(newcomer)).map((row) => row.key)).toEqual(['kid-9']);
    expect((await rows(owner)).map((row) => row.key)).toEqual(['kid-1']);
    // They cannot make invites, or touch the first family's old backup file.
    expect((await h.call('POST', '/api/invites', {}, { cookie: newcomer })).status).toBe(403);
    expect((await h.call('GET', '/api/backup', undefined, { cookie: newcomer })).status).toBe(403);
    const session = (await (await h.call('GET', '/api/auth/session', undefined, { cookie: newcomer })).json()) as { canInvite: boolean };
    expect(session.canInvite).toBe(false);

    // Later they sign in with their password like anyone else, and are back in their own family.
    const login = await h.call('POST', '/api/auth/login', { email: NEW_PARENT, passwordKey: KEY_B });
    expect(login.status).toBe(200);
    expect((await rows(cookieFrom(login))).map((row) => row.key)).toEqual(['kid-9']);
    expect((await h.call('POST', '/api/auth/login', { email: NEW_PARENT, passwordKey: KEY_A })).status).toBe(401);
  });

  it('two invited parents get two families, apart from each other', async () => {
    const owner = await h.signUp();
    const one = cookieFrom(await joinWith(await invite(owner), 'one@example.com'));
    const two = cookieFrom(await joinWith(await invite(owner), 'two@example.com'));
    await h.call('POST', '/api/data', { puts: [child('kid-1', 'A')], removes: [] }, { cookie: one });
    expect(await rows(two)).toEqual([]);
  });

  it('a link works once, and not after it runs out', async () => {
    const owner = await h.signUp();
    const token = await invite(owner);
    expect((await joinWith(token)).status).toBe(200);
    const again = await joinWith(token, 'someone.else@example.com');
    expect(again.status).toBe(400);
    expect(await again.json()).toEqual({ error: 'bad_invite' });

    const late = await invite(owner);
    h.advance(INVITE_DAYS * DAY);
    expect((await joinWith(late, 'late@example.com')).status).toBe(400);
    expect((await joinWith('x'.repeat(43), 'made.up@example.com')).status).toBe(400);
  });

  it('never moves a parent who can already sign in, and leaves the link unused', async () => {
    const owner = await h.signUp();
    const token = await invite(owner);
    expect((await joinWith(token, PARENT)).status).toBe(409);
    expect((await joinWith(token, NEW_PARENT)).status).toBe(200);
    expect((await joinWith(await invite(owner), NEW_PARENT.toUpperCase())).status).toBe(409);
  });

  it('only a signed-in parent of the first family can make a link', async () => {
    expect((await h.call('POST', '/api/invites', {})).status).toBe(401);
    // A stranger cannot sign up without an invite.
    await h.call('POST', '/api/auth/start', { email: STRANGER });
    expect(h.mailer.sent).toEqual([]);
  });
});
