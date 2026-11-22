import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { awardSkills } from '../../src/app/awardsRun';
import { buildSheet, onPaper, paperAnswer } from '../../src/app/worksheet';
import { CATALOGUE, skillById } from '../../src/content/catalogue';
import { generateQuestion } from '../../src/content/registry';
import { recentErrors } from '../../src/lib/errorLog';
import { openApp, setUp } from './practiceHelpers';

const skills = (...ids: string[]) => ids.map((id) => skillById(id)!);

// Printable worksheets (plan section 15.6).
describe('a worksheet', () => {
  it('has the number of questions asked for, taken in turn from each skill, the same for the same seed', () => {
    const request = { skillIds: ['M-1-B1', 'M-2-A1'], count: 10, shift: 0 as const, seed: 4242, grade: '1' as const };
    const sheet = buildSheet(skills('M-1-B1', 'M-2-A1'), [], request);
    expect(sheet.items).toHaveLength(10);
    expect(sheet.items.map((item) => item.skill.id).slice(0, 4)).toEqual(['M-1-B1', 'M-2-A1', 'M-1-B1', 'M-2-A1']);
    expect(buildSheet(skills('M-1-B1', 'M-2-A1'), [], request)).toEqual(sheet);
    expect(new Set(sheet.items.map((item) => item.question.key)).size).toBe(10);
  });

  it('asks at the child\'s level, or one easier or harder', () => {
    const state = { childId: 'kid-1', skillId: 'M-1-B1', score: 75, bestScore: 75, streak: 0, attempts: 10, correct: 8, hintedRight: 0, recent: [], masteredAt: null, placedOut: false, reviewBox: 0, reviewDueAt: null, lastPracticedAt: null, updatedAt: '2026-03-08T10:00:00.000Z' };
    const at = (shift: -1 | 0 | 1) => buildSheet(skills('M-1-B1'), [state], { skillIds: ['M-1-B1'], count: 4, shift, seed: 7, grade: '1' }).items.map((item) => item.question.level);
    expect(at(0)).toEqual([3, 3, 3, 3]);
    expect(at(-1)).toEqual([2, 2, 2, 2]);
  });

  it('leaves off listen questions, and names a skill that is only heard', () => {
    const listenOnly = CATALOGUE.find((skill) => skill.id === 'E-PK-A1')!;
    expect(onPaper(generateQuestion('E-PK-A1', 1, 1))).toBe(false);
    const sheet = buildSheet([listenOnly, skillById('M-K-B2')!], [], { skillIds: [], count: 6, shift: 0, seed: 1, grade: 'K' });
    expect(sheet.left.map((each) => each.skill.id)).toEqual(['E-PK-A1']);
    expect(sheet.items.every((item) => onPaper(item.question))).toBe(true);
    expect(sheet.items).toHaveLength(6);
  });

  it('has an answer for every question of every skill that can go on paper', () => {
    for (const skill of awardSkills()) {
      for (let level = 1; level <= skill.maxLevel; level += 1) {
        const question = generateQuestion(skill.id, level, 3);
        if (!onPaper(question)) continue;
        expect(paperAnswer(question).length, `${skill.id} level ${level}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('the worksheet pages', () => {
  it('a grown-up chooses skills and opens a sheet with its answer key', async () => {
    await setUp('1');
    openApp('/parent/worksheets');
    const form = await screen.findByRole('region', { name: 'Make a worksheet' });
    fireEvent.change(within(form).getByLabelText('What to practise'), { target: { value: 'choose' } });
    fireEvent.click(await within(form).findByRole('switch', { name: 'B.1 Add within 20' }));
    fireEvent.click(within(form).getByRole('button', { name: /Make the worksheet/ }));
    const sheet = await screen.findByRole('article', { name: 'Worksheet' });
    await waitFor(() => expect(sheet.querySelectorAll('[data-paper-type]')).toHaveLength(10));
    expect(sheet.textContent).toContain('Name: Robin');
    const key = screen.getByRole('article', { name: 'Answer key' });
    expect(key.querySelectorAll('[data-answer]')).toHaveLength(10);
    expect(screen.getByRole('button', { name: /Print/ })).toBeTruthy();
    expect(recentErrors()).toEqual([]);
  });

  it('the same address prints the same sheet', async () => {
    await setUp('1');
    openApp('/parent/worksheet?child=kid-1&skills=M-1-B1,M-1-A1&n=10&shift=0&seed=31337');
    const sheet = await screen.findByRole('article', { name: 'Worksheet' });
    expect(sheet.getAttribute('data-sheet-seed')).toBe('31337');
    expect(sheet.textContent).toContain('Sheet 31337');
    const expected = buildSheet(skills('M-1-B1', 'M-1-A1'), [], { skillIds: [], count: 10, shift: 0, seed: 31337, grade: '1' });
    const answers = [...screen.getByRole('article', { name: 'Answer key' }).querySelectorAll('[data-answer]')].map((li) => li.textContent?.split(' (')[0]);
    expect(answers).toEqual(expected.items.map((item) => item.answer));
  });
});
