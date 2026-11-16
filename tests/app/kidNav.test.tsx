import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';
import { summariseDay } from '../../src/app/childDay';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { allGenerators, generatorFor } from '../../src/content/registry';
import { addDays, advanceClock, localDay } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { openRepo } from '../../src/storage/index';
import type { Attempt, Child, SkillState } from '../../src/storage/schema';
import { NOW, answer, findOnMath, holdHome, openApp, openSkill, setUp, settled, sumOnScreen, wrongValue } from './practiceHelpers';

// What the app says and plays, recorded instead of spoken.
const spoken = vi.hoisted(() => ({ said: [] as unknown[], phrases: [] as string[], sounds: [] as string[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown) => {
    spoken.said.push(say);
    return true;
  },
  speakPhrase: async (key: string) => {
    spoken.phrases.push(key);
    return true;
  },
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: (name: string) => {
    spoken.sounds.push(name);
  },
  unlockAudio: async () => {
    spoken.sounds.push('unlock');
  },
}));

beforeEach(() => {
  spoken.said.length = 0;
  spoken.phrases.length = 0;
  spoken.sounds.length = 0;
});

const repo = async () => (await openRepo()).repo;
const stateOf = async (skillId: string) => (await (await repo()).getSkillStates('kid-1')).find((s) => s.skillId === skillId);
const ADD = 'M-K-C4';
const ORDER = 'M-K-B3';

// A mastered skill. `dueInDays` below zero means its review is due.
function mastered(skillId: string, dueInDays: number): SkillState {
  const at = addDays(NOW.toISOString(), -3);
  return { childId: 'kid-1', skillId, score: 100, bestScore: 100, streak: 6, attempts: 20, correct: 19, recent: Array.from({ length: 10 }, () => true), masteredAt: at, placedOut: false, reviewBox: 0, reviewDueAt: addDays(NOW.toISOString(), dueInDays), lastPracticedAt: at, updatedAt: at };
}

// Marks every skill that is ready as mastered and not due, except the ones named.
// What is left is what today's picks can choose from, however large the catalogue grows.
async function masterAllBut(keep: string[]): Promise<void> {
  const store = await repo();
  for (const generator of allGenerators()) {
    if (!keep.includes(generator.skillId)) await store.saveSkillState(mastered(generator.skillId, 20));
  }
}

const picksOnScreen = async (): Promise<string[]> => [...(await screen.findByRole('group', { name: "Today's picks" })).querySelectorAll('[data-skill]')].map((el) => el.getAttribute('data-skill') ?? '');

describe('home', () => {
  it('shows the daily goal, Play, a picture tile for each pick, and the subjects', async () => {
    await setUp('K', { preReader: false });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    // One pick from each of the first three ladders that have a kindergarten skill to start on.
    expect(await picksOnScreen()).toEqual(['M-K-A1', 'M-K-B1', ADD]);
    expect(screen.getByRole('button', { name: /Play/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: '0 of 15 questions today' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Math/ })).toBeTruthy();
    // Subjects with no skill ready are not offered, and nothing is due for review.
    expect(screen.queryByRole('button', { name: /Language Arts/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Review/ })).toBeNull();
    // A reader sees why each skill was picked.
    expect(screen.getAllByText('Next up').length).toBe(3);
  });

  it('for a pre-reader, tiles carry no reason text, and the speaker corner says the skill name', async () => {
    await setUp('K');
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await picksOnScreen();
    expect(screen.queryByText('Next up')).toBeNull();
    spoken.said.length = 0;
    await user.click(screen.getByRole('button', { name: 'Hear the name: Add to 10' }));
    expect(spoken.said).toHaveLength(1);
    expect(JSON.stringify(spoken.said[0])).toContain('10');
    // Hearing the name does not open the skill.
    expect(screen.queryByRole('region', { name: 'Question' })).toBeNull();
  });

  it('the goal ring counts today\'s answers and lights a star for each share of the goal', async () => {
    await setUp('K', { dailyGoalQuestions: 4 });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    for (let i = 0; i < 3; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
    }
    await holdHome();
    const ring = await screen.findByRole('img', { name: '3 of 4 questions today' });
    expect(ring.querySelectorAll('[data-star="lit"]').length).toBe(3);
    expect(ring.querySelectorAll('[data-star="unlit"]').length).toBe(1);
  });

  it('says the goal is reached once it is', async () => {
    await setUp('K', { dailyGoalQuestions: 2 });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    for (let i = 0; i < 2; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
    }
    await holdHome();
    expect(await screen.findByRole('img', { name: 'Daily goal reached: 2 questions today' })).toBeTruthy();
  });

  it('a mastered skill whose review is due is offered as a review, first in the picks', async () => {
    await setUp('K');
    await (await repo()).saveSkillState(mastered(ADD, -1));
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect((await picksOnScreen())[0]).toBe(ADD);
    expect(screen.getByRole('button', { name: /Review \(1\)/ })).toBeTruthy();
  });
});

