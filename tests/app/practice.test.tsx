import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { setTimingForTests } from '../../src/app/timing';
import { advanceClock, localDay } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { openRepo } from '../../src/storage/index';
import { NOW, answer, openApp, openSkill, passInterruptions, setUp, settled, sumOnScreen, wrongValue } from './practiceHelpers';

// What the app says and plays, recorded instead of spoken.
const spoken = vi.hoisted(() => ({ said: [] as unknown[], phrases: [] as string[], sounds: [] as string[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown) => {
    spoken.said.push(say);
    return true;
  },
  speakPhrase: async (key: string) => {
    spoken.phrases.push(key);
    return true;
  },
  stop: () => undefined,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: (name: string) => {
    spoken.sounds.push(name);
  },
  unlockAudio: async () => {
    spoken.sounds.push('unlock');
  },
}));

beforeEach(() => {
  spoken.said.length = 0;
  spoken.phrases.length = 0;
  spoken.sounds.length = 0;
});

const repo = async () => (await openRepo()).repo;
const stateOf = async () => (await (await repo()).getSkillStates('kid-1')).find((s) => s.skillId === 'M-K-C4');
const attempts = async () => (await repo()).listAttempts('kid-1', {});

describe('a new child masters a skill', () => {
  it('15 correct answers: score 100, medal shown, 15 attempts stored with snapshots and days, review scheduled', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    const between: string[] = [];
    for (let i = 0; i < 15; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
      // Each answer is saved before the next question renders.
      expect(await attempts()).toHaveLength(i + 1);
      between.push(...(await passInterruptions(user)));
    }

    // The medal.
    expect(document.querySelector('[data-celebration="100"]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Mastered!' })).toBeTruthy();
    expect(screen.getByText('You earned a medal.')).toBeTruthy();
    // The 10th answer reaches 90 and is also the end of a grade 1 session: the celebration comes first, then the break.
    expect(between).toEqual(['celebration:50', 'celebration:80', 'celebration:90', 'break', 'celebration:100']);
    expect(spoken.sounds.filter((s) => s === 'fanfare')).toHaveLength(1);

    const state = await stateOf();
    expect(state).toMatchObject({ score: 100, bestScore: 100, streak: 15, attempts: 15, correct: 15, reviewBox: 0, placedOut: false });
    expect(state?.masteredAt).toBe(new Date(NOW.getTime() + 15_000).toISOString()); // each test answer is a second apart
    // The first review is due in 2 days.
    expect(localDay(new Date(state?.reviewDueAt ?? ''))).toBe('2026-03-11');

    const log = await attempts();
    expect(log).toHaveLength(15);
    expect(log.map((a) => a.scoreAfter)).toEqual([10, 20, 31, 41, 52, 61, 70, 78, 86, 90, 92, 94, 96, 98, 100]);
    expect(log.map((a) => a.scoreBefore)).toEqual([0, 10, 20, 31, 41, 52, 61, 70, 78, 86, 90, 92, 94, 96, 98]);
    // The level asked follows the score: 1, then 2 from 40, 3 from 70, 4 from 90.
    expect(log.map((a) => a.level)).toEqual([1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4]);
    for (const a of log) {
      expect(a.day).toBe('2026-03-09');
      expect(a.kind).toBe('practice');
      expect(a.correct).toBe(true);
      expect(a.contentVersion).toBe(1);
      expect(a.snapshot.prompt).toMatch(/^\d+ plus \d+ equals what\? \[.*□.*\]$/);
      expect(a.snapshot.correct).toMatch(/^\d+$/);
      expect(a.snapshot.given).toBe(a.snapshot.correct);
      expect(a.itemType).toBe(a.level <= 2 ? 'choice' : 'numberPad');
      expect(Number.isInteger(a.seed)).toBe(true);
    }
    // No question was asked twice in a row.
    for (let i = 1; i < log.length; i += 1) expect(log[i]?.snapshot.prompt).not.toBe(log[i - 1]?.snapshot.prompt);
    // One session holds them all.
    const sessions = await (await repo()).listSessions('kid-1');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ questions: 15, correct: 15, kind: 'practice', skillId: 'M-K-C4', day: '2026-03-09' });
    expect(new Set(log.map((a) => a.sessionId))).toEqual(new Set([sessions[0]?.id]));
    expect(recentErrors()).toEqual([]);

    // "All done" on the medal goes home, where the skill now shows as mastered.
    await user.click(screen.getByRole('button', { name: /All done/ }));
    expect(await screen.findByRole('button', { name: 'Add to 10. Score 100' })).toBeTruthy();
    expect(document.querySelector('[data-stage="mastered"]')).not.toBeNull();
  }, 60_000);
});

