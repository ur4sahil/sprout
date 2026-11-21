import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';
import { exportText, importText } from '../../src/app/dataTools';
import { dayBars, ladderLevel, scoreRows, sortRows } from '../../src/app/parentData';
import { LOCK_MS, MAX_WRONG, PASS_MS, grantPass, hasPass, hashPin, lockedFor, resetGateForTests, savePin, tryPin } from '../../src/app/pin';
import { useAppStore } from '../../src/app/store';
import { diagnosticLadders } from '../../src/app/checkIn';
import { CATALOGUE, skillById } from '../../src/content/catalogue';
import { advanceClock, freezeClock, localDay, localWeek } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { requestCode, setPasswordWithCode, signOut } from '../../src/storage/account';
import { ImportError } from '../../src/storage/exportFile';
import { openRepo, setRepoForTests } from '../../src/storage/index';
import { memoryRepo } from '../../src/storage/memoryRepo';
import type { Attempt, Child, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { stubServer } from '../storage/serverStub';
import { PARENT } from '../worker/harness';
import { NOW, PIN, openApp, setUp } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({ ...(await original<typeof import('../../src/audio/speech')>()), speak: async () => true, stop: () => undefined, isSpeechAvailable: () => true }));
vi.mock('../../src/audio/sfx', async (original) => ({ ...(await original<typeof import('../../src/audio/sfx')>()), playSfx: () => undefined, unlockAudio: async () => undefined }));

const repo = async () => (await openRepo()).repo;
type User = ReturnType<typeof userEvent.setup>;

