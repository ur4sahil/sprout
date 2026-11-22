import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { setVoiceEngine } from '../../src/audio/engine';
import { resetVoice, voiceText } from '../../src/audio/voice';
import type { Say } from '../../src/engine/types';
import { advanceClock } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import type { Child, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, answer, gotIt, openApp, setUp, settled, sumOnScreen, wrongValue } from './practiceHelpers';

// The friend on the question screen (plan section 20, phase 2) in practice, review and the Mixed bag: it is drawn
// beside the question line, in the main area (never in the side panel, which is a thin strip on a phone), it is the
// subject's friend (in the Mixed bag, each question's own), a tap on it says the question again in its voice, and it
// reacts to a right answer and a miss, or holds still in Calm mode.

const heard = vi.hoisted(() => ({ said: [] as { say: unknown; who: string }[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown, _rate?: number, _pace?: string, who?: string) => {
    heard.said.push({ say, who: who ?? 'sprout' });
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
  heard.said.length = 0;
  resetVoice();
  // The server speaks with the new voices, so each friend says its own subject.
  setVoiceEngine('piper');
});
afterEach(() => resetVoice());

const words = (say: unknown): string => voiceText(say as Say) ?? JSON.stringify(say);
const started = (child: Child, skillId: string, score: number): SkillState => ({ ...newSkillState(child.id, skillId, NOW.toISOString()), score, bestScore: score, attempts: 6, correct: 3, recent: [true, false, true, false, true, false], lastPracticedAt: NOW.toISOString() });
async function choose(child: Child, states: SkillState[] = []): Promise<void> {
  const { repo } = await openRepo();
  for (const state of states) await repo.saveSkillState(state);
  useAppStore.getState().setChild(child);
}

// Tests shorten the praise to nothing; these keep it up for a moment, to see the friend's cheer.
const praiseStaysUp = (): void => setTimingForTests({ praiseMinMs: 5000, praiseMaxMs: 5000 });
const friendBox = (): HTMLElement => document.querySelector('[data-friend]') as HTMLElement;
const promptText = (): string => document.querySelector('[data-friend-line]')?.textContent ?? '';

// The friend is in the question's own stage, in the main area, with the question line beside it.
function expectBesideTheQuestion(who: string): void {
  const friend = friendBox();
  expect(friend, 'a friend is drawn').not.toBeNull();
  expect(friend.dataset.friend).toBe(who);
  expect(friend.closest('main')).not.toBeNull();
  expect(friend.closest('aside')).toBeNull();
  const stage = friend.closest('[data-friend-stage]') as HTMLElement;
  expect(stage).not.toBeNull();
  expect(stage.querySelector('[data-friend-line]') ?? stage.querySelector('[data-verdict]')).not.toBeNull();
  expect(document.querySelector('aside [data-friend]')).toBeNull();
}

async function tapFriend(user: ReturnType<typeof openApp>, name: string): Promise<{ words: string; who: string }> {
  const before = heard.said.length;
  await user.click(screen.getByRole('button', { name: `${name}: hear the question again` }));
  await waitFor(() => expect(heard.said.length).toBe(before + 1));
  const last = heard.said.at(-1);
  return { words: words(last?.say), who: last?.who ?? '' };
}

describe('practice', () => {
  it('Pip sits beside the question line, and a tap on him says the question again in his voice', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'M-K-C4', 20)]);
    const user = openApp('/skill/M-K-C4');
    await screen.findByRole('region', { name: 'Question' });
    expectBesideTheQuestion('pip');
    await waitFor(() => expect(heard.said.length).toBeGreaterThan(0));
    const prompt = heard.said[0];
    expect(prompt?.who).toBe('pip');
    const again = await tapFriend(user, 'Pip');
    expect(again).toEqual({ words: words(prompt?.say), who: 'pip' });
    // The same words as the speaker button.
    const before = heard.said.length;
    await user.click(screen.getByRole('button', { name: 'Hear the question' }));
    await waitFor(() => expect(heard.said.length).toBe(before + 1));
    expect(words(heard.said.at(-1)?.say)).toBe(again.words);
    expect(promptText().length).toBeGreaterThan(0);
  });

  it('a miss gets a kind nod, he stays beside the steps after it, and a right answer gets his loop', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'M-K-C4', 20)]);
    const user = openApp('/skill/M-K-C4');
    await screen.findByRole('region', { name: 'Question' });
    await answer(user, wrongValue());
    await screen.findByRole('region', { name: 'Explanation' });
    expect(friendBox().dataset.friendReaction).toBe('nod');
    expect(friendBox().dataset.friendMood).toBe('think');
    expectBesideTheQuestion('pip');
    // A tap still says the question again.
    expect((await tapFriend(user, 'Pip')).who).toBe('pip');
    await gotIt(user);
    await screen.findByRole('region', { name: 'Question' });
    // The praise stays up long enough to see the cheer.
    praiseStaysUp();
    await answer(user, sumOnScreen());
    await screen.findByText('Correct!');
    expect(friendBox().dataset.friendReaction).toBe('loop');
    expect(document.querySelector('[data-friend] [data-sparkles]')).not.toBeNull();
  });

  it('Olive is the friend in Language Arts', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'E-K-A1', 20)]);
    const view = openApp('/skill/E-K-A1');
    await screen.findByRole('region', { name: 'Question' });
    expectBesideTheQuestion('olive');
    expect((await tapFriend(view, 'Olive')).who).toBe('olive');
  });

  it('in Calm mode the friend is still there and holds still: no cheer, no habits', async () => {
    const child = await setUp('K', { calm: true });
    await choose(child, [started(child, 'M-K-C4', 20)]);
    const user = openApp('/skill/M-K-C4');
    await screen.findByRole('region', { name: 'Question' });
    expectBesideTheQuestion('pip');
    expect(document.querySelector('[data-friend] [data-character]')?.hasAttribute('data-still')).toBe(true);
    praiseStaysUp();
    await answer(user, sumOnScreen());
    await screen.findByText('Correct!');
    expect(friendBox().dataset.friendReaction).toBeUndefined();
    expect(document.querySelector('[data-friend] [data-sparkles]')).toBeNull();
  });
});