describe('a wrong answer', () => {
  it('shows the explanation, with no buzzer, and moves the score as the table says', async () => {
    await setUp('1'); // standard scoring
    const user = openApp();
    await openSkill(user, 'Add to 10');
    await answer(user, sumOnScreen());
    await settled();
    expect((await stateOf())?.score).toBe(10);

    const right = sumOnScreen();
    const wrong = wrongValue();
    await answer(user, wrong);
    const panel = await screen.findByRole('region', { name: 'Explanation' });
    expect(panel.querySelector('[data-given]')?.textContent).toBe(String(wrong));
    expect(panel.querySelector('[data-correct]')?.textContent).toBe(String(right));
    expect(screen.getByText('You answered')).toBeTruthy();
    expect(screen.getByText('Correct answer')).toBeTruthy();
    expect(panel.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(1);
    expect(panel.querySelector('ol')?.textContent).toContain(`= ${right}`);
    // 10 with a loss of 2 is 8, and the streak is gone.
    expect(await stateOf()).toMatchObject({ score: 8, streak: 0, attempts: 2, correct: 1, recent: [true, false] });
    // The explanation is read aloud. No sound plays for a wrong answer.
    expect(spoken.sounds).toEqual(['unlock', 'chime']);
    expect(JSON.stringify(spoken.said.at(-1))).toContain('Count on');

    const log = await attempts();
    expect(log[1]).toMatchObject({ correct: false, scoreBefore: 10, scoreAfter: 8 });
    expect(log[1]?.snapshot).toMatchObject({ correct: String(right), given: String(wrong) });

    // "Got it" loads the next question.
    await user.click(screen.getByRole('button', { name: /Got it/ }));
    await screen.findByRole('region', { name: 'Question' });
    expect(screen.queryByRole('region', { name: 'Explanation' })).toBeNull();
  });

  it('in gentle mode, the default for kindergarten, the loss is smaller', async () => {
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    await answer(user, sumOnScreen());
    await settled();
    await answer(user, wrongValue());
    await screen.findByRole('region', { name: 'Explanation' });
    expect((await stateOf())?.score).toBe(9);
  });

  it('the next question after a miss is one level easier', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    // Up to 52, where level 2 is asked.
    for (let i = 0; i < 5; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
      await passInterruptions(user);
    }
    expect((await stateOf())?.score).toBe(52);
    await answer(user, wrongValue());
    await user.click(await screen.findByRole('button', { name: /Got it/ }));
    await screen.findByRole('region', { name: 'Question' });
    await answer(user, sumOnScreen());
    await settled();
    const log = await attempts();
    expect(log.map((a) => a.level)).toEqual([1, 1, 1, 1, 2, 2, 1]);
    // After that one easier question, the level goes back to what the score calls for.
    await passInterruptions(user);
    await answer(user, sumOnScreen());
    await settled();
    expect((await attempts()).at(-1)?.level).toBe(2);
  });
});

