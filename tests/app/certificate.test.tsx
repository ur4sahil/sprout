import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { categoryComplete, categoryRows, scoreRows } from '../../src/app/parentData';
import { CATALOGUE } from '../../src/content/catalogue';
import { openRepo } from '../../src/storage/index';
import type { Child, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { NOW, openApp, setUp } from './practiceHelpers';

// A printable certificate for a completed group of skills (plan section 7).

const COMPARING = CATALOGUE.filter((skill) => skill.subject === 'math' && skill.grade === 'PK' && skill.category.startsWith('B.'));
const mastered = (child: Child, skillId: string): SkillState => ({ ...newSkillState(child.id, skillId, NOW.toISOString()), score: 100, bestScore: 100, attempts: 12, correct: 12, recent: [true, true, true], masteredAt: NOW.toISOString(), lastPracticedAt: NOW.toISOString() });

async function master(child: Child, skillIds: string[]): Promise<void> {
  const { repo } = await openRepo();
  for (const id of skillIds) await repo.saveSkillState(mastered(child, id));
}

afterEach(() => vi.restoreAllMocks());

describe('a completed group', () => {
  it('is one where every skill is mastered', async () => {
    const child = await setUp('PK');
    const first = COMPARING[0]!;
    expect(COMPARING.length).toBeGreaterThanOrEqual(2);
    const some = scoreRows(CATALOGUE, [mastered(child, first.id)], []);
    expect(categoryRows(some, first).map((row) => row.skill.id)).toEqual(COMPARING.map((skill) => skill.id));
    expect(categoryComplete(some, first)).toBe(false);
    const all = scoreRows(CATALOGUE, COMPARING.map((skill) => mastered(child, skill.id)), []);
    expect(categoryComplete(all, first)).toBe(true);
    // Another group of the same subject and grade is not finished by it.
    expect(categoryComplete(all, CATALOGUE.find((skill) => skill.id === 'M-PK-A1')!)).toBe(false);
  });
});

describe('the certificate', () => {
  it('is linked from the finished group on the scores screen, names the child and the group, and prints', async () => {
    const child = await setUp('PK');
    await master(child, COMPARING.map((skill) => skill.id));
    openApp('/parent/scores');
    const link = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('[data-certificate-link]');
      if (!found) throw new Error('no link yet');
      return found;
    });
    // Only the finished group has one.
    expect(document.querySelectorAll('[data-certificate-link]')).toHaveLength(1);
    expect(link.getAttribute('aria-label')).toBe(`Certificate for Math, Pre-K, ${COMPARING[0]!.category}`);
    fireEvent.click(link);
    const certificate = await screen.findByRole('article', { name: 'Certificate' });
    expect(certificate.textContent).toContain('Robin');
    expect(certificate.textContent).toContain('has mastered every skill in');
    expect(certificate.textContent).toContain(COMPARING[0]!.category.replace(/^B\. /, ''));
    expect(certificate.textContent).toContain(`Math, Pre-K · ${COMPARING.length} skills`);
    expect(certificate.textContent).toContain('March 9, 2026');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: /Print/ }));
    expect(print).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to scores' }));
    expect(await screen.findByRole('heading', { name: 'Scores' })).toBeTruthy();
  });

  it('is not shown for a group that is not finished, and has no Print button', async () => {
    const child = await setUp('PK');
    await master(child, [COMPARING[0]!.id]);
    openApp(`/parent/certificate/${child.id}/${COMPARING[0]!.id}`);
    expect((await screen.findByRole('status')).textContent).toContain('This group is not finished yet.');
    expect(screen.queryByRole('article', { name: 'Certificate' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Print/ })).toBeNull();
  });

  it('is behind the grown-ups gate', async () => {
    const child = await setUp('PK', {}, { gate: 'closed' });
    await master(child, COMPARING.map((skill) => skill.id));
    openApp(`/parent/certificate/${child.id}/${COMPARING[0]!.id}`);
    expect(await screen.findByRole('heading', { name: 'Grown-ups only' })).toBeTruthy();
    expect(screen.queryByRole('article', { name: 'Certificate' })).toBeNull();
  });
});
