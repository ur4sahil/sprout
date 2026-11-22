import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POP_ROUND, popTurn } from '../../src/app/games';
import { useAppStore } from '../../src/app/store';
import { setVoiceEngine } from '../../src/audio/engine';
import { LINES, chooseLine } from '../../src/audio/lines';
import { PRAISE } from '../../src/audio/say';
import { resetVoice, setVoiceOn, voiceText } from '../../src/audio/voice';
import { generatorFor } from '../../src/content/registry';
import { sittingCap } from '../../src/engine/diagnostic';
import type { Say } from '../../src/engine/types';
import { advanceClock } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import type { Child, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, answer, gotIt, openApp, setUp, settled, sumOnScreen, wrongValue } from './practiceHelpers';

// Who speaks (plan section 20, the owner's rule): once the server speaks with the new voices, inside a subject the
// subject's friend says everything (the question, "Not quite" and each step, hints and their worked example, praise,
// the check-in's questions, lessons and their examples, fast facts), and the lesson button names that friend. Sprout
// says everything outside: home, the garden, menus, today's plan, stickers, the check-in's closing lines, Pop. Every
// line is also fetched early in the voice that will say it, or the early fetch is wasted. Until the server says so
// (the live app on Kokoro), everything is said as before: the last describe below.

const heard = vi.hoisted(() => ({ said: [] as { say: unknown; pace: string; who: string }[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown, _rate?: number, pace?: string, who?: string) => {
    heard.said.push({ say, pace: pace ?? 'normal', who: who ?? 'sprout' });
    return true;
  },
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: () => undefined,
  unlockAudio: async () => undefined,
}));
// The old four-beat lesson is what a skill without a teaching lesson gets. A test turns the teaching lessons off to see it.
const lessons = vi.hoisted(() => ({ off: false }));
vi.mock('../../src/lessons', async (original) => {
  const actual = await original<typeof import('../../src/lessons')>();
  return { ...actual, teachingFor: (skillId: string) => (lessons.off ? null : actual.teachingFor(skillId)) };
});

// The sentences fetched early, as the server is asked for them.
let fetched: { text: string; pace: string; who: string }[];
beforeEach(() => {
  heard.said.length = 0;
  lessons.off = false;
  fetched = [];
  resetVoice();
  setVoiceOn(true);
  // The server speaks with the new voices, as the test copy does. The last describe turns this back.
  setVoiceEngine('piper');
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url !== '/api/voice') throw new TypeError('Failed to fetch');
    const body = JSON.parse(String(init?.body)) as { text: string; pace?: string; who?: string };
    fetched.push({ text: body.text, pace: body.pace ?? 'normal', who: body.who ?? 'sprout' });
    return new Response(new TextEncoder().encode('mp3'), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
  });
});
afterEach(() => resetVoice());

const words = (say: unknown): string => voiceText(say as Say) ?? JSON.stringify(say);
const said = (): { words: string; pace: string; who: string }[] => heard.said.map((each) => ({ words: words(each.say), pace: each.pace, who: each.who }));
const speakers = (): Set<string> => new Set(heard.said.map((each) => each.who));
const lastSaid = (): { words: string; pace: string; who: string } | undefined => said().at(-1);
// Waits until the line was said, and gives who said it.
async function whoSaid(match: RegExp | string): Promise<string> {
  const find = (): { words: string; who: string } | undefined => said().find((each) => (typeof match === 'string' ? each.words === match : match.test(each.words)));
  await waitFor(() => expect(find(), String(match)).toBeDefined());
  return find()?.who ?? '';
}
// Waits until the sentence was fetched early, and gives the voices it was fetched in.
async function fetchedBy(text: string): Promise<string[]> {
  await waitFor(() => expect(fetched.some((each) => each.text === text), text).toBe(true));
  return fetched.filter((each) => each.text === text).map((each) => each.who);
}

const started = (child: Child, skillId: string, score: number): SkillState => ({ ...newSkillState(child.id, skillId, NOW.toISOString()), score, bestScore: score, attempts: 6, correct: 3, recent: [true, false, true, false, true, false], lastPracticedAt: NOW.toISOString() });
async function choose(child: Child, states: SkillState[] = []): Promise<void> {
  const { repo } = await openRepo();
  for (const state of states) await repo.saveSkillState(state);
  useAppStore.getState().setChild(child);
}
const hintButton = (): HTMLButtonElement => document.querySelector('[data-hints-left]') as HTMLButtonElement;
// Taps the first option and Submit; after a miss, walks the steps to "Got it".
async function answerFirst(user: ReturnType<typeof openApp>): Promise<void> {
  const options = document.querySelectorAll('[data-option]');
  await user.click(options[0] as Element);
  advanceClock(1000);
  await user.click(screen.getByRole('button', { name: /Submit/ }));
  await waitFor(() => expect(document.querySelector('[data-phase="saving"]')).toBeNull());
  if (await screen.findByRole('region', { name: 'Explanation' }, { timeout: 300 }).then(() => true, () => false)) await gotIt(user);
}

