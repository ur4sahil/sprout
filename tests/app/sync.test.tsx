import { gzipSync } from 'node:zlib';
import { giveFamilyPin } from '../helpers/familyPin';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';
import { useAppStore } from '../../src/app/store';
import BackupStatus from '../../src/components/BackupStatus';
import { signIn } from '../../src/storage/account';
import { advanceClock } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import { memoryRepo } from '../../src/storage/memoryRepo';
import { SYNC_EVERY_MS, syncStatus } from '../../src/storage/sync';
import { attempt, child, state, T } from '../storage/fixtures';
import type { ServerStub } from '../storage/serverStub';
import { stubServer } from '../storage/serverStub';
import { KEY_A, PARENT } from '../worker/harness';
import { answer, holdHome, openSkill, setUp, settled, sumOnScreen } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  speakPhrase: async () => true,
  stop: () => undefined,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: () => undefined,
  unlockAudio: async () => undefined,
}));
function launch(path = '/'): ReturnType<typeof userEvent.setup> {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

// The family file another iPad left on the server: one child with a score.
async function otherIpadBackedUp(stub: ServerStub): Promise<void> {
  const other = memoryRepo();
  await other.saveChild(child('a', { name: 'Maya' }));
  await other.addAttempt(attempt('m-1', 'a', 'M-K-C4', true, T(3, 1)));
  await other.saveSkillState(state('a', 'M-K-C4', { score: 40, bestScore: 40, attempts: 1, correct: 1, recent: [true], lastPracticedAt: T(3, 1) }));
  const body = new Uint8Array(gzipSync(Buffer.from(JSON.stringify(await other.exportAll())))).buffer as ArrayBuffer;
  await stub.server.backup.write(body, 'none');
}

const uploads = (stub: ServerStub): number => stub.calls.filter((call) => call.method === 'PUT' && call.path === '/api/backup').length;
const pulls = (stub: ServerStub): number => stub.calls.filter((call) => call.method === 'GET' && call.path.startsWith('/api/backup')).length;

describe('a new iPad', () => {
  // The family already has a PIN, so the app opens past "Choose a PIN".
  // It counts as backed up already: saving it here must not look like a change waiting to upload.
  beforeEach(async () => {
    await giveFamilyPin();
    await (await openRepo()).repo.updateDeviceState({ dirty: false });
  });

  it('fetches the family\'s progress straight after the first sign-in, before the profile picker', async () => {
    const stub = stubServer();
    await stub.server.signUp(PARENT, KEY_A);
    await otherIpadBackedUp(stub);
    vi.spyOn(crypto.subtle, 'deriveBits').mockResolvedValue(new Uint8Array(32).fill(0xaa).buffer);

    // Hold the download, so the waiting screen can be seen.
    const real = globalThis.fetch;
    let letGo: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      letGo = resolve;
    });
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/backup')) await held;
      return real(input, init);
    });

    launch();
    await screen.findAllByRole('button', { name: 'Sign in' });
    await act(async () => {
      expect(await signIn(PARENT, 'correct horse battery')).toEqual({ ok: true });
    });
    expect(await screen.findByRole('heading', { name: "Getting your family's progress" })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Who is playing?' })).toBeNull();
    letGo();
    expect(await screen.findByRole('button', { name: 'Maya' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: "Getting your family's progress" })).toBeNull();
    const { repo } = await openRepo();
    expect((await repo.getSkillStates('a'))[0]?.score).toBe(40);
    expect(await repo.getDeviceState()).toMatchObject({ dirty: false, backupVersion: 'v1' });
    expect(uploads(stub)).toBe(0);
  });

  it('when the backup cannot be reached it says so, and a grown-up can try again or carry on', async () => {
    const stub = stubServer();
    await stub.server.signUp(PARENT, KEY_A);
    await otherIpadBackedUp(stub);
    vi.spyOn(crypto.subtle, 'deriveBits').mockResolvedValue(new Uint8Array(32).fill(0xaa).buffer);
    const real = globalThis.fetch;
    let down = true;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (down && String(input).startsWith('/api/backup')) throw new TypeError('Load failed');
      return real(input, init);
    });

    const user = launch();
    await screen.findAllByRole('button', { name: 'Sign in' });
    await act(async () => {
      await signIn(PARENT, 'correct horse battery');
    });
    expect((await screen.findByRole('alert')).textContent).toContain('This device is not online.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect((await screen.findByRole('alert')).textContent).toContain('This device is not online.');
    down = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Maya' })).toBeTruthy();
  });

  it('"Carry on" opens the app with what this device has', async () => {
    const stub = stubServer();
    await stub.server.signUp(PARENT, KEY_A);
    vi.spyOn(crypto.subtle, 'deriveBits').mockResolvedValue(new Uint8Array(32).fill(0xaa).buffer);
    const real = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/backup')) return new Response('{"error":"server"}', { status: 500 });
      return real(input, init);
    });
    const user = launch();
    await screen.findAllByRole('button', { name: 'Sign in' });
    await act(async () => {
      await signIn(PARENT, 'correct horse battery');
    });
    expect((await screen.findByRole('alert')).textContent).toContain('The backup could not be fetched.');
    await user.click(screen.getByRole('button', { name: 'Carry on' }));
    expect(await screen.findByRole('button', { name: 'Add a child' })).toBeTruthy();
  });

  it('a device that has synced before goes straight to the picker when a parent signs in again', async () => {
    const stub = stubServer();
    await stub.server.signUp(PARENT, KEY_A);
    vi.spyOn(crypto.subtle, 'deriveBits').mockResolvedValue(new Uint8Array(32).fill(0xaa).buffer);
    const { repo } = await openRepo();
    await repo.saveDeviceState({ ...(await repo.getDeviceState()), lastSyncAt: T(1) });
    launch();
    await screen.findAllByRole('button', { name: 'Sign in' });
    await act(async () => {
      await signIn(PARENT, 'correct horse battery');
    });
    expect(useAppStore.getState().firstSync).toBe(false);
    expect(await screen.findByRole('button', { name: 'Add a child' })).toBeTruthy();
  });
});

