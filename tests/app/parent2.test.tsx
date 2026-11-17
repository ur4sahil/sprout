import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { filterLog, redraw, troubleSpots } from '../../src/app/parentData';
import { EXTRA_PRACTICE, addToExtraPractice, moveSkill, newPlan, reasoningTemplate } from '../../src/app/plans';
import { CATALOGUE, skillById } from '../../src/content/catalogue';
import { LADDERS } from '../../src/content/ladders';
import { generateQuestion } from '../../src/content/registry';
import { describeAnswer, describePrompt, describeResponse } from '../../src/engine/describe';
import { localDay } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { openRepo } from '../../src/storage/index';
import type { Attempt, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, openApp, setUp } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({ ...(await original<typeof import('../../src/audio/speech')>()), speak: async () => true, speakPhrase: async () => true, stop: () => undefined, isSpeechAvailable: () => true }));
vi.mock('../../src/audio/sfx', async (original) => ({ ...(await original<typeof import('../../src/audio/sfx')>()), playSfx: () => undefined, unlockAudio: async () => undefined }));

const repo = async () => (await openRepo()).repo;
const TODAY = localDay(NOW);

// A real answer to a real question: made from the skill, level and seed, as practice does.
function answered(id: string, skillId: string, seed: number, correct: boolean, minutesAgo: number, change: Partial<Attempt> = {}): Attempt {
  const question = generateQuestion(skillId, 1, seed);
  if (question.type !== 'choice') throw new Error('this helper answers choice questions');
  const index = correct ? question.answerIndex : (question.answerIndex + 1) % question.options.length;
  const at = new Date(NOW.getTime() - minutesAgo * 60_000);
  return {
    id,
    childId: 'kid-1',
    skillId,
    sessionId: 's-1',
    level: 1,
    seed,
    itemType: 'choice',
    response: { index },
    contentVersion: skillById(skillId)?.version ?? 1,
    snapshot: { prompt: describePrompt(question), correct: describeAnswer(question), given: describeResponse(question, { index }) },
    correct,
    ms: 5000,
    scoreBefore: 0,
    scoreAfter: 0,
    kind: 'practice',
    day: localDay(at),
    createdAt: at.toISOString(),
    ...change,
  };
}

describe('a logged question shown again', () => {
  const skill = skillById('M-K-C4')!;

  it('is made again from its skill, level and seed when the skill has not changed', () => {
    const attempt = answered('a-1', 'M-K-C4', 77, false, 5);
    const shown = redraw(attempt, skill);
    expect(shown.question).toEqual(generateQuestion('M-K-C4', 1, 77));
    expect(shown.prompt).toBe(attempt.snapshot.prompt);
    expect(shown.given).toBe(attempt.snapshot.given);
    expect(shown.correct).toBe(attempt.snapshot.correct);
    expect(shown.given).not.toBe(shown.correct);
  });

  it('shows the saved snapshot when the skill has changed since, or is gone', () => {
    const old = answered('a-2', 'M-K-C4', 77, false, 5, { contentVersion: skill.version + 1, snapshot: { prompt: 'An older question', correct: '9', given: '8' } });
    expect(redraw(old, skill)).toEqual({ question: null, prompt: 'An older question', correct: '9', given: '8' });
    expect(redraw({ ...old, contentVersion: skill.version }, undefined).question).toBeNull();
    // A saved answer of another type than the question now made is not trusted either.
    expect(redraw({ ...old, contentVersion: skill.version, itemType: 'sort' }, skill).question).toBeNull();
  });

  it('a check-in answer of "I don\'t know yet" keeps its saved words', () => {
    const attempt = answered('a-3', 'M-K-C4', 5, false, 5, { kind: 'diagnostic', response: null, snapshot: { prompt: 'p', correct: 'c', given: "I don't know yet" } });
    const shown = redraw(attempt, skill);
    expect(shown.question).not.toBeNull();
    expect(shown.given).toBe("I don't know yet");
  });
});

describe('the question log filters', () => {
  it('newest first, by skill, and by today or the last 7 days', () => {
    const list = [answered('old', 'M-K-C4', 1, true, 10 * 24 * 60), answered('week', 'M-K-A1', 2, true, 3 * 24 * 60), answered('morning', 'M-K-C4', 3, false, 120), answered('now', 'M-K-A1', 4, true, 1)];
    expect(filterLog(list, 'all', 'all', NOW.toISOString()).map((attempt) => attempt.id)).toEqual(['now', 'morning', 'week', 'old']);
    expect(filterLog(list, 'M-K-C4', 'all', NOW.toISOString()).map((attempt) => attempt.id)).toEqual(['morning', 'old']);
    expect(filterLog(list, 'all', 'today', NOW.toISOString()).map((attempt) => attempt.id)).toEqual(['now', 'morning']);
    expect(filterLog(list, 'all', 'week', NOW.toISOString()).map((attempt) => attempt.id)).toEqual(['now', 'morning', 'week']);
    expect(filterLog(list, 'M-K-A1', 'today', NOW.toISOString()).map((attempt) => attempt.id)).toEqual(['now']);
  });
});