describe('practice', () => {
  it('Pip says everything in Math practice: the question, Not quite and each step, the hint and its example, the praise', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'M-K-C4', 20)]);
    const user = openApp('/skill/M-K-C4');
    await screen.findByRole('region', { name: 'Question' });
    const prompt = await waitFor(() => {
      const first = said()[0];
      if (!first) throw new Error('nothing said yet');
      return first;
    });
    expect(prompt.who).toBe('pip');
    expect(await fetchedBy(prompt.words)).toEqual(['pip']);

    // A hint: the nudge, then the worked example, its steps fetched early in Pip's voice.
    await user.click(hintButton());
    expect(await whoSaid(/^Here is a hint\. /)).toBe('pip');
    await user.click(screen.getByRole('button', { name: /Show me an example/ }));
    expect(await whoSaid(/^Here is one like it, worked out\. /)).toBe('pip');
    await user.click(screen.getByRole('button', { name: /Back to my question/ }));

    // A miss: "Not quite" with the first step, then each step as it is shown.
    await answer(user, wrongValue());
    const opening = await whoSaid(/^Not quite\. /);
    expect(opening).toBe('pip');
    const notQuite = said().find((each) => each.words.startsWith('Not quite. '))?.words ?? '';
    expect(await fetchedBy(notQuite)).toEqual(['pip']);
    const before = heard.said.length;
    await user.click(screen.getByRole('button', { name: /Next step/ }));
    await waitFor(() => expect(heard.said.length).toBe(before + 1));
    expect(lastSaid()?.who).toBe('pip');
    await gotIt(user);

    // A right answer: the praise.
    await screen.findByRole('region', { name: 'Question' });
    await answer(user, sumOnScreen());
    await settled();
    const praise = PRAISE.map((each) => words(each.say));
    await waitFor(() => expect(said().some((each) => praise.includes(each.words))).toBe(true));
    expect(said().find((each) => praise.includes(each.words))?.who).toBe('pip');

    // Nothing in Math practice was said or fetched in another voice.
    expect(speakers()).toEqual(new Set(['pip']));
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['pip']));
  });

  it('Olive says Language Arts practice', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'E-K-A1', 20)]);
    openApp('/skill/E-K-A1');
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(said().length).toBeGreaterThan(0));
    expect(speakers()).toEqual(new Set(['olive']));
    expect(await fetchedBy(said()[0]?.words ?? '')).toEqual(['olive']);
  });

  it('Finn says Reasoning practice', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'R-A1', 20)]);
    openApp('/skill/R-A1');
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(said().length).toBeGreaterThan(0));
    expect(speakers()).toEqual(new Set(['finn']));
    expect(await fetchedBy(said()[0]?.words ?? '')).toEqual(['finn']);
  });
});

describe('review', () => {
  it('each question is said by its skill\'s friend, and the end card by Sprout', async () => {
    const child = await setUp('K');
    const at = new Date(NOW.getTime() - 3 * 86_400_000).toISOString();
    const due = new Date(NOW.getTime() - 86_400_000).toISOString();
    await choose(child, [{ ...newSkillState(child.id, 'M-K-C4', at), score: 100, bestScore: 100, streak: 6, attempts: 20, correct: 19, recent: Array.from({ length: 10 }, () => true), masteredAt: at, reviewDueAt: due, lastPracticedAt: at }]);
    const user = openApp('/review');
    for (let i = 0; i < 3; i += 1) {
      await screen.findByRole('region', { name: 'Question' });
      if (i === 0) {
        await answer(user, wrongValue());
        expect(await whoSaid(/^Not quite\. /)).toBe('pip');
        await gotIt(user);
      } else {
        await answer(user, sumOnScreen());
        await settled();
      }
    }
    await screen.findByRole('dialog', { name: 'Review done' });
    expect(await whoSaid(words(LINES.reviewDone))).toBe('sprout');
    // Everything before the end card was Pip's: three questions, "Not quite" and its steps, and the praise.
    const praise = PRAISE.map((each) => words(each.say));
    const pips = said().filter((each) => each.who === 'pip');
    expect(pips.length).toBeGreaterThanOrEqual(5);
    expect(pips.some((each) => praise.includes(each.words))).toBe(true);
    expect(said().filter((each) => each.who !== 'pip').map((each) => each.words)).toEqual([words(LINES.reviewDone)]);
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['pip']));
  });
});

