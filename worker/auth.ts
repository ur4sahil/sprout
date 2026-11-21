import { z } from 'zod';
import { hmacHex, randomCode, randomHex, randomToken, safeEqual, sha256Hex } from './crypto';
import type { Mailer } from './mailer';
import type { SessionRow, Store } from './store';

// Sign-in, password, sessions and lockout. Rules: plan section 4.

export const COOKIE_NAME = '__Host-sprout';
export const SESSION_DAYS = 30;
export const CODE_MINUTES = 10;
export const CODE_TRIES = 5;
export const CODE_RESEND_SECONDS = 60;
export const LOCK_TRIES = 5;
export const LOCK_MINUTES = 15;
export const INVITE_DAYS = 7;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface AuthDeps {
  store: Store;
  mailer: Mailer;
  pepper: string;
  parentEmails: string[]; // lower case
  now: () => Date;
  // Runs work after the reply has gone, so a listed and an unlisted
  // address take the same time to answer.
  defer: (work: Promise<void>) => void;
}

const emailField = z.string().min(3).max(254);
const startBody = z.object({ email: emailField });
const passwordBody = z.object({
  email: emailField,
  code: z.string().regex(/^\d{6}$/),
  passwordKey: z.string().regex(/^[0-9a-f]{64}$/),
});
const joinBody = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/),
  email: emailField,
  passwordKey: z.string().regex(/^[0-9a-f]{64}$/),
});
const loginBody = z.object({
  email: emailField,
  passwordKey: z.string().regex(/^[0-9a-f]{64}$/),
});

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export function parseParentEmails(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
}

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

// The first family: the parents on the list in the Worker's settings. Only they can invite.
export function isFirstFamily(deps: AuthDeps, email: string): boolean {
  return deps.parentEmails.includes(email);
}

// A parent who may sign in: one of the first family, or one who joined through an invite.
async function isListed(deps: AuthDeps, email: string): Promise<boolean> {
  return isFirstFamily(deps, email) || (await deps.store.getMember(email)) !== null;
}

// Whose records a parent reads and writes: the first family's, or the family of their own they joined into.
export async function familyFor(deps: AuthDeps, email: string, firstFamily: string): Promise<string | null> {
  if (isFirstFamily(deps, email)) return firstFamily;
  return (await deps.store.getMember(email))?.family ?? null;
}

function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Max-Age=${SESSION_DAYS * 24 * 60 * 60}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

export function clearedCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