// Types a PIN on the pad, waiting for the pad to be ready: it is switched off while a PIN is being checked.
async function typePin(user: User, pin: string): Promise<void> {
  for (const digit of pin) {
    await waitFor(() => expect((screen.getByRole('button', { name: digit }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole('button', { name: digit }));
  }
  await waitFor(() => {
    const pad = document.querySelector('[data-pin-digits]');
    if (pad && pad.getAttribute('data-pin-digits') !== '0') throw new Error('the pad has not cleared');
    const one = screen.queryByRole('button', { name: '1' }) as HTMLButtonElement | null;
    if (one?.disabled) throw new Error('still checking');
  });
}

function attempt(id: string, skillId: string, day: string, ms: number, correct = true): Attempt {
  return { id, childId: 'kid-1', skillId, sessionId: 's-1', level: 1, seed: 1, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: 'p', correct: 'c', given: 'g' }, correct, hinted: false, ms, scoreBefore: 0, scoreAfter: 10, kind: 'practice', day, createdAt: `${day}T15:00:00.000Z` };
}

describe('the PIN', () => {
  it('is never saved itself: the family record holds a salt and a scrambled form', async () => {
    const store = memoryRepo();
    await savePin(store, '4821');
    const family = await store.getFamily();
    expect(family.pinSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(family.pinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.values(family)).not.toContain('4821');
    expect(family.pinHash).toBe(await hashPin('4821', family.pinSalt as string));
    expect(family.pinHash).not.toBe(await hashPin('4822', family.pinSalt as string));
    // The same PIN saved again gets a fresh salt, so the saved form is different.
    await savePin(store, '4821');
    expect((await store.getFamily()).pinHash).not.toBe(family.pinHash);
    await expect(savePin(store, '12')).rejects.toThrow();
    await expect(savePin(store, 'abcd')).rejects.toThrow();
  });

  it('a wrong PIN is refused, five wrong tries lock the gate for a minute, and a pass lasts ten minutes', async () => {
    freezeClock(NOW);
    resetGateForTests();
    const store = memoryRepo();
    await savePin(store, '4821');
    const family = await store.getFamily();
    for (let i = 1; i < MAX_WRONG; i += 1) expect(await tryPin(family, '0000')).toBe('wrong');
    expect(await tryPin(family, '0000')).toBe('locked');
    expect(lockedFor()).toBe(LOCK_MS);
    // While it is locked even the right PIN is refused.
    expect(await tryPin(family, '4821')).toBe('locked');
    expect(hasPass()).toBe(false);
    advanceClock(LOCK_MS - 1);
    expect(await tryPin(family, '4821')).toBe('locked');
    advanceClock(1);
    expect(await tryPin(family, '4821')).toBe('ok');
    expect(hasPass()).toBe(true);
    advanceClock(PASS_MS - 1);
    expect(hasPass()).toBe(true);
    advanceClock(1);
    expect(hasPass()).toBe(false);
    // The count of wrong tries starts again after a right one.
    for (let i = 1; i < MAX_WRONG; i += 1) expect(await tryPin(family, '1111')).toBe('wrong');
    expect(await tryPin(family, '4821')).toBe('ok');
    expect(await tryPin(family, '111')).toBe('wrong');
  });

  it('set on one iPad, it opens the gate on another after the backup is merged there', async () => {
    freezeClock(NOW);
    resetGateForTests();
    const one = memoryRepo();
    await savePin(one, '4821');
    const two = memoryRepo();
    expect(await tryPin(await two.getFamily(), '4821')).toBe('wrong');
    await two.importAll(await one.exportAll());
    expect(await tryPin(await two.getFamily(), '4821')).toBe('ok');
    // A newer PIN on the second iPad wins when it travels back.
    advanceClock(60_000);
    await savePin(two, '7777');
    await one.importAll(await two.exportAll());
    resetGateForTests();
    expect(await tryPin(await one.getFamily(), '4821')).toBe('wrong');
    expect(await tryPin(await one.getFamily(), '7777')).toBe('ok');
  });
});

describe('first run', () => {
  it('a family with no PIN chooses one before the profile picker, typed twice', async () => {
    freezeClock(NOW);
    resetGateForTests();
    useAppStore.getState().setAccount({ status: 'signedIn', email: 'parent.one@example.com', expiresAt: new Date(NOW.getTime() + 20 * 86_400_000).toISOString() });
    const user = openApp();
    expect(await screen.findByRole('heading', { name: 'Choose a grown-ups PIN' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Sprout' })).toBeNull();
    await typePin(user, '4821');
    expect(await screen.findByText('Type it once more.')).toBeTruthy();
    await typePin(user, '4822');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Those two did not match. Start again.');
    expect((await (await repo()).getFamily()).pinHash).toBeNull();
    await typePin(user, '4821');
    await typePin(user, '4821');
    expect(await screen.findByRole('heading', { name: 'Sprout' })).toBeTruthy();
    expect((await (await repo()).getFamily()).pinHash).toMatch(/^[0-9a-f]{64}$/);
    // The grown-up who just chose it can add a child without typing it again.
    await user.click(screen.getByRole('button', { name: 'Add a child' }));
    expect(screen.getByRole('heading', { name: 'Add a child' })).toBeTruthy();
  });
});

describe('the grown-ups gate on screen', () => {
  it('"Grown-ups" asks for the PIN; a wrong one is refused and the right one opens the dashboard', async () => {
    await setUp('K', {}, { gate: 'closed' });
    const user = openApp();
    await screen.findByRole('button', { name: 'Robin' });
    await user.click(await screen.findByRole('button', { name: 'Grown-ups' }));
    expect(await screen.findByRole('heading', { name: 'Grown-ups only' })).toBeTruthy();
    await typePin(user, '9999');
    expect((await screen.findByRole('alert')).textContent).toBe('That PIN is not right.');
    for (let i = 0; i < MAX_WRONG - 1; i += 1) await typePin(user, '9999');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Too many tries. Wait 60 seconds, then try again.'));
    advanceClock(LOCK_MS);
    await typePin(user, PIN);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
    // "Done" goes back to the picker. Within ten minutes the gate does not ask again.
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(await screen.findByRole('button', { name: 'Grown-ups' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
    advanceClock(PASS_MS + 1);
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(await screen.findByRole('button', { name: 'Grown-ups' }));
    expect(await screen.findByRole('heading', { name: 'Grown-ups only' })).toBeTruthy();
  });

  it('a grown-up page opened by its address still asks for the PIN', async () => {
    await setUp('K', {}, { gate: 'closed' });
    for (const path of ['/parent', '/parent/scores', '/parent/settings', '/parent/data', '/parent/sound']) {
      const view = render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      );
      expect(await screen.findByRole('heading', { name: 'Grown-ups only' })).toBeTruthy();
      expect(document.querySelector('[data-parent-page]')).toBeNull();
      view.unmount();
    }
  });

  it('Forgot PIN refuses a wrong password, accepts the right one, and then a new PIN opens the gate', async () => {
    const stub = stubServer();
    await requestCode(PARENT);
    await setPasswordWithCode(PARENT, stub.server.lastCode(), 'correct horse battery');
    resetGateForTests();
    await savePin(await repo(), '4821');
    const user = openApp('/parent/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Forgot PIN' }));
    await user.type(screen.getByLabelText('Password'), 'not the password');
    await user.click(screen.getByRole('button', { name: 'Check password' }));
    expect((await screen.findByRole('alert')).textContent).toBe('That password is not right.');
    expect(screen.queryByRole('heading', { name: 'Choose a new PIN' })).toBeNull();
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Check password' }));
    expect(await screen.findByRole('heading', { name: 'Choose a new PIN' })).toBeTruthy();
    await typePin(user, '5555');
    await typePin(user, '5555');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
    resetGateForTests();
    expect(await tryPin(await (await repo()).getFamily(), '4821')).toBe('wrong');
    expect(await tryPin(await (await repo()).getFamily(), '5555')).toBe('ok');
    // With no internet it says so, and the PIN is not changed.
    resetGateForTests();
    stub.goOffline();
  });
});

describe('what the dashboard and scores are made from', () => {
  it('counts questions and whole minutes for each of the last 14 local days', () => {
    const today = localDay(NOW);
    const bars = dayBars([attempt('a', 'M-K-C4', today, 50_000), attempt('b', 'M-K-C4', today, 45_000), attempt('c', 'M-K-A1', '2026-03-07', 120_000), attempt('old', 'M-K-A1', '2026-02-01', 60_000)], NOW.toISOString());
    expect(bars).toHaveLength(14);
    expect(bars[0]?.day).toBe('2026-02-24');
    expect(bars.at(-1)).toEqual({ day: today, questions: 2, minutes: 2 });
    expect(bars.find((bar) => bar.day === '2026-03-07')).toEqual({ day: '2026-03-07', questions: 1, minutes: 2 });
    expect(bars.reduce((sum, bar) => sum + bar.questions, 0)).toBe(3);
  });

  it('says a check-in level as a share of the grade, a skill to work on, or a finished ladder', () => {
    const counting = diagnosticLadders('math').find((ladder) => ladder.id === 'counting');
    const patterns = diagnosticLadders('math').find((ladder) => ladder.id === 'patterns');
    const name = (id: string): string => skillById(id)?.name ?? id;
    const result = { id: 'd', childId: 'kid-1', subject: 'math' as const, takenAt: NOW.toISOString() };
    expect(ladderLevel({ ...result, ladderId: 'counting', placementSkillId: 'M-K-A3', estimateGrade: 'K', estimateFraction: 2 / 7 }, counting, name)).toBe('Kindergarten, 29% through');
    // Fewer than three skills of that grade on the ladder: name the skill instead.
    expect(ladderLevel({ ...result, ladderId: 'patterns', placementSkillId: 'M-K-G1', estimateGrade: 'K', estimateFraction: 0 }, patterns, name)).toBe('Working on Patterns: AAB, ABB, ABC');
    expect(ladderLevel({ ...result, ladderId: 'counting', placementSkillId: null, estimateGrade: null, estimateFraction: null }, counting, name)).toBe('Finished this ladder');
  });

  it('gives every skill a row, and sorts with the biggest or newest first', () => {
    const state = (skillId: string, change: Partial<SkillState>): SkillState => ({ ...newSkillState('kid-1', skillId, NOW.toISOString()), ...change });
    const skills = CATALOGUE.filter((skill) => ['M-K-A1', 'M-K-C4', 'M-PK-A1'].includes(skill.id));
    const rows = scoreRows(skills, [state('M-K-C4', { score: 64, attempts: 10, correct: 7, lastPracticedAt: '2026-03-08T10:00:00.000Z' }), state('M-PK-A1', { score: 80, placedOut: true })], [attempt('a', 'M-K-C4', '2026-03-08', 90_000), attempt('b', 'M-K-C4', '2026-03-08', 40_000)]);
    expect(rows.map((row) => row.skill.id)).toEqual(['M-PK-A1', 'M-K-A1', 'M-K-C4']);
    expect(rows[2]).toMatchObject({ score: 64, stage: 'practising', attempts: 10, accuracy: 70, minutes: 2 });
    expect(rows[1]).toMatchObject({ score: 0, stage: 'notStarted', attempts: 0, accuracy: null, minutes: 0, lastPracticedAt: null });
    expect(rows[0]).toMatchObject({ score: 80, attempts: 0 });
    expect(sortRows(rows, 'score').map((row) => row.skill.id)).toEqual(['M-PK-A1', 'M-K-C4', 'M-K-A1']);
    expect(sortRows(rows, 'attempts').map((row) => row.skill.id)).toEqual(['M-K-C4', 'M-PK-A1', 'M-K-A1']);
    expect(sortRows(rows, 'last')[0]?.skill.id).toBe('M-K-C4');
    expect(sortRows(rows, 'skill')).toEqual(rows);
  });
});

async function practised(child: Child): Promise<void> {
  const store = await repo();
  const today = localDay(NOW);
  await store.saveSkillState({ ...newSkillState(child.id, 'M-K-C4', NOW.toISOString()), score: 100, bestScore: 100, attempts: 5, correct: 5, hintedRight: 0, recent: [true, true, true, true, true], masteredAt: NOW.toISOString(), lastPracticedAt: NOW.toISOString() });
  await store.saveSkillState({ ...newSkillState(child.id, 'M-K-A1', NOW.toISOString()), score: 40, bestScore: 40, attempts: 2, correct: 2, hintedRight: 0, recent: [true, true], lastPracticedAt: NOW.toISOString() });
  for (let i = 0; i < 7; i += 1) await store.addAttempt(attempt(`t-${i}`, i < 5 ? 'M-K-C4' : 'M-K-A1', today, 30_000));
  await store.saveDiagnostic({ id: 'd-1', childId: child.id, subject: 'math', ladderId: 'counting', placementSkillId: 'M-K-A3', estimateGrade: 'K', estimateFraction: 2 / 7, takenAt: NOW.toISOString() });
}

describe('the grown-up pages', () => {
  it('the dashboard shows the last 14 days, the goal, skills mastered, picks and check-in levels', async () => {
    const child = await setUp('K');
    await practised(child);
    openApp('/parent/dashboard');
    const facts = await screen.findByRole('region', { name: 'Practice' });
    expect(within(facts).getByRole('img', { name: 'Questions each day for the last 14 days. 7 in all.' })).toBeTruthy();
    expect(within(facts).getByRole('img', { name: 'Minutes each day for the last 14 days. 4 in all.' })).toBeTruthy();
    expect(facts.querySelectorAll('[data-bars="Questions"] rect')).toHaveLength(14);
    expect(facts.querySelector(`[data-bars="Questions"] rect[data-day="${localDay(NOW)}"]`)?.getAttribute('data-value')).toBe('7');
    expect(facts.querySelector('[data-fact="goal"]')?.textContent).toBe("Today's plan: 7 of 35 questions");
    expect(facts.querySelector('[data-fact="mastered"]')?.textContent).toBe('Skills mastered: 1');
    expect(facts.querySelector('[data-fact="picks"]')?.textContent).toMatch(/^Today's picks: .+/);
    expect(screen.getByRole('region', { name: 'Check-in levels' }).textContent).toContain('Math: Counting: Kindergarten, 29% through');
    // No sign-in reminder with 20 days left.
    expect(document.querySelector('[data-signin-banner]')).toBeNull();
    expect(recentErrors()).toEqual([]);
  });

  it('the dashboard shows a level for each topic, its change since last week and a line, and saves this week', async () => {
    const child = await setUp('K');
    await practised(child);
    const lastWeek = localWeek(new Date(NOW.getTime() - 7 * 86_400_000));
    await (await repo()).saveChild({ ...child, levelWeeks: [{ week: lastWeek, at: NOW.toISOString(), levels: { 'add-subtract': 0.1 } }] });
    openApp('/parent/dashboard');
    const topics = await screen.findByRole('region', { name: 'Levels by topic' });
    // Adding and subtracting: 4 of the 17 kindergarten skills known, so about 0.2 of the year.
    const adding = topics.querySelector('[data-topic="add-subtract"]');
    expect(adding?.textContent).toContain('Math: Adding and subtracting');
    expect(adding?.textContent).toContain('about early kindergarten');
    expect(adding?.textContent).toContain('up 0.1 since last week');
    expect(adding?.querySelector('[data-spark="add-subtract"]')).not.toBeNull();
    expect(topics.querySelector('[data-topic="phonics"]')?.textContent).toContain('not tried yet');
    expect(topics.querySelector('[data-topic="counting"]')?.getAttribute('data-kind')).toBe('level');
    await waitFor(async () => {
      const saved = (await (await repo()).listChildren()).find((each) => each.id === child.id);
      expect(saved?.levelWeeks.map((snapshot) => snapshot.week)).toEqual([lastWeek, localWeek(NOW)]);
      expect(saved?.levelWeeks.at(-1)?.levels['add-subtract']).toBe(0.2);
    });
    expect(recentErrors()).toEqual([]);
  });

  it('the dashboard reminds a grown-up to sign in again from 5 days before the end', async () => {
    await setUp('K');
    useAppStore.getState().setAccount({ status: 'signedIn', email: 'parent.one@example.com', expiresAt: new Date(NOW.getTime() + 4 * 86_400_000).toISOString() });
    openApp('/parent/dashboard');
    await screen.findByRole('heading', { name: 'Dashboard' });
    await waitFor(() => expect(document.querySelector('[data-signin-banner]')?.textContent).toContain('Sign in again by 2026-03-13'));
    expect(screen.getByRole('button', { name: 'Sign in again now' })).toBeTruthy();
  });

  it('scores lists every skill by group and sorts by a column', async () => {
    const child = await setUp('K');
    await practised(child);
    const user = openApp('/parent/scores');
    const row = await waitFor(() => {
      const found = document.querySelector('[data-skill-row="M-K-C4"]');
      if (!found) throw new Error('no rows yet');
      return found;
    });
    expect(document.querySelectorAll('[data-skill-row]')).toHaveLength(CATALOGUE.length);
    expect([...row.querySelectorAll('td')].map((cell) => cell.textContent)).toEqual(['C.4 Add to 10', '100', '5', '100%', '3', localDay(NOW), 'Mastered', 'Remove']);
    expect(document.querySelector('[data-group]')?.textContent).toBe('Math, Pre-K, A. Counting');
    await user.click(screen.getByRole('button', { name: 'Score' }));
    expect(document.querySelector('[data-skill-row]')?.getAttribute('data-skill-row')).toBe('M-K-C4');
    // Sorted lists have no group headings.
    expect(document.querySelector('[data-group]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Answers' }));
    expect([...document.querySelectorAll('[data-skill-row]')].slice(0, 2).map((el) => el.getAttribute('data-skill-row'))).toEqual(['M-K-C4', 'M-K-A1']);
  });

  it('settings saves each change to the child, restarts a check-in, and mutes the device', async () => {
    await setUp('K');
    const user = openApp('/parent/settings');
    await screen.findByRole('region', { name: 'Settings for Robin' });
    await user.selectOptions(screen.getByLabelText('Grade'), '1');
    await waitFor(async () => expect((await (await repo()).listChildren())[0]?.grade).toBe('1'));
    await user.selectOptions(screen.getByLabelText('Daily time limit'), '20');
    await user.selectOptions(screen.getByLabelText('Questions in a session'), '12');
    await user.selectOptions(screen.getByLabelText('Voice speed'), '0.7');
    await user.click(screen.getByRole('switch', { name: /Pre-reader mode/ }));
    await user.click(screen.getByRole('switch', { name: /Gentle scoring/ }));
    await user.click(screen.getByRole('switch', { name: /Show a timer/ }));
    await user.click(screen.getByRole('switch', { name: /Videos in lessons/ }));
    await user.click(screen.getByRole('switch', { name: /Read questions aloud/ }));
    // Home shows the garden unless a grown-up picks the plain list.
    expect((screen.getByLabelText('Home shows') as HTMLSelectElement).value).toBe('garden');
    await user.selectOptions(screen.getByLabelText('Home shows'), 'list');
    await waitFor(async () =>
      expect((await (await repo()).listChildren())[0]?.settings).toMatchObject({ dailyMinutes: 20, sessionLength: 12, speechRate: 0.7, preReader: false, gentleScoring: false, showTimer: true, allowVideos: false, autoSpeak: false, homeView: 'list' }),
    );
    await user.selectOptions(screen.getByLabelText('Home shows'), 'garden');
    await waitFor(async () => expect((await (await repo()).listChildren())[0]?.settings.homeView).toBe('garden'));

    // Restarting the math check-in clears its progress and leaves scores alone.
    await (await repo()).saveSkillState({ ...newSkillState('kid-1', 'M-K-C4', NOW.toISOString()), score: 55 });
    expect((await (await repo()).getDiagnosticProgress('kid-1', 'math'))?.done).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Restart Math check-in' }));
    await waitFor(async () => expect(await (await repo()).getDiagnosticProgress('kid-1', 'math')).toMatchObject({ done: false, sittings: 0, ladders: {} }));
    expect((await (await repo()).getDiagnosticProgress('kid-1', 'ela'))?.done).toBe(true);
    expect((await (await repo()).getSkillStates('kid-1'))[0]?.score).toBe(55);

    await user.click(screen.getByRole('switch', { name: /Mute this device/ }));
    await waitFor(async () => expect((await (await repo()).getDeviceState()).muted).toBe(true));
    expect(useAppStore.getState().muted).toBe(true);
    await user.click(screen.getByRole('switch', { name: /Mute this device/ }));
    await waitFor(async () => expect((await (await repo()).getDeviceState()).muted).toBe(false));

    // The PIN can be changed from here.
    await user.click(screen.getByRole('button', { name: 'Change the PIN' }));
    await typePin(user, '2468');
    await typePin(user, '2468');
    await screen.findByRole('region', { name: 'Family and device' });
    resetGateForTests();
    expect(await tryPin(await (await repo()).getFamily(), '2468')).toBe('ok');
    expect(recentErrors()).toEqual([]);
  });

  it('a grown-up adds 10 minutes when the daily limit is reached, through the gate', async () => {
    const child = await setUp('K', { dailyMinutes: 1 }, { gate: 'closed' });
    const store = await repo();
    await store.addAttempt(attempt('long-1', 'M-K-C4', localDay(NOW), 61_000));
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect(await screen.findByRole('dialog', { name: 'All done for today' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Grown-ups: add 10 minutes' }));
    expect(await screen.findByRole('heading', { name: 'Grown-ups only' })).toBeTruthy();
    await typePin(user, PIN);
    // Home opens with the extra time, for today only.
    expect(await screen.findByRole('list', { name: "Today's plan" })).toBeTruthy();
    expect((await store.listChildren())[0]?.settings.extraMinutes).toEqual({ day: localDay(NOW), minutes: 10 });
    expect(child.settings.dailyMinutes).toBe(1);
  });
});

describe('data tools', () => {
  it('export, wipe the device, import: everything is back', async () => {
    const child = await setUp('K');
    await practised(child);
    const before = await (await repo()).exportAll();
    const text = await exportText(await repo());
    expect(JSON.parse(text)).toMatchObject({ format: 'sprout-export' });
    // A fresh device.
    setRepoForTests(memoryRepo());
    expect(await (await repo()).listChildren()).toEqual([]);
    const report = await importText(await repo(), text);
    expect(report.added).toBeGreaterThan(10);
    const after = await (await repo()).exportAll();
    for (const key of ['children', 'skillStates', 'attempts', 'sessions', 'awards', 'plans', 'diagnostics', 'flags', 'diagnosticProgress', 'family'] as const) expect(after[key]).toEqual(before[key]);
    // Importing the same file again adds nothing and wipes nothing.
    const again = await importText(await repo(), text);
    expect(again.added).toBe(0);
    expect((await (await repo()).exportAll()).attempts).toEqual(before.attempts);
  });

  it('export, reset a child, import: the child stays reset', async () => {
    const child = await setUp('K');
    await practised(child);
    const text = await exportText(await repo());
    advanceClock(60_000);
    await (await repo()).resetChild(child.id);
    expect(await (await repo()).getSkillStates(child.id)).toEqual([]);
    await importText(await repo(), text);
    expect(await (await repo()).getSkillStates(child.id)).toEqual([]);
    expect(await (await repo()).listAttempts(child.id, {})).toEqual([]);
    expect(await (await repo()).listDiagnostics(child.id)).toEqual([]);
    // The child is still there, ready to start again.
    expect((await (await repo()).listChildren()).map((each) => each.name)).toEqual(['Robin']);
  });

  it('refuses a file that is not a Sprout backup, in words a parent can read, and changes nothing', async () => {
    await setUp('K');
    await expect(importText(await repo(), 'not json at all')).rejects.toThrow(ImportError);
    await expect(importText(await repo(), '{"format":"something-else"}')).rejects.toThrow('This is not a Sprout backup file.');
    expect((await (await repo()).listChildren()).map((each) => each.name)).toEqual(['Robin']);
  });

  it('the data page resets one child only after a second, clearly worded step', async () => {
    const child = await setUp('K');
    await practised(child);
    const user = openApp('/parent/data');
    await user.click(await screen.findByRole('button', { name: 'Reset Robin' }));
    expect(screen.getByRole('alert').textContent).toContain('It cannot be undone');
    expect(screen.getByRole('button', { name: 'Export first' })).toBeTruthy();
    // Changing one's mind keeps everything.
    await user.click(screen.getByRole('button', { name: 'Keep everything' }));
    expect((await (await repo()).getSkillStates(child.id)).length).toBe(2);
    await user.click(screen.getByRole('button', { name: 'Reset Robin' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reset Robin' }));
    expect(await screen.findByText('Robin starts again from the beginning.')).toBeTruthy();
    await waitFor(async () => expect(await (await repo()).getSkillStates(child.id)).toEqual([]));
    expect(await (await repo()).listAttempts(child.id, {})).toEqual([]);
  });

  it('the data page says who is signed in, the state of this device, and the credits', async () => {
    await setUp('K');
    openApp('/parent/data');
    await screen.findByRole('region', { name: 'Sign-in' });
    expect(document.querySelector('[data-signed-in]')?.textContent).toBe('Signed in as parent.one@example.com until 2026-03-29.');
    await waitFor(() => expect(document.querySelector('[data-fact="unreadable"]')?.textContent).toBe('Saved items that could not be read: 0'));
    expect(document.querySelector('[data-fact="storage"]')?.textContent).toBe('Progress is saved on this device.');
    expect(document.querySelector('[data-fact="flags"]')?.textContent).toBe('Flagged questions: 0');
    expect(screen.getByRole('region', { name: 'Credits' }).textContent).toContain('Illustrative Mathematics');
    expect(screen.getByRole('region', { name: 'Saved online' })).toBeTruthy();
  });

  it('signing out keeps the children and their progress on the device', async () => {
    const stub = stubServer();
    await requestCode(PARENT);
    await setPasswordWithCode(PARENT, stub.server.lastCode(), 'correct horse battery');
    const child = await setUp('K');
    useAppStore.getState().setAccount({ status: 'signedIn', email: PARENT, expiresAt: new Date(Date.now() + 20 * 86_400_000).toISOString() });
    await practised(child);
    grantPass();
    const user = openApp('/parent/data');
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(useAppStore.getState().account.status).toBe('signedOut');
    expect((await (await repo()).listChildren()).map((each) => each.name)).toEqual(['Robin']);
    expect((await (await repo()).getSkillStates(child.id)).length).toBe(2);
    expect((await (await repo()).listAttempts(child.id, {})).length).toBe(7);
    // The pass at the gate ends with the sign-out.
    expect(hasPass()).toBe(false);
    void signOut;
  });
});