function struggling(skillId: string): { state: SkillState; attempts: Attempt[] } {
  const attempts = [true, false, false, true, false, false].map((correct, i) => answered(`${skillId}-${i}`, skillId, 100 + i, correct, 60 - i));
  return { state: { ...newSkillState('kid-1', skillId, NOW.toISOString()), score: 12, attempts: 6, correct: 2, recent: [true, false, false, true, false, false], lastPracticedAt: NOW.toISOString() }, attempts };
}

describe('trouble spots', () => {
  it('lists a skill with 5 or more recent answers, mostly wrong, with its three newest misses', () => {
    const skills = CATALOGUE.filter((skill) => ['M-K-C4', 'M-K-A1'].includes(skill.id));
    const hard = struggling('M-K-C4');
    const fine = { ...newSkillState('kid-1', 'M-K-A1', NOW.toISOString()), score: 60, attempts: 6, correct: 5, recent: [true, true, true, false, true, true] };
    const spots = troubleSpots(skills, [hard.state, fine], [...hard.attempts, ...[0, 1, 2, 3, 4, 5].map((i) => answered(`f-${i}`, 'M-K-A1', i, true, i))]);
    expect(spots.map((spot) => spot.skill.id)).toEqual(['M-K-C4']);
    // The three most recent wrong answers, newest first.
    expect(spots[0]?.missed.map((attempt) => attempt.id)).toEqual(['M-K-C4-5', 'M-K-C4-4', 'M-K-C4-2']);
    // Fewer than 5 answers in the two weeks: not flagged.
    expect(troubleSpots(skills, [hard.state], hard.attempts.slice(0, 4))).toEqual([]);
    // A score of 80 or more: not flagged.
    expect(troubleSpots(skills, [{ ...hard.state, score: 80 }], hard.attempts)).toEqual([]);
  });
});

describe('plans', () => {
  it('the ready-made plan holds all 17 reasoning skills in ladder order', () => {
    const template = reasoningTemplate();
    expect(template.name).toBe('Reasoning practice');
    expect(template.skillIds).toHaveLength(17);
    expect(template.skillIds).toEqual(LADDERS.filter((ladder) => ladder.subject === 'reasoning').flatMap((ladder) => ladder.skillIds));
    expect(template.skillIds.slice(0, 3)).toEqual(['R-A1', 'R-A2', 'R-A3']);
  });

  it('a skill moves one place earlier or later, and stays put at the ends', () => {
    const plan = newPlan('  Mine ', ['a', 'b', 'c', 'b'], ['kid-1', 'kid-1'], NOW.toISOString());
    expect(plan).toMatchObject({ name: 'Mine', skillIds: ['a', 'b', 'c'], childIds: ['kid-1'], deletedAt: null });
    expect(moveSkill(plan, 'c', -1, NOW.toISOString()).skillIds).toEqual(['a', 'c', 'b']);
    expect(moveSkill(plan, 'a', 1, NOW.toISOString()).skillIds).toEqual(['b', 'a', 'c']);
    expect(moveSkill(plan, 'a', -1, NOW.toISOString())).toBe(plan);
    expect(moveSkill(plan, 'c', 1, NOW.toISOString())).toBe(plan);
    expect(moveSkill(plan, 'zzz', 1, NOW.toISOString())).toBe(plan);
  });

  it('"Add to a plan" makes the child\'s Extra practice plan, then adds to it, and never twice', () => {
    const first = addToExtraPractice([], 'kid-1', 'M-K-C4', NOW.toISOString());
    expect(first).toMatchObject({ name: EXTRA_PRACTICE, skillIds: ['M-K-C4'], childIds: ['kid-1'] });
    const second = addToExtraPractice([first!], 'kid-1', 'M-K-A1', NOW.toISOString());
    expect(second).toMatchObject({ id: first!.id, skillIds: ['M-K-C4', 'M-K-A1'] });
    expect(addToExtraPractice([second!], 'kid-1', 'M-K-C4', NOW.toISOString())).toBeNull();
    // Another child gets a plan of their own, and a removed plan is not reused.
    expect(addToExtraPractice([second!], 'kid-2', 'M-K-C4', NOW.toISOString())?.id).not.toBe(first!.id);
    expect(addToExtraPractice([{ ...second!, deletedAt: NOW.toISOString() }], 'kid-1', 'M-K-C4', NOW.toISOString())?.id).not.toBe(first!.id);
  });
});