describe('sync in the background', () => {
  async function signedInDevice(): Promise<ServerStub> {
    const stub = stubServer();
    stub.useCookie(await stub.server.signUp(PARENT, KEY_A));
    stub.calls.length = 0;
    return stub;
  }

  it('runs at launch, and again when a session ends, never while a question is on screen', async () => {
    const stub = await signedInDevice();
    await setUp('K'); // one child, saved on this device
    const user = launch();
    await screen.findByRole('button', { name: 'Robin' });
    await waitFor(() => expect(syncStatus().last).toBe('uploaded'));
    expect(uploads(stub)).toBe(1);

    await openSkill(user, 'Add to 10');
    await answer(user, sumOnScreen());
    await settled();
    // More than 5 minutes pass, and the app comes back to the front in the middle of a session.
    advanceClock(SYNC_EVERY_MS + 1000);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(uploads(stub)).toBe(1);
    expect(pulls(stub)).toBe(1);

    // Back on home, the session is over: the new answer is backed up.
    await holdHome();
    await screen.findByRole('heading', { name: 'Robin' });
    await waitFor(() => expect(uploads(stub)).toBe(2));
    await waitFor(() => expect(syncStatus().running).toBe(false));
    expect((await (await openRepo()).repo.getDeviceState()).dirty).toBe(false);
  });

  it('coming back to the front on a quiet screen syncs, at most once every 5 minutes', async () => {
    const stub = await signedInDevice();
    await setUp('K');
    launch();
    await screen.findByRole('button', { name: 'Robin' });
    await waitFor(() => expect(syncStatus().last).toBe('uploaded'));
    const front = async (): Promise<void> => {
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    };
    await front();
    expect(pulls(stub)).toBe(1);
    advanceClock(SYNC_EVERY_MS);
    await front();
    await waitFor(() => expect(pulls(stub)).toBe(2));
    expect(uploads(stub)).toBe(1); // nothing had changed
  });

  it('holds back while a new version of the app is taking over, so nothing delays the hand-over', async () => {
    const stub = await signedInDevice();
    await setUp('K');
    useAppStore.getState().setUpdateReady(true);
    launch();
    await screen.findByRole('button', { name: 'Robin' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(pulls(stub)).toBe(0);
    // Once that is out of the way, sync runs as usual.
    act(() => useAppStore.getState().setUpdateReady(false));
    await waitFor(() => expect(uploads(stub)).toBe(1));
  });

  it('never runs while signed out', async () => {
    const stub = stubServer();
    launch();
    await screen.findAllByRole('button', { name: 'Sign in' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(stub.calls.filter((call) => call.path.startsWith('/api/backup'))).toEqual([]);
  });
});

describe('backup status, for the parent data screen', () => {
  it('shows when the last backup ran, and "Back up now" runs one', async () => {
    const stub = stubServer();
    stub.useCookie(await stub.server.signUp(PARENT, KEY_A));
    render(<BackupStatus />);
    expect(await screen.findByText('Not backed up yet.')).toBeTruthy();
    const { repo } = await openRepo();
    await repo.saveChild(child('a'));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back up now' }));
    expect(await screen.findByText(/^Last backup: /)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(stub.server.backup.writes()).toBe(1);
  });

  it('says in plain words why a backup did not run', async () => {
    const stub = stubServer();
    stub.goOffline();
    render(<BackupStatus />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Back up now' }));
    expect((await screen.findByRole('alert')).textContent).toBe('No internet. The backup will run when this device is online again.');
    stub.goOnline();
    await user.click(screen.getByRole('button', { name: 'Back up now' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Sign in again to back up.');
    expect(screen.getByText('Not backed up yet.')).toBeTruthy();
  });
});
