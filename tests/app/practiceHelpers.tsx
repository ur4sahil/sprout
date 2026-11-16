import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/app/App';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { advanceClock, freezeClock } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import type { Child, Grade } from '../../src/storage/schema';
import { defaultSettings } from '../../src/storage/schema';

export const NOW = new Date(2026, 2, 9, 16, 30); // a Monday afternoon, local time

export type User = ReturnType<typeof userEvent.setup>;

// A signed-in device with one child, at a fixed time, with the answer-flow waits switched off.
export async function setUp(grade: Grade = '1', change: Partial<Child['settings']> = {}): Promise<Child> {
  freezeClock(NOW);
  setTimingForTests({ tapGuardMs: 0, praiseMinMs: 0, praiseMaxMs: 0 });
  useAppStore.getState().setAccount({ status: 'signedIn', email: 'parent.one@example.com', expiresAt: new Date(NOW.getTime() + 20 * 86_400_000).toISOString() });
  const child: Child = {
    id: 'kid-1',
    name: 'Robin',
    avatar: '🐢',
    grade,
    settings: { ...defaultSettings(grade), ...change },
    resetAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
  };
  await (await openRepo()).repo.saveChild(child);
  return child;
}

export function openApp(path = '/'): User {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

// From the profile picker into a skill.
export async function openSkill(user: User, skillName: string): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Robin' }));
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${skillName}\\.`) }));
  await screen.findByRole('region', { name: 'Question' });
}

// The sum the "Add to 10" question on screen is asking for, read from its picture.
export function sumOnScreen(): number {
  const label = document.querySelector('[data-visual="equation"]')?.getAttribute('aria-label') ?? '';
  const numbers = (label.match(/\d+/g) ?? []).map(Number);
  if (numbers.length !== 2) throw new Error(`No sum on screen: "${label}"`);
  return (numbers[0] as number) + (numbers[1] as number);
}

// Answers the "Add to 10" question on screen with the given number.
export async function answer(user: User, value: number): Promise<void> {
  const type = document.querySelector('[aria-label="Question"]')?.getAttribute('data-type');
  if (type === 'choice') {
    const option = [...document.querySelectorAll('[data-option]')].find((el) => el.getAttribute('aria-label') === String(value));
    await user.click(option ?? (document.querySelector('[data-option]') as Element));
  } else {
    for (const digit of String(value)) await user.click(screen.getByRole('button', { name: digit }));
  }
  // Real answers are never given at the same instant. Without this the frozen clock would stamp them all alike.
  advanceClock(1000);
  await user.click(screen.getByRole('button', { name: /Submit/ }));
}

// A value that is certainly wrong, and is offered on screen when the question is a choice.
export function wrongValue(): number {
  const right = sumOnScreen();
  const options = [...document.querySelectorAll('[data-option]')].map((el) => Number(el.getAttribute('aria-label')));
  return options.find((option) => option !== right) ?? right + 1;
}

// Waits until the screen has moved on from the question that was just answered.
export async function settled(): Promise<void> {
  await waitFor(() => {
    const phase = document.querySelector('[data-phase]')?.getAttribute('data-phase');
    if (phase === 'saving' || phase === 'correct') throw new Error('still showing the last answer');
  });
}

// Taps through anything that sits between two questions: a celebration or the soft break.
export async function passInterruptions(user: User): Promise<string[]> {
  const seen: string[] = [];
  for (;;) {
    const celebration = document.querySelector('[data-celebration]');
    const rest = document.querySelector('[data-break]');
    if (celebration) {
      seen.push(`celebration:${celebration.getAttribute('data-celebration')}`);
      if (celebration.getAttribute('data-celebration') === '100') return seen;
      await user.click(screen.getByRole('button', { name: /Keep going/ }));
    } else if (rest) {
      seen.push('break');
      await user.click(screen.getByRole('button', { name: /Keep going/ }));
    } else return seen;
  }
}
