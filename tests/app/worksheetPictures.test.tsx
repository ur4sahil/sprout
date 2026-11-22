import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { openRepo } from '../../src/storage/index';
import { newSkillState } from '../../src/storage/schema';
import { NOW, openApp, setUp } from './practiceHelpers';

// The pictures of Nov 22, 2026 on paper: a picture prints as it shows on screen, and a bar graph to colour in
// prints its title over its rows, as the one on screen does.
describe('the new pictures on a worksheet', () => {
  it('a bar graph to colour in has its title over its rows', async () => {
    await setUp('2');
    // A Skill Score of 95 asks the top level of grade 2 C.4: make the bar graph from tally marks.
    const at = NOW.toISOString();
    await (await openRepo()).repo.saveSkillState({ ...newSkillState('kid-1', 'M-2-C4', at), score: 95, bestScore: 95, attempts: 20, correct: 19 });
    openApp('/parent/worksheet?child=kid-1&skills=M-2-C4&n=10&shift=0&seed=11');
    const sheet = await screen.findByRole('article', { name: 'Worksheet' });
    await waitFor(() => expect(sheet.querySelectorAll('[data-paper-type="buildBar"]')).toHaveLength(10));
    for (const item of sheet.querySelectorAll('[data-paper-type="buildBar"]')) expect(item.querySelector('[data-title]')?.textContent).toBe('Our favorite things');
  });

  it('a question with a new picture prints it: grade 3 D.1 prints its empty plates or baskets beside the things', async () => {
    await setUp('3');
    openApp('/parent/worksheet?child=kid-1&skills=M-3-D1&n=6&shift=0&seed=3');
    const sheet = await screen.findByRole('article', { name: 'Worksheet' });
    await waitFor(() => expect(sheet.querySelectorAll('[data-paper-type]')).toHaveLength(6));
    expect(sheet.querySelectorAll('[data-visual="holders"]')).toHaveLength(6);
    expect(sheet.querySelectorAll('[data-holder]').length).toBeGreaterThanOrEqual(12);
    // Empty on paper: the child draws the shares in.
    expect(sheet.querySelectorAll('[data-holder] [data-item]')).toHaveLength(0);
  });
});