describe('the Mixed bag', () => {
  it('each question is said by its own subject\'s friend, so the voice changes with the subject; the end card by Sprout', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'M-K-C1', 30), started(child, 'E-K-A1', 30)]);
    const user = openApp('/mixed');
    const seen = new Set<string>();
    for (let turn = 0; turn < 10; turn += 1) {
      await screen.findByRole('region', { name: 'Question' });
      const subject = document.querySelector('[data-subject]')?.getAttribute('data-subject');
      const friend = subject === 'ela' ? 'olive' : 'pip';
      await waitFor(() => expect(lastSaid()?.who).toBe(friend));
      seen.add(friend);
      const prompt = lastSaid()?.words ?? '';
      expect(await fetchedBy(prompt)).toContain(friend);
      await answerFirst(user);
      if (document.querySelector('[data-card="mixed-done"]')) break;
    }
    expect(seen).toEqual(new Set(['pip', 'olive']));
    await screen.findByText('Mixed bag done');
    expect(await whoSaid(words(LINES.mixedDone))).toBe('sprout');
    expect(said().filter((each) => each.who === 'sprout').map((each) => each.words)).toEqual([words(LINES.mixedDone)]);
  });
});

describe('lessons', () => {
  it('a lesson that teaches is said by the subject\'s friend at the lesson pace; the choice screen names Pip, and Sprout says it', async () => {
    const child = await setUp('K');
    await choose(child);
    const user = openApp('/skill/M-K-C4/learn');
    // M-K-C4 has a video, so the line offers it first.
    expect(await whoSaid(words(chooseLine('Pip', true)))).toBe('sprout');
    expect(screen.queryByRole('button', { name: /Lesson with Sprout/ })).toBeNull();
    await user.click(await screen.findByRole('button', { name: /Lesson with Pip/ }));
    await waitFor(() => expect(said().filter((each) => each.pace === 'lesson').length).toBeGreaterThan(1));
    const lesson = said().filter((each) => each.pace === 'lesson');
    expect(new Set(lesson.map((each) => each.who))).toEqual(new Set(['pip']));
    expect(await fetchedBy(lesson[0]?.words ?? '')).toContain('pip');
    expect(fetched.filter((each) => each.pace === 'lesson').every((each) => each.who === 'pip')).toBe(true);
    // The turn's question and its praise are Pip's too.
    await screen.findByText('Your turn!', undefined, { timeout: 8000 });
    expect(lastSaid()?.who).toBe('pip');
  });

  it('the four-beat lesson and the worked example are said by the subject\'s friend', async () => {
    lessons.off = true;
    const child = await setUp('K');
    await choose(child);
    const user = openApp('/skill/E-K-A1/learn');
    await user.click(await screen.findByRole('button', { name: /Lesson with Olive/ }));
    await screen.findByRole('button', { name: /Practise/ });
    const beats = generatorFor('E-K-A1')
      .lesson()
      .flatMap((beat) => (beat.reveal ? [beat.speak, beat.reveal.speak] : [beat.speak]))
      .map(words);
    for (const beat of beats) expect(await whoSaid(beat)).toBe('olive');
    expect(fetched.filter((each) => each.pace === 'lesson').every((each) => each.who === 'olive')).toBe(true);
    heard.said.length = 0;
    await user.click(screen.getByRole('tab', { name: /Example/ }));
    await waitFor(() => expect(said().length).toBe(1));
    expect(lastSaid()).toMatchObject({ pace: 'lesson', who: 'olive' });
    await user.click(screen.getByRole('button', { name: /Show me how/ }));
    await waitFor(() => expect(said().length).toBe(2));
    expect(lastSaid()).toMatchObject({ pace: 'lesson', who: 'olive' });
  });
});

