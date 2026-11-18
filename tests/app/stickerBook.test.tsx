import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { awardSkills } from '../../src/app/awardsRun';
import { BOOK_LINES, firstPage, forgetPresses, howToEarn, looseStickers, placedForNow, stickerTelling, wordsSay } from '../../src/app/stickerBook';
import { useAppStore } from '../../src/app/store';
import { allAwards } from '../../src/engine/awards';
import type { Say } from '../../src/engine/types';
import { localDay } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import Awards, { boardName } from '../../src/screens/kid/Awards';
import { openRepo } from '../../src/storage/index';
import { newSkillState } from '../../src/storage/schema';
import { NOW, setUp } from './practiceHelpers';

const spoken = vi.hoisted(() => ({ said: [] as unknown[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown) => {
    spoken.said.push(say);
    return true;
  },
  stop: () => undefined,
}));
const sounds = vi.hoisted(() => ({ played: [] as string[] }));
vi.mock('../../src/audio/sounds', async (original) => ({
  ...(await original<typeof import('../../src/audio/sounds')>()),
  playSound: (name: string) => {
    sounds.played.push(name);
  },
}));

// Spoken text keeps digits and signs out of plain words (CLAUDE.md).
function speakable(say: Say): boolean {
  return say.length > 0 && say.every((part) => (typeof part === 'string' ? part.trim().length > 0 && !/[0-9+=<>_]/.test(part) : true));
}

const earned = (awardId: string, earnedAt: string) => ({ awardId, earnedAt });

// jsdom has no PointerEvent, so a pointer's place would be lost. A mouse event carries it.
beforeEach(() => {
  if (typeof window.PointerEvent === 'undefined') vi.stubGlobal('PointerEvent', MouseEvent);
});

afterEach(() => {
  forgetPresses();
  spoken.said = [];
  sounds.played = [];
  delete document.documentElement.dataset.calm;
});

describe('which stickers are loose', () => {
  it('every earned sticker not pressed on is loose, oldest first', () => {
    const list = [earned('b', '2026-03-09T10:00:00.000Z'), earned('a', '2026-03-08T10:00:00.000Z'), earned('c', '2026-03-09T11:00:00.000Z')];
    expect(looseStickers(list, [])).toEqual(['a', 'b', 'c']);
    expect(looseStickers(list, ['b'])).toEqual(['a', 'c']);
    expect(looseStickers(list, ['a', 'b', 'c'])).toEqual([]);
    // A placed id that is not earned (another device, a reset) changes nothing.
    expect(looseStickers(list, ['zzz'])).toHaveLength(3);
  });

  it('until pressing on is saved: only a sticker earned today is loose, and a press this run keeps it on', () => {
    const today = localDay(new Date(2026, 2, 9, 12));
    const list = [earned('old', new Date(2026, 2, 8, 20).toISOString()), earned('new', new Date(2026, 2, 9, 8).toISOString())];
    expect(placedForNow(list, today, new Set())).toEqual(['old']);
    expect(looseStickers(list, placedForNow(list, today, new Set()))).toEqual(['new']);
    expect(placedForNow(list, today, new Set(['new']))).toEqual(['old', 'new']);
    // The next day everything earned before counts as on the page.
    expect(placedForNow(list, localDay(new Date(2026, 2, 10, 12)), new Set())).toEqual(['old', 'new']);
  });

  it('the book opens on the first page with a sticker waiting, else the child’s own Math page', () => {
    const pages = [
      { id: 'math-PK', awards: [{ id: 'p1' }] },
      { id: 'math-K', awards: [{ id: 'k1' }] },
      { id: 'milestones', awards: [{ id: 'm1' }] },
    ];
    expect(firstPage(pages, ['m1'], 'PK')).toBe(2);
    expect(firstPage(pages, [], 'K')).toBe(1);
    expect(firstPage(pages, [], '3')).toBe(0);
  });
});

describe('what a sticker needs, written and said', () => {
  const awards = allAwards(awardSkills());

  it('every sticker there is has words for what earns it, and they can be said', () => {
    for (const award of awards) {
      const told = howToEarn(award, boardName(award.board));
      expect(told.text.length, award.id).toBeGreaterThan(5);
      expect(speakable(told.say), `${award.id}: ${JSON.stringify(told.say)}`).toBe(true);
      expect(speakable(stickerTelling(award).say), award.id).toBe(true);
    }
  });

  it('says the rule plainly for each kind', () => {
    const find = (id: string) => awards.find((award) => award.id === id);
    const of = (id: string) => {
      const award = find(id);
      if (!award) throw new Error(`no award ${id}`);
      return howToEarn(award, boardName(award.board));
    };
    expect(of('mastered:math-K:1')).toEqual({ text: 'Master 1 skill in Math, Kindergarten.', say: ['Master', { number: 1 }, 'skill in', 'Math, Kindergarten'] });
    expect(of('mastered:math-1:all').text).toBe('Master every skill in Math, Grade 1.');
    expect(of('mastered:math-1:all').say).toEqual(['Master every skill in', 'Math, Grade', { number: 1 }]);
    expect(of('category:math-K:A').text).toBe('Get every Counting skill in Math, Kindergarten to 80.');
    expect(of('questions:250')).toEqual({ text: 'Answer 250 questions.', say: ['Answer', { number: 250 }, 'questions'] });
    expect(of('days:7').text).toBe('Learn on 7 different days.');
    expect(of('diagnostic:ela').text).toBe('Finish the Language Arts check-in.');
  });

  it('turns written numbers into number parts', () => {
    expect(wordsSay('Numbers to 1,000')).toEqual(['Numbers to', { number: 1000 }]);
    expect(wordsSay('Reasoning')).toEqual(['Reasoning']);
  });
});