describe('the plans page', () => {
  it('no plan exists until a parent makes one; using the ready-made plan changes the picks', async () => {
    await setUp('K', { preReader: false });
    expect(await (await repo()).listPlans()).toEqual([]);
    const user = openApp('/parent/plans');
    expect((await screen.findByRole('status')).textContent).toContain('No plans yet');
    await user.click(screen.getByRole('button', { name: 'Use this plan' }));
    const section = await screen.findByRole('region', { name: 'Reasoning practice' });
    expect(section.textContent).toContain('17 skills. For: Robin.');
    const plans = await (await repo()).listPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ name: 'Reasoning practice', childIds: ['kid-1'] });

    // The child's picks now lead with the plan's first skill.
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(await screen.findByRole('button', { name: 'Robin' }));
    const picks = await screen.findByRole('group', { name: "Today's picks" });
    const first = picks.querySelector('[data-skill]');
    expect(first?.getAttribute('data-skill')).toBe('R-A1');
    expect(within(first as HTMLElement).getByText('From your plan')).toBeTruthy();
  });

  it('a parent names a plan, picks skills, orders them, assigns children, changes it and removes it', async () => {
    await setUp('K');
    const user = openApp('/parent/plans');
    await user.click(await screen.findByRole('button', { name: 'New plan' }));
    expect((screen.getByRole('button', { name: 'Save plan' }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText('Name of the plan'), 'Number work');
    await user.selectOptions(screen.getByLabelText('Add a skill'), 'M-K-C4');
    await user.selectOptions(screen.getByLabelText('Add a skill'), 'M-K-A1');
    const order = (): (string | null)[] => [...document.querySelectorAll('[data-plan-skill]')].map((el) => el.getAttribute('data-plan-skill'));
    expect(order()).toEqual(['M-K-C4', 'M-K-A1']);
    // A skill already chosen is not offered again.
    expect(within(screen.getByLabelText('Add a skill')).queryByRole('option', { name: /C\.4 Add to 10/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Move Count to 20 earlier' }));
    expect(order()).toEqual(['M-K-A1', 'M-K-C4']);
    await user.click(screen.getByRole('button', { name: 'Save plan' }));
    await screen.findByRole('region', { name: 'Number work' });
    let plans = await (await repo()).listPlans();
    expect(plans[0]).toMatchObject({ name: 'Number work', skillIds: ['M-K-A1', 'M-K-C4'], childIds: ['kid-1'] });

    // Change it: take a skill out and take the child off.
    await user.click(screen.getByRole('button', { name: 'Change' }));
    await user.click(screen.getByRole('button', { name: 'Take out Count to 20' }));
    await user.click(screen.getByRole('switch', { name: /Robin/ }));
    await user.click(screen.getByRole('button', { name: 'Save plan' }));
    await waitFor(async () => expect((await (await repo()).listPlans())[0]).toMatchObject({ skillIds: ['M-K-C4'], childIds: [] }));
    expect((await screen.findByRole('region', { name: 'Number work' })).textContent).toContain('1 skill. For: no one yet.');

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(async () => expect(await (await repo()).listPlans()).toEqual([]));
    plans = (await (await repo()).exportAll()).plans;
    // Removed, not erased: the removal travels to the other iPads.
    expect(plans[0]?.deletedAt).not.toBeNull();
    expect(recentErrors()).toEqual([]);
  });
});

describe('the question log and flags', () => {
  it('shows every answer newest first, redraws each, and saves a flag that is exported', async () => {
    await setUp('K');
    const store = await repo();
    const changed = answered('old-version', 'M-K-C4', 9, false, 30, { contentVersion: 99, snapshot: { prompt: 'A question from before', correct: '7', given: '6' } });
    for (const attempt of [answered('first', 'M-K-C4', 11, true, 20), answered('second', 'M-K-A1', 12, false, 10), changed]) await store.addAttempt(attempt);
    const user = openApp('/parent/log');
    await waitFor(() => expect(document.querySelectorAll('[data-log-row]')).toHaveLength(3));
    expect([...document.querySelectorAll('[data-log-row]')].map((row) => row.getAttribute('data-log-row'))).toEqual(['second', 'first', 'old-version']);
    expect(document.querySelector('[data-log-count]')?.textContent).toBe('3 answers');

    // A wrong answer shows what was answered and the right answer. A right one shows only the answer.
    const second = document.querySelector('[data-log-row="second"]') as HTMLElement;
    const question = generateQuestion('M-K-A1', 1, 12);
    expect(second.querySelector('[data-redrawn]')?.getAttribute('data-redrawn')).toBe('yes');
    expect(second.textContent).toContain(describePrompt(question));
    const wrongIndex = question.type === 'choice' ? (question.answerIndex + 1) % question.options.length : 0;
    expect(second.querySelector('[data-given]')?.textContent).toContain(`Answered: ${describeResponse(question, { index: wrongIndex })}`);
    expect(second.querySelector('[data-correct-answer]')?.textContent).toBe(`Right answer: ${describeAnswer(question)}`);
    expect(document.querySelector('[data-log-row="first"] [data-correct-answer]')).toBeNull();
    // The answer to a skill that has changed since is shown from its saved snapshot.
    const old = document.querySelector('[data-log-row="old-version"]') as HTMLElement;
    expect(old.querySelector('[data-redrawn]')?.getAttribute('data-redrawn')).toBe('snapshot');
    expect(old.textContent).toContain('A question from before');
    expect(old.textContent).toContain('Answered: 6');
    expect(old.textContent).toContain('Right answer: 7');

    // Filter by skill.
    await user.selectOptions(screen.getByLabelText('Skill'), 'M-K-A1');
    expect([...document.querySelectorAll('[data-log-row]')].map((row) => row.getAttribute('data-log-row'))).toEqual(['second']);
    expect(document.querySelector('[data-log-count]')?.textContent).toBe('1 answer');

    // Flag it with a note.
    await user.click(within(document.querySelector('[data-log-row="second"]') as HTMLElement).getByRole('button', { name: 'Flag' }));
    await user.type(screen.getByLabelText(/What is wrong with this question/), 'The picture is hard to count');
    await user.click(screen.getByRole('button', { name: 'Save flag' }));
    await waitFor(() => expect(document.querySelector('[data-log-row="second"] [data-flagged]')).not.toBeNull());
    const flags = await store.listFlags();
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ childId: 'kid-1', attemptId: 'second', skillId: 'M-K-A1', level: 1, seed: 12, note: 'The picture is hard to count', resolvedAt: null });
    expect((await store.exportAll()).flags).toEqual(flags);
    // A flagged row cannot be flagged twice.
    expect(within(document.querySelector('[data-log-row="second"]') as HTMLElement).queryByRole('button', { name: 'Flag' })).toBeNull();
    expect(recentErrors()).toEqual([]);
  });

  it('the data page lists the flag with its skill, level and seed', async () => {
    await setUp('K');
    await (await repo()).saveFlag({ id: 'f-1', childId: 'kid-1', attemptId: 'a', skillId: 'M-K-A1', level: 2, seed: 4242, note: 'Two right answers', createdAt: NOW.toISOString(), resolvedAt: null });
    openApp('/parent/data');
    await waitFor(() => expect(document.querySelector('[data-fact="flags"]')?.textContent).toBe('Flagged questions: 1'));
    expect(document.querySelector('[data-flag="f-1"]')?.textContent).toBe('M-K-A1, level 2, seed 4242: Two right answers');
  });
});

describe('the trouble spots page', () => {
  it('shows a stuck skill with its three newest misses, and adds it to a plan that changes the picks', async () => {
    await setUp('K', { preReader: false });
    const store = await repo();
    const hard = struggling('M-K-C4');
    await store.saveSkillState(hard.state);
    for (const attempt of hard.attempts) await store.addAttempt(attempt);
    const user = openApp('/parent/trouble');
    const spot = await screen.findByRole('region', { name: 'Add to 10' });
    expect(spot.textContent).toContain('Score 12');
    expect(spot.querySelectorAll('[data-redrawn]')).toHaveLength(3);
    expect(spot.querySelectorAll('[data-correct-answer]')).toHaveLength(3);
    await user.click(within(spot).getByRole('button', { name: 'Add to a plan' }));
    expect((await screen.findByRole('status')).textContent).toContain('"Extra practice" plan');
    expect(await store.listPlans()).toHaveLength(1);
    expect((await store.listPlans())[0]).toMatchObject({ name: 'Extra practice', skillIds: ['M-K-C4'], childIds: ['kid-1'] });
    // A second tap does not add it again.
    await user.click(within(spot).getByRole('button', { name: 'Add to a plan' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('already on'));
    expect((await store.listPlans())[0]?.skillIds).toEqual(['M-K-C4']);
    expect(TODAY).toBe(localDay(NOW));
  });

  it('says so plainly when a child has none', async () => {
    await setUp('K');
    openApp('/parent/trouble');
    expect((await screen.findByRole('status')).textContent).toContain('No trouble spots for Robin.');
  });
});
