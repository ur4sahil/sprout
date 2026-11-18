import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAIR_COUNT, PAIR_KINDS, pairsDeck, POP_ROUND, popSkills, popTurn } from '../../src/app/games';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { makeRng } from '../../src/engine/rng';
import { openRepo } from '../../src/storage/index';
import type { Child, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, openApp, setUp } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));

// The scratchpad and the two games (plan section 10, step 22).

// A skill in progress, with one miss behind it, so the fast track (five right from the start) does not apply.
const started = (child: Child, skillId: string, score: number, change: Partial<SkillState> = {}): SkillState => ({ ...newSkillState(child.id, skillId, NOW.toISOString()), score, bestScore: score, attempts: 3, correct: 2, recent: [true, false, true], lastPracticedAt: NOW.toISOString(), ...change });

beforeEach(() => setTimingForTests({ pairsLookMs: 0 }));

describe('which skills Pop draws on', () => {
  it('takes skills in progress whose next question is a choice, and no others', async () => {
    const child = await setUp('K');
    const choice = started(child, 'M-K-B2', 20); // Compare numbers: a choice at every level
    const mastered = started(child, 'M-K-B1', 100);
    const untouched = { ...newSkillState(child.id, 'M-PK-B1', NOW.toISOString()) };
    const placedOut = started(child, 'M-PK-B2', 60, { placedOut: true });
    const sorting = started(child, 'M-PK-D3', 20); // Sort into two groups: never a choice
    expect(popTurn(child, choice)?.question.type).toBe('choice');
    expect(popTurn(child, mastered)).toBeNull();
    expect(popTurn(child, untouched)).toBeNull();
    expect(popTurn(child, placedOut)).toBeNull();
    expect(popTurn(child, sorting)).toBeNull();
    expect(popTurn(child, started(child, 'no-such-skill', 20))).toBeNull();
    expect(popSkills(child, [sorting, mastered, choice, untouched, placedOut]).map((state) => state.skillId)).toEqual(['M-K-B2']);
    // It asks what practice would ask next: the same question for the same place in the skill.
    expect(popTurn(child, choice)?.question).toEqual(popTurn(child, choice)?.question);
  });
});

describe('the Pairs deck', () => {
  it('is 12 cards in 6 pairs, of a kind that fits the grade', () => {
    for (const grade of ['PK', 'K', '1', '2'] as const) {
      const kinds = new Set<string>();
      for (let seed = 1; seed <= 40; seed += 1) {
        const { kind, cards } = pairsDeck(grade, makeRng(seed));
        kinds.add(kind);
        expect(PAIR_KINDS[grade]).toContain(kind);
        expect(cards).toHaveLength(PAIR_COUNT * 2);
        expect(cards.map((card) => card.id)).toEqual([...Array(12).keys()]);
        for (let pair = 0; pair < PAIR_COUNT; pair += 1) {
          const two = cards.filter((card) => card.pair === pair);
          expect(two).toHaveLength(2);
          // The two halves look different, so a pair is worked out, not spotted.
          expect(two[0]?.visual).not.toEqual(two[1]?.visual);
        }
        // No two cards are the same picture.
        expect(new Set(cards.map((card) => JSON.stringify(card.visual))).size).toBe(12);
        expect(new Set(cards.map((card) => card.name)).size).toBe(12);
      }
      expect(kinds.size).toBe(PAIR_KINDS[grade].length);
    }
  });

  it('pairs a numeral with that many dots for pre-K, and a double with its sum for grade 2', () => {
    const dots = pairsDeck('PK', makeRng(3)).cards;
    for (const card of dots) {
      const other = dots.find((each) => each.pair === card.pair && each.id !== card.id)!;
      const count = (visual: (typeof card)['visual']): number => (visual.kind === 'text' ? Number(visual.value) : visual.kind === 'emojiGroup' ? visual.count : -1);
      expect(count(card.visual)).toBe(count(other.visual));
    }
    const doubles = [...Array(30).keys()].map((seed) => pairsDeck('2', makeRng(seed))).find((deck) => deck.kind === 'doubles')!.cards;
    for (const card of doubles) {
      if (card.visual.kind !== 'equation') continue;
      const other = doubles.find((each) => each.pair === card.pair && each.id !== card.id)!;
      const [a, , b] = card.visual.parts as [number, string, number];
      expect(other.visual).toEqual({ kind: 'text', value: String(a + b), size: 'l' });
    }
  });
});