function readCookie(request: Request): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) {
      const value = rest.join('=');
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return null;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function codeHash(deps: AuthDeps, email: string, code: string): Promise<string> {
  return hmacHex(deps.pepper, `code:${email}:${code}`);
}

function passwordHash(deps: AuthDeps, salt: string, passwordKey: string): Promise<string> {
  return hmacHex(deps.pepper, `${salt}${passwordKey}`);
}

async function startSession(deps: AuthDeps, email: string): Promise<Response> {
  const at = deps.now();
  const token = randomToken();
  const expiresAt = new Date(at.getTime() + SESSION_DAYS * DAY).toISOString();
  await deps.store.createSession({
    tokenHash: await sha256Hex(token),
    email,
    createdAt: at.toISOString(),
    expiresAt,
  });
  return json(200, { email, expiresAt }, { 'Set-Cookie': sessionCookie(token) });
}

// The session behind this request, or null. An expired one is removed.
export async function findSession(deps: AuthDeps, request: Request): Promise<SessionRow | null> {
  const token = readCookie(request);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await deps.store.getSession(tokenHash);
  if (!row) return null;
  if (deps.now().getTime() >= new Date(row.expiresAt).getTime() || !(await isListed(deps, row.email))) {
    await deps.store.deleteSession(tokenHash);
    return null;
  }
  return row;
}

// POST /api/auth/start
export async function start(deps: AuthDeps, request: Request): Promise<Response> {
  const body = await readBody(request, startBody);
  if (!body) return json(400, { error: 'bad_request' });
  const email = normalise(body.email);
  // Checked after the reply too, so a listed and an unlisted address take the same time to answer.
  deps.defer(isListed(deps, email).then((listed) => (listed ? sendCode(deps, email) : undefined)));
  return json(200, { ok: true });
}

async function sendCode(deps: AuthDeps, email: string): Promise<void> {
  try {
    const at = deps.now();
    const old = await deps.store.getCode(email);
    if (old && at.getTime() - new Date(old.sentAt).getTime() < CODE_RESEND_SECONDS * 1000) return;
    const code = randomCode();
    await deps.store.saveCode({
      email,
      codeHash: await codeHash(deps, email, code),
      sentAt: at.toISOString(),
      expiresAt: new Date(at.getTime() + CODE_MINUTES * MINUTE).toISOString(),
      tries: 0,
    });
    await deps.mailer.sendCode(email, code);
  } catch (error) {
    // Never log the address or the code.
    console.error('sign-in code could not be sent:', error instanceof Error ? error.name : 'error');
  }
}

// POST /api/auth/password
export async function setPassword(deps: AuthDeps, request: Request): Promise<Response> {
  const body = await readBody(request, passwordBody);
  if (!body) return json(400, { error: 'bad_request' });
  const email = normalise(body.email);
  const fail = () => json(400, { error: 'bad_code' });
  if (!(await isListed(deps, email))) return fail();
  const row = await deps.store.getCode(email);
  if (!row) return fail();
  const at = deps.now();
  if (at.getTime() >= new Date(row.expiresAt).getTime()) return fail();
  if (!(await deps.store.claimCodeTry(email, CODE_TRIES))) return fail();
  if (!safeEqual(await codeHash(deps, email, body.code), row.codeHash)) return fail();

  const salt = randomHex(16);
  const stamp = at.toISOString();
  await deps.store.saveUser({
    email,
    pwHash: await passwordHash(deps, salt, body.passwordKey),
    pwSalt: salt,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await deps.store.deleteCode(email);
  await deps.store.deleteSessionsFor(email);
  await deps.store.clearAttempts(email);
  return startSession(deps, email);
}

// POST /api/auth/login
export async function login(deps: AuthDeps, request: Request): Promise<Response> {
  const body = await readBody(request, loginBody);
  if (!body) return json(400, { error: 'bad_request' });
  const email = normalise(body.email);
  const at = deps.now();

  const saved = await deps.store.getAttempts(email);
  const live =
    saved && at.getTime() - new Date(saved.windowStart).getTime() < LOCK_MINUTES * MINUTE ? saved : null;
  if (live && live.count >= LOCK_TRIES) return json(429, { error: 'locked' });

  // An unknown address does the same work as a known one.
  const user = (await isListed(deps, email)) ? await deps.store.getUser(email) : null;
  const expected = user ? user.pwHash : '0'.repeat(64);
  const actual = await passwordHash(deps, user ? user.pwSalt : '0'.repeat(32), body.passwordKey);
  const matches = safeEqual(actual, expected);
  if (!user || !matches) {
    const count = (live ? live.count : 0) + 1;
    await deps.store.saveAttempts({
      email,
      windowStart: live ? live.windowStart : at.toISOString(),
      count,
    });
    return count >= LOCK_TRIES ? json(429, { error: 'locked' }) : json(401, { error: 'invalid' });
  }
  await deps.store.clearAttempts(email);
  return startSession(deps, email);
}

// GET /api/auth/session. canInvite: this parent may make invite links (the first family only).
export function sessionInfo(deps: AuthDeps, session: SessionRow): Response {
  return json(200, { email: session.email, expiresAt: session.expiresAt, canInvite: isFirstFamily(deps, session.email) });
}

// POST /api/invites: a one-time link for another family's parent, good for INVITE_DAYS. Only the first family
// may make one. The token is in the link's #fragment, so it never reaches a server log; only its hash is kept.
export async function createInvite(deps: AuthDeps, session: SessionRow, appOrigin: string): Promise<Response> {
  if (!isFirstFamily(deps, session.email)) return json(403, { error: 'forbidden' });
  const at = deps.now();
  const token = randomToken();
  const expiresAt = new Date(at.getTime() + INVITE_DAYS * DAY).toISOString();
  await deps.store.saveInvite({ tokenHash: await sha256Hex(token), createdBy: session.email, createdAt: at.toISOString(), expiresAt, usedAt: null });
  return json(200, { url: `${appOrigin}/join#${token}`, expiresAt });
}

// POST /api/auth/join: a parent with an invite link makes an account with their email and a password, and gets a
// family of their own. The link stands in for the emailed code: it was handed to them by someone who knows them.
export async function join(deps: AuthDeps, request: Request): Promise<Response> {
  const body = await readBody(request, joinBody);
  if (!body) return json(400, { error: 'bad_request' });
  const email = normalise(body.email);
  const tokenHash = await sha256Hex(body.token);
  const invite = await deps.store.getInvite(tokenHash);
  const at = deps.now();
  if (!invite || invite.usedAt !== null || at.getTime() >= new Date(invite.expiresAt).getTime()) return json(400, { error: 'bad_invite' });
  // An address that can already sign in keeps its account: an invite never moves a parent to another family.
  if ((await isListed(deps, email)) || (await deps.store.getUser(email)) !== null) return json(409, { error: 'taken' });
  if (!(await deps.store.claimInvite(tokenHash, at.toISOString()))) return json(400, { error: 'bad_invite' });

  const stamp = at.toISOString();
  await deps.store.saveMember({ email, family: `f-${randomHex(16)}`, joinedAt: stamp });
  const salt = randomHex(16);
  await deps.store.saveUser({ email, pwHash: await passwordHash(deps, salt, body.passwordKey), pwSalt: salt, createdAt: stamp, updatedAt: stamp });
  await deps.store.clearAttempts(email);
  return startSession(deps, email);
}

// POST /api/auth/logout
export async function logout(deps: AuthDeps, session: SessionRow): Promise<Response> {
  await deps.store.deleteSession(session.tokenHash);
  return json(200, { ok: true }, { 'Set-Cookie': clearedCookie() });
}

// POST /api/auth/logout-all
export async function logoutAll(deps: AuthDeps, session: SessionRow): Promise<Response> {
  await deps.store.deleteSessionsFor(session.email);
  return json(200, { ok: true }, { 'Set-Cookie': clearedCookie() });
}
