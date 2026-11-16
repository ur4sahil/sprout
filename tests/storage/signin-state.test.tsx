import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../src/app/App';
import { useAppStore } from '../../src/app/store';
import { advanceClock } from '../../src/lib/clock';
import { logError, recentErrors } from '../../src/lib/errorLog';
import { accountSettled, checkSession, requestCode, setPasswordWithCode, signOut } from '../../src/storage/account';
import { ImportError, exportFileName, parseExportFile, parseExportText } from '../../src/storage/exportFile';
import { keepErrorsInDeviceRecord, openRepo, requestPersistence, setRepoForTests } from '../../src/storage/index';
import { memoryRepo } from '../../src/storage/memoryRepo';
import { PARENT } from '../worker/harness';
import type { ServerStub } from './serverStub';
import { stubServer } from './serverStub';
import { giveFamilyPin } from '../helpers/familyPin';

const DAY = 24 * 60 * 60 * 1000;

async function signedIn(): Promise<ServerStub> {
  const stub = stubServer();
  await requestCode(PARENT);
  await setPasswordWithCode(PARENT, stub.server.lastCode(), 'a long password');
  await giveFamilyPin();
  return stub;
}

// As if the app was closed and opened again: the screen state is gone, the device record is not.
async function relaunch(path = '/'): Promise<void> {
  // A real launch starts with nothing in memory.
  useAppStore.getState().setAccount({ status: 'checking' });
  useAppStore.getState().setLink('waiting');
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => expect(useAppStore.getState().account.status).not.toBe('checking'));
}

describe('the sign-in state kept in the device record', () => {
  it('remembers who signed in and when the session ends, and nothing else about the account', async () => {
    await signedIn();
    const device = await (await openRepo()).repo.getDeviceState();
    expect(device.signedInEmail).toBe(PARENT);
    expect(device.sessionExpiresAt).toBe(new Date(new Date('2026-01-10T12:00:00.000Z').getTime() + 30 * DAY).toISOString());
    expect(JSON.stringify(device)).not.toContain('a long password');
  });

  it('after one sign-in, the app opens with the network off', async () => {
    const stub = await signedIn();
    stub.goOffline();
    await relaunch('/home');
    expect(useAppStore.getState().account).toMatchObject({ status: 'signedIn', email: PARENT });
    expect(await screen.findByRole('heading', { name: 'Sprout' })).toBeTruthy();
    expect(screen.queryByLabelText('Password')).toBeNull();
    await accountSettled();
    // Being offline did not sign the device out.
    expect((await (await openRepo()).repo.getDeviceState()).signedInEmail).toBe(PARENT);
  });

  it('still opens offline on the last day, and locks once the saved end date has passed', async () => {
    const stub = await signedIn();
    stub.goOffline();
    advanceClock(30 * DAY - 1000);
    await relaunch();
    expect(useAppStore.getState().account.status).toBe('signedIn');

    advanceClock(1000);
    await relaunch();
    expect(useAppStore.getState().account).toEqual({ status: 'signedOut', offline: false });
    expect((await screen.findAllByRole('button', { name: 'Sign in' })).length).toBeGreaterThan(0);
    const device = await (await openRepo()).repo.getDeviceState();
    expect(device.signedInEmail).toBeNull();
    expect(device.sessionExpiresAt).toBeNull();
  });

  it('locks on the end date with the network on too', async () => {
    const stub = await signedIn();
    advanceClock(31 * DAY);
    stub.server.advance(31 * DAY);
    await relaunch();
    expect(useAppStore.getState().account.status).toBe('signedOut');
  });

  it('when the server says the session is no longer good, the app stays open this launch and locks at the next', async () => {
    const stub = await signedIn();
    // "Sign out everywhere" was chosen on another device.
    await stub.server.store.deleteSessionsFor(PARENT);
    await relaunch();
    expect(useAppStore.getState().account.status).toBe('signedIn'); // never locks in the middle of a session
    await accountSettled();
    expect((await (await openRepo()).repo.getDeviceState()).signedInEmail).toBeNull();
    await relaunch();
    expect(useAppStore.getState().account).toEqual({ status: 'signedOut', offline: false });
  });

  it('a server fault during the background check does not sign the device out', async () => {
    const stub = await signedIn();
    stub.server.store.getSession = async () => {
      throw new Error('database is down');
    };
    await relaunch();
    await accountSettled();
    expect((await (await openRepo()).repo.getDeviceState()).signedInEmail).toBe(PARENT);
    expect(useAppStore.getState().account.status).toBe('signedIn');
  });

  it('signing out forgets the sign-in on the device and keeps everything else', async () => {
    await signedIn();
    const { repo } = await openRepo();
    await repo.saveDeviceState({ ...(await repo.getDeviceState()), muted: true });
    await signOut();
    const device = await repo.getDeviceState();
    expect(device.signedInEmail).toBeNull();
    expect(device.sessionExpiresAt).toBeNull();
    expect(device.muted).toBe(true);
    await relaunch();
    expect(useAppStore.getState().account.status).toBe('signedOut');
  });

  it('a device whose record was lost is signed in again from the server cookie', async () => {
    await signedIn();
    setRepoForTests(memoryRepo()); // the saved data is gone, the cookie is not
    useAppStore.getState().setAccount({ status: 'checking' });
    await checkSession();
    expect(useAppStore.getState().account.status).toBe('signedIn');
    expect((await (await openRepo()).repo.getDeviceState()).signedInEmail).toBe(PARENT);
  });

  it('signs in for this launch even when the device record cannot be written', async () => {
    const stub = stubServer();
    const repo = memoryRepo();
    repo.updateDeviceState = async () => {
      throw new Error('storage is full');
    };
    setRepoForTests(repo);
    await requestCode(PARENT);
    expect(await setPasswordWithCode(PARENT, stub.server.lastCode(), 'a long password')).toEqual({ ok: true });
    expect(useAppStore.getState().account.status).toBe('signedIn');
    expect(recentErrors().map((e) => e.message)).toContain('storage is full');
  });
});