describe('milestones', () => {
  it('a milestone is not shown twice when the child drops below it and climbs back', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    const seen: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
      seen.push(...(await passInterruptions(user)));
    }
    expect(seen).toEqual(['celebration:50']);
    expect((await stateOf())?.score).toBe(52);

    // Two misses: 52 to 46 to 42.
    for (let i = 0; i < 2; i += 1) {
      await answer(user, wrongValue());
      await user.click(await screen.findByRole('button', { name: /Got it/ }));
      await screen.findByRole('region', { name: 'Question' });
    }
    expect((await stateOf())?.score).toBe(42);

    // Back past 50.
    await answer(user, sumOnScreen());
    await settled();
    seen.push(...(await passInterruptions(user)));
    await answer(user, sumOnScreen());
    await settled();
    seen.push(...(await passInterruptions(user)));
    expect((await stateOf())?.score).toBeGreaterThan(50);
    expect(seen.filter((s) => s === 'celebration:50')).toHaveLength(1);
  });

  it('a celebration says what happened, and "Keep going" returns to a new question', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    for (let i = 0; i < 5; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
    }
    expect(screen.getByRole('dialog', { name: 'Halfway there!' })).toBeTruthy();
    expect(JSON.stringify(spoken.said.at(-1))).toContain('Halfway there!');
    await user.click(screen.getByRole('button', { name: /Keep going/ }));
    await screen.findByRole('region', { name: 'Question' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the answer flow', () => {
  it('reads the prompt aloud when a question appears, and praises a right answer with a chime', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    await waitFor(() => expect(JSON.stringify(spoken.said)).toContain('equals what?'));
    const before = spoken.said.length;
    await answer(user, sumOnScreen());
    await settled();
    expect(spoken.sounds).toEqual(['unlock', 'chime']);
    expect(spoken.phrases).toHaveLength(1);
    expect(spoken.phrases[0]).toMatch(/^phrase:/);
    // Tapping the option said its number, then the next prompt was read, once.
    await waitFor(() => expect(spoken.said.length).toBe(before + 2));
    expect(spoken.said[before]).toEqual([{ number: expect.any(Number) }]);
    expect(JSON.stringify(spoken.said[before + 1])).toContain('equals what?');
    await new Promise((r) => setTimeout(r, 150));
    expect(spoken.said.length).toBe(before + 2);
  });

  it('does not read the prompt when auto-speak is off', async () => {
    await setUp('2'); // off by default above grade 1
    const user = openApp();
    await openSkill(user, 'Add to 10');
    expect(spoken.said.filter((say) => JSON.stringify(say).includes('equals what?'))).toEqual([]);
    // The speaker button still reads it.
    await user.click(screen.getByRole('button', { name: 'Hear the question' }));
    expect(JSON.stringify(spoken.said.at(-1))).toContain('equals what?');
  });

  it('Submit is off until there is an answer, and inputs lock once it is tapped', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    expect(screen.getByRole('button', { name: /Submit/ })).toHaveProperty('disabled', true);
    setTimingForTests({ praiseMinMs: 300, praiseMaxMs: 300 });
    await answer(user, sumOnScreen());
    await waitFor(() => expect(document.querySelector('[data-phase="correct"]')).not.toBeNull());
    expect(screen.getByRole('status').textContent).toContain('Correct!');
    expect([...document.querySelectorAll('[data-option]')].every((el) => (el as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.queryByRole('button', { name: /Submit/ })).toBeNull();
    await settled();
  });

  it('ignores a tap in the first 400 ms after a question appears', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    setTimingForTests({ tapGuardMs: 400 });
    const right = [...document.querySelectorAll('[data-option]')].find((el) => el.getAttribute('aria-label') === String(sumOnScreen()));
    await user.click(right as Element);
    advanceClock(399);
    await user.click(screen.getByRole('button', { name: /Submit/ }));
    expect(await attempts()).toHaveLength(0);
    expect(document.querySelector('[data-phase]')?.getAttribute('data-phase')).toBe('asking');
    advanceClock(1);
    await user.click(screen.getByRole('button', { name: /Submit/ }));
    await settled();
    expect(await attempts()).toHaveLength(1);
  });

  it('when an answer cannot be saved it says so, stays on the question, and a retry saves it once', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    const store = await repo();
    const real = store.saveSkillState.bind(store);
    let fail = true;
    store.saveSkillState = async (s) => {
      if (fail) throw new Error('storage is full');
      return real(s);
    };
    const prompt = screen.getByRole('region', { name: 'Question' }).querySelector('p')?.textContent;
    await answer(user, sumOnScreen());
    expect((await screen.findByRole('alert')).textContent).toContain('could not be saved');
    expect(screen.getByRole('region', { name: 'Question' }).querySelector('p')?.textContent).toBe(prompt);
    expect((await stateOf())?.score ?? 0).toBe(0);
    expect(recentErrors().map((e) => e.message)).toContain('storage is full');

    fail = false;
    await user.click(screen.getByRole('button', { name: /Submit/ }));
    await settled();
    expect(await attempts()).toHaveLength(1); // not two
    expect((await stateOf())?.score).toBe(10);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('offers a soft break after the session length, with no forced end', async () => {
    await setUp('1', { sessionLength: 3 });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    for (let i = 0; i < 3; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
    }
    const rest = screen.getByRole('dialog', { name: 'Time for a break?' });
    expect(rest.textContent).toContain('You answered 3 questions.');
    await user.click(screen.getByRole('button', { name: /Keep going/ }));
    await screen.findByRole('region', { name: 'Question' });
    for (let i = 0; i < 3; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
      await passInterruptionsExceptBreak(user);
    }
    expect(screen.getByRole('dialog', { name: 'Time for a break?' }).textContent).toContain('You answered 6 questions.');
    await user.click(screen.getByRole('button', { name: /All done/ }));
    expect(await screen.findByRole('group', { name: 'Skills' })).toBeTruthy();
    // Leaving closed the session.
    await waitFor(async () => expect((await (await repo()).listSessions('kid-1'))[0]?.endedAt).not.toBeNull());
  });

  it('shows the timer only when the parent turned it on', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    expect(document.querySelector('[data-time]')).toBeNull();
    expect(document.querySelector('[data-answered]')?.textContent).toBe('0');
  });

  it('with the timer on, the time is shown', async () => {
    await setUp('1', { showTimer: true });
    const user = openApp();
    await openSkill(user, 'Add to 10');
    expect(document.querySelector('[data-time]')?.textContent).toBe('0:00');
  });

  it('picks up where the child left off, and never repeats the question just answered', async () => {
    await setUp('1');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    for (let i = 0; i < 3; i += 1) {
      await answer(user, sumOnScreen());
      await settled();
    }
    await user.click(screen.getByRole('button', { name: 'Back to home' }));
    await user.click(await screen.findByRole('button', { name: 'Add to 10. Score 31' }));
    await screen.findByRole('region', { name: 'Question' });
    expect(document.querySelector('[data-score]')?.getAttribute('data-score')).toBe('31');
    await answer(user, sumOnScreen());
    await settled();
    const log = await attempts();
    expect(log).toHaveLength(4);
    expect(new Set(log.map((a) => a.snapshot.prompt)).size).toBe(4);
    expect((await (await repo()).listSessions('kid-1')).length).toBe(2);
  });
});

async function passInterruptionsExceptBreak(user: ReturnType<typeof openApp>): Promise<void> {
  const celebration = document.querySelector('[data-celebration]');
  if (celebration) await user.click(screen.getByRole('button', { name: /Keep going/ }));
}

describe('getting to a skill', () => {
  it('with no child chosen, a skill or the home path goes back to the profile picker', async () => {
    await setUp('1');
    openApp('/skill/M-K-C4');
    expect(await screen.findByRole('button', { name: 'Robin' })).toBeTruthy();
    expect(useAppStore.getState().child).toBeNull();
  });

  it('a skill that does not exist goes back to home', async () => {
    const child = await setUp('1');
    useAppStore.getState().setChild(child);
    openApp('/skill/M-9-Z9');
    expect(await screen.findByRole('group', { name: 'Skills' })).toBeTruthy();
  });
});
