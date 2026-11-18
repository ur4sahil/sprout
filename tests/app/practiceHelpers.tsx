import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/app/App';
import { grantPass, resetGateForTests, savePin } from '../../src/app/pin';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { advanceClock, freezeClock } from '../../src/lib/clock';
import { CATALOGUE_VERSION } from '../../src/content/catalogue';
import { openRepo } from '../../src/storage/index';
import type { Child, Grade } from '../../src/storage/schema';
import { defaultSettings } from '../../src/storage/schema';

export const NOW = new Date(2026, 2, 9, 16, 30); // a Monday afternoon, local time

export type User = ReturnType<typeof userEvent.setup>;

// A signed-in device with one child, at a fixed time, with the answer-flow waits switched off.
// The check-in is marked finished, so home shows picks straight away. A test about the check-in passes `checkIn: 'new'`.
// The family PIN is 1234. A grown-up has just passed the gate, unless a test passes `gate: 'closed'`.
export const PIN = '1234';
export async function setUp(grade: Grade = '1', change: Partial<Child['settings']> = {}, options: { checkIn?: 'done' | 'new'; gate?: 'open' | 'closed' } = {}): Promise<Child> {
  freezeClock(NOW);
  setTimingForTests({ tapGuardMs: 0, praiseMinMs: 0, praiseMaxMs: 0, holdToExitMs: 30, tryPauseMs: 0, beatGapMs: 0 });
  useAppStore.getState().setAccount({ status: 'signedIn', email: 'parent.one@example.com', expiresAt: new Date(NOW.getTime() + 20 * 86_400_000).toISOString() });
  const child: Child = {
    id: 'kid-1',
    name: 'Robin',
    avatar: '🐢',
    grade,
    settings: { ...defaultSettings(grade), ...change },
    resetAt: null,
    levelWeeks: [], storiesRead: [], stickersPlaced: [],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
  };
  const { repo } = await openRepo();
  await savePin(repo, PIN);
  resetGateForTests();
  if (options.gate !== 'closed') grantPass();
  // As on a device that has been open before: the catalogue's new skills have already been placed.
  await repo.updateDeviceState({ catalogueVersion: CATALOGUE_VERSION });
  await repo.saveChild(child);
  if (options.checkIn !== 'new') {
    await finishCheckIn(child.id);
  }
  return child;
}

// Marks both check-ins finished for a child, with their two stickers already on the board.
export async function finishCheckIn(childId: string): Promise<void> {
  const { repo } = await openRepo();
  for (const subject of ['math', 'ela'] as const) {
    await repo.saveDiagnosticProgress({ childId, subject, ladders: {}, sittings: 1, done: true, lastSittingDay: '', updatedAt: NOW.toISOString() });
    await repo.addAward({ childId, awardId: `diagnostic:${subject}`, earnedAt: NOW.toISOString() });
  }
}

export function openApp(path = '/'): User {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

// Presses and holds the home button until the kid lock lets go.
export async function holdHome(): Promise<void> {
  const button = screen.getByRole('button', { name: /^Back to home\. Press and hold/ });
  fireEvent.pointerDown(button);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
  });
  fireEvent.pointerUp(button);
}

// From home to a skill's tile on the Math page.
export async function findOnMath(user: User, skillName: string): Promise<HTMLElement> {
  await user.click(await screen.findByRole('button', { name: /^Math$/ }));
  await screen.findByRole('heading', { name: /Math/ });
  // The skill may sit under another grade's tab.
  const tile = (): HTMLElement | null => screen.queryByRole('button', { name: new RegExp(`^${skillName}\\.`) });
  for (const tab of screen.queryAllByRole('tab')) {
    if (tile()) break;
    await user.click(tab);
  }
  const found = tile();
  if (!found) throw new Error(`No tile for "${skillName}" on the Math page`);
  return found;
}

// From the profile picker into a skill.
export async function openSkill(user: User, skillName: string): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Robin' }));
  await user.click(await findOnMath(user, skillName));
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
// On the explanation after a wrong answer: taps "Next step" until the last step, then "Got it".
export async function gotIt(user: User): Promise<void> {
  await screen.findByRole('region', { name: 'Explanation' });
  for (;;) {
    const next = screen.queryByRole('button', { name: /Next step/ });
    if (!next) break;
    await user.click(next);
  }
  await user.click(screen.getByRole('button', { name: /Got it/ }));
}

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
