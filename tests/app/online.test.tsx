import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';
import { grantPass, resetGateForTests, savePin } from '../../src/app/pin';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { CATALOGUE_VERSION } from '../../src/content/catalogue';
import { freezeClock } from '../../src/lib/clock';
import type { Backend } from '../../src/storage/backend';
import { memoryBackend } from '../../src/storage/backend';
import { SEND_AFTER_MS, setDataApiForTests } from '../../src/storage/index';
import type { FakeDataApi } from '../../src/storage/online';
import { fakeDataApi, trackedBackend } from '../../src/storage/online';
import type { Repo } from '../../src/storage/repo';
import { makeRepo } from '../../src/storage/repoCore';
import type { Child } from '../../src/storage/schema';
import { defaultSettings, newSkillState } from '../../src/storage/schema';
import type { Syncer } from '../../src/storage/sync';
import { makeSyncer } from '../../src/storage/sync';
import { NOW, answer, openSkill, sumOnScreen } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  speakPhrase: async () => true,
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));

// The server and the device in the running app: it opens from the device's copy, with or without
// the internet, sends each change as it happens, and picks up what other devices saved.

const kid = (id: string, name: string, grade: Child['grade'] = 'K'): Child => ({ id, name, avatar: '🐢', grade, settings: defaultSettings(grade), resetAt: null, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), deletedAt: null });
const finished = async (repo: Repo, childId: string): Promise<void> => {
  for (const subject of ['math', 'ela'] as const) {
    await repo.saveDiagnosticProgress({ childId, subject, ladders: {}, sittings: 1, done: true, lastSittingDay: '', updatedAt: NOW.toISOString() });
    await repo.addAward({ childId, awardId: `diagnostic:${subject}`, earnedAt: NOW.toISOString() });
  }
};

let api: FakeDataApi;
let device: Backend; // this device's database
let other: { repo: Repo; sync: Syncer }; // another signed-in device

function otherDevice(): { repo: Repo; sync: Syncer } {
  const backend = trackedBackend(memoryBackend());
  const repo = makeRepo(backend);
  return { repo, sync: makeSyncer(repo, backend, api) };
}

beforeEach(async () => {
  freezeClock(NOW);
  setTimingForTests({ tapGuardMs: 0, praiseMinMs: 0, praiseMaxMs: 0, holdToExitMs: 30 });
  api = fakeDataApi();
  device = memoryBackend();
  setDataApiForTests(api, device);
  other = otherDevice();
  await savePin(other.repo, '1234');
  await other.sync.run();
  resetGateForTests();
  grantPass();
  // This device has been opened before, on this version of the catalogue.
  await makeRepo(device).updateDeviceState({ catalogueVersion: CATALOGUE_VERSION, browserModeAccepted: true });
});

function launch(path = '/'): void {
  useAppStore.getState().setAccount({ status: 'signedIn', email: 'parent.one@example.com', expiresAt: new Date(NOW.getTime() + 20 * 86_400_000).toISOString() });
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const childButton = (name: string): HTMLElement | null => screen.queryByRole('button', { name });
const settle = (ms = SEND_AFTER_MS + 80): Promise<void> => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
const offlineNotice = (): boolean => [...document.querySelectorAll('[role="status"]')].some((el) => (el.textContent ?? '').startsWith('No internet.'));

describe('opening the app', () => {
  it("shows the children saved on the server, whichever device added them", async () => {
    await other.repo.saveChild(kid('kid-1', 'Preana'));
    await other.repo.saveChild(kid('kid-2', 'Jaivik'));
    await other.sync.run();
    launch();
    expect(await screen.findByRole('button', { name: 'Preana' })).toBeTruthy();
    expect(childButton('Jaivik')).toBeTruthy();
  });

  it('with no internet it still opens, from the copy on the device, and says it is offline', async () => {
    // The device fetched the family's records on an earlier day.
    await other.repo.saveChild(kid('kid-1', 'Preana'));
    await other.sync.run();
    const before = trackedBackend(device);
    await makeSyncer(makeRepo(before), before, api).run();
    api.offline = true;
    launch();
    expect(await screen.findByRole('button', { name: 'Preana' })).toBeTruthy();
    await waitFor(() => expect(offlineNotice()).toBe(true));
    // When the internet is back the notice goes away by itself.
    api.offline = false;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(offlineNotice()).toBe(false));
  });
});

