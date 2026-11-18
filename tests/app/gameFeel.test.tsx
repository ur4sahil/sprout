import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { popTurn } from '../../src/app/games';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { advanceClock } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import type { Child, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, openApp, setUp } from './practiceHelpers';

const heard = vi.hoisted(() => ({ sounds: [] as string[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));
vi.mock('../../src/audio/sounds', async (original) => ({
  ...(await original<typeof import('../../src/audio/sounds')>()),
  playSound: (name: string) => {
    heard.sounds.push(name);
  },
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: (name: string) => {
    heard.sounds.push(name);
  },
}));

// Fast facts, Pairs and Pop feel like practice (game feel, phase 8): the shared sounds, sparkles, and the subject's
// friend in the corner, cheering a right answer and encouraging after a miss.

beforeEach(() => {
  heard.sounds.length = 0;
  setTimingForTests({ pairsLookMs: 0 });
});

const mood = (): string | null => document.querySelector('[data-game-friend]')?.getAttribute('data-friend-mood') ?? null;
const started = (child: Child, skillId: string, score: number): SkillState => ({ ...newSkillState(child.id, skillId, NOW.toISOString()), score, bestScore: score, attempts: 3, correct: 2, recent: [true, false, true], lastPracticedAt: NOW.toISOString() });

describe('Pop', () => {
  it('a right balloon pops with its sound and sparkles, and Pip cheers; a miss gets a warm smile', async () => {
    const child = await setUp('K');
    const { repo } = await openRepo();
    await repo.saveSkillState(started(child, 'M-K-B2', 20));
    useAppStore.getState().setChild(child);
    openApp('/games/pop');
    await waitFor(() => expect(document.querySelector('[data-phase="asking"]')).toBeTruthy());
    expect(document.querySelector('[data-game-friend]')?.getAttribute('data-game-friend')).toBe('pip');
    expect(mood()).toBe('listen');
    const state = (await repo.getSkillStates(child.id)).find((each) => each.skillId === 'M-K-B2') as SkillState;
    const right = popTurn(child, state)?.question.answerIndex ?? 0;
    fireEvent.click(document.querySelectorAll('[data-balloon]')[right] as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-phase="right"]')).toBeTruthy());
    expect(heard.sounds).toEqual(expect.arrayContaining(['pop', 'chime']));
    expect(mood()).toBe('cheer');
    expect(document.querySelector('[aria-label="Balloons"] [data-particles]')).not.toBeNull();

    await waitFor(() => expect(document.querySelector('[data-pop-count="1"]') && document.querySelector('[data-phase="asking"]')).toBeTruthy());
    const next = (await repo.getSkillStates(child.id)).find((each) => each.skillId === 'M-K-B2') as SkillState;
    const answer = popTurn(child, next)?.question.answerIndex ?? 0;
    const wrong = [...document.querySelectorAll('[data-balloon]')].findIndex((_, index) => index !== answer);
    fireEvent.click(document.querySelectorAll('[data-balloon]')[wrong] as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-pop-explanation]')).toBeTruthy());
    expect(mood()).toBe('encourage');
    expect(heard.sounds).toContain('notyet');
  });
});

describe('Pairs', () => {
  it('a flip has its sound, a found pair sparkles and the friend cheers, a miss is smiled on', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    openApp('/games/pairs');
    const cards = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('[data-card]')];
    await waitFor(() => expect(cards()).toHaveLength(12));
    const ofPair = (pair: number): HTMLButtonElement[] => cards().filter((card) => card.getAttribute('data-pair') === String(pair));
    expect(mood()).toBe('listen');
    fireEvent.click(ofPair(0)[0] as HTMLElement);
    expect(heard.sounds).toEqual(['pick']);
    fireEvent.click(ofPair(1)[0] as HTMLElement);
    expect(mood()).toBe('encourage');
    await waitFor(() => expect(cards().some((card) => card.hasAttribute('data-up'))).toBe(false));
    expect(document.querySelector('[data-particles]')).toBeNull();
    fireEvent.click(ofPair(2)[0] as HTMLElement);
    fireEvent.click(ofPair(2)[1] as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-pairs-found="1"]')).toBeTruthy());
    expect(mood()).toBe('cheer');
    expect(heard.sounds).toContain('chime');
    expect(document.querySelector('[aria-label="Cards"] [data-particles]')).not.toBeNull();
  });
});

describe('a fast facts race', () => {
  it('a right answer chimes, sparkles and Pip cheers; a miss has the soft sound and a warm smile', async () => {
    const child = await setUp('1');
    useAppStore.getState().setChild(child);
    openApp('/facts/add10');
    await waitFor(() => expect(document.querySelector('[data-phase="asking"]')).not.toBeNull());
    expect(document.querySelector('[data-game-friend]')?.getAttribute('data-game-friend')).toBe('pip');
    const shown = (): number => {
      const found = /^(\d+) ([+−]) (\d+) =/.exec(document.querySelector('[data-fact-text]')?.textContent ?? '');
      if (!found) throw new Error('no fact on screen');
      return found[2] === '+' ? Number(found[1]) + Number(found[3]) : Number(found[1]) - Number(found[3]);
    };
    const type = (value: number): void => {
      for (const digit of String(value)) fireEvent.click(screen.getByRole('button', { name: digit }));
    };
    act(() => advanceClock(1500));
    type(shown());
    await waitFor(() => expect(document.querySelector('[data-right]')?.getAttribute('data-right')).toBe('1'));
    expect(heard.sounds).toContain('chime');
    expect(mood()).toBe('cheer');
    expect(document.querySelector('[aria-label="Question"] [data-particles]')).not.toBeNull();
    await waitFor(() => expect(document.querySelector('[data-phase="asking"]')).not.toBeNull());
    const answer = shown();
    // A wrong answer with as many digits as the right one is checked at once.
    type(answer >= 10 ? answer + 1 : answer === 9 ? 8 : answer + 1);
    await screen.findByText('Not quite');
    expect(heard.sounds).toContain('notyet');
    expect(mood()).toBe('encourage');
  });
});