describe('the subject page', () => {
  it('opens on the nearest grade the child has, groups skills by category, and switches grade by tab', async () => {
    await setUp('1');
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await user.click(await screen.findByRole('button', { name: /Math/ }));
    expect((await screen.findByRole('tab', { name: 'Kindergarten' })).getAttribute('aria-selected')).toBe('true');
    const kinder = [...document.querySelectorAll('[data-skill]')].map((el) => el.getAttribute('data-skill'));
    expect(kinder.slice(0, 2)).toEqual(['M-K-A1', 'M-K-A2']);
    expect(kinder).toContain(ORDER);
    expect(kinder).toContain(ADD);
    expect(kinder.every((id) => id?.startsWith('M-K-'))).toBe(true);
    // One band for each lettered category, in order.
    const letters = [...document.querySelectorAll('section h2')].map((el) => (el.textContent ?? '').charAt(0));
    expect(letters).toEqual([...letters].sort());
    expect(new Set(letters).size).toBe(letters.length);
    await user.click(screen.getByRole('tab', { name: 'Pre-K' }));
    // Pre-K: 16 skills in 4 lettered categories, in catalogue order.
    const preK = [...document.querySelectorAll('[data-skill]')].map((el) => el.getAttribute('data-skill'));
    expect(preK).toHaveLength(16);
    expect(preK.slice(0, 3)).toEqual(['M-PK-A1', 'M-PK-A2', 'M-PK-A3']);
    expect(preK.at(-1)).toBe('M-PK-D3');
    expect([...document.querySelectorAll('section h2')].map((el) => el.textContent)).toEqual(['A. Counting', 'B. Comparing', 'C. Shapes and sizes', 'D. Patterns and sorting']);
    await user.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
  });

  it('an unknown subject goes back to home', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    openApp('/subject/history');
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
  });
});