describe('the check-in', () => {
  it('its questions are said by the subject\'s friend, its closing sticker line by Sprout', async () => {
    const child = await setUp('K', {}, { checkIn: 'new' });
    await choose(child);
    const user = openApp('/diagnostic?subject=math');
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(said().length).toBeGreaterThan(0));
    expect(said()[0]?.who).toBe('pip');
    expect(await fetchedBy(said()[0]?.words ?? '')).toContain('pip');
    // The closing lines are fetched early, in Sprout's voice.
    expect(await fetchedBy(words(LINES.checkInSitting))).toEqual(['sprout']);
    for (let i = 0; i < sittingCap('K'); i += 1) {
      const button = await screen.findByRole('button', { name: /I don't know yet/ });
      await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
      const before = document.querySelector('[data-check-in-count]')?.textContent;
      advanceClock(2000);
      await user.click(button);
      await waitFor(() => expect(document.querySelector('[data-check-in-count]')?.textContent).not.toBe(before));
    }
    await waitFor(() => expect(document.querySelector('[data-card="sitting-over"]')).not.toBeNull());
    expect(await whoSaid(words(LINES.checkInSitting))).toBe('sprout');
    expect(said().filter((each) => each.who !== 'pip').map((each) => each.words)).toEqual([words(LINES.checkInSitting)]);
  });

  it('the Language Arts check-in is Olive\'s', async () => {
    const child = await setUp('K', {}, { checkIn: 'new' });
    await choose(child);
    openApp('/diagnostic?subject=ela');
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(said().length).toBeGreaterThan(0));
    expect(said()[0]?.who).toBe('olive');
  });
});

describe('fast facts', () => {
  it('Pip says the facts, and they are fetched early in his voice', async () => {
    const child = await setUp('1');
    await choose(child);
    openApp('/facts/add10');
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(fetched.length).toBeGreaterThan(10));
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['pip']));
    fireEvent.click(screen.getByRole('button', { name: 'Hear the fact' }));
    await waitFor(() => expect(said().length).toBe(1));
    expect(lastSaid()?.who).toBe('pip');
    expect(fetched.map((each) => each.text)).toContain(lastSaid()?.words);
  });
});

describe('outside the subjects', () => {
  it('Sprout says home, today\'s plan and the subject page', async () => {
    await setUp('K');
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await screen.findByRole('list', { name: "Today's plan" });
    for (const speaker of screen.getAllByRole('button', { name: /^Hear: / })) await user.click(speaker);
    await user.click(await screen.findByRole('button', { name: /^Math$/ }));
    await screen.findByRole('heading', { name: /Math/ });
    await user.click(screen.getAllByRole('button', { name: /^Hear the name: / })[0] as HTMLElement);
    expect(heard.said.length).toBeGreaterThan(2);
    expect(speakers()).toEqual(new Set(['sprout']));
  });

  it('Sprout says the garden', async () => {
    const child = await setUp('K');
    await choose(child, [started(child, 'M-K-C4', 30)]);
    const user = openApp('/garden');
    const plant = await screen.findAllByRole('button', { name: /Add to 10/ });
    await user.click(plant[0] as HTMLElement);
    await waitFor(() => expect(heard.said.length).toBeGreaterThan(0));
    expect(speakers()).toEqual(new Set(['sprout']));
  });

  it('Pop is a game, so Sprout says it, wrong answers included', async () => {
    const child = await setUp('K');
    const state = started(child, 'M-K-B2', 20);
    await choose(child, [state]);
    openApp('/games/pop');
    await waitFor(() => expect(document.querySelector('[data-phase="asking"]')).not.toBeNull());
    expect(POP_ROUND).toBeGreaterThan(1);
    const right = popTurn(child, state)?.question.answerIndex ?? 0;
    const balloons = [...document.querySelectorAll<HTMLButtonElement>('[data-balloon]')];
    fireEvent.click(balloons.find((_, index) => index !== right) as HTMLElement);
    expect(await whoSaid(/^Not quite\. /)).toBe('sprout');
    expect(speakers()).toEqual(new Set(['sprout']));
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['sprout']));
  });
});

