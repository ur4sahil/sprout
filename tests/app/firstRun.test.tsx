import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { recordAnswer, newSession, recentKeys } from '../../src/app/practiceRecord';
import { skillById } from '../../src/content/catalogue';
import { generateQuestion } from '../../src/content/registry';
import { describeAnswer, describePrompt, describeResponse } from '../../src/engine/describe';
import type { Question, QuestionBase, Visual } from '../../src/engine/types';
import { localDay } from '../../src/lib/clock';
import { isInstalled, isIosDevice } from '../../src/lib/platform';
import { openRepo } from '../../src/storage/index';
import { newSkillState } from '../../src/storage/schema';
import { stubServer } from '../storage/serverStub';
import { NOW, finishCheckIn, openApp, setUp } from './practiceHelpers';

const spoken = vi.hoisted(() => ({ said: [] as unknown[], sounds: [] as string[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown) => {
    spoken.said.push(say);
    return true;
  },
  stop: () => undefined,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  unlockAudio: async () => {
    spoken.sounds.push('unlock');
  },
}));

beforeEach(() => {
  spoken.said.length = 0;
  spoken.sounds.length = 0;
});

const repo = async () => (await openRepo()).repo;

describe('child setup', () => {
  async function emptyDevice() {
    await setUp('1');
    const store = await repo();
    for (const each of await store.listChildren()) await store.saveChild({ ...each, deletedAt: NOW.toISOString() });
    return openApp();
  }

  it('first run has no children: the start screen offers "Add a child", which opens the grown-ups area', async () => {
    const user = await emptyDevice();
    expect(await screen.findByRole('heading', { name: 'Sprout' })).toBeTruthy();
    // No child yet, so no cards: just a way to the grown-ups' add-a-child screen.
    expect(screen.queryByRole('group', { name: 'Who is playing?' })).toBeNull();
    expect(screen.getByText('Add your first child to begin.')).toBeTruthy();
    await user.click(await screen.findByRole('button', { name: 'Add a child' }));
    expect(screen.getByRole('heading', { name: 'Add a child' })).toBeTruthy();
  });

  it('a grown-up adds a child in two steps: name and picture, then grade', async () => {
    const user = await emptyDevice();
    await user.click(await screen.findByRole('button', { name: 'Add a child' }));
    await user.type(screen.getByLabelText('First name'), '  Maya ');
    await user.click(screen.getByRole('button', { name: 'fox' }));
    expect(screen.getByRole('button', { name: 'fox' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Maya' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Kindergarten' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Back on the picker, with the new child.
    expect(await screen.findByRole('button', { name: 'Maya' })).toBeTruthy();
    const saved = (await (await repo()).listChildren())[0];
    expect(saved).toMatchObject({ name: 'Maya', avatar: '🦊', grade: 'K', resetAt: null, deletedAt: null });
    // Kindergarten defaults.
    expect(saved?.settings).toEqual({ gentleScoring: true, sessionLength: 8, speechRate: 0.85, autoSpeak: true, showTimer: false, dailyGoalQuestions: 15, allowVideos: true, dailyMinutes: 0, preReader: true, extraMinutes: { day: '', minutes: 0 }, factSets: [], planKeepGoing: 3, planNew: true, planMixed: true });
    expect(saved?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('gives each grade its own defaults', async () => {
    for (const [label, grade, length, gentle, pre] of [['Pre-K', 'PK', 6, true, true], ['Grade 1', '1', 10, false, false], ['Grade 2', '2', 10, false, false]] as const) {
      const user = await emptyDevice();
      await user.click(await screen.findByRole('button', { name: 'Add a child' }));
      await user.type(screen.getByLabelText('First name'), `Kid ${grade}`);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: label }));
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await screen.findByRole('button', { name: `Kid ${grade}` });
      const saved = (await (await repo()).listChildren()).find((c) => c.name === `Kid ${grade}`);
      expect(saved?.grade).toBe(grade);
      expect(saved?.settings).toMatchObject({ sessionLength: length, gentleScoring: gentle, preReader: pre });
      document.body.innerHTML = '';
    }
  });

  it('asks for a name and a grade before going on, and Back keeps what was typed', async () => {
    const user = await emptyDevice();
    await user.click(await screen.findByRole('button', { name: 'Add a child' }));
    await user.type(screen.getByLabelText('First name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert').textContent).toBe('Type a name first.');
    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert').textContent).toBe('Choose a grade first.');
    expect(await (await repo()).listChildren()).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('First name')).toHaveProperty('value', 'Sam');
  });

  it('Cancel saves nothing', async () => {
    const user = await emptyDevice();
    await user.click(await screen.findByRole('button', { name: 'Add a child' }));
    await user.type(screen.getByLabelText('First name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('heading', { name: 'Sprout' })).toBeTruthy();
    expect(await (await repo()).listChildren()).toEqual([]);
  });

  it('says so when the profile cannot be saved, and frees the button', async () => {
    const user = await emptyDevice();
    const store = await repo();
    store.saveChild = async () => {
      throw new Error('storage is full');
    };
    await user.click(await screen.findByRole('button', { name: 'Add a child' }));
    await user.type(screen.getByLabelText('First name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Grade 1' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toContain('could not be saved');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false);
  });
});

describe('the profile picker', () => {
  it('shows one big button for each child, and tapping one says hi, unlocks sound and opens home', async () => {
    const child = await setUp('K');
    await (await repo()).saveChild({ ...child, id: 'kid-2', name: 'Ada', avatar: '🦄', createdAt: new Date(NOW.getTime() + 1000).toISOString() });
    // Ada has finished her check-in too, so home opens for her.
    await finishCheckIn('kid-2');
    const user = openApp();
    const group = await screen.findByRole('group', { name: 'Who is playing?' });
    expect([...group.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual(['Robin', 'Ada']);
    // Adding a child is in the grown-ups area once there is one: not on this screen.
    expect(screen.queryByRole('button', { name: /Add a child/ })).toBeNull();
    // Each card says who it is, their grade and how far along today's goal they are.
    const card = group.querySelector('[data-profile="Robin"]') as HTMLElement;
    expect(card.textContent).toContain('Kindergarten');
    expect(card.textContent).toContain('0 of 15 today');
    expect(document.getElementById(card.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Kindergarten. 0 of 15 questions today.');
    await user.click(screen.getByRole('button', { name: 'Ada' }));
    expect(spoken.sounds).toEqual(['unlock']);
    expect(spoken.said).toEqual([['Hi', { word: 'Ada' }]]);
    expect(await screen.findByRole('heading', { name: 'Ada' })).toBeTruthy();
    expect(useAppStore.getState().child?.id).toBe('kid-2');
    // Home shows today's plan for a kindergarten child: three kindergarten skills to start on.
    const picks = [...(await screen.findByRole('list', { name: "Today's plan" })).querySelectorAll('[data-skill]')];
    expect(picks).toHaveLength(3);
    expect(picks.every((row) => row.getAttribute('data-skill')?.startsWith('M-K-'))).toBe(true);
  });

  it('"Switch child" goes back to the picker and forgets the child', async () => {
    await setUp('K');
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await user.click(await screen.findByRole('button', { name: /Switch child/ }));
    expect(await screen.findByRole('group', { name: 'Who is playing?' })).toBeTruthy();
    expect(useAppStore.getState().child).toBeNull();
  });

  it('reminds a grown-up to sign in again in the last 5 days, and not before', async () => {
    await setUp('K');
    useAppStore.getState().setAccount({ status: 'signedIn', email: 'parent.one@example.com', expiresAt: new Date(NOW.getTime() + 6 * 86_400_000).toISOString() });
    openApp();
    await screen.findByRole('button', { name: 'Robin' });
    expect(document.querySelector('[data-signin-reminder]')).toBeNull();
    document.body.innerHTML = '';
    useAppStore.getState().setAccount({ status: 'signedIn', email: 'parent.one@example.com', expiresAt: new Date(NOW.getTime() + 5 * 86_400_000).toISOString() });
    openApp();
    await screen.findByRole('button', { name: 'Robin' });
    expect(document.querySelector('[data-signin-reminder]')?.textContent).toBe('Grown-ups: sign in again by 2026-03-14.');
  });

  it('a soft-deleted child is not offered', async () => {
    const child = await setUp('K');
    await (await repo()).saveChild({ ...child, id: 'gone', name: 'Gone', deletedAt: NOW.toISOString() });
    openApp();
    await screen.findByRole('button', { name: 'Robin' });
    expect(screen.queryByRole('button', { name: 'Gone' })).toBeNull();
  });
});

describe('the install guide', () => {
  const realAgent = navigator.userAgent;
  function device(userAgent: string, extra: { maxTouchPoints?: number; standalone?: boolean } = {}): void {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: extra.maxTouchPoints ?? 0 });
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: extra.standalone });
  }
  afterEach(() => device(realAgent));

  const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

  it('a Safari tab on an iPad sees only the install guide: no sign-in, no profiles', async () => {
    stubServer();
    device(IPAD);
    openApp('/home');
    expect(await screen.findByRole('heading', { name: 'Add Sprout to the Home Screen' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.getByRole('img', { name: /Share button/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Add to Home Screen/ })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('a modern iPad that calls itself a Mac sees it too, and so does a signed-in device', async () => {
    await setUp('K');
    // A device that signed in earlier, launching afresh.
    stubServer();
    const store = await repo();
    await store.saveDeviceState({ ...(await store.getDeviceState()), signedInEmail: 'parent.one@example.com', sessionExpiresAt: '2099-01-01T00:00:00.000Z' });
    useAppStore.getState().setAccount({ status: 'checking' });
    device(IPAD_AS_MAC, { maxTouchPoints: 5 });
    openApp();
    expect(await screen.findByRole('heading', { name: 'Add Sprout to the Home Screen' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Robin' })).toBeNull();
  });

  it('the app opened from its Home Screen icon skips the guide', async () => {
    stubServer();
    device(IPAD, { standalone: true });
    openApp();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Add Sprout to the Home Screen' })).toBeNull();
  });

  it('a laptop skips the guide', async () => {
    stubServer();
    device(IPAD_AS_MAC, { maxTouchPoints: 0 });
    openApp();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('"Use in this browser anyway" warns first, then leads to the sign-in screen and is remembered', async () => {
    stubServer();
    device(IPAD);
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Use in this browser anyway' }));
    expect(screen.getByRole('alert').textContent).toContain('will not appear in the installed app');
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Carry on in this browser' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect((await (await repo()).getDeviceState()).browserModeAccepted).toBe(true);
    // The next launch goes straight to sign-in.
    document.body.innerHTML = '';
    useAppStore.getState().setAccount({ status: 'checking' });
    openApp();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Add Sprout to the Home Screen' })).toBeNull());
  });

  it('tells devices and windows apart', () => {
    expect(isIosDevice({ userAgent: IPAD })).toBe(true);
    expect(isIosDevice({ userAgent: IPAD.replace('iPad', 'iPhone') })).toBe(true);
    expect(isIosDevice({ userAgent: IPAD_AS_MAC, maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: IPAD_AS_MAC, maxTouchPoints: 0 })).toBe(false);
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile', maxTouchPoints: 5 })).toBe(false);
    expect(isInstalled({ userAgent: IPAD, standalone: true }, () => false)).toBe(true);
    expect(isInstalled({ userAgent: IPAD }, (query) => query === '(display-mode: standalone)')).toBe(true);
    expect(isInstalled({ userAgent: IPAD }, () => false)).toBe(false);
  });
});

describe('the saved record of an answer', () => {
  const skill = skillById('M-K-C4')!;
  const child = { id: 'kid-1', name: 'Robin', avatar: '🐢', grade: '1' as const, settings: { gentleScoring: false, sessionLength: 10, speechRate: 0.85, autoSpeak: true, showTimer: false, dailyGoalQuestions: 15, allowVideos: true, dailyMinutes: 0, preReader: false, extraMinutes: { day: '', minutes: 0 }, factSets: [], planKeepGoing: 3, planNew: true, planMixed: true }, resetAt: null, levelWeeks: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), deletedAt: null };

  it('keeps the level and seed asked, exactly what was submitted, and a plain-text snapshot', () => {
    const question = generateQuestion('M-K-C4', 1, 77);
    if (question.type !== 'choice') throw new Error('expected a choice');
    const wrong = (question.answerIndex + 1) % 3;
    const session = newSession(child, skill.id, NOW);
    const outcome = recordAnswer({ child, skill, state: newSkillState('kid-1', skill.id, NOW.toISOString()), session, question, response: { index: wrong }, shownAt: NOW, answeredAt: new Date(NOW.getTime() + 4200) });
    expect(outcome.correct).toBe(false);
    expect(outcome.attempt).toMatchObject({ childId: 'kid-1', skillId: 'M-K-C4', sessionId: session.id, level: 1, seed: 77, itemType: 'choice', response: { index: wrong }, contentVersion: 1, correct: false, ms: 4200, scoreBefore: 0, scoreAfter: 0, kind: 'practice', day: '2026-03-09' });
    expect(outcome.attempt.snapshot.correct).toBe(describeAnswer(question));
    expect(outcome.attempt.snapshot.given).toBe(describeResponse(question, { index: wrong }));
    expect(outcome.attempt.snapshot.given).not.toBe(outcome.attempt.snapshot.correct);
    expect(outcome.session).toMatchObject({ questions: 1, correct: 0 });
  });

  it('caps the time at two minutes, so one abandoned question never counts as an hour', () => {
    const question = generateQuestion('M-K-C4', 3, 5);
    const at = (ms: number) => recordAnswer({ child, skill, state: newSkillState('kid-1', skill.id, NOW.toISOString()), session: newSession(child, skill.id, NOW), question, response: { value: 1 }, shownAt: NOW, answeredAt: new Date(NOW.getTime() + ms) }).attempt.ms;
    expect(at(119_999)).toBe(119_999);
    expect(at(3_600_000)).toBe(120_000);
    expect(at(-50)).toBe(0);
  });

  it('stamps the local day, not the UTC day', () => {
    const lateEvening = new Date(2026, 2, 9, 23, 30);
    const question = generateQuestion('M-K-C4', 3, 5);
    const outcome = recordAnswer({ child, skill, state: newSkillState('kid-1', skill.id, NOW.toISOString()), session: newSession(child, skill.id, lateEvening), question, response: { value: 1 }, shownAt: lateEvening, answeredAt: lateEvening });
    expect(outcome.attempt.day).toBe('2026-03-09');
    expect(newSession(child, skill.id, lateEvening).day).toBe('2026-03-09');
  });

  it('works the recent question keys out again from saved attempts, for this version only', () => {
    const made = [3, 4, 5].map((seed) => generateQuestion('M-K-C4', 1, seed));
    const rows = made.map((q, i) => recordAnswer({ child, skill, state: newSkillState('kid-1', skill.id, NOW.toISOString()), session: newSession(child, skill.id, NOW), question: q, response: { index: 0 }, shownAt: NOW, answeredAt: new Date(NOW.getTime() + i) }).attempt);
    expect(recentKeys(rows, skill)).toEqual(made.map((q) => q.key));
    expect(recentKeys(rows.map((row) => ({ ...row, contentVersion: 9 })), skill)).toEqual([]);
    expect(recentKeys(rows.map((row) => ({ ...row, kind: 'review' as const })), skill)).toEqual([]);
  });

  it('describes answers of every question type in plain words', () => {
    const t = (value: string): Visual => ({ kind: 'text', value, size: 'l' });
    const base: QuestionBase = { skillId: 'T', level: 1, seed: 1, key: 'k', facts: { id: 'x' }, mode: 'look', prompt: { text: 'Pick.', speak: ['Pick.'] }, explanation: { speak: ['x'], steps: ['x'] } };
    const cases: [Question, Parameters<typeof describeResponse>[1], string, string][] = [
      [{ ...base, type: 'choice', options: [t('2'), t('3')], answerIndex: 1 }, { index: 0 }, '3', '2'],
      [{ ...base, type: 'multiSelect', options: [t('a'), t('b'), t('c')], answerIndexes: [0, 2] }, { indexes: [1] }, 'a, c', 'b'],
      [{ ...base, type: 'tapCount', emoji: '🍎', shown: 6, answer: 3 }, { count: 4 }, '3', '4'],
      [{ ...base, type: 'numberPad', answer: 12, maxDigits: 2 }, { value: 21 }, '12', '21'],
      [{ ...base, type: 'order', items: [t('3'), t('1'), t('2')], answerOrder: [1, 2, 0] }, { order: [0, 1, 2] }, '1, 2, 3', '3, 1, 2'],
      [{ ...base, type: 'sort', items: [t('cat'), t('red')], bins: [{ label: 'Animals', speak: ['Animals'] }, { label: 'Colours', speak: ['Colours'] }], answerBin: [0, 1] }, { bins: [1, 1] }, 'cat: Animals, red: Colours', 'cat: Colours, red: Colours'],
      [{ ...base, type: 'match', left: [t('A'), t('B')], right: [t('b'), t('a')], answerPairs: [[0, 1], [1, 0]] }, { pairs: [[0, 0], [1, 1]] }, 'A with a, B with b', 'A with b, B with a'],
      [{ ...base, type: 'tiles', slots: 3, bank: ['c', 'a', 't', 'x', 'o'], answer: 'cat' }, { tiles: ['c', 'o', 't'] }, 'cat', 'cot'],
    ];
    for (const [question, response, right, given] of cases) {
      expect(describeAnswer(question), question.type).toBe(right);
      expect(describeResponse(question, response), question.type).toBe(given);
    }
    // An answer of the wrong shape is recorded as it is, never thrown away.
    expect(describeResponse(cases[0]![0], { value: 9 })).toBe('{"value":9}');
    expect(describePrompt({ ...base, type: 'numberPad', answer: 1, maxDigits: 1, stimulus: { kind: 'equation', parts: [1, '+', 0, '=', 'blank'] } })).toBe('Pick. [1 + 0 = □]');
    expect(describePrompt({ ...base, type: 'numberPad', answer: 1, maxDigits: 1 })).toBe('Pick.');
  });
});

describe('the grown-ups bar on the profile page', () => {
  it('signing out asks for the PIN first, and Cancel changes nothing', async () => {
    await setUp('K', {}, { gate: 'closed' });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Grown-ups only' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('button', { name: 'Robin' })).toBeTruthy();
    expect(useAppStore.getState().account.status).toBe('signedIn');
  });

  it('holds Grown-ups and Sign out, and a card shows the answers given today', async () => {
    const child = await setUp('K');
    const store = await repo();
    for (let i = 0; i < 4; i += 1) {
      await store.addAttempt({ id: `t-${i}`, childId: child.id, skillId: 'M-K-C4', sessionId: 's-1', level: 1, seed: i, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: 'p', correct: 'c', given: 'g' }, correct: true, ms: 1000, scoreBefore: 0, scoreAfter: 10, kind: 'practice', day: localDay(NOW), createdAt: NOW.toISOString() });
    }
    openApp();
    const bar = await screen.findByRole('group', { name: 'For grown-ups' });
    expect([...bar.querySelectorAll('button')].map((b) => b.textContent?.replace(/^\W+/, ''))).toEqual(['Grown-ups', 'Sign out']);
    await waitFor(() => expect(document.querySelector('[data-profile="Robin"] [data-today]')?.getAttribute('data-today')).toBe('4'));
  });
});