describe('the kid lock', () => {
  it('a tap on the home button does nothing. A press and hold leaves', async () => {
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    const button = screen.getByRole('button', { name: /^Back to home\. Press and hold/ });
    await user.click(button);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    // Letting go early, or sliding off, cancels the hold.
    fireEvent.pointerDown(button);
    fireEvent.pointerLeave(button);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    await holdHome();
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
  });

  it('a press shorter than the hold time is not enough', async () => {
    await setUp('K');
    setTimingForTests({ holdToExitMs: 300 });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    const button = screen.getByRole('button', { name: /^Back to home\. Press and hold/ });
    fireEvent.pointerDown(button);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(button.getAttribute('data-holding')).toBe('true');
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    fireEvent.pointerUp(button);
    expect(button.getAttribute('data-holding')).toBe('false');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    fireEvent.pointerDown(button);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
  });

  it('a Back press leaves the child on the practice screen', async () => {
    await setUp('K');
    let back: () => void = () => undefined;
    function Capture() {
      const navigate = useNavigate();
      back = () => void navigate(-1);
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Capture />
        <App />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await openSkill(user, 'Add to 10');
    const before = sumOnScreen();
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        back();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    }
    expect(screen.queryByRole('group', { name: 'Who is playing?' })).toBeNull();
    // The same session carries on.
    await answer(user, before);
    await settled();
    expect((await stateOf(ADD))?.attempts).toBe(1);
  });

  it('a Back press on home keeps the child on home', async () => {
    await setUp('K');
    let back: () => void = () => undefined;
    function Capture() {
      const navigate = useNavigate();
      back = () => void navigate(-1);
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Capture />
        <App />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await screen.findByRole('heading', { name: 'Robin' });
    await act(async () => {
      back();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole('heading', { name: 'Robin' })).toBeTruthy();
    expect(useAppStore.getState().child?.id).toBe('kid-1');
  });
});

describe('the daily limit', () => {
  it('appears on the way into the next screen once the minutes are used, never in the middle of a question', async () => {
    await setUp('K', { dailyMinutes: 1 });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    advanceClock(61_000);
    await answer(user, sumOnScreen());
    await settled();
    // Still practising: the limit never interrupts.
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    spoken.said.length = 0;
    await holdHome();
    expect(await screen.findByRole('dialog', { name: 'All done for today' })).toBeTruthy();
    expect(spoken.said).toEqual([['All done for today. Great work. See you tomorrow.']]);
    expect(screen.queryByRole('button', { name: /Play/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Bye for now/ }));
    expect(await screen.findByRole('group', { name: 'Who is playing?' })).toBeTruthy();
  });

  it('also guards a skill, Play and review opened directly', async () => {
    const child = await setUp('K', { dailyMinutes: 1 });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    advanceClock(61_000);
    await answer(user, sumOnScreen());
    await settled();
    document.body.innerHTML = '';
    for (const path of [`/skill/${ADD}`, '/play', '/review']) {
      useAppStore.getState().setChild(child);
      const view = render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      );
      expect(await screen.findByRole('dialog', { name: 'All done for today' })).toBeTruthy();
      view.unmount();
    }
  });

  it('the limit is for the local day: tomorrow the child can play again, and 0 means no limit', async () => {
    const child = await setUp('K', { dailyMinutes: 1 });
    const attempt = (createdAt: string, day: string, ms: number): Attempt => ({ id: `a-${createdAt}`, childId: 'kid-1', skillId: ADD, sessionId: 's', level: 1, seed: 1, itemType: 'choice', response: { type: 'choice', optionId: 'a' }, contentVersion: 1, snapshot: { prompt: 'p', correct: 'c', given: 'g' }, correct: true, ms, scoreBefore: 0, scoreAfter: 10, kind: 'practice', day, createdAt });
    const base = { child, states: [], sessions: [], plans: [], diagnostics: [], canListen: true };
    const yesterday = attempt(addDays(NOW.toISOString(), -1), '2026-03-08', 120_000);
    const today = (ms: number): Attempt => attempt(NOW.toISOString(), '2026-03-09', ms);
    expect(summariseDay({ ...base, nowIso: NOW.toISOString(), attempts: [yesterday] }).limitReached).toBe(false);
    expect(summariseDay({ ...base, nowIso: NOW.toISOString(), attempts: [yesterday, today(59_000)] }).limitReached).toBe(false);
    const used = summariseDay({ ...base, nowIso: NOW.toISOString(), attempts: [yesterday, today(60_000)] });
    expect(used.limitReached).toBe(true);
    expect(used.answeredToday).toBe(1);
    const noLimit: Child = { ...child, settings: { ...child.settings, dailyMinutes: 0 } };
    expect(summariseDay({ ...base, child: noLimit, nowIso: NOW.toISOString(), attempts: [today(120_000), { ...today(120_000), id: 'b' }] }).limitReached).toBe(false);
  });
});

describe('the lesson player', () => {
  it('steps through the four beats, speaking each, then offers Practise', async () => {
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    spoken.said.length = 0;
    await user.click(screen.getByRole('button', { name: 'Learn this skill' }));
    const beats = generatorFor(ADD).lesson();
    expect(beats.map((beat) => beat.beat)).toEqual(['see', 'watch', 'try', 'remember']);
    await screen.findByRole('button', { name: /Practise/ });
    const expected: unknown[] = [];
    for (const beat of beats) {
      expected.push(beat.speak);
      if (beat.reveal) expected.push(beat.reveal.speak);
    }
    expect(spoken.said).toEqual(expected);
    expect(document.querySelector('[data-beat]')?.getAttribute('data-beat')).toBe('remember');
    expect(screen.getAllByRole('button', { name: /step \d of 4/ }).length).toBe(4);
    // A dot jumps back to its beat and plays on from there.
    spoken.said.length = 0;
    await user.click(screen.getByRole('button', { name: 'Try it together, step 3 of 4' }));
    await waitFor(() => expect(spoken.said.length).toBe(expected.length - 2));
    expect(spoken.said[0]).toEqual(beats[2]?.speak);
    await user.click(await screen.findByRole('button', { name: /Practise/ }));
    expect(await screen.findByRole('region', { name: 'Question' })).toBeTruthy();
    // Watching a lesson is not practice: nothing was scored.
    expect(await stateOf(ADD)).toBeUndefined();
    expect(recentErrors()).toEqual([]);
  });

  it('the example shows one step at a time, then the answer', async () => {
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    await user.click(screen.getByRole('button', { name: 'Learn this skill' }));
    await user.click(await screen.findByRole('tab', { name: /Example/ }));
    const region = await screen.findByRole('region', { name: 'Example' });
    expect(region.querySelectorAll('li').length).toBe(0);
    expect(document.querySelector('[data-example-answer]')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Show me how/ }));
    expect(region.querySelectorAll('li').length).toBe(1);
    while (screen.queryByRole('button', { name: /Next step/ })) await user.click(screen.getByRole('button', { name: /Next step/ }));
    expect(document.querySelector('[data-example-answer]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: /Practise/ }));
    expect(await screen.findByRole('region', { name: 'Question' })).toBeTruthy();
  });

  it('the back button returns to practice, and an unknown skill goes home', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    const user = openApp(`/skill/${ADD}/learn`);
    await user.click(await screen.findByRole('button', { name: 'Back to practice' }));
    expect(await screen.findByRole('region', { name: 'Question' })).toBeTruthy();
    document.body.innerHTML = '';
    openApp('/skill/M-9-Z9/learn');
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
  });
});