describe('review', () => {
  it("each question has its skill's friend beside it, and a tap says the question again", async () => {
    const child = await setUp('K');
    const at = new Date(NOW.getTime() - 3 * 86_400_000).toISOString();
    const due = new Date(NOW.getTime() - 86_400_000).toISOString();
    await choose(child, [{ ...newSkillState(child.id, 'M-K-C4', at), score: 100, bestScore: 100, streak: 6, attempts: 20, correct: 19, recent: Array.from({ length: 10 }, () => true), masteredAt: at, reviewDueAt: due, lastPracticedAt: at }]);
    const user = openApp('/review');
    await screen.findByRole('region', { name: 'Question' });
    expectBesideTheQuestion('pip');
    expect((await tapFriend(user, 'Pip')).who).toBe('pip');
    praiseStaysUp();
    await answer(user, sumOnScreen());
    await screen.findByText('Correct!');
    expect(friendBox().dataset.friendReaction).toBe('loop');
  });
});

describe('the Mixed bag', () => {
  it("the friend changes with each question's subject, and says its own question again on a tap", async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'M-K-C1', 30), started(child, 'E-K-A1', 30)]);
    const user = openApp('/mixed');
    const seen = new Set<string>();
    for (let turn = 0; turn < 10 && seen.size < 2; turn += 1) {
      await screen.findByRole('region', { name: 'Question' });
      const subject = document.querySelector('[data-subject]')?.getAttribute('data-subject');
      const friend = subject === 'ela' ? 'olive' : 'pip';
      expectBesideTheQuestion(friend);
      expect((await tapFriend(user, friend === 'olive' ? 'Olive' : 'Pip')).who).toBe(friend);
      seen.add(friend);
      await user.click(document.querySelectorAll('[data-option]')[0] as Element);
      advanceClock(1000);
      await user.click(screen.getByRole('button', { name: /Submit/ }));
      await waitFor(() => expect(document.querySelector('[data-phase="saving"]')).toBeNull());
      if (await screen.findByRole('region', { name: 'Explanation' }, { timeout: 300 }).then(() => true, () => false)) await gotIt(user);
      else await settled();
    }
    expect(seen).toEqual(new Set(['pip', 'olive']));
  });
});
