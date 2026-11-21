import { z } from 'zod';
import { useAppStore } from '../app/store';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { openRepo } from './index';

// Talks to /api/auth and keeps the sign-in state: in the app store for this launch, and in the
// device record, so the app opens with no network after one sign-in.
// The password itself never leaves the device: it is stretched here first.

export const MIN_PASSWORD_LENGTH = 10;
const PBKDF2_ROUNDS = 310_000;

const sessionReply = z.object({ email: z.string(), expiresAt: z.string() });
const errorReply = z.object({ error: z.string() });

export type AuthFailure = 'invalid' | 'locked' | 'bad_code' | 'bad_invite' | 'bad_reset' | 'taken' | 'offline' | 'server';
export type AuthResult = { ok: true } | { ok: false; reason: AuthFailure };

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function derivePasswordKey(email: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(`sprout:${cleanEmail(email)}`),
      iterations: PBKDF2_ROUNDS,
    },
    material,
    256,
  );
  return toHex(new Uint8Array(bits));
}

async function post(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
  } catch {
    return null; // no network
  }
}

async function readJson(reply: Response): Promise<unknown> {
  try {
    return await reply.json();
  } catch {
    return null;
  }
}

async function failureOf(reply: Response): Promise<AuthFailure> {
  const parsed = errorReply.safeParse(await readJson(reply));
  const code = parsed.success ? parsed.data.error : '';
  if (code === 'invalid' || code === 'locked' || code === 'bad_code' || code === 'bad_invite' || code === 'bad_reset' || code === 'taken') return code;
  return 'server';
}

// What the device record remembers: who is signed in and when the session ends. Never the password.
async function remember(session: { email: string; expiresAt: string } | null): Promise<void> {
  try {
    const { repo } = await openRepo();
    await repo.updateDeviceState({ signedInEmail: session?.email ?? null, sessionExpiresAt: session?.expiresAt ?? null });
  } catch (error) {
    // The sign-in still holds for this launch. It will be asked for again at the next one.
    logError(error);
  }
}

async function acceptSession(reply: Response | null): Promise<AuthResult> {
  if (!reply) return { ok: false, reason: 'offline' };
  if (!reply.ok) return { ok: false, reason: await failureOf(reply) };
  const parsed = sessionReply.safeParse(await readJson(reply));
  if (!parsed.success) return { ok: false, reason: 'server' };
  await remember(parsed.data);
  useAppStore.getState().setAccount({ status: 'signedIn', ...parsed.data });
  return { ok: true };
}

type ServerAnswer = { kind: 'session'; email: string; expiresAt: string } | { kind: 'none' } | { kind: 'unreachable' };

async function askServer(): Promise<ServerAnswer> {
  let reply: Response;
  try {
    reply = await fetch('/api/auth/session', { credentials: 'same-origin' });
  } catch {
    return { kind: 'unreachable' };
  }
  if (reply.status === 401) return { kind: 'none' };
  const parsed = reply.ok ? sessionReply.safeParse(await readJson(reply)) : null;
  // Anything else (a server fault, a reply that makes no sense) settles nothing either way.
  return parsed && parsed.success ? { kind: 'session', ...parsed.data } : { kind: 'unreachable' };
}

// Set while the launch check is still comparing the saved sign-in with the server. Tests wait on it.
let background: Promise<void> = Promise.resolve();
export function accountSettled(): Promise<void> {
  return background;
}

// Run once at launch. Decides whether this device is signed in.
//  - A saved end date that has not passed: the app opens, with or without a network.
//  - A saved end date that has passed: the app locks, with or without a network.
//  - Nothing saved: ask the server.
// If the server says the session is no longer good, the app locks at its next launch,
// never in the middle of this one.
export async function checkSession(): Promise<void> {
  const { setAccount } = useAppStore.getState();
  let saved: { email: string; expiresAt: string } | null = null;
  try {
    const device = await (await openRepo()).repo.getDeviceState();
    if (device.signedInEmail !== null && device.sessionExpiresAt !== null) {
      saved = { email: device.signedInEmail, expiresAt: device.sessionExpiresAt };
    }
  } catch (error) {
    logError(error);
  }

  if (saved) {
    const kept = saved;
    if (now().getTime() >= new Date(kept.expiresAt).getTime()) {
      await remember(null);
      setAccount({ status: 'signedOut', offline: false });
      return;
    }
    setAccount({ status: 'signedIn', ...kept });
    // In the background: keep the saved end date in step with the server.
    background = askServer().then(async (answer) => {
      if (answer.kind === 'none') await remember(null);
      else if (answer.kind === 'session' && (answer.email !== kept.email || answer.expiresAt !== kept.expiresAt)) {
        await remember({ email: answer.email, expiresAt: answer.expiresAt });
      }
    });
    return;
  }

  const answer = await askServer();
  if (answer.kind === 'session') {
    await remember({ email: answer.email, expiresAt: answer.expiresAt });
    setAccount({ status: 'signedIn', email: answer.email, expiresAt: answer.expiresAt });
  } else {
    setAccount({ status: 'signedOut', offline: answer.kind === 'unreachable' });
  }
}

// Emails a six-digit code if the address is on the family list.
// The reply never says whether it was.
export async function requestCode(email: string): Promise<AuthResult> {
  const reply = await post('/api/auth/start', { email: cleanEmail(email) });
  if (!reply) return { ok: false, reason: 'offline' };
  return reply.ok ? { ok: true } : { ok: false, reason: 'server' };
}