async function openReview(): Promise<ReturnType<typeof openApp>> {
  const user = openApp();
  await user.click(await screen.findByRole('button', { name: 'Robin' }));
  await user.click(await screen.findByRole('button', { name: /Review \(1\)/ }));
  await screen.findByRole('region', { name: 'Question' });
  return user;
}

describe('review', () => {
  it('3 right keeps the medal and moves the skill to the next box', async () => {
    await setUp('K');
    await (await repo()).saveSkillState(mastered(ADD, -1));
    const user = await openReview();
    const prompts = new Set<string>();
    for (let i = 0; i < 3; i += 1) {
      expect(document.querySelector('[data-review-count]')?.textContent).toBe(`${i} of 3`);
      prompts.add(document.querySelector('[data-visual="equation"]')?.getAttribute('aria-label') ?? '');
      await answer(user, sumOnScreen());
      await settled();
    }
    expect(prompts.size).toBe(3); // never the same question twice
    const card = await screen.findByRole('dialog', { name: 'Review done' });
    expect(card.textContent).toContain('1 of 1 medal kept');
    const state = await stateOf(ADD);
    expect(state).toMatchObject({ score: 100, reviewBox: 1, attempts: 20 });
    expect(localDay(new Date(state?.reviewDueAt ?? ''))).toBe('2026-03-14'); // 5 days on
    const log = await (await repo()).listAttempts('kid-1', {});
    expect(log.map((a) => a.kind)).toEqual(['review', 'review', 'review']);
    expect(log.every((a) => a.scoreBefore === 100 && a.scoreAfter === 100 && a.level === 3)).toBe(true);
    const sessions = await (await repo()).listSessions('kid-1', addDays(NOW.toISOString(), -1));
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ kind: 'review', questions: 3, correct: 3, skillId: null });
    await user.click(screen.getByRole('button', { name: /All done/ }));
    await screen.findByRole('heading', { name: 'Robin' });
    expect(screen.queryByRole('button', { name: /Review/ })).toBeNull();
  });

  it('2 right keeps the medal in the same box', async () => {
    await setUp('K');
    await (await repo()).saveSkillState({ ...mastered(ADD, -1), reviewBox: 2 });
    const user = await openReview();
    await answer(user, wrongValue());
    await user.click(await screen.findByRole('button', { name: /Got it/ }));
    for (let i = 0; i < 2; i += 1) {
      await screen.findByRole('region', { name: 'Question' });
      await answer(user, sumOnScreen());
      await settled();
    }
    await screen.findByRole('dialog', { name: 'Review done' });
    const state = await stateOf(ADD);
    expect(state).toMatchObject({ score: 100, reviewBox: 2 });
    expect(localDay(new Date(state?.reviewDueAt ?? ''))).toBe('2026-03-21'); // 12 days on
  });

  it('0 or 1 right drops the skill to 85 and back into practice', async () => {
    await setUp('K');
    await (await repo()).saveSkillState({ ...mastered(ADD, -1), reviewBox: 3 });
    const user = await openReview();
    for (let i = 0; i < 2; i += 1) {
      await answer(user, wrongValue());
      await user.click(await screen.findByRole('button', { name: /Got it/ }));
      await screen.findByRole('region', { name: 'Question' });
    }
    // The score does not move until the review is over.
    expect((await stateOf(ADD))?.score).toBe(100);
    await answer(user, sumOnScreen());
    await settled();
    const card = await screen.findByRole('dialog', { name: 'Review done' });
    expect(card.querySelector('[data-result="practise"]')).not.toBeNull();
    const state = await stateOf(ADD);
    expect(state).toMatchObject({ score: 85, masteredAt: null, reviewDueAt: null, bestScore: 100 });
    expect(spoken.sounds).not.toContain('buzz');
  });

  it('with nothing due, /review says so and goes home', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    const user = openApp('/review');
    const card = await screen.findByRole('dialog', { name: 'Review done' });
    expect(card.textContent).toContain('Nothing to review right now.');
    await user.click(screen.getByRole('button', { name: /All done/ }));
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
  });
});