describe('two devices', () => {
  it('a child added on another device appears here when the app comes back to the front', async () => {
    await other.repo.saveChild(kid('kid-1', 'Preana'));
    await other.sync.run();
    launch();
    await screen.findByRole('button', { name: 'Preana' });
    expect(childButton('Jaivik')).toBeNull();
    await other.repo.saveChild(kid('kid-2', 'Jaivik'));
    await other.sync.run();
    // More than ten seconds later, the app is brought back to the front. The picker updates by itself.
    freezeClock(new Date(NOW.getTime() + 60_000));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByRole('button', { name: 'Jaivik' })).toBeTruthy();
  });

  it('an answer given here reaches the server a moment later, and the other device then has it', async () => {
    await other.repo.saveChild(kid('kid-1', 'Robin'));
    await finished(other.repo, 'kid-1');
    await other.sync.run();
    launch();
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Robin' });
    await openSkill(user, 'Add to 10');
    await settle();
    const saves = api.saves;
    await answer(user, sumOnScreen());
    await settle();
    expect(api.rows().filter((row) => row.store === 'attempts')).toHaveLength(1);
    // The attempt, the score and the session went together, in one request.
    expect(api.saves).toBe(saves + 1);
    await other.sync.run();
    expect(await other.repo.listAttempts('kid-1', {})).toHaveLength(1);
    expect((await other.repo.getSkillStates('kid-1')).find((state) => state.skillId === 'M-K-C4')?.score).toBeGreaterThan(0);
  });

  it('with no internet practice carries on, and the answers go up when it is back', async () => {
    await other.repo.saveChild(kid('kid-1', 'Robin'));
    await finished(other.repo, 'kid-1');
    await other.sync.run();
    launch();
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Robin' });
    await openSkill(user, 'Add to 10');
    await settle();
    api.offline = true;
    await answer(user, sumOnScreen());
    await settle();
    // The next question is there: nothing waited for the server.
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    expect(document.querySelector('[data-answered]')?.textContent).toBe('1');
    await answer(user, sumOnScreen());
    await settle();
    expect(api.rows().filter((row) => row.store === 'attempts')).toEqual([]);
    expect(offlineNotice()).toBe(true);
    api.offline = false;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(api.rows().filter((row) => row.store === 'attempts')).toHaveLength(2));
    await waitFor(() => expect(offlineNotice()).toBe(false));
  });
});

describe("a device that kept its own records before", () => {
  async function oldRecords(): Promise<void> {
    const old = makeRepo(device);
    await old.saveChild(kid('kid-1', 'Preana'));
    await old.saveSkillState({ ...newSkillState('kid-1', 'M-K-C4', NOW.toISOString()), score: 40, bestScore: 40, attempts: 4, correct: 4, recent: [true, true, true, true], lastPracticedAt: NOW.toISOString() });
    await finished(old, 'kid-1');
    await savePin(old, '1234'); // the family's PIN was already on this device
    await old.updateDeviceState({ lastSyncAt: NOW.toISOString() });
  }

  it('sends them up the first time, joined with what another device already saved', async () => {
    await oldRecords();
    await other.repo.saveChild(kid('kid-2', 'Jaivik'));
    await other.sync.run();
    launch();
    expect(await screen.findByRole('button', { name: 'Preana' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Jaivik' })).toBeTruthy();
    await waitFor(() => expect(api.rows().filter((row) => row.store === 'children').map((row) => row.key).sort()).toEqual(['kid-1', 'kid-2']));
    // The other device now has both children and the score.
    await other.sync.run();
    expect((await other.repo.listChildren()).map((each) => each.name).sort()).toEqual(['Jaivik', 'Preana']);
    expect((await other.repo.getSkillStates('kid-1'))[0]?.score).toBe(40);
    expect((await makeRepo(device).getDeviceState()).movedOnline).toBe(true);
  });

  it('offline, it opens with its own records and joins later', async () => {
    await oldRecords();
    api.offline = true;
    launch();
    expect(await screen.findByRole('button', { name: 'Preana' })).toBeTruthy();
    expect((await makeRepo(device).getDeviceState()).movedOnline).toBe(false);
    api.offline = false;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(api.rows().some((row) => row.store === 'children' && row.key === 'kid-1')).toBe(true));
  });
});
