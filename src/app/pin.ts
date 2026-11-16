import { now } from '../lib/clock';
import type { Repo } from '../storage/repo';
import type { Family } from '../storage/schema';

// The grown-ups gate (plan section 10). One 4-digit PIN for the whole family. It is saved scrambled
// in the family record, which travels to every iPad with the backup. The PIN itself is never saved.
// A PIN keeps a child out. It is not a security barrier: the account password is.

export const PIN_LENGTH = 4;
export const PASS_MS = 10 * 60 * 1000; // a pass lasts 10 minutes, in memory only
export const MAX_WRONG = 5;
export const LOCK_MS = 60 * 1000;
const ROUNDS = 100_000;

const hex = (bytes: Uint8Array): string => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const unhex = (text: string): Uint8Array => new Uint8Array((text.match(/../g) ?? []).map((pair) => Number.parseInt(pair, 16)));

export function isPin(text: string): boolean {
  return new RegExp(`^[0-9]{${PIN_LENGTH}}$`).test(text);
}

export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex) as BufferSource, iterations: ROUNDS }, key, 256);
  return hex(new Uint8Array(bits));
}

export function hasPin(family: Family): boolean {
  return family.pinHash !== null && family.pinSalt !== null;
}

// Saves a new PIN for the family, with a fresh salt.
export async function savePin(repo: Repo, pin: string): Promise<void> {
  if (!isPin(pin)) throw new Error('A PIN is four digits');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await repo.saveFamily({ id: 'family', pinSalt: salt, pinHash: await hashPin(pin, salt), updatedAt: now().toISOString() });
}

// The gate, in memory only: closing the app closes the gate.
const gate = { passUntil: 0, wrong: 0, lockedUntil: 0 };

export function hasPass(): boolean {
  return now().getTime() < gate.passUntil;
}

export function grantPass(): void {
  gate.passUntil = now().getTime() + PASS_MS;
  gate.wrong = 0;
  gate.lockedUntil = 0;
}

export function endPass(): void {
  gate.passUntil = 0;
}

// How long the gate stays locked after five wrong tries, in milliseconds. 0 when it is not locked.
export function lockedFor(): number {
  return Math.max(0, gate.lockedUntil - now().getTime());
}

export type PinTry = 'ok' | 'wrong' | 'locked';

// One try at the gate. A right PIN gives a 10-minute pass. Five wrong tries lock the gate for a minute.
export async function tryPin(family: Family, pin: string): Promise<PinTry> {
  if (lockedFor() > 0) return 'locked';
  if (hasPin(family) && isPin(pin) && (await hashPin(pin, family.pinSalt as string)) === family.pinHash) {
    grantPass();
    return 'ok';
  }
  gate.wrong += 1;
  if (gate.wrong >= MAX_WRONG) {
    gate.wrong = 0;
    gate.lockedUntil = now().getTime() + LOCK_MS;
    return 'locked';
  }
  return 'wrong';
}

export function resetGateForTests(): void {
  gate.passUntil = 0;
  gate.wrong = 0;
  gate.lockedUntil = 0;
}