describe('storage at start-up', () => {
  it('shows a banner when progress cannot be saved, and none when it can', async () => {
    stubServer();
    setRepoForTests(memoryRepo(), false);
    await relaunch();
    expect(screen.getByRole('status').textContent).toBe('Progress will not be kept on this device. It is still saved online while the internet is on.');
  });

  it('shows no banner on a device that saves', async () => {
    stubServer();
    await relaunch();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('falls back to memory, with the banner, when IndexedDB is not there', async () => {
    stubServer();
    setRepoForTests(null); // open for real: this test environment has no IndexedDB
    const opened = await openRepo();
    expect(opened.saved).toBe(false);
    await opened.repo.saveDeviceState({ ...(await opened.repo.getDeviceState()), muted: true });
    expect((await (await openRepo()).repo.getDeviceState()).muted).toBe(true); // one repo for the whole launch
    await relaunch();
    expect(screen.getByRole('status').textContent).toContain('will not be kept on this device');
  });

  it('asks for persistent storage once and remembers the answer', async () => {
    const repo = memoryRepo();
    let asked = 0;
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        persist: async () => {
          asked += 1;
          return true;
        },
      },
    });
    try {
      await requestPersistence(repo);
      await requestPersistence(repo);
      expect(asked).toBe(1);
      expect((await repo.getDeviceState()).persistGranted).toBe(true);
    } finally {
      Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
    }
  });

  it('copes with a browser that cannot be asked, and asks again another time', async () => {
    const repo = memoryRepo();
    await requestPersistence(repo);
    expect((await repo.getDeviceState()).persistGranted).toBeNull();
  });

  it('keeps the last 20 errors in the device record across launches', async () => {
    const repo = memoryRepo();
    await keepErrorsInDeviceRecord(repo);
    for (let i = 0; i < 23; i += 1) logError(new Error(`problem ${i}`));
    await waitFor(async () => expect((await repo.getDeviceState()).errors.at(-1)?.message).toBe('problem 22'));
    const saved = (await repo.getDeviceState()).errors;
    expect(saved).toHaveLength(20);
    expect(saved[0]?.message).toBe('problem 3');
    // The next launch starts with them.
    await keepErrorsInDeviceRecord(repo);
    expect(recentErrors().map((e) => e.message).slice(-2)).toEqual(['problem 21', 'problem 22']);
    expect(recentErrors()).toHaveLength(20);
  });

  it('an error while storage is failing is kept in memory and never throws', async () => {
    const repo = memoryRepo();
    repo.saveDeviceState = async () => {
      throw new Error('disk full');
    };
    await keepErrorsInDeviceRecord(repo);
    expect(() => logError(new Error('first'))).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(recentErrors().map((e) => e.message)).toEqual(['first']);
  });
});

describe('reading a backup file', () => {
  const good = async (): Promise<unknown> => JSON.parse(JSON.stringify(await memoryRepo().exportAll()));

  it('accepts a file this version wrote', async () => {
    const file = parseExportFile(await good());
    expect(file.format).toBe('sprout-export');
    expect(parseExportText(JSON.stringify(await good())).version).toBe(1);
  });

  it('accepts a file from before the quarantined list existed', async () => {
    const old = (await good()) as Record<string, unknown>;
    delete old.quarantined;
    expect(parseExportFile(old).quarantined).toEqual([]);
  });

  it('says what is wrong in words a parent can read', async () => {
    expect(() => parseExportText('not json at all')).toThrow('This is not a Sprout backup file.');
    expect(() => parseExportText('{"hello":1}')).toThrow('This is not a Sprout backup file.');
    const file = (await good()) as object;
    expect(() => parseExportFile({ ...file, version: 9 })).toThrow(/newer version of Sprout/);
    expect(() => parseExportFile({ ...file, children: [{ id: 'x' }] })).toThrow('This backup file is damaged and cannot be read.');
    expect(() => parseExportFile(null)).toThrow(ImportError);
  });

  it('names the file by its day', () => {
    expect(exportFileName('2026-03-09')).toBe('sprout-backup-2026-03-09.json');
  });
});
