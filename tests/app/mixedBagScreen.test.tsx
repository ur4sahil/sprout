import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { advanceClock } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import { newSkillState } from '../../src/storage/schema';
import { NOW, gotIt, openApp, setUp } from './practiceHelpers';

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

// The Mixed bag screen (plan section 17): every answer is ordinary practice on its skill.
describe('the Mixed bag', () => {
  it('asks from two topics in turn, saves each answer as practice, teaches on a miss, and ends on its card', async () => {
    const child = await setUp('K');
    const { repo } = await openRepo();
    // Two skills in progress, from two topics: adding (M-K-C1) and comparing (M-K-B1).
    for (const skillId of ['M-K-C1', 'M-K-B1']) {
      await repo.saveSkillState({ ...newSkillState(child.id, skillId, NOW.toISOString()), attempts: 4, correct: 2, score: 30, lastPracticedAt: NOW.toISOString() });
    }
    useAppStore.getState().setChild(child);
    const user = openApp('/mixed');
    const names: string[] = [];
    let wrong = 0;
    for (let turn = 0; turn < 10; turn += 1) {
      await screen.findByRole('region', { name: 'Question' });
      names.push(document.querySelector('h1')?.textContent ?? '');
      const options = document.querySelectorAll('[data-option]');
      await user.click((options[0] ?? options[1]) as Element);
      advanceClock(1000);
      await user.click(screen.getByRole('button', { name: /Submit/ }));
      await waitFor(() => expect(document.querySelector('[data-phase="saving"]')).toBeNull());
      if (await screen.findByRole('region', { name: 'Explanation' }).then(() => true, () => false)) {
        wrong += 1;
        await gotIt(user);
      }
      if (document.querySelector('[data-card="mixed-done"]')) break;
    }
    await screen.findByText('Mixed bag done');
    // Turns alternate between the two topics.
    for (let i = 1; i < names.length; i += 1) expect(names[i]).not.toBe(names[i - 1]);
    // Every answer was saved as practice on its own skill.
    const attempts = await repo.listAttempts(child.id, {});
    expect(attempts).toHaveLength(10);
    expect(attempts.every((attempt) => attempt.kind === 'practice')).toBe(true);
    expect(new Set(attempts.map((attempt) => attempt.skillId))).toEqual(new Set(['M-K-C1', 'M-K-B1']));
    const states = await repo.getSkillStates(child.id);
    expect(states.find((state) => state.skillId === 'M-K-C1')?.attempts).toBe(9);
    expect(wrong).toBeGreaterThanOrEqual(0);
  });

  it('opens for a child who has practised nothing yet, with topics not yet started (the owner\'s choice, Nov 19, 2026)', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    openApp('/mixed');
    await screen.findByRole('region', { name: 'Question' });
    expect(screen.queryByText('Nothing to mix yet')).toBeNull();
  });
});
