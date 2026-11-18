import { KEEP_GOING_QUESTIONS } from '../../src/app/todaysPlan';
import { LINES } from '../../src/audio/lines';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';
import { summariseDay } from '../../src/app/childDay';
import { saveStoryFinished } from '../../src/app/collecting';
import { EPISODES } from '../../src/stories/episodes';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { CATALOGUE } from '../../src/content/catalogue';
import { allGenerators, generatorFor } from '../../src/content/registry';
import { addDays, advanceClock, localDay } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { openRepo } from '../../src/storage/index';
import type { Attempt, Child, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, answer, gotIt, holdHome, openApp, openSkill, setUp, settled, sumOnScreen, wrongValue } from './practiceHelpers';

// What the app says and plays, recorded instead of spoken.
const spoken = vi.hoisted(() => ({ said: [] as unknown[], sounds: [] as string[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown) => {
    spoken.said.push(say);
    return true;
  },
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));
// The old four-beat lesson is still what a skill without a teaching lesson gets. A test turns the teaching lessons off to see it.
const lessons = vi.hoisted(() => ({ off: false }));
vi.mock('../../src/lessons', async (original) => {
  const actual = await original<typeof import('../../src/lessons')>();
  return { ...actual, teachingFor: (skillId: string) => (lessons.off ? null : actual.teachingFor(skillId)) };
});
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
  lessons.off = false;
  spoken.said.length = 0;
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

// Home's ringed card: the next part of today's plan. A tap on it starts that part.
const nextCard = async (): Promise<HTMLElement> => {
  await screen.findByRole('list', { name: "Today's plan" });
  const card = document.querySelector('[data-plan-part][data-next] > button');
  if (!card) throw new Error('No next card on home');
  return card as HTMLElement;
};
const gardenStrip = (name: RegExp | string) => screen.findByRole('button', { name: typeof name === 'string' ? `Your garden. Open it. ${name}` : name });

const picksOnScreen = async (): Promise<string[]> => [...(await screen.findByRole('list', { name: "Today's plan" })).querySelectorAll('[data-skill]')].map((el) => el.getAttribute('data-skill') ?? '');

describe('home', () => {
  it('shows the daily goal, today\'s plan with a Start button, and the subjects', async () => {
    await setUp('K', { preReader: false });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    // A new kindergarten child: one practice skill in each subject from Sprout's first picks, one new skill, and the
    // Mixed bag greyed out: nothing to mix yet.
    const plan = await screen.findByRole('list', { name: "Today's plan" });
    const parts = [...plan.querySelectorAll('[data-plan-part]')].map((el) => el.getAttribute('data-plan-part'));
    expect(parts).toEqual(['keepGoing', 'keepGoing', 'keepGoing', 'new', 'mixed']);
    expect([...plan.querySelectorAll('[data-subject]')].map((el) => el.getAttribute('data-subject'))).toEqual(['math', 'ela', 'reasoning']);
    expect(screen.getByRole('button', { name: /^Math practice\./ })).toBeTruthy();
    expect((screen.getByRole('button', { name: /^Mixed bag\. Opens after/ }) as HTMLButtonElement).disabled).toBe(true);
    // Home is the plan's cards (the owner's choice A): the first card is ringed as next, and Sprout says it.
    expect(plan.querySelector('[data-next]')?.getAttribute('data-subject')).toBe('math');
    expect(screen.getByRole('button', { name: 'Next up: Math practice Hear it.' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start today's plan/ })).toBeNull();
    // A strip of the garden on top carries the day's sun. The goal is the plan's questions added up: 10 + 10 + 10 + 5.
    // The greyed-out Mixed bag adds nothing.
    const strip = await gardenStrip('0 of 35 questions today.');
    expect(strip.querySelector('[data-strip-sun]')?.textContent).toBe('0/35');
    expect(screen.getByRole('button', { name: /^Math$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Language Arts$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Reasoning$/ })).toBeTruthy();
    // Nothing is due for review.
    expect(screen.queryByRole('button', { name: /Review \(/ })).toBeNull();
  });

  it('each part of the plan can be heard, and hearing it opens nothing', async () => {
    await setUp('K');
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await picksOnScreen();
    spoken.said.length = 0;
    await user.click(screen.getByRole('button', { name: 'Hear: New skill' }));
    expect(spoken.said).toHaveLength(1);
    expect(JSON.stringify(spoken.said[0])).toContain('A new skill');
    expect(screen.queryByRole('region', { name: 'Question' })).toBeNull();
  });

  it('the plan follows the grown-up\'s settings', async () => {
    await setUp('K', { planPractice: ['math'], planNew: false, planMixed: false });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    const plan = await screen.findByRole('list', { name: "Today's plan" });
    expect([...plan.querySelectorAll('[data-plan-part]')].map((el) => el.getAttribute('data-plan-part'))).toEqual(['keepGoing']);
    expect(plan.querySelector('[data-subject]')?.getAttribute('data-subject')).toBe('math');
  });

  it('the sun counts the plan\'s answers and fills by the share of the goal', async () => {
    // One skill to practice, nothing else: the goal is that skill's 10 questions.
    await setUp('K', { planPractice: ['math'], planNew: false, planMixed: false });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    for (let i = 0; i < 3; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
    }
    await holdHome();
    const strip = await gardenStrip(`3 of ${KEEP_GOING_QUESTIONS} questions today.`);
    expect(strip.querySelector('[data-strip-sun]')?.textContent).toBe(`3/${KEEP_GOING_QUESTIONS}`);
    // The card shows its three answers as three lit dots out of ten.
    const card = document.querySelector('[data-plan-part][data-next]');
    expect(card?.querySelectorAll('[data-on]')).toHaveLength(3);
    // The whole garden, a tap away, shows the same sun.
    await user.click(strip);
    const sun = await screen.findByRole('img', { name: `3 of ${KEEP_GOING_QUESTIONS} questions today` });
    expect(sun.getAttribute('data-goal-done')).toBe('3');
    expect(sun.getAttribute('data-share')).toBe(String(Math.round((3 / KEEP_GOING_QUESTIONS) * 100)));
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy();
  });

  it('says the goal is reached once the plan is done', async () => {
    const child = await setUp('K', { planPractice: ['math'], planNew: false, planMixed: false });
    const store = await repo();
    const at = NOW.toISOString();
    await store.saveSkillState({ ...newSkillState(child.id, ADD, at), attempts: KEEP_GOING_QUESTIONS, correct: KEEP_GOING_QUESTIONS, score: 60, lastPracticedAt: at });
    for (let i = 0; i < KEEP_GOING_QUESTIONS; i += 1) {
      await store.addAttempt({ id: `t-${i}`, childId: child.id, skillId: ADD, sessionId: 's-1', level: 1, seed: i, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: 'p', correct: 'c', given: 'g' }, correct: true, ms: 1000, scoreBefore: 0, scoreAfter: 10, kind: 'practice', day: localDay(NOW), createdAt: at });
    }
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await gardenStrip(`${KEEP_GOING_QUESTIONS} of ${KEEP_GOING_QUESTIONS} questions today.`);
    expect(screen.getByRole('button', { name: 'Plan done! Great work. Hear it.' })).toBeTruthy();
    expect(document.querySelector('[data-plan-part][data-next]')).toBeNull();
    // Today's story waits (game feel, phase 7).
    expect(screen.getByRole('button', { name: /Story time/ })).toBeTruthy();
  });

  it('the story at the end of the path: read once a day, saved when finished, then in the story book', async () => {
    const child = await setUp('K', { planPractice: ['math'], planNew: false, planMixed: false });
    const store = await repo();
    const at = NOW.toISOString();
    await store.saveSkillState({ ...newSkillState(child.id, ADD, at), attempts: KEEP_GOING_QUESTIONS, correct: KEEP_GOING_QUESTIONS, score: 60, lastPracticedAt: at });
    for (let i = 0; i < KEEP_GOING_QUESTIONS; i += 1) {
      await store.addAttempt({ id: `s-${i}`, childId: child.id, skillId: ADD, sessionId: 's-1', level: 1, seed: i, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: 'p', correct: 'c', given: 'g' }, correct: true, ms: 1000, scoreBefore: 0, scoreAfter: 10, kind: 'practice', day: localDay(NOW), createdAt: at });
    }
    // No story book yet: nothing has been read.
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect(screen.queryByRole('button', { name: /^Stories$/ })).toBeNull();
    // Saving a finished story: the story waits no more today, and the book appears.
    await saveStoryFinished((await store.listChildren())[0]!, EPISODES[0]!.id, localDay(NOW));
    expect((await store.listChildren())[0]?.storiesRead).toEqual([{ episodeId: EPISODES[0]!.id, day: localDay(NOW) }]);
    cleanup();
    const again = openApp();
    await again.click(await screen.findByRole('button', { name: 'Robin' }));
    await gardenStrip(`${KEEP_GOING_QUESTIONS} of ${KEEP_GOING_QUESTIONS} questions today.`);
    expect(screen.queryByRole('button', { name: /Story time/ })).toBeNull();
    expect(screen.getByText('Plan done! Great work.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Stories$/ })).toBeTruthy();
  });

  it('a mastered skill whose review is due puts Review first in the plan', async () => {
    await setUp('K');
    await (await repo()).saveSkillState(mastered(ADD, -1));
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    const plan = await screen.findByRole('list', { name: "Today's plan" });
    expect(plan.querySelector('[data-plan-part]')?.getAttribute('data-plan-part')).toBe('review');
    expect(screen.getByRole('button', { name: /Review \(1\)/ })).toBeTruthy();
  });
});

describe('home as the garden, or as a list', () => {
  it("home is the plan's cards under a strip of the garden; the strip opens the whole garden", async () => {
    await setUp('K', { preReader: false });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    const plan = await screen.findByRole('list', { name: "Today's plan" });
    expect(document.querySelector('[data-home-view]')?.getAttribute('data-home-view')).toBe('cards');
    expect(plan.getAttribute('data-look')).toBe('cards');
    // Each practice card shows its subject's friend.
    expect([...plan.querySelectorAll('[data-plan-part="keepGoing"] > button:first-of-type')].map((el) => /with (\w+)/.exec(el.textContent ?? '')?.[1])).toEqual(['Pip', 'Olive', 'Finn']);
    // The strip shows only ready skills, today's first.
    const ready = new Set(allGenerators().map((generator) => generator.skillId));
    const strip = await gardenStrip(/^Your garden\. Open it\./);
    const shown = [...strip.querySelectorAll('[data-strip-plant]')].map((el) => el.getAttribute('data-strip-plant') ?? '');
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((id) => ready.has(id))).toBe(true);
    for (const id of await picksOnScreen()) expect(shown).toContain(id);
    // The old goal card is gone; the menu is as it was, with the garden in it too.
    expect(screen.queryByRole('region', { name: 'Today' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Your garden' })).toBeNull();
    for (const name of [/^Math$/, /^Language Arts$/, /^Reasoning$/, /^Stickers$/, /^Pairs$/, /^Garden$/, /Switch child/]) expect(screen.getByRole('button', { name })).toBeTruthy();
    // The strip opens the whole garden: the path's stones are the plan's parts, in order.
    await user.click(strip);
    const garden = await screen.findByRole('region', { name: 'Your garden' });
    const parts = ['keepGoing', 'keepGoing', 'keepGoing', 'new', 'mixed'];
    const stones = [...garden.querySelectorAll('[data-stone]')];
    expect(stones.length).toBeGreaterThan(0);
    for (const stone of stones) expect(stone.getAttribute('data-stone-part')).toBe(parts[Number(stone.getAttribute('data-stone'))]);
    const plants = [...garden.querySelectorAll('[data-plant-button]')].map((el) => el.getAttribute('data-skill') ?? '');
    expect(plants.length).toBeGreaterThan(0);
    expect(plants.every((id) => ready.has(id))).toBe(true);
    // The signpost (jsdom has no screen width, so it is a phone here) sends a child where the menu would.
    await user.click(screen.getByRole('button', { name: 'Places' }));
    expect([...document.querySelectorAll('[data-place]')].map((el) => el.getAttribute('data-place'))).toEqual(['subjects:math', 'subjects:ela', 'subjects:reasoning', 'stickers', 'switch']);
    await user.click(screen.getByRole('button', { name: 'All Reasoning skills' }));
    expect(await screen.findByRole('heading', { name: /Reasoning/ })).toBeTruthy();
  });

  it('the big button opens the first part that is not done', async () => {
    const ELA = 'E-K-A1';
    await setUp('K', { planPractice: ['math', 'ela'], planNew: false, planMixed: false });
    await masterAllBut([ADD, ELA]);
    // The Math part is finished: its ten answers are in today.
    const store = await repo();
    const at = NOW.toISOString();
    await store.saveSkillState({ ...newSkillState('kid-1', ADD, at), attempts: KEEP_GOING_QUESTIONS, correct: KEEP_GOING_QUESTIONS, score: 60, lastPracticedAt: at });
    for (let i = 0; i < KEEP_GOING_QUESTIONS; i += 1) {
      await store.addAttempt({ id: `g-${i}`, childId: 'kid-1', skillId: ADD, sessionId: 's-g', level: 1, seed: i, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: 'p', correct: 'c', given: 'g' }, correct: true, ms: 1000, scoreBefore: 0, scoreAfter: 10, kind: 'practice', day: localDay(NOW), createdAt: at });
    }
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect(await picksOnScreen()).toEqual([ADD, ELA]);
    expect(document.querySelector(`[data-plan-part][data-skill="${ADD}"]`)?.hasAttribute('data-done')).toBe(true);
    // The ringed card skips the finished part.
    expect(document.querySelector(`[data-plan-part][data-skill="${ELA}"]`)?.hasAttribute('data-next')).toBe(true);
    await user.click(await nextCard());
    await screen.findByRole('region', { name: 'Question' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(CATALOGUE.find((skill) => skill.id === ELA)?.name ?? '-');
  });

  it("a plant's Practice button opens that skill, and Lesson opens its lesson", async () => {
    await setUp('K');
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await user.click(await gardenStrip(/^Your garden\. Open it\./));
    await screen.findByRole('region', { name: 'Your garden' });
    const plant = document.querySelector(`[data-plant-button][data-skill="${ADD}"]`) ?? document.querySelector('[data-plant-button]');
    const skillId = plant?.getAttribute('data-skill') ?? '';
    const name = CATALOGUE.find((skill) => skill.id === skillId)?.name ?? '';
    await user.click(plant as HTMLElement);
    const card = screen.getByRole('dialog', { name });
    await user.click(card.querySelector('[data-card-way="practice"]') as HTMLElement);
    await screen.findByRole('region', { name: 'Question' });
    await holdHome();
    await user.click(await gardenStrip(/^Your garden\. Open it\./));
    await screen.findByRole('region', { name: 'Your garden' });
    await user.click(document.querySelector(`[data-plant-button][data-skill="${skillId}"]`) as HTMLElement);
    await user.click(screen.getByRole('dialog', { name }).querySelector('[data-card-way="learn"]') as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Your garden' })).toBeNull());
    expect(screen.queryByRole('region', { name: 'Question' })).toBeNull();
  });

  it("with 'A list' chosen, home is the old list: the goal ring, Start today's plan, and no garden", async () => {
    await setUp('K', { homeView: 'list', preReader: false });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    const plan = await screen.findByRole('list', { name: "Today's plan" });
    expect(plan.querySelectorAll('[data-plan-part]')).toHaveLength(5);
    expect(screen.queryByRole('region', { name: 'Your garden' })).toBeNull();
    expect(document.querySelector('[data-garden]')).toBeNull();
    expect(screen.getByRole('button', { name: /Start today's plan/ })).toBeTruthy();
    const ring = screen.getByRole('img', { name: '0 of 35 questions today' });
    expect(ring.querySelectorAll('[data-star]').length).toBeGreaterThan(0);
    expect(screen.getByText('0 of 35 questions')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Start today's plan/ }));
    await screen.findByRole('region', { name: 'Question' });
  });
});

describe('the subject page', () => {
  it('opens on the nearest grade the child has, groups skills by category, and switches grade by tab', async () => {
    // A grade 3 child: no skill is built for that grade, so the page opens on the highest grade below it.
    await setUp('3');
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await user.click(await screen.findByRole('button', { name: /^Math$/ }));
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(tabs.map((_, i) => (i === tabs.length - 1 ? 'true' : 'false')));
    await user.click(screen.getByRole('tab', { name: 'Kindergarten' }));
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
    // Pre-K: every Pre-K skill in 4 lettered categories, in catalogue order.
    const preK = [...document.querySelectorAll('[data-skill]')].map((el) => el.getAttribute('data-skill'));
    expect(preK).toHaveLength(CATALOGUE.filter((skill) => skill.subject === 'math' && skill.grade === 'PK').length);
    expect(preK.slice(0, 3)).toEqual(['M-PK-A1', 'M-PK-A2', 'M-PK-A3']);
    expect(preK.at(-1)).toBe('M-PK-D6');
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
    lessons.off = true;
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    spoken.said.length = 0;
    await user.click(screen.getByRole('button', { name: 'Learn this skill' }));
    // The bulb opens on a choice; the lesson starts when it is picked.
    await user.click(await screen.findByRole('button', { name: /Lesson with Sprout/ }));
    const beats = generatorFor(ADD).lesson();
    expect(beats.map((beat) => beat.beat)).toEqual(['see', 'watch', 'try', 'remember']);
    await screen.findByRole('button', { name: /Practise/ });
    const expected: unknown[] = [];
    for (const beat of beats) {
      expected.push(beat.speak);
      if (beat.reveal) expected.push(beat.reveal.speak);
    }
    // The choice screen's own line comes first; then each beat in turn.
    const choice = [JSON.stringify(LINES.choose), JSON.stringify(LINES.chooseWithVideo)];
    expect(spoken.said.filter((said) => !choice.includes(JSON.stringify(said)))).toEqual(expected);
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
    await user.click(await screen.findByRole('button', { name: /^Example/ }));
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
    expect(screen.queryByRole('button', { name: /Review \(/ })).toBeNull();
    // Today's review is ticked off in the plan.
    expect((await screen.findByRole('list', { name: "Today's plan" })).querySelector('[data-plan-part="review"]')?.hasAttribute('data-done')).toBe(true);
  });

  it('2 right keeps the medal in the same box', async () => {
    await setUp('K');
    await (await repo()).saveSkillState({ ...mastered(ADD, -1), reviewBox: 2 });
    const user = await openReview();
    await answer(user, wrongValue());
    await gotIt(user);
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
      await gotIt(user);
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

describe('Start today\'s plan', () => {
  it('opens the first part not done; a part ticks off when its answers are in', async () => {
    await setUp('K', { planPractice: ['math'], planNew: false });
    await masterAllBut([ADD]);
    await (await repo()).saveSkillState({ ...newSkillState('kid-1', ADD, NOW.toISOString()), attempts: 2, correct: 1, score: 20, lastPracticedAt: NOW.toISOString() });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect(await picksOnScreen()).toEqual([ADD]);
    await user.click(await nextCard());
    await screen.findByRole('region', { name: 'Question' });
    for (let i = 0; i < KEEP_GOING_QUESTIONS; i += 1) {
      await answer(user, wrongValue());
      await gotIt(user);
      await settled();
    }
    await holdHome();
    const plan = await screen.findByRole('list', { name: "Today's plan" });
    expect(plan.querySelector(`[data-skill="${ADD}"]`)?.hasAttribute('data-done')).toBe(true);
    expect(await screen.findByRole('button', { name: /Story time/ })).toBeTruthy();
  });

  it('with a review due, the plan starts with the review', async () => {
    await setUp('K');
    await masterAllBut([]);
    await (await repo()).saveSkillState(mastered(ADD, -1));
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await user.click(await nextCard());
    await screen.findByRole('heading', { name: /Review: Add to 10/ });
  });

  it('/play goes to the next part, or home when the plan is done', async () => {
    const child = await setUp('K');
    await masterAllBut([]);
    useAppStore.getState().setChild(child);
    openApp('/play');
    expect(await screen.findByRole('heading', { name: 'Robin' })).toBeTruthy();
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
