import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import type { ReloadNote } from '../../src/app/updates';
import { CHECK_EVERY_MS, LOOK_AGAIN_MS, RETRY_RELOAD_MS, RUNNING_BUILD, checkForUpdate, finishUpdate, isSafeToUpdate, resetUpdatesForTests, startUpdates, watchForUpdates } from '../../src/app/updates';
import { advanceClock, freezeClock } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { NOW, answer, holdHome, openApp, openSkill, setUp, settled, sumOnScreen } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  stop: () => undefined,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: () => undefined,
  unlockAudio: async () => undefined,
}));

// A stand-in for the browser's service worker and for the server's /build.json.
function fakeBrowser(start: { server: string | null } = { server: 'b1' }) {
  const registration = { update: vi.fn(async () => undefined) };
  const container = { register: vi.fn(async () => registration) };
  const reload = vi.fn();
  const state = { server: start.server };
  const serverBuild = vi.fn(async () => state.server);
  const note: { value: ReloadNote | null } = { value: null };
  const lastReload = { get: () => note.value, set: (next: ReloadNote) => void (note.value = next) };
  return {
    deps: { container: container as unknown as ServiceWorkerContainer, reload, serverBuild, running: 'b1', lastReload },
    note,
    container,
    registration,
    reload,
    serverBuild,
    // A new build is published.
    publish: (id: string) => {
      state.server = id;
    },
  };
}

beforeEach(() => {
  resetUpdatesForTests();
  useAppStore.getState().setNewerBuild(false);
  freezeClock(NOW);
});
afterEach(() => resetUpdatesForTests());

