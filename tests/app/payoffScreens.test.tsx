import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { PRAISE } from '../../src/audio/say';
import { LINES as CAST_LINES } from '../../src/cast';
import { addDays, advanceClock } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, answer, gotIt, openApp, openSkill, passInterruptions, setUp, settled, sumOnScreen, wrongValue } from './practiceHelpers';

// The payoff (game feel, phase 5) on the real screens: the friend in the corner, the plant in the status panel,
// the growth show on the medal, review pots, and the Mixed bag's basket.

const spoken = vi.hoisted(() => ({ said: [] as unknown[] }));
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
  playSfx: () => undefined,
  unlockAudio: async () => undefined,
}));

beforeEach(() => {
  spoken.said.length = 0;
});

const praise = new Set(PRAISE.map((p) => JSON.stringify(p.say)));
const pipCheers = new Set(CAST_LINES.pip.cheer.map((say) => JSON.stringify(say)));

describe('practice', () => {
  it('Pip sits in the corner and reacts, the plant grows in the status panel, and the medal ends on the growth show', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    const friend = (): string | null => document.querySelector('[data-friend]')?.getAttribute('data-friend-mood') ?? null;
    expect(document.querySelector('[data-friend]')?.getAttribute('data-friend')).toBe('pip');
    expect(friend()).toBe('listen');
    expect(document.querySelector('[data-status-plant]')?.getAttribute('data-stage')).toBe('0');

    const said: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const before = spoken.said.length;
      await answer(user, sumOnScreen());
      await settled();
      said.push(...spoken.said.slice(before).map((s) => JSON.stringify(s)));
      await passInterruptions(user);
    }
    // One praise for each right answer: the app's, or (from the fourth) sometimes Pip's own, never both.
    const praised = said.filter((s) => praise.has(s) || pipCheers.has(s));
    expect(praised).toHaveLength(10);

    // At 100 the medal plays the growth show (at once in unit tests): the plant in bloom and the three facts.
    const medal = document.querySelector('[data-celebration="100"]') as HTMLElement;
    const show = medal.querySelector('[data-growth-show]') as HTMLElement;
    expect(show.querySelector('[data-growth-plant]')?.getAttribute('data-from')).toBe('0');
    expect(show.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('4');
    expect(show.querySelector('[data-character="pip"]')?.getAttribute('data-mood')).toBe('cheerBig');
    expect(show.textContent).toContain('10 right');
    expect(show.textContent).toContain('Skill Score 100');
    await waitFor(() => expect(show.querySelector('[data-fact="sunny"]')?.hasAttribute('data-on')).toBe(true));
    // Ten answers today make today a sunny day.
    expect(show.textContent).toContain('1 sunny day this week');
    expect(screen.getByRole('button', { name: /All done/ })).toBeTruthy();
  }, 60_000);

  it('the friend thinks after a miss and encourages after a second one', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    await answer(user, wrongValue());
    await screen.findByRole('region', { name: 'Explanation' });
    expect(document.querySelector('[data-friend]')?.getAttribute('data-friend-mood')).toBe('think');
    await gotIt(user);
    await screen.findByRole('region', { name: 'Question' });
    await answer(user, wrongValue());
    await screen.findByRole('region', { name: 'Explanation' });
    expect(document.querySelector('[data-friend]')?.getAttribute('data-friend-mood')).toBe('encourage');
  });

  it('in Calm mode the friend and the plant are still there, holding still', async () => {
    await setUp('1', { calm: true });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    expect(document.querySelector('[data-friend] [data-character]')?.hasAttribute('data-still')).toBe(true);
    expect(document.querySelector('[data-status-plant] [data-plant]')).not.toBeNull();
  });
});

describe('review as watering', () => {
  const mastered = (skillId: string): SkillState => {
    const at = NOW.toISOString();
    return { ...newSkillState('kid-1', skillId, at), score: 100, bestScore: 100, streak: 6, attempts: 20, correct: 19, recent: Array.from({ length: 10 }, () => true), masteredAt: at, reviewBox: 0, reviewDueAt: addDays(at, -1), lastPracticedAt: at };
  };

  it('the skill is a droopy plant in a pot; right answers water it, a miss does no harm, and it stands tall when done', async () => {
    await setUp('K');
    await (await openRepo()).repo.saveSkillState(mastered('M-K-C4'));
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await user.click(await screen.findByRole('button', { name: /Review \(1\)/ }));
    await screen.findByRole('region', { name: 'Question' });
    const pot = (): HTMLElement => document.querySelector('[data-review-pot]') as HTMLElement;
    expect(pot().getAttribute('data-watered')).toBe('0');
    expect(pot().querySelector('[data-plant]')?.hasAttribute('data-droop')).toBe(true);
    expect(document.querySelector('[data-friend]')?.getAttribute('data-friend')).toBe('pip');

    await answer(user, sumOnScreen());
    await waitFor(() => expect(pot().getAttribute('data-watered')).toBe('1'));
    await settled();
    await answer(user, wrongValue());
    await screen.findByRole('region', { name: 'Explanation' });
    expect(pot().getAttribute('data-watered')).toBe('1');
    expect(pot().querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('4');
    await gotIt(user);
    await screen.findByRole('region', { name: 'Question' });
    await answer(user, sumOnScreen());
    await screen.findByRole('dialog', { name: 'Review done' });
  });
});

describe('the Mixed bag as a basket', () => {
  it('each card comes out of the basket edged in its subject, and the friend is that subject\'s', async () => {
    const child = await setUp('K');
    const { repo } = await openRepo();
    for (const skillId of ['M-K-C1', 'E-K-A1']) {
      await repo.saveSkillState({ ...newSkillState(child.id, skillId, NOW.toISOString()), attempts: 4, correct: 2, score: 30, lastPracticedAt: NOW.toISOString() });
    }
    useAppStore.getState().setChild(child);
    const user = openApp('/mixed');
    const seen = new Set<string>();
    for (let turn = 0; turn < 4; turn += 1) {
      await screen.findByRole('region', { name: 'Question' });
      const bag = document.querySelector('[data-subject]') as HTMLElement;
      expect(bag.querySelector('[data-basket]')).not.toBeNull();
      expect(bag.querySelector('[data-phase][data-arrive]')).not.toBeNull();
      const subject = bag.getAttribute('data-subject') ?? '';
      const friend = document.querySelector('[data-friend]')?.getAttribute('data-friend');
      expect(friend).toBe(subject === 'math' ? 'pip' : 'olive');
      seen.add(subject);
      const options = document.querySelectorAll('[data-option]');
      await user.click(options[0] as Element);
      advanceClock(1000);
      await user.click(screen.getByRole('button', { name: /Submit/ }));
      await waitFor(() => expect(document.querySelector('[data-phase="saving"]')).toBeNull());
      if (await screen.findByRole('region', { name: 'Explanation' }).then(() => true, () => false)) await gotIt(user);
    }
    expect(seen).toEqual(new Set(['math', 'ela']));
  });
});