describe('Pop', () => {
  async function ready(): Promise<Child> {
    const child = await setUp('K');
    const { repo } = await openRepo();
    await repo.saveSkillState(started(child, 'M-K-B2', 20));
    useAppStore.getState().setChild(child);
    return child;
  }
  const balloons = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('[data-balloon]')];
  const rightIndex = async (child: Child): Promise<number> => {
    const { repo } = await openRepo();
    const state = (await repo.getSkillStates(child.id)).find((each) => each.skillId === 'M-K-B2')!;
    return popTurn(child, state)!.question.answerIndex;
  };

  it('asks ten balloon questions, saves every answer as practice, and ends with a round-over card', async () => {
    const child = await ready();
    openApp('/games/pop');
    for (let asked = 0; asked < POP_ROUND; asked += 1) {
      await waitFor(() => expect(document.querySelector(`[data-pop-count="${asked}"]`) && document.querySelector('[data-phase="asking"]')).toBeTruthy());
      expect(balloons().length).toBeGreaterThanOrEqual(2);
      fireEvent.click(balloons()[await rightIndex(child)] as HTMLElement);
    }
    const card = await screen.findByRole('dialog', { name: 'Round over!' });
    expect(card.textContent).toContain('You popped 10 of 10.');
    const { repo } = await openRepo();
    const attempts = await repo.listAttempts(child.id, {});
    expect(attempts).toHaveLength(10);
    expect(attempts.every((attempt) => attempt.skillId === 'M-K-B2' && attempt.correct)).toBe(true);
    // The score moved, as it does in practice.
    const state = (await repo.getSkillStates(child.id)).find((each) => each.skillId === 'M-K-B2')!;
    expect(state.attempts).toBe(13);
    expect(state.score).toBeGreaterThan(20);
  });

  it('a wrong balloon shows the right one and the explanation, and waits for Got it', async () => {
    const child = await ready();
    openApp('/games/pop');
    await waitFor(() => expect(document.querySelector('[data-phase="asking"]')).toBeTruthy());
    const right = await rightIndex(child);
    const wrong = balloons().findIndex((_, index) => index !== right);
    fireEvent.click(balloons()[wrong] as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-pop-explanation]')).toBeTruthy());
    expect(balloons()[right]?.hasAttribute('data-right')).toBe(true);
    expect(balloons().every((balloon) => balloon.disabled)).toBe(true);
    const { repo } = await openRepo();
    expect((await repo.listAttempts(child.id, {})).map((attempt) => attempt.correct)).toEqual([false]);
    // It says so, and the steps come one at a time, as in practice.
    expect(document.querySelector('[data-pop-explanation] [data-verdict]')?.textContent).toContain('Not quite');
    expect(document.querySelectorAll('[data-pop-explanation] ol li')).toHaveLength(1);
    for (;;) {
      const next = screen.queryByRole('button', { name: /Next step/ });
      if (!next) break;
      fireEvent.click(next);
    }
    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));
    await waitFor(() => expect(document.querySelector('[data-pop-count="1"]') && document.querySelector('[data-phase="asking"]')).toBeTruthy());
  });

  it('goes home when the child has no skill it can draw on', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    openApp('/games/pop');
    expect(await screen.findByRole('list', { name: "Today's plan" })).toBeTruthy();
  });
});