describe('Play', () => {
  it('runs a pick for one session length, then "Next one" moves on with no menu in between', async () => {
    await setUp('K', { sessionLength: 2 });
    await masterAllBut([ADD]); // leaves "Add to 10" as the only pick
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect(await picksOnScreen()).toEqual([ADD]);
    await user.click(screen.getByRole('button', { name: /Play/ }));
    await screen.findByRole('region', { name: 'Question' });
    for (let i = 0; i < 2; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
    }
    expect(document.querySelector('[data-break]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Keep going/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Next one/ }));
    expect(await screen.findByRole('dialog', { name: 'All done!' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Home/ }));
    expect(await screen.findByRole('img', { name: '2 of 15 questions today' })).toBeTruthy();
    expect((await stateOf(ADD))?.attempts).toBe(2);
  });

  it('a review pick runs as a review, then moves on', async () => {
    await setUp('K');
    await masterAllBut([]);
    await (await repo()).saveSkillState(mastered(ADD, -1));
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect(await picksOnScreen()).toEqual([ADD]);
    await user.click(screen.getByRole('button', { name: /Play/ }));
    await screen.findByRole('heading', { name: /Review: Add to 10/ });
    for (let i = 0; i < 3; i += 1) {
      await screen.findByRole('region', { name: 'Question' });
      await answer(user, sumOnScreen());
      await settled();
    }
    await screen.findByRole('dialog', { name: 'Review done' });
    await user.click(screen.getByRole('button', { name: /Next one/ }));
    expect(await screen.findByRole('dialog', { name: 'All done!' })).toBeTruthy();
    expect((await stateOf(ADD))?.reviewBox).toBe(1);
  });

  it('"All done" on the break goes home, and Play with no picks goes home', async () => {
    const child = await setUp('K', { sessionLength: 1 });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await user.click(await screen.findByRole('button', { name: /Play/ }));
    await screen.findByRole('region', { name: 'Question' });
    await holdHome();
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
    document.body.innerHTML = '';
    await masterAllBut([]);
    useAppStore.getState().setChild(child);
    openApp('/play');
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
    await findOnMath(user, 'Add to 10');
  });
});

describe('the screen wake lock', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('is asked for during practice and given back on leaving', async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ release }));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
    expect(release).not.toHaveBeenCalled();
    await holdHome();
    await screen.findByRole('heading', { name: 'Robin' });
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  });

  it('a refusal is ignored', async () => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) } });
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    await answer(user, sumOnScreen());
    await settled();
    expect((await stateOf(ADD))?.attempts).toBe(1);
    expect(recentErrors()).toEqual([]);
  });
});