const newer = (): boolean => useAppStore.getState().newerBuild;
const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('finding a new build', () => {
  it('the build id is set by the build', () => {
    expect(typeof RUNNING_BUILD).toBe('string');
    expect(RUNNING_BUILD.length).toBeGreaterThan(0);
  });

  it('registers the service worker once, at the root of the site, never from the browser cache', async () => {
    const browser = fakeBrowser();
    await startUpdates(browser.deps);
    await startUpdates(browser.deps);
    expect(browser.container.register).toHaveBeenCalledTimes(1);
    expect(browser.container.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  });

  it('asks the server at launch, and the same build changes nothing', async () => {
    const browser = fakeBrowser();
    await startUpdates(browser.deps);
    await flush();
    expect(browser.serverBuild).toHaveBeenCalledTimes(1);
    expect(browser.registration.update).toHaveBeenCalledTimes(1);
    expect(newer()).toBe(false);
  });

  it('a newer build on the server at launch is noticed', async () => {
    const browser = fakeBrowser({ server: 'b2' });
    await startUpdates(browser.deps);
    await waitFor(() => expect(newer()).toBe(true));
  });

  it('no answer from the server (offline) changes nothing', async () => {
    const browser = fakeBrowser({ server: null });
    await startUpdates(browser.deps);
    await flush();
    expect(newer()).toBe(false);
  });

  it('a browser with no service workers still asks the server, and the app runs', async () => {
    const browser = fakeBrowser({ server: 'b2' });
    await startUpdates({ ...browser.deps, container: undefined });
    await waitFor(() => expect(newer()).toBe(true));
    expect(recentErrors()).toEqual([]);
  });

  it('a failed registration is logged, and the app still asks the server', async () => {
    const browser = fakeBrowser({ server: 'b2' });
    browser.container.register.mockRejectedValueOnce(new Error('SecurityError'));
    await startUpdates(browser.deps);
    expect(recentErrors().length).toBe(1);
    await waitFor(() => expect(newer()).toBe(true));
  });

  it('asks the server at most once a minute, and a failed check is tried again later', async () => {
    const browser = fakeBrowser();
    await startUpdates(browser.deps); // the launch check
    advanceClock(CHECK_EVERY_MS - 1);
    checkForUpdate();
    expect(browser.serverBuild).toHaveBeenCalledTimes(1);
    advanceClock(1);
    browser.registration.update.mockRejectedValueOnce(new Error('offline'));
    browser.serverBuild.mockResolvedValueOnce(null);
    checkForUpdate();
    checkForUpdate();
    expect(browser.serverBuild).toHaveBeenCalledTimes(2);
    browser.publish('b2');
    advanceClock(CHECK_EVERY_MS);
    checkForUpdate();
    expect(browser.serverBuild).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(newer()).toBe(true));
    expect(recentErrors()).toEqual([]);
  });

  it('asks again on coming back to the front, back from the page cache, back online, and every quarter hour on screen', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const browser = fakeBrowser();
      await startUpdates(browser.deps);
      const stop = watchForUpdates();
      const calls = (): number => browser.serverBuild.mock.calls.length;
      for (const fire of [
        () => document.dispatchEvent(new Event('visibilitychange')),
        () => window.dispatchEvent(new Event('pageshow')),
        () => window.dispatchEvent(new Event('online')),
      ]) {
        const before = calls();
        fire(); // within a minute of the last check: nothing
        expect(calls()).toBe(before);
        advanceClock(CHECK_EVERY_MS);
        fire();
        expect(calls()).toBe(before + 1);
      }
      const before = calls();
      advanceClock(LOOK_AGAIN_MS);
      vi.advanceTimersByTime(LOOK_AGAIN_MS);
      expect(calls()).toBe(before + 1);
      stop();
      advanceClock(LOOK_AGAIN_MS);
      vi.advanceTimersByTime(LOOK_AGAIN_MS);
      window.dispatchEvent(new Event('pageshow'));
      expect(calls()).toBe(before + 1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('loading the newer build', () => {
  it('loads the page again once, and only when the server has a newer build', async () => {
    const browser = fakeBrowser();
    await startUpdates(browser.deps);
    await flush();
    finishUpdate();
    expect(browser.reload).not.toHaveBeenCalled();
    browser.publish('b2');
    advanceClock(CHECK_EVERY_MS);
    checkForUpdate();
    await waitFor(() => expect(newer()).toBe(true));
    finishUpdate();
    finishUpdate();
    expect(browser.reload).toHaveBeenCalledTimes(1);
    expect(newer()).toBe(false);
  });

  it('a page that loaded again but is still the old build (the server was slow) does not loop', async () => {
    const browser = fakeBrowser({ server: 'b2' });
    await startUpdates(browser.deps);
    await waitFor(() => expect(newer()).toBe(true));
    finishUpdate();
    expect(browser.note.value).toEqual({ build: 'b2', at: NOW.getTime() });
    // The page loads again, from the kept copy: still b1. The same note is in the tab.
    resetUpdatesForTests();
    await startUpdates(browser.deps);
    await flush();
    expect(newer()).toBe(false);
    // Ten minutes on, it tries again.
    advanceClock(RETRY_RELOAD_MS);
    checkForUpdate();
    await waitFor(() => expect(newer()).toBe(true));
    // A build newer still is tried at once.
    resetUpdatesForTests();
    useAppStore.getState().setNewerBuild(false);
    browser.note.value = { build: 'b2', at: NOW.getTime() + RETRY_RELOAD_MS };
    browser.publish('b3');
    await startUpdates(browser.deps);
    await waitFor(() => expect(newer()).toBe(true));
  });

  it('only the profile picker and home are safe screens', () => {
    expect(['/', '/home'].every(isSafeToUpdate)).toBe(true);
    expect(['/skill/M-K-C4', '/skill/M-K-C4/learn', '/play', '/review', '/subject/math', '/signin'].some(isSafeToUpdate)).toBe(false);
  });

  it('a newer build on the profile picker loads straight away, with no button to press', async () => {
    const browser = fakeBrowser();
    await startUpdates(browser.deps);
    await setUp('K');
    openApp();
    await screen.findByRole('button', { name: 'Robin' });
    browser.publish('b2');
    advanceClock(CHECK_EVERY_MS);
    checkForUpdate();
    await waitFor(() => expect(browser.reload).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: /Update now/ })).toBeNull();
  });

  it('a newer build found in the middle of a question waits until the child is back on home', async () => {
    const browser = fakeBrowser();
    await startUpdates(browser.deps);
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    browser.publish('b2');
    advanceClock(CHECK_EVERY_MS);
    checkForUpdate();
    await waitFor(() => expect(newer()).toBe(true));
    await answer(user, sumOnScreen());
    await settled();
    await answer(user, sumOnScreen());
    await settled();
    expect(browser.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    await holdHome();
    await waitFor(() => expect(browser.reload).toHaveBeenCalledTimes(1));
  });
});
