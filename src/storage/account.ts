import { z } from 'zod';
import { useAppStore } from '../app/store';

// Talks to /api/auth and keeps the sign-in state in the app store.
// The password itself never leaves the device: it is stretched here first.

export const MIN_PASSWORD_LENGTH = 10;
const PBKDF2_ROUNDS = 310_000;

const sessionReply = z.object({ email: z.string(), expiresAt: z.string() });
const errorReply = z.object({ error: z.string() });

export type AuthFailure = 'invalid' | 'locked' | 'bad_code' | 'offline' | 'server';
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
  if (code === 'invalid' || code === 'locked' || code === 'bad_code') return code;
  return 'server';
}

async function acceptSession(reply: Response | null): Promise<AuthResult> {
  if (!reply) return { ok: false, reason: 'offline' };
  if (!reply.ok) return { ok: false, reason: await failureOf(reply) };
  const parsed = sessionReply.safeParse(await readJson(reply));
  if (!parsed.success) return { ok: false, reason: 'server' };
  useAppStore.getState().setAccount({ status: 'signedIn', ...parsed.data });
  return { ok: true };
}

// Asks the server who is signed in on this device. Run once at launch.
export async function checkSession(): Promise<void> {
  const { setAccount } = useAppStore.getState();
  let reply: Response;
  try {
    reply = await fetch('/api/auth/session', { credentials: 'same-origin' });
  } catch {
    setAccount({ status: 'signedOut', offline: true });
    return;
  }
  const parsed = reply.ok ? sessionReply.safeParse(await readJson(reply)) : null;
  if (parsed && parsed.success) setAccount({ status: 'signedIn', ...parsed.data });
  else setAccount({ status: 'signedOut', offline: false });
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

async function endSession(path: string): Promise<AuthResult> {
  const reply = await post(path, {});
  if (!reply) return { ok: false, reason: 'offline' };
  // 401 means the server had already ended it.
  if (!reply.ok && reply.status !== 401) return { ok: false, reason: 'server' };
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
    case 'offline':
      return 'No internet connection. Signing in needs the internet.';
    case 'server':
      return 'Something went wrong on our side. Please try again.';
  }
}
