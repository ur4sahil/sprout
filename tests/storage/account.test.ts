import { describe, expect, it } from 'vitest';
import { useAppStore } from '../../src/app/store';
import {
  checkSession,
  derivePasswordKey,
  requestCode,
  setPasswordWithCode,
  signIn,
  signOut,
  signOutEverywhere,
} from '../../src/storage/account';
import { PARENT, STRANGER } from '../worker/harness';
import { settle, stubServer } from './serverStub';

const PASSWORD = 'correct horse battery';

function account() {
  return useAppStore.getState().account;
}

async function signUp(stub: ReturnType<typeof stubServer>, password = PASSWORD) {
  await requestCode(PARENT);
  await settle();
  return setPasswordWithCode(PARENT, stub.server.lastCode(), password);
}

describe('derivePasswordKey', () => {
  it('is 64 hex characters, the same every time, and ignores email case', async () => {
    const key = await derivePasswordKey(PARENT, PASSWORD);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await derivePasswordKey(` ${PARENT.toUpperCase()} `, PASSWORD)).toBe(key);
  });

  it('changes with the password and with the email', async () => {
    const key = await derivePasswordKey(PARENT, PASSWORD);
    expect(await derivePasswordKey(PARENT, `${PASSWORD}!`)).not.toBe(key);
    expect(await derivePasswordKey(STRANGER, PASSWORD)).not.toBe(key);
  });
});

describe('account against the real Worker code', () => {
  it('signs up with an emailed code, and the password never leaves the device', async () => {
    const stub = stubServer();
    expect(await signUp(stub)).toEqual({ ok: true });
    const state = account();
    expect(state.status).toBe('signedIn');
    if (state.status === 'signedIn') {
      expect(state.email).toBe(PARENT);
      expect(new Date(state.expiresAt).getTime()).toBeGreaterThan(stub.server.deps.now().getTime());
    }
    expect(stub.cookie()).not.toBeNull();
    for (const call of stub.calls) expect(call.body ?? '').not.toContain(PASSWORD);
  });

  it('finds the session again at the next launch', async () => {
    const stub = stubServer();
    await signUp(stub);
    useAppStore.getState().setAccount({ status: 'checking' });
    await checkSession();
    expect(account()).toMatchObject({ status: 'signedIn', email: PARENT });
  });

  it('is signed out at launch when there is no session', async () => {
    stubServer();
    await checkSession();
    expect(account()).toEqual({ status: 'signedOut', offline: false });
  });

  it('is signed out and marked offline at launch with no network', async () => {
    stubServer().goOffline();
    await checkSession();
    expect(account()).toEqual({ status: 'signedOut', offline: true });
  });

  it('signs out, then signs in with the password', async () => {
    const stub = stubServer();
    await signUp(stub);
    expect(await signOut()).toEqual({ ok: true });
    expect(account()).toEqual({ status: 'signedOut', offline: false });
    await checkSession();
    expect(account().status).toBe('signedOut');

    expect(await signIn(PARENT, 'not the password')).toEqual({ ok: false, reason: 'invalid' });
    expect(account().status).toBe('signedOut');
    expect(await signIn(PARENT.toUpperCase(), PASSWORD)).toEqual({ ok: true });
    expect(account().status).toBe('signedIn');
  });

  it('gives an unlisted email the same answers as a wrong password', async () => {
    stubServer();
    expect(await requestCode(STRANGER)).toEqual({ ok: true });
    expect(await signIn(STRANGER, PASSWORD)).toEqual({ ok: false, reason: 'invalid' });
    expect(await setPasswordWithCode(STRANGER, '123456', PASSWORD)).toEqual({ ok: false, reason: 'bad_code' });
  });

  it('reports the lock after five wrong passwords', async () => {
    const stub = stubServer();
    await signUp(stub);
    await signOut();
    const reasons: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const result = await signIn(PARENT, 'wrong password');
      reasons.push(result.ok ? 'ok' : result.reason);
    }
    expect(reasons).toEqual(['invalid', 'invalid', 'invalid', 'invalid', 'locked']);
    expect(await signIn(PARENT, PASSWORD)).toEqual({ ok: false, reason: 'locked' });
  });

  it('signs out everywhere', async () => {
    const stub = stubServer();
    await signUp(stub);
    expect(await signOutEverywhere()).toEqual({ ok: true });
    await checkSession();
    expect(account().status).toBe('signedOut');
  });

  it('says offline, and changes nothing, when there is no network', async () => {
    const stub = stubServer();
    await signUp(stub);
    stub.goOffline();
    expect(await signIn(PARENT, PASSWORD)).toEqual({ ok: false, reason: 'offline' });
    expect(await requestCode(PARENT)).toEqual({ ok: false, reason: 'offline' });
    expect(await signOut()).toEqual({ ok: false, reason: 'offline' });
    expect(account().status).toBe('signedIn');
  });
});
