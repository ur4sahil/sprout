import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import type { Child } from '../../src/storage/schema';
import { advanceClock } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { openRepo } from '../../src/storage/index';
import { NOW, openApp, setUp as baseSetUp } from './practiceHelpers';

// A chosen child, as after a tap on the profile page.
async function setUp(...args: Parameters<typeof baseSetUp>): Promise<Child> {
  const child = await baseSetUp(...args);
  useAppStore.getState().setChild(child);
  return child;
}

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));

// Fast facts (plan section 15.5): the menu entry, the set list and a race.

function type(value: number): void {
  for (const digit of String(value)) fireEvent.click(screen.getByRole('button', { name: digit }));
}

// The fact on screen, as "7 + 8", worked out.
function answerShown(): number {
  const text = document.querySelector('[data-fact-text]')?.textContent ?? '';
  const found = /^(\d+) ([+−×÷]) (\d+) =/.exec(text);
  if (!found) throw new Error(`no fact on screen: ${text}`);
  const [a, op, b] = [Number(found[1]), found[2], Number(found[3])];
  return op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
}

describe('fast facts', () => {
  it('is not in the menu below grade 1 unless a parent opened a set', async () => {
    await setUp('K');
    openApp('/home');
    await screen.findByRole('group', { name: 'Places to go' });
    expect(screen.queryByRole('button', { name: 'Fast facts' })).toBeNull();
  });

  it('shows a grade 1 child the two sets open at grade 1, each with a grid of its facts', async () => {
    await setUp('1');
    openApp('/home');
    fireEvent.click(await screen.findByRole('button', { name: 'Fast facts' }));
    const adding = await screen.findByRole('region', { name: 'Adding within 10' });
    expect(screen.getByRole('region', { name: 'Taking away within 10' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Adding within 20' })).toBeNull();
    expect(adding.querySelectorAll('[data-fact]')).toHaveLength(66);
    expect(adding.querySelector('[data-fluent]')?.getAttribute('data-fluent')).toBe('0');
  });

  it('a parent can open a set early', async () => {
    await setUp('1', { factSets: ['times2510'] });
    openApp('/facts');
    expect(await screen.findByRole('region', { name: 'Times 2, 5 and 10' })).toBeTruthy();
  });

  it('a race is 20 facts: the car moves on each right answer, a miss shows the right answer, and every answer is saved', async () => {
    const child = await setUp('1');
    openApp('/facts/add10');
    await screen.findByRole('region', { name: 'Question' });
    for (let i = 0; i < 20; i += 1) {
      await waitFor(() => expect(document.querySelector('[data-phase="asking"]')).not.toBeNull());
      const answer = answerShown();
      act(() => advanceClock(1500)); // quick
      if (i === 3) {
        // A wrong answer with as many digits as the right one is checked at once.
        type(answer === 9 ? 8 : (answer + 1) % 10);
        await screen.findByText('Not quite');
        expect(document.querySelector('[data-fact-text]')?.textContent).toContain(`= ${answer}`);
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        continue;
      }
      type(answer);
      if (i < 19) await waitFor(() => expect(document.querySelector('[data-right]')?.getAttribute('data-right')).toBe(String(i < 3 ? i + 1 : i)));
    }
    const done = await screen.findByRole('dialog', { name: 'Finish!' });
    expect(done.textContent).toContain('19 of 20 right');
    const { repo } = await openRepo();
    const states = await repo.listFactStates(child.id);
    expect(states.reduce((sum, state) => sum + state.answers, 0)).toBe(20);
    expect(states.every((state) => state.updatedAt >= NOW.toISOString())).toBe(true);
    expect(recentErrors()).toEqual([]);
  });

  it('a set the child cannot open sends them back to the list', async () => {
    await setUp('1');
    openApp('/facts/divide');
    expect(await screen.findByRole('region', { name: 'Adding within 10' })).toBeTruthy();
  });
});

describe('fast facts for grown-ups', () => {
  it('shows each open set with its share fast and the facts that are slow or often wrong, and opens a set early', async () => {
    const child = await setUp('1');
    const { repo } = await openRepo();
    await repo.saveFactStates([
      { childId: child.id, factId: '3+4', answers: 4, right: 1, recent: [{ right: false, ms: 2000 }], updatedAt: NOW.toISOString() },
      { childId: child.id, factId: '1+1', answers: 2, right: 2, recent: [{ right: true, ms: 900 }, { right: true, ms: 800 }], updatedAt: NOW.toISOString() },
    ]);
    openApp('/parent/facts');
    const adding = await screen.findByRole('region', { name: 'Adding within 10' });
    expect(adding.querySelector('[data-share]')?.textContent).toBe('2% fast');
    expect(adding.querySelector('[data-fact-trouble]')?.textContent).toContain('3 + 4 = 7: often wrong');
    const times = screen.getByRole('region', { name: 'Times 2, 5 and 10' });
    expect(times.textContent).toContain('opens at grade 3');
    fireEvent.click(within(times).getByRole('button', { name: 'Open early' }));
    await waitFor(async () => expect((await repo.listChildren())[0]?.settings.factSets).toEqual(['times2510']));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Times 2, 5 and 10' }).textContent).toContain('0% fast'));
  });
});