export async function setPasswordWithCode(email: string, code: string, password: string): Promise<AuthResult> {
  const passwordKey = await derivePasswordKey(email, password);
  return acceptSession(await post('/api/auth/password', { email: cleanEmail(email), code, passwordKey }));
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const passwordKey = await derivePasswordKey(email, password);
  return acceptSession(await post('/api/auth/login', { email: cleanEmail(email), passwordKey }));
}

// Another family's parent makes an account from an invite link: their email and a new password. No code is
// emailed; the link stands in for it (the owner's choice, Nov 21, 2026).
export async function joinWithInvite(token: string, email: string, password: string): Promise<AuthResult> {
  const passwordKey = await derivePasswordKey(email, password);
  return acceptSession(await post('/api/auth/join', { token, email: cleanEmail(email), passwordKey }));
}

function linkToken(location: { pathname: string; hash: string }, path: string): string | null {
  if (location.pathname !== path) return null;
  const token = location.hash.replace(/^#/, '');
  return /^[A-Za-z0-9_-]{20,100}$/.test(token) ? token : null;
}

// The token in an invite link (/join#<token>), or null when this is not one.
export function inviteToken(location: { pathname: string; hash: string }): string | null {
  return linkToken(location, '/join');
}

// The token in a reset link (/reset#<token>), or null when this is not one.
export function resetToken(location: { pathname: string; hash: string }): string | null {
  return linkToken(location, '/reset');
}

// Whose reset link this is: the email, or why it cannot be used.
export async function checkResetLink(token: string): Promise<{ ok: true; email: string } | { ok: false; reason: AuthFailure }> {
  const reply = await post('/api/auth/reset-check', { token });
  if (!reply) return { ok: false, reason: 'offline' };
  if (!reply.ok) return { ok: false, reason: await failureOf(reply) };
  const parsed = z.object({ email: z.string() }).safeParse(await readJson(reply));
  return parsed.success ? { ok: true, email: parsed.data.email } : { ok: false, reason: 'server' };
}

// Sets a new password with a reset link the first family sent (invited parents get no emailed codes).
export async function resetWithLink(token: string, email: string, password: string): Promise<AuthResult> {
  const passwordKey = await derivePasswordKey(email, password);
  return acceptSession(await post('/api/auth/reset', { token, passwordKey }));
}

// The parents this family invited, for Grown-ups (the first family only), or null when it cannot be told.
export async function invitedParents(): Promise<{ email: string; joinedAt: string }[] | null> {
  try {
    const reply = await fetch('/api/members', { credentials: 'same-origin' });
    if (!reply.ok) return null;
    const parsed = z.object({ members: z.array(z.object({ email: z.string(), joinedAt: z.string() })) }).safeParse(await readJson(reply));
    return parsed.success ? parsed.data.members : null;
  } catch {
    return null;
  }
}

// A one-time link for an invited parent to set a new password, good for 3 days.
export async function makeResetLink(email: string): Promise<{ ok: true; url: string; expiresAt: string } | { ok: false; reason: AuthFailure }> {
  const reply = await post('/api/members/reset', { email });
  if (!reply) return { ok: false, reason: 'offline' };
  if (!reply.ok) return { ok: false, reason: 'server' };
  const parsed = z.object({ url: z.string(), expiresAt: z.string() }).safeParse(await readJson(reply));
  return parsed.success ? { ok: true, ...parsed.data } : { ok: false, reason: 'server' };
}

// Whether this parent may make invite links (the first family only). False when it cannot be told (offline).
export async function canInvite(): Promise<boolean> {
  try {
    const reply = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!reply.ok) return false;
    const parsed = z.object({ canInvite: z.boolean() }).safeParse(await readJson(reply));
    return parsed.success && parsed.data.canInvite;
  } catch {
    return false;
  }
}

// A new one-time invite link, good for 7 days, or why it could not be made.
export async function makeInvite(): Promise<{ ok: true; url: string; expiresAt: string } | { ok: false; reason: AuthFailure }> {
  const reply = await post('/api/invites', {});
  if (!reply) return { ok: false, reason: 'offline' };
  if (!reply.ok) return { ok: false, reason: 'server' };
  const parsed = z.object({ url: z.string(), expiresAt: z.string() }).safeParse(await readJson(reply));
  return parsed.success ? { ok: true, ...parsed.data } : { ok: false, reason: 'server' };
}

async function endSession(path: string): Promise<AuthResult> {
  const reply = await post(path, {});
  if (!reply) return { ok: false, reason: 'offline' };
  // 401 means the server had already ended it.
  if (!reply.ok && reply.status !== 401) return { ok: false, reason: 'server' };
  await remember(null);
  useAppStore.getState().setAccount({ status: 'signedOut', offline: false });
  return { ok: true };
}

export function signOut(): Promise<AuthResult> {
  return endSession('/api/auth/logout');
}

export function signOutEverywhere(): Promise<AuthResult> {
  return endSession('/api/auth/logout-all');
}

export function failureMessage(reason: AuthFailure): string {
  switch (reason) {
    case 'invalid':
      return 'That email or password is not right.';
    case 'locked':
      return 'Too many tries. Wait 15 minutes, or use "Forgot password".';
    case 'bad_code':
      return 'That code is not right, or it has run out. Ask for a new code.';
    case 'bad_invite':
      return 'This invite link has been used or has run out. Ask for a new one.';
    case 'bad_reset':
      return 'This reset link has been used or has run out. Ask for a new one.';
    case 'taken':
      return 'That email already has a Sprout account. Sign in instead.';
    case 'offline':
      return 'No internet connection. Signing in needs the internet.';
    case 'server':
      return 'Something went wrong on our side. Please try again.';
  }
}