describe('Pairs', () => {
  it('turns two cards, keeps a pair face up, turns a miss back, and saves nothing', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    openApp('/games/pairs');
    const cards = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('[data-card]')];
    await waitFor(() => expect(cards()).toHaveLength(12));
    expect(cards().every((card) => !card.hasAttribute('data-up') && /face down/.test(card.getAttribute('aria-label') ?? ''))).toBe(true);
    const ofPair = (pair: number): HTMLButtonElement[] => cards().filter((card) => card.getAttribute('data-pair') === String(pair));

    // A miss: two cards from different pairs turn back.
    fireEvent.click(ofPair(0)[0] as HTMLElement);
    expect(ofPair(0)[0]?.hasAttribute('data-up')).toBe(true);
    fireEvent.click(ofPair(1)[0] as HTMLElement);
    await waitFor(() => expect(cards().some((card) => card.hasAttribute('data-up'))).toBe(false));
    expect(document.querySelector('[data-pairs-found="0"]')).toBeTruthy();

    // Every pair found, one after another.
    for (let pair = 0; pair < PAIR_COUNT; pair += 1) {
      const [one, two] = ofPair(pair);
      fireEvent.click(one as HTMLElement);
      fireEvent.click(two as HTMLElement);
      if (pair < PAIR_COUNT - 1) await waitFor(() => expect(document.querySelector(`[data-pairs-found="${pair + 1}"]`)).toBeTruthy());
    }
    expect(await screen.findByRole('dialog', { name: 'You found them all!' })).toBeTruthy();
    // A reward: no attempt, no session, no score.
    const { repo } = await openRepo();
    expect(await repo.listAttempts(child.id, {})).toEqual([]);
    expect(await repo.getSkillStates(child.id)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Play again/ }));
    await waitFor(() => expect(cards()).toHaveLength(12));
    expect(cards().some((card) => card.hasAttribute('data-up'))).toBe(false);
  });
});

describe('the scratchpad', () => {
  const pencil = (): HTMLElement | null => screen.queryByRole('button', { name: 'Open the scratchpad' });

  it('opens over the question from grade 1, draws, undoes, clears, and keeps nothing', async () => {
    const child = await setUp('1');
    useAppStore.getState().setChild(child);
    openApp('/skill/M-1-B1');
    await screen.findByRole('region', { name: 'Question' });
    fireEvent.click(pencil() as HTMLElement);
    const pad = await screen.findByRole('dialog', { name: 'Scratchpad' });
    const paper = screen.getByRole('img', { name: 'Drawing area' });
    const draw = (from: [number, number], to: [number, number]): void => {
      act(() => {
        fireEvent.pointerDown(paper, { pointerId: 1, clientX: from[0], clientY: from[1] });
        fireEvent.pointerMove(paper, { pointerId: 1, clientX: to[0], clientY: to[1] });
        fireEvent.pointerUp(paper, { pointerId: 1 });
      });
    };
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveProperty('disabled', true);
    draw([10, 10], [60, 40]);
    draw([20, 80], [90, 80]);
    expect(pad.getAttribute('data-lines')).toBe('2');
    expect(paper.querySelectorAll('polyline')).toHaveLength(2);
    expect(paper.querySelector('polyline')?.getAttribute('points')).toBe('10,10 60,40');
    // Moving with no finger down draws nothing.
    fireEvent.pointerMove(paper, { pointerId: 1, clientX: 200, clientY: 200 });
    expect(paper.querySelector('polyline:last-of-type')?.getAttribute('points')).toBe('20,80 90,80');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(paper.querySelectorAll('polyline')).toHaveLength(1);
    draw([5, 5], [6, 6]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(paper.querySelectorAll('polyline, circle')).toHaveLength(0);
    // The question is still underneath, and closing throws the drawing away.
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    draw([1, 1], [2, 2]);
    fireEvent.click(screen.getByRole('button', { name: 'Close the scratchpad' }));
    expect(screen.queryByRole('dialog', { name: 'Scratchpad' })).toBeNull();
    fireEvent.click(pencil() as HTMLElement);
    expect(screen.getByRole('dialog', { name: 'Scratchpad' }).getAttribute('data-lines')).toBe('0');
  });

  it('is not offered before grade 1', async () => {
    const child = await setUp('K');
    useAppStore.getState().setChild(child);
    openApp('/skill/M-K-C4');
    await screen.findByRole('region', { name: 'Question' });
    expect(pencil()).toBeNull();
  });
});