describe('before the switch to the new voices (the live app on Kokoro)', () => {
  for (const server of ['kokoro', 'not said'] as const) {
    it(`Math practice is all Sprout's, as before, with Pip still drawn beside it (server ${server})`, async () => {
      setVoiceEngine(server === 'kokoro' ? 'kokoro' : undefined);
      const child = await setUp('K');
      await choose(child, [started(child, 'M-K-C4', 20)]);
      const user = openApp('/skill/M-K-C4');
      await screen.findByRole('region', { name: 'Question' });
      expect(document.querySelector('[data-character="pip"]')).not.toBeNull();
      await waitFor(() => expect(said().length).toBeGreaterThan(0));
      await user.click(hintButton());
      expect(await whoSaid(/^Here is a hint\. /)).toBe('sprout');
      await user.click(screen.getByRole('button', { name: /Show me an example/ }));
      expect(await whoSaid(/^Here is one like it, worked out\. /)).toBe('sprout');
      await user.click(screen.getByRole('button', { name: /Back to my question/ }));
      await answer(user, wrongValue());
      expect(await whoSaid(/^Not quite\. /)).toBe('sprout');
      await user.click(screen.getByRole('button', { name: /Next step/ }));
      await gotIt(user);
      await screen.findByRole('region', { name: 'Question' });
      await answer(user, sumOnScreen());
      await settled();
      const praise = PRAISE.map((each) => words(each.say));
      await waitFor(() => expect(said().some((each) => praise.includes(each.words))).toBe(true));
      expect(speakers()).toEqual(new Set(['sprout']));
      expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['sprout']));
    });
  }

  it('the lesson button and its line say Sprout, and Sprout tells the lesson', async () => {
    setVoiceEngine('kokoro');
    const child = await setUp('K');
    await choose(child);
    const user = openApp('/skill/M-K-C4/learn');
    expect(await whoSaid(words(LINES.chooseWithVideo))).toBe('sprout');
    expect(chooseLine('Sprout', false)).toEqual(LINES.choose);
    expect(chooseLine('Sprout', true)).toEqual(LINES.chooseWithVideo);
    expect(screen.queryByRole('button', { name: /Lesson with Pip/ })).toBeNull();
    await user.click(await screen.findByRole('button', { name: /Lesson with Sprout/ }));
    await waitFor(() => expect(said().filter((each) => each.pace === 'lesson').length).toBeGreaterThan(1));
    expect(speakers()).toEqual(new Set(['sprout']));
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['sprout']));
  });

  it('review is Sprout\'s, as before: the questions, Not quite and its steps, the praise, the end card', async () => {
    setVoiceEngine('kokoro');
    const child = await setUp('K');
    const at = new Date(NOW.getTime() - 3 * 86_400_000).toISOString();
    const due = new Date(NOW.getTime() - 86_400_000).toISOString();
    await choose(child, [{ ...newSkillState(child.id, 'M-K-C4', at), score: 100, bestScore: 100, streak: 6, attempts: 20, correct: 19, recent: Array.from({ length: 10 }, () => true), masteredAt: at, reviewDueAt: due, lastPracticedAt: at }]);
    const user = openApp('/review');
    await screen.findByRole('region', { name: 'Question' });
    await answer(user, wrongValue());
    expect(await whoSaid(/^Not quite\. /)).toBe('sprout');
    await gotIt(user);
    for (let i = 0; i < 2; i += 1) {
      await screen.findByRole('region', { name: 'Question' });
      await answer(user, sumOnScreen());
      await settled();
    }
    await screen.findByRole('dialog', { name: 'Review done' });
    expect(await whoSaid(words(LINES.reviewDone))).toBe('sprout');
    expect(said().length).toBeGreaterThanOrEqual(6);
    expect(speakers()).toEqual(new Set(['sprout']));
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['sprout']));
  });

  it('the Mixed bag is Sprout\'s, misses included, with each subject\'s friend still drawn', async () => {
    setVoiceEngine('kokoro');
    const child = await setUp('K');
    await choose(child, [started(child, 'M-K-C1', 30), started(child, 'E-K-A1', 30)]);
    const user = openApp('/mixed');
    const drawn = new Set<string>();
    for (let turn = 0; turn < 10 && !said().some((each) => each.words.startsWith('Not quite. ')); turn += 1) {
      await screen.findByRole('region', { name: 'Question' });
      const subject = document.querySelector('[data-subject]')?.getAttribute('data-subject');
      if (subject) drawn.add(document.querySelector(`[data-character="${subject === 'ela' ? 'olive' : 'pip'}"]`) ? subject : 'none');
      await answerFirst(user);
    }
    expect(await whoSaid(/^Not quite\. /)).toBe('sprout');
    expect(drawn.has('none')).toBe(false);
    expect(speakers()).toEqual(new Set(['sprout']));
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['sprout']));
  });

  it('the check-in, the Mixed bag and fast facts are Sprout\'s too', async () => {
    setVoiceEngine('kokoro');
    const child = await setUp('1', {}, { checkIn: 'new' });
    await choose(child, [started(child, 'M-K-C1', 30), started(child, 'E-K-A1', 30)]);
    openApp('/diagnostic?subject=ela');
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(said().length).toBeGreaterThan(0));
    cleanup();
    openApp('/mixed');
    await screen.findByRole('region', { name: 'Question' });
    await waitFor(() => expect(said().length).toBeGreaterThan(1));
    cleanup();
    openApp('/facts/add10');
    await screen.findByRole('region', { name: 'Question' });
    fireEvent.click(screen.getByRole('button', { name: 'Hear the fact' }));
    await waitFor(() => expect(said().length).toBeGreaterThan(2));
    await waitFor(() => expect(fetched.length).toBeGreaterThan(10));
    expect(speakers()).toEqual(new Set(['sprout']));
    expect(new Set(fetched.map((each) => each.who))).toEqual(new Set(['sprout']));
  });
});