async function openBook(mastered: string[] = ['M-K-A1']) {
  const child = await setUp('K');
  const { repo } = await openRepo();
  for (const skillId of mastered) await repo.saveSkillState({ ...newSkillState('kid-1', skillId, NOW.toISOString()), score: 100, bestScore: 100, attempts: 15, correct: 15, masteredAt: NOW.toISOString() });
  useAppStore.getState().setChild(child);
  const view = render(
    <MemoryRouter initialEntries={['/awards']}>
      <Awards />
    </MemoryRouter>,
  );
  await waitFor(() => {
    if (!view.container.querySelector('[data-book]')) throw new Error('no book yet');
  });
  return view;
}
const openPage = (root: HTMLElement): string | null => root.querySelector('[data-book]')?.getAttribute('data-page') ?? null;

for (const mode of ['normal', 'calm'] as const) {
  describe(`the sticker book, ${mode} mode`, () => {
    const setMode = (): void => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
    };

    it('keeps every page, mark and count; opens on the page with a new sticker, loose at its foot, and says so', async () => {
      setMode();
      const { container } = await openBook();
      // Every board is still a page, in order, with its count; only the open page is in view.
      expect([...container.querySelectorAll('[data-board]')].map((el) => el.getAttribute('data-board'))).toEqual(['math-PK', 'math-K', 'math-1', 'math-2', 'math-3', 'ela-PK', 'ela-K', 'ela-1', 'ela-2', 'reasoning', 'milestones']);
      expect([...container.querySelectorAll('[data-board]')].filter((el) => !el.hasAttribute('hidden'))).toHaveLength(1);
      // Three stickers are waiting (the new one and the two check-in stickers, all from today): the book opens on
      // the first page that has one.
      expect(openPage(container)).toBe('math-K');
      const board = container.querySelector('[data-board="math-K"]') as HTMLElement;
      expect(board.querySelector('h2')?.textContent).toMatch(/^Math, Kindergarten: 1 of \d+$/);
      const slot = board.querySelector('[data-award="mastered:math-K:1"]') as HTMLElement;
      expect(slot.getAttribute('data-earned')).toBe('yes');
      expect(slot.getAttribute('data-placed')).toBe('no');
      expect(board.querySelector('[data-award="mastered:math-K:3"]')?.getAttribute('data-earned')).toBe('no');
      expect(board.querySelector('[data-loose="mastered:math-K:1"]')).not.toBeNull();
      expect(spoken.said).toContainEqual(BOOK_LINES.pressMany);
      // A page out of sight has no buttons: its stickers are pictures until it is turned to.
      expect(container.querySelector('[data-board="math-PK"] button')).toBeNull();
      expect(recentErrors()).toEqual([]);
    });

    it('a tap presses a loose sticker on, with a pop', async () => {
      setMode();
      const { container } = await openBook();
      fireEvent.click(container.querySelector('[data-loose="mastered:math-K:1"]') as HTMLElement);
      const slot = container.querySelector('[data-award="mastered:math-K:1"]') as HTMLElement;
      expect(slot.getAttribute('data-placed')).toBe('yes');
      expect(slot.querySelector('img, [data-particles]')).not.toBeNull();
      expect(container.querySelector('[data-loose="mastered:math-K:1"]')).toBeNull();
      expect(sounds.played).toContain('pop');
    });

    it('a dotted sticker says and shows what earns it; a placed one says what it is', async () => {
      setMode();
      const { container } = await openBook();
      spoken.said = [];
      fireEvent.click(screen.getByRole('button', { name: '3 skills mastered. Not yet' }));
      expect(container.querySelector('[data-telling]')?.textContent).toContain('Master 3 skills in Math, Kindergarten.');
      expect(spoken.said.at(-1)).toEqual(['Master', { number: 3 }, 'skills in', 'Math, Kindergarten']);
      fireEvent.click(screen.getByRole('button', { name: 'Hear it again' }));
      expect(spoken.said).toHaveLength(2);
    });

    it('the arrows turn the pages with the page sounds, and say the page name', async () => {
      setMode();
      const { container } = await openBook();
      spoken.said = [];
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(openPage(container)).toBe('math-1');
      expect(sounds.played.at(-1)).toBe('open');
      expect(spoken.said.at(-1)).toEqual(['Math, Grade', { number: 1 }]);
      fireEvent.click(screen.getByRole('button', { name: 'Page before' }));
      expect(openPage(container)).toBe('math-K');
      expect(sounds.played.at(-1)).toBe('close');
      expect(container.querySelector('[data-board="math-K"]')?.className).toMatch(/turnBack/);
    });

    it('a sideways swipe turns the page; a mostly up-and-down one does not', async () => {
      setMode();
      const { container } = await openBook();
      const book = container.querySelector('[data-book]') as HTMLElement;
      book.getBoundingClientRect = () => ({ width: 500, height: 600, top: 0, left: 0, right: 500, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
      act(() => {
        fireEvent.pointerDown(book, { clientX: 400, clientY: 200 });
        fireEvent.pointerUp(book, { clientX: 200, clientY: 230 });
      });
      expect(openPage(container)).toBe('math-1');
      act(() => {
        fireEvent.pointerDown(book, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(book, { clientX: 250, clientY: 500 });
      });
      expect(openPage(container)).toBe('math-1');
      act(() => {
        fireEvent.pointerDown(book, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(book, { clientX: 300, clientY: 110 });
      });
      expect(openPage(container)).toBe('math-K');
    });
  });
}
