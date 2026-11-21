import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { openRepo } from '../../src/storage/index';
import { newSkillState } from '../../src/storage/schema';
import { NOW, answer, gotIt, openApp, setUp, settled, sumOnScreen } from './practiceHelpers';

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

// Hints (the owner's choice, Nov 21, 2026): a nudge, then a worked example; 3 a part; a right answer after one
// counts for half.

async function practising(score: number): Promise<void> {
  const child = await setUp('K');
  const { repo } = await openRepo();
  // Started already, so there is no skip test and no fast track.
  await repo.saveSkillState({ ...newSkillState(child.id, 'M-K-C4', NOW.toISOString()), attempts: 6, correct: 3, score, lastPracticedAt: NOW.toISOString() });
  useAppStore.getState().setChild(child);
}

const hintButton = (): HTMLButtonElement => document.querySelector('[data-hints-left]') as HTMLButtonElement;

describe('a hint in practice', () => {
  it('nudges with the first step, then shows a worked example, and the question waits underneath', async () => {
    await practising(20);
    const user = openApp('/skill/M-K-C4');
    await screen.findByRole('region', { name: 'Question' });
    expect(hintButton().getAttribute('aria-label')).toBe('Hint, 3 left');
    await user.click(hintButton());
    const dialog = await screen.findByRole('dialog', { name: 'Hint' });
    // "Add to 10" works its answer in three steps, so the first ("Start at ...") is the nudge.
    expect(dialog.querySelector('[data-nudge]')?.textContent).toMatch(/^Start at \d+\.$/);
    await user.click(screen.getByRole('button', { name: /Show me an example/ }));
    expect(dialog.getAttribute('data-hint')).toBe('example');
    expect(dialog.querySelector('[data-example-answer]')?.textContent).toMatch(/\d/);
    await user.click(screen.getByRole('button', { name: /Back to my question/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    // The question is still there; opening its hint again is free.
    expect(hintButton().getAttribute('aria-label')).toBe('Hint again');
    expect(hintButton().getAttribute('data-hints-left')).toBe('2');
  });

  it('a right answer after a hint is saved as hinted and gains half the points', async () => {
    await practising(20);
    const user = openApp('/skill/M-K-C4');
    await screen.findByRole('region', { name: 'Question' });
    await user.click(hintButton());
    await user.click(await screen.findByRole('button', { name: /Back to my question/ }));
    await answer(user, sumOnScreen());
    await settled();
    const { repo } = await openRepo();
    const [attempt] = await repo.listAttempts('kid-1', { skillId: 'M-K-C4' });
    expect(attempt).toMatchObject({ correct: true, hinted: true, scoreBefore: 20, scoreAfter: 25 });
    const state = (await repo.getSkillStates('kid-1')).find((s) => s.skillId === 'M-K-C4');
    expect(state?.hintedRight).toBe(1);
    // The next question without a hint gains in full.
    await screen.findByRole('region', { name: 'Question' });
    await answer(user, sumOnScreen());
    await settled();
    const latest = (await repo.listAttempts('kid-1', { skillId: 'M-K-C4' })).find((a) => a.id !== attempt?.id);
    expect(latest).toMatchObject({ correct: true, hinted: false, scoreBefore: 25, scoreAfter: 35 });
  });

  it('counts down over three questions, then is switched off for the rest of the part', async () => {
    await practising(20);
    const user = openApp('/skill/M-K-C4');
    for (const left of [3, 2, 1]) {
      await screen.findByRole('region', { name: 'Question' });
      await waitFor(() => expect(hintButton().getAttribute('data-hints-left')).toBe(String(left)));
      await user.click(hintButton());
      await user.click(await screen.findByRole('button', { name: /Back to my question/ }));
      await answer(user, sumOnScreen() + 1); // wrong, so the walk-through shows
      await gotIt(user);
    }
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(hintButton().getAttribute('aria-label')).toBe('No hints left'));
    expect(hintButton().disabled).toBe(true);
    // A wrong answer after a hint is scored like any wrong answer, and is not counted as helped.
    const { repo } = await openRepo();
    const attempts = await repo.listAttempts('kid-1', { skillId: 'M-K-C4' });
    expect(attempts.every((a) => a.hinted && !a.correct)).toBe(true);
    expect((await repo.getSkillStates('kid-1')).find((s) => s.skillId === 'M-K-C4')?.hintedRight).toBe(0);
  });
});

describe('a hint in the Mixed bag and in a review', () => {
  it('the Mixed bag has 3 hints for the whole bag, and saves a hinted answer as hinted', async () => {
    const child = await setUp('K');
    const { repo } = await openRepo();
    for (const skillId of ['M-K-C1', 'M-K-B1']) {
      await repo.saveSkillState({ ...newSkillState(child.id, skillId, NOW.toISOString()), attempts: 4, correct: 2, score: 30, lastPracticedAt: NOW.toISOString() });
    }
    useAppStore.getState().setChild(child);
    const user = openApp('/mixed');
    await screen.findByRole('region', { name: 'Question' });
    expect(hintButton().getAttribute('aria-label')).toBe('Hint, 3 left');
    await user.click(hintButton());
    await screen.findByRole('dialog', { name: 'Hint' });
    await user.click(screen.getByRole('button', { name: /Back to my question/ }));
    const options = document.querySelectorAll('[data-option]');
    await user.click(options[0] as Element);
    await user.click(screen.getByRole('button', { name: /Submit/ }));
    await waitFor(async () => expect(await repo.listAttempts(child.id, {})).toHaveLength(1));
    const [attempt] = await repo.listAttempts(child.id, {});
    expect(attempt?.hinted).toBe(true);
  });

  it('a review offers the hint button too', async () => {
    const child = await setUp('K');
    const { repo } = await openRepo();
    const at = new Date(NOW.getTime() - 5 * 86_400_000).toISOString();
    await repo.saveSkillState({ ...newSkillState(child.id, 'M-K-C4', at), score: 100, bestScore: 100, attempts: 20, correct: 20, masteredAt: at, reviewDueAt: at, lastPracticedAt: at });
    useAppStore.getState().setChild(child);
    openApp('/review');
    await screen.findByRole('region', { name: 'Question' });
    expect(hintButton().getAttribute('aria-label')).toBe('Hint, 3 left');
  });

  it('three right answers in a review, each after a hint, count as one and a half: the skill goes back to practice', async () => {
    const child = await setUp('K');
    const { repo } = await openRepo();
    const at = new Date(NOW.getTime() - 5 * 86_400_000).toISOString();
    await repo.saveSkillState({ ...newSkillState(child.id, 'M-K-C4', at), score: 100, bestScore: 100, attempts: 20, correct: 20, masteredAt: at, reviewDueAt: at, lastPracticedAt: at });
    useAppStore.getState().setChild(child);
    const user = openApp('/review');
    for (let i = 0; i < 3; i += 1) {
      await screen.findByRole('region', { name: 'Question' });
      await waitFor(() => expect(hintButton().disabled).toBe(false));
      await user.click(hintButton());
      await user.click(await screen.findByRole('button', { name: /Back to my question/ }));
      await answer(user, sumOnScreen());
      await settled();
    }
    await screen.findByText('Review done');
    const attempts = await repo.listAttempts(child.id, {});
    expect(attempts.filter((a) => a.kind === 'review' && a.correct && a.hinted)).toHaveLength(3);
    const state = (await repo.getSkillStates(child.id)).find((s) => s.skillId === 'M-K-C4');
    expect(state?.masteredAt).toBeNull();
    expect(state?.score).toBe(85);
  });
});
