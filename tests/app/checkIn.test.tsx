import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { syncAwards } from '../../src/app/awardsRun';
import { checkInToday, diagnosticLadders, growthStates, isFirstVisit, runCatalogueGrowth } from '../../src/app/checkIn';
import { useDiagnostic } from '../../src/app/useDiagnostic';
import { skillById } from '../../src/content/catalogue';
import { allGenerators } from '../../src/content/registry';
import { shouldWalk, sittingCap } from '../../src/engine/diagnostic';
import type { Question, Response } from '../../src/engine/types';
import { advanceClock, localDay } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { openRepo } from '../../src/storage/index';
import type { Child, DiagnosticProgress, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, holdHome, openApp, setUp } from './practiceHelpers';

const spoken = vi.hoisted(() => ({ said: [] as unknown[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown) => {
    spoken.said.push(say);
    return true;
  },
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));
vi.mock('../../src/audio/sfx', async (original) => ({ ...(await original<typeof import('../../src/audio/sfx')>()), playSfx: () => undefined, unlockAudio: async () => undefined }));

const repo = async () => (await openRepo()).repo;
const DAY = 86_400_000;

function rightResponse(question: Question): Response {
  switch (question.type) {
    case 'choice':
      return { index: question.answerIndex };
    case 'multiSelect':
      return { indexes: question.answerIndexes };
    case 'tapCount':
      return { count: question.answer };
    case 'numberPad':
      return { value: question.answer };
    case 'numberLineTap':
    case 'columnSum':
      return { value: question.answer };
    case 'dragWord':
      return { index: question.answerIndex };
    case 'setClock':
      return { time: question.answer };
    case 'buildBar':
      return { values: question.answer };
    case 'order':
      return { order: question.answerOrder };
    case 'sort':
      return { bins: question.answerBin };
    case 'match':
      return { pairs: question.answerPairs };
    case 'tiles':
      return { tiles: question.answer.split('') };
  }
}

function progressOf(change: Partial<DiagnosticProgress>): DiagnosticProgress {
  return { childId: 'kid-1', subject: 'math', ladders: {}, sittings: 0, done: false, lastSittingDay: '', updatedAt: NOW.toISOString(), ...change };
}

describe('which check-in home offers', () => {
  it('the ladders hold only skills that are built, in ladder order', () => {
    const ready = new Set(allGenerators().map((generator) => generator.skillId));
    const math = diagnosticLadders('math');
    expect(math.map((ladder) => ladder.id)).toEqual(['counting', 'comparing', 'add-subtract', 'place-value', 'shapes', 'length', 'patterns', 'data', 'time', 'money', 'fractions', 'multiply-divide', 'measures']);
    // A ladder with no skill built yet is not a ladder yet. Every Language Arts ladder now has at least one.
    expect(diagnosticLadders('ela').map((ladder) => ladder.id)).toEqual(['letters', 'sounds', 'phonics', 'sight-words', 'grammar', 'vocabulary', 'reading']);
    for (const ladder of [...math, ...diagnosticLadders('ela')]) for (const skill of ladder.skills) expect(ready.has(skill.id)).toBe(true);
    expect(math[0]?.skills.map((skill) => skill.id).slice(0, 9)).toEqual(['M-PK-A1', 'M-PK-A2', 'M-PK-A3', 'M-PK-A12', 'M-PK-A4', 'M-PK-A5', 'M-PK-A6', 'M-PK-A7', 'M-PK-A11']);
    // Reasoning is never checked.
    expect([...math, ...diagnosticLadders('ela')].some((ladder) => ladder.skills.some((skill) => skill.id.startsWith('R-')))).toBe(false);
  });

  it('a child who has never opened the math check-in starts with it', () => {
    expect(isFirstVisit('K', { math: null, ela: null })).toBe(true);
    expect(isFirstVisit('K', { math: progressOf({}), ela: null })).toBe(false);
  });

  it('offers one sitting a day, swapping subjects, until both are finished', () => {
    const today = '2026-03-09';
    // Math was opened and left part-way, with no sitting ended: it is offered again.
    expect(checkInToday('K', { math: progressOf({}), ela: null }, today)).toBe('math');
    // A sitting ended today: nothing more today.
    expect(checkInToday('K', { math: progressOf({ sittings: 1, lastSittingDay: today }), ela: null }, today)).toBeNull();
    // The next day, the subject with fewer sittings goes next.
    expect(checkInToday('K', { math: progressOf({ sittings: 1, lastSittingDay: today }), ela: null }, '2026-03-10')).toBe('ela');
    expect(checkInToday('K', { math: progressOf({ sittings: 1, lastSittingDay: '2026-03-08' }), ela: progressOf({ subject: 'ela', sittings: 1, lastSittingDay: today }) }, '2026-03-10')).toBe('math');
    // A finished subject is not offered, and when both are finished nothing is.
    expect(checkInToday('K', { math: progressOf({ sittings: 2, done: true, lastSittingDay: '2026-03-08' }), ela: progressOf({ subject: 'ela', sittings: 3 }) }, today)).toBe('ela');
    expect(checkInToday('K', { math: progressOf({ done: true }), ela: progressOf({ subject: 'ela', done: true }) }, today)).toBeNull();
  });
});

// Runs one sitting through the hook, answering right only where `knows` says so.
async function sitting(child: Child, subject: 'math' | 'ela', knows: (skillId: string) => boolean): Promise<{ asked: string[]; end: string }> {
  const { result, unmount } = renderHook(() => useDiagnostic(child, subject));
  const asked: string[] = [];
  for (;;) {
    await waitFor(() => expect(['asking', 'sittingOver', 'done', 'failed']).toContain(result.current.phase));
    if (result.current.phase !== 'asking') break;
    const question = result.current.question as Question;
    asked.push(question.skillId);
    advanceClock(4000);
    if (knows(question.skillId)) {
      act(() => result.current.setResponse(rightResponse(question)));
      act(() => result.current.submit());
    } else {
      act(() => result.current.dontKnow());
    }
    await waitFor(() => expect(result.current.question === question && result.current.phase === 'asking').toBe(false));
  }
  const end = result.current.phase;
  unmount();
  return { asked, end };
}

describe('a check-in over more than one sitting', () => {
  it('saves placements by skill id, places out what the child knows, and never moves a score', async () => {
    const child = await setUp('K', {}, { checkIn: 'new' });
    // This child knows every pre-K skill and nothing above.
    const knows = (skillId: string): boolean => skillById(skillId)?.grade === 'PK';

    const first = await sitting(child, 'math', knows);
    expect(first.end).toBe('sittingOver');
    expect(first.asked).toHaveLength(sittingCap('K'));
    let progress = await (await repo()).getDiagnosticProgress('kid-1', 'math');
    expect(progress).toMatchObject({ sittings: 1, done: false, lastSittingDay: localDay(NOW) });

    // A kindergarten child walks every ladder that starts at or below K and has four or more skills:
    // with grade 3 built, that takes three sittings.
    let sittings = 1;
    let end: string = first.end;
    const later: string[] = [];
    const sizes = [first.asked.length];
    while (end !== 'done' && sittings < 5) {
      advanceClock(DAY);
      const next = await sitting(child, 'math', knows);
      later.push(...next.asked);
      sizes.push(next.asked.length);
      end = next.end;
      sittings += 1;
    }
    expect(end).toBe('done');
    progress = await (await repo()).getDiagnosticProgress('kid-1', 'math');
    expect(progress).toMatchObject({ sittings: 3, done: true });

    // Every math ladder with a built skill has one placement, and each is a skill id on that ladder or null.
    const results = await (await repo()).listDiagnostics('kid-1');
    const ladders = diagnosticLadders('math');
    expect(results.map((result) => result.ladderId).sort()).toEqual(ladders.map((ladder) => ladder.id).sort());
    const placed = Object.fromEntries(results.map((result) => [result.ladderId, result.placementSkillId]));
    // The placement is the first kindergarten skill: directly above everything the child knows.
    expect(placed).toMatchObject({ counting: 'M-K-A1', comparing: 'M-K-B1', 'add-subtract': 'M-K-C1', shapes: 'M-K-E1', patterns: 'M-K-G1' });
    // Ladders too short to walk are placed at the child's grade without a question.
    expect(placed).toMatchObject({ 'place-value': 'M-K-D1', length: 'M-K-F1', data: 'M-K-F2' });
    expect(results.find((result) => result.ladderId === 'counting')).toMatchObject({ subject: 'math', estimateGrade: 'K', estimateFraction: 0 });

    // Skills below each placement are placed out at 80. Nothing at or above it has a state.
    const states = await (await repo()).getSkillStates('kid-1');
    const preK = allGenerators().map((generator) => generator.skillId).filter((id) => id.startsWith('M-PK-'));
    expect(states.map((state) => state.skillId).sort()).toEqual(preK.sort());
    for (const state of states) expect(state).toMatchObject({ score: 80, bestScore: 80, placedOut: true, masteredAt: null, attempts: 0 });

    // Every answer is logged as a check-in answer with the score unchanged, in a check-in session.
    const attempts = await (await repo()).listAttempts('kid-1', {});
    expect(attempts).toHaveLength(first.asked.length + later.length);
    for (const attempt of attempts) {
      expect(attempt.kind).toBe('diagnostic');
      expect(attempt.scoreAfter).toBe(attempt.scoreBefore);
      expect(attempt.correct).toBe(knows(attempt.skillId));
    }
    expect(attempts.filter((attempt) => !attempt.correct).every((attempt) => attempt.snapshot.given === "I don't know yet" && attempt.response === null)).toBe(true);
    const sessions = await (await repo()).listSessions('kid-1');
    expect(sessions.map((session) => [session.kind, session.questions, session.endedAt !== null])).toEqual(sizes.map((size) => ['diagnostic', size, true]));

    // No skill is tested twice: at most three questions on any one skill, and only on walked ladders.
    const counts = new Map<string, number>();
    for (const id of [...first.asked, ...later]) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
    const walked = new Set(diagnosticLadders('math').filter((ladder) => shouldWalk(ladder, 'K')).flatMap((ladder) => ladder.skills.map((skill) => skill.id)));
    for (const id of counts.keys()) expect(walked.has(id)).toBe(true);
    // Questions are asked at level 2, or the skill's top level when that is lower.
    for (const attempt of attempts) expect(attempt.level).toBe(Math.min(2, skillById(attempt.skillId)?.maxLevel ?? 2));
    expect(recentErrors()).toEqual([]);
  });

  it('a sitting stopped part-way picks up where it left off, without asking the finished ladders again', async () => {
    const child = await setUp('K', {}, { checkIn: 'new' });
    const { result, unmount } = renderHook(() => useDiagnostic(child, 'math'));
    for (let i = 0; i < 5; i += 1) {
      await waitFor(() => expect(result.current.phase).toBe('asking'));
      const question = result.current.question;
      advanceClock(3000);
      act(() => result.current.dontKnow());
      await waitFor(() => expect(result.current.question).not.toBe(question));
    }
    unmount();
    const saved = await (await repo()).getDiagnosticProgress('kid-1', 'math');
    // Stopping is not the end of a sitting: nothing is counted, and home offers the check-in again today.
    expect(saved).toMatchObject({ sittings: 0, lastSittingDay: '' });
    const askedSoFar = Object.values(saved?.ladders ?? {}).reduce((sum, walk) => sum + walk.asked, 0);
    expect(askedSoFar).toBe(5);
    const rest = await sitting(child, 'math', () => false);
    expect(rest.end).toBe('sittingOver');
    // The sitting limit counts from when the child came back.
    expect(rest.asked).toHaveLength(sittingCap('K'));
    expect((await (await repo()).listAttempts('kid-1', {})).length).toBe(5 + sittingCap('K'));
  });
});

describe('a finished check-in', () => {
  it('opening it again asks nothing and does not count as a sitting', async () => {
    const child = await setUp('K');
    const before = await (await repo()).getDiagnosticProgress('kid-1', 'math');
    const again = await sitting(child, 'math', () => true);
    expect(again).toEqual({ asked: [], end: 'done' });
    expect(await (await repo()).getDiagnosticProgress('kid-1', 'math')).toEqual(before);
    expect(await (await repo()).listSessions('kid-1')).toEqual([]);
  });
});

describe('the check-in on screen', () => {
  it('a new child starts with the math check-in, can leave it, and home then offers it once a day', async () => {
    await setUp('K', {}, { checkIn: 'new' });
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    expect(await screen.findByRole('heading', { name: /Check-in: Math/ })).toBeTruthy();
    await screen.findByRole('region', { name: 'Question' });
    expect(screen.getByRole('button', { name: /I don't know yet/ })).toBeTruthy();

    // "Skip for now" is offered before the first answer. It goes home, and home does not send the child straight back.
    await user.click(screen.getByRole('button', { name: /Skip for now/ }));
    await user.click(await screen.findByRole('button', { name: /Check-in/ }));
    await screen.findByRole('region', { name: 'Question' });
    // So does a press and hold on the home button.
    await holdHome();
    const checkIn = await screen.findByRole('button', { name: /Check-in/ });
    expect(checkIn.getAttribute('data-check-in')).toBe('math');
    expect(screen.getByRole('group', { name: "Today's picks" })).toBeTruthy();

    // Back in: answer "I don't know yet" until the sitting ends with a sticker.
    await user.click(checkIn);
    for (let i = 0; i < sittingCap('K'); i += 1) {
      const button = await screen.findByRole('button', { name: /I don't know yet/ });
      await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
      const before = document.querySelector('[data-check-in-count]')?.textContent;
      advanceClock(2000);
      await user.click(button);
      // Nothing says right or wrong: the next question simply comes.
      await waitFor(() => expect(document.querySelector('[data-check-in-count]')?.textContent).not.toBe(before));
      // After the first answer there is no skipping: leaving takes a press and hold.
      expect(screen.queryByRole('button', { name: /Skip for now/ })).toBeNull();
      expect(document.querySelector('[data-correct]')).toBeNull();
    }
    const card = await waitFor(() => {
      const found = document.querySelector('[data-card="sitting-over"]');
      if (!found) throw new Error('the sitting has not ended');
      return found;
    });
    expect(card.textContent).toContain('All done for today');
    expect(JSON.stringify(spoken.said.at(-1))).toContain('sticker');
    await user.click(screen.getByRole('button', { name: /Home/ }));

    // One sitting a day: no check-in button now.
    await screen.findByRole('group', { name: "Today's picks" });
    expect(screen.queryByRole('button', { name: /Check-in/ })).toBeNull();
    expect(recentErrors()).toEqual([]);
  });

  it('the next day home offers the other subject', async () => {
    const child = await setUp('K', {}, { checkIn: 'new' });
    const store = await repo();
    await store.saveDiagnosticProgress(progressOf({ sittings: 1, lastSittingDay: localDay(NOW) }));
    advanceClock(DAY);
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: child.name }));
    const checkIn = await screen.findByRole('button', { name: /Check-in/ });
    expect(checkIn.getAttribute('data-check-in')).toBe('ela');
    await user.click(checkIn);
    expect(await screen.findByRole('heading', { name: /Check-in: Language Arts/ })).toBeTruthy();
  });
});

describe('stickers', () => {
  const mastered = (skillId: string): SkillState => ({ ...newSkillState('kid-1', skillId, NOW.toISOString()), score: 100, bestScore: 100, attempts: 15, correct: 15, masteredAt: NOW.toISOString() });
  const placedOut = (skillId: string): SkillState => ({ ...newSkillState('kid-1', skillId, NOW.toISOString()), score: 80, bestScore: 80, placedOut: true });

  it('mastering a skill uncovers the right sticker, celebrated once on home', async () => {
    await setUp('K');
    await (await repo()).saveSkillState(mastered('M-K-A1'));
    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    const card = await waitFor(() => {
      const found = document.querySelector('[data-card="new-stickers"]');
      if (!found) throw new Error('no sticker card yet');
      return found;
    });
    expect([...card.querySelectorAll('[data-new-award]')].map((el) => el.getAttribute('data-new-award'))).toEqual(['mastered:math-K:1']);
    expect(card.textContent).toContain('1 skill mastered');
    expect(spoken.said).toContainEqual(['You earned a new sticker.']);
    await user.click(screen.getByRole('button', { name: /Yay/ }));
    expect(document.querySelector('[data-card="new-stickers"]')).toBeNull();

    // The board shows it uncovered, and the others still covered.
    await user.click(screen.getByRole('button', { name: /Stickers/ }));
    const board = await waitFor(() => {
      const found = document.querySelector('[data-board="math-K"]');
      if (!found) throw new Error('no board yet');
      return found;
    });
    expect(board.querySelector('[data-award="mastered:math-K:1"]')?.getAttribute('data-earned')).toBe('yes');
    expect(board.querySelector('[data-award="mastered:math-K:3"]')?.getAttribute('data-earned')).toBe('no');
    expect(board.querySelector('h2')?.textContent).toMatch(/^Math, Kindergarten: 1 of \d+$/);
    // One board for each subject and grade with skills, one for Reasoning, one for Milestones.
    expect([...document.querySelectorAll('[data-board]')].map((el) => el.getAttribute('data-board'))).toEqual(['math-PK', 'math-K', 'math-1', 'math-2', 'math-3', 'ela-PK', 'ela-K', 'ela-1', 'ela-2', 'reasoning', 'milestones']);
    // The check-in stickers the child already had are on the Milestones board.
    expect(document.querySelector('[data-award="diagnostic:math"]')?.getAttribute('data-earned')).toBe('yes');

    // Going home again does not celebrate the same sticker twice.
    await user.click(screen.getByRole('button', { name: 'Back to home' }));
    await screen.findByRole('group', { name: "Today's picks" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.querySelector('[data-card="new-stickers"]')).toBeNull();
    expect((await (await repo()).listAwards('kid-1')).filter((award) => award.awardId === 'mastered:math-K:1')).toHaveLength(1);
  });

  it('a category the child placed out of shows its sticker with no celebration', async () => {
    const child = await setUp('K');
    const store = await repo();
    for (const id of ['M-PK-B1', 'M-PK-B2', 'M-PK-B3', 'M-PK-B4']) await store.saveSkillState(placedOut(id));
    const awards = await syncAwards(store, child, NOW.toISOString());
    expect(awards.earned.map((award) => award.awardId)).toContain('category:math-PK:B');
    expect(awards.fresh).toEqual([]);

    const user = openApp();
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    await screen.findByRole('group', { name: "Today's picks" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.querySelector('[data-card="new-stickers"]')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Stickers/ }));
    await waitFor(() => expect(document.querySelector('[data-award="category:math-PK:B"]')?.getAttribute('data-earned')).toBe('yes'));
  });

  it('a category with one skill earned by practice is celebrated, and an award is never taken back', async () => {
    const child = await setUp('K');
    const store = await repo();
    for (const id of ['M-PK-B1', 'M-PK-B3', 'M-PK-B4']) await store.saveSkillState(placedOut(id));
    await store.saveSkillState({ ...placedOut('M-PK-B2'), placedOut: false, attempts: 12, score: 84 });
    expect((await syncAwards(store, child, NOW.toISOString())).fresh.map((award) => award.id)).toEqual(['category:math-PK:B']);
    // The score later drops below 80: the sticker stays.
    await store.saveSkillState({ ...placedOut('M-PK-B2'), placedOut: false, attempts: 14, score: 60 });
    const later = await syncAwards(store, child, NOW.toISOString());
    expect(later.earned.map((award) => award.awardId)).toContain('category:math-PK:B');
    expect(later.fresh).toEqual([]);
  });
});

describe('catalogue growth', () => {
  it('a new skill below a saved placement is placed out, once, and a skill the child has touched is left alone', async () => {
    const child = await setUp('K');
    const store = await repo();
    // A device that has not yet seen this catalogue.
    await store.updateDeviceState({ catalogueVersion: 0 });
    await store.saveDiagnostic({ id: 'd-1', childId: 'kid-1', subject: 'math', ladderId: 'counting', placementSkillId: 'M-K-A3', estimateGrade: 'K', estimateFraction: 0.28, takenAt: NOW.toISOString() });
    // The child has practised one skill below the placement, badly. Everything else below it has no state: as if just added.
    await store.saveSkillState({ ...newSkillState('kid-1', 'M-PK-A2', NOW.toISOString()), score: 20, attempts: 4 });
    const grown = growthStates(child, await store.listDiagnostics('kid-1'), await store.getSkillStates('kid-1'), NOW.toISOString());
    expect(grown.map((state) => state.skillId)).toEqual(['M-PK-A1', 'M-PK-A3', 'M-PK-A12', 'M-PK-A4', 'M-PK-A5', 'M-PK-A6', 'M-PK-A7', 'M-PK-A11', 'M-PK-A8', 'M-PK-A9', 'M-PK-A10', 'M-PK-A13', 'M-K-A1', 'M-K-A2']);
    for (const state of grown) expect(state).toMatchObject({ score: 80, bestScore: 80, placedOut: true });

    expect((await store.getDeviceState()).catalogueVersion).toBe(0);
    expect(await runCatalogueGrowth(store, 7, NOW.toISOString())).toBe(14);
    expect((await store.getDeviceState()).catalogueVersion).toBe(7);
    const states = await store.getSkillStates('kid-1');
    expect(states.find((state) => state.skillId === 'M-PK-A2')).toMatchObject({ score: 20, placedOut: false });
    expect(states.find((state) => state.skillId === 'M-K-A2')).toMatchObject({ score: 80, placedOut: true });
    // Nothing at or above the placement is touched, and no other ladder.
    expect(states.some((state) => state.skillId === 'M-K-A3' || state.skillId.startsWith('M-PK-B'))).toBe(false);
    // The same version again does nothing. A higher one runs again and finds nothing left to do.
    expect(await runCatalogueGrowth(store, 7, NOW.toISOString())).toBe(0);
    // The step runs only when the catalogue has grown: a placement saved since then is not acted on at the same version.
    await store.saveDiagnostic({ id: 'd-9', childId: 'kid-1', subject: 'math', ladderId: 'shapes', placementSkillId: 'M-K-E1', estimateGrade: 'K', estimateFraction: 0, takenAt: NOW.toISOString() });
    expect(await runCatalogueGrowth(store, 7, NOW.toISOString())).toBe(0);
    expect((await store.getSkillStates('kid-1')).some((state) => state.skillId.startsWith('M-PK-C'))).toBe(false);
    expect(await runCatalogueGrowth(store, 8, NOW.toISOString())).toBe(6);
    expect((await store.getDeviceState()).catalogueVersion).toBe(8);
  });

  it('a ladder the child passed in full places out every skill on it, and a child with no placement gets nothing', async () => {
    const child = await setUp('K');
    const store = await repo();
    expect(growthStates(child, [], [], NOW.toISOString())).toEqual([]);
    await store.saveDiagnostic({ id: 'd-2', childId: 'kid-1', subject: 'math', ladderId: 'comparing', placementSkillId: null, estimateGrade: null, estimateFraction: null, takenAt: NOW.toISOString() });
    const grown = growthStates(child, await store.listDiagnostics('kid-1'), [], NOW.toISOString());
    expect(grown.map((state) => state.skillId)).toEqual(['M-PK-B1', 'M-PK-B2', 'M-PK-B3', 'M-PK-B4', 'M-K-B1', 'M-K-B2', 'M-K-B3', 'M-K-B4', 'M-K-B5', 'M-1-A4', 'M-1-A8', 'M-2-A3', 'M-2-A8', 'M-2-A13', 'M-3-A3']);
  });
});
