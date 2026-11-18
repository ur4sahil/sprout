import { CATALOGUE } from '../src/content/catalogue';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answer, answerRight, gotIt, holdHome, openSkill, shoot, sum } from './support/kid';
import { checkScreen } from './support/layout';

// The grown-ups area, part 2 (Phase 8b): trouble spots, the question log with flags, and plans.

test.describe('grown-ups area, part 2', () => {
  test('the question log shows each answer again, wrong ones with the right answer, and a flag is saved', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    await answerRight(page);
    // One wrong answer: an option that is not the sum.
    const right = await sum(page);
    const labels = await page.locator('[data-option]').evaluateAll((els) => els.map((el) => Number(el.getAttribute('aria-label'))));
    await answer(page, labels.find((value) => value !== right) ?? right);
    await gotIt(page);
    await holdHome(page);
    await page.getByRole('button', { name: /Switch child/ }).click();
    await page.getByRole('button', { name: 'Grown-ups' }).click();
    await page.getByRole('tab', { name: 'Question log' }).click();

    await expect(page.locator('[data-log-row]')).toHaveCount(2);
    await expect(page.locator('[data-log-count]')).toHaveText('2 answers');
    // Newest first: the wrong answer is on top, with the right answer beside it.
    const newest = page.locator('[data-log-row]').first();
    await expect(newest.locator('[data-redrawn]')).toHaveAttribute('data-redrawn', 'yes');
    await expect(newest.locator('[data-correct-answer]')).toHaveText(`Right answer: ${right}`);
    await expect(page.locator('[data-log-row]').nth(1).locator('[data-correct-answer]')).toHaveCount(0);
    await checkScreen(page, 'question log', 44);
    await shoot(page, 'parent-log');

    await newest.getByRole('button', { name: 'Flag' }).click();
    await page.getByLabel(/What is wrong with this question/).fill('Too hard to read');
    await page.getByRole('button', { name: 'Save flag' }).click();
    await expect(newest.locator('[data-flagged]')).toBeVisible();
    await page.getByRole('tab', { name: 'Data' }).click();
    await expect(page.locator('[data-fact="flags"]')).toHaveText('Flagged questions: 1');
    await expect(page.locator('[data-flag]')).toContainText('M-K-C4, level 1');
    await expect(page.locator('[data-flag]')).toContainText('Too hard to read');
  });

  test('a plan made from the ready-made list puts its first skill into the child picks', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Grown-ups' }).click();
    await page.getByRole('tab', { name: 'Plans' }).click();
    await expect(page.getByRole('status')).toContainText('No plans yet');
    await checkScreen(page, 'plans, empty', 44);
    await page.getByRole('button', { name: 'Use this plan' }).click();
    const plan = page.getByRole('region', { name: 'Reasoning practice' });
    await expect(plan).toContainText(`${CATALOGUE.filter((skill) => skill.subject === 'reasoning').length} skills. For: Robin.`);

    // Change it: the editor fits the screen, and a skill can be moved and taken out.
    await plan.getByRole('button', { name: 'Change' }).click();
    await expect(page.locator('[data-plan-skill]')).toHaveCount(CATALOGUE.filter((skill) => skill.subject === 'reasoning').length);
    await checkScreen(page, 'plan editor', 44);
    await shoot(page, 'parent-plan-editor');
    await page.getByRole('button', { name: 'Move Which belongs earlier' }).click();
    await expect(page.locator('[data-plan-skill]').first()).toHaveAttribute('data-plan-skill', 'R-A2');
    await page.getByRole('button', { name: 'Save plan' }).click();
    await expect(page.getByRole('region', { name: 'Reasoning practice' })).toBeVisible();

    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    const picks = page.getByRole('list', { name: "Today's plan" });
    await expect(picks.locator('[data-skill]').first()).toHaveAttribute('data-skill', 'R-A2');
  });

  test('trouble spots is empty for a child who is doing fine, and every new page fits', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Grown-ups' }).click();
    await page.getByRole('tab', { name: 'Trouble spots' }).click();
    await expect(page.getByRole('status')).toContainText('No trouble spots for Robin.');
    await checkScreen(page, 'trouble spots', 44);
    // All nine tabs are there and none is cut off.
    await expect(page.getByRole('tab')).toHaveText(['Dashboard', 'Scores', 'Trouble spots', 'Fast facts', 'Worksheets', 'Question log', 'Plans', 'Settings', 'Data']);
    await shoot(page, 'parent-tabs');
  });
});
