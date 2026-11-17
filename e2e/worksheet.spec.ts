import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { checkScreen } from './support/layout';

// The grown-ups pages added by plan section 15: levels by topic, fast facts and worksheets.
test.describe('grown-ups: levels, fast facts and worksheets', () => {
  test('the dashboard lists a level for each topic, and the fast facts page fits', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.getByRole('button', { name: 'Grown-ups' }).click();
    const topics = page.getByRole('region', { name: 'Levels by topic' });
    await expect(topics.locator('[data-topic="add-subtract"]')).toBeVisible();
    await expect(topics.locator('[data-topic="phonics"]')).toContainText(/not tried yet|about/);
    await checkScreen(page, 'dashboard with levels', 44);
    await page.getByRole('tab', { name: 'Fast facts' }).click();
    await expect(page.getByRole('region', { name: 'Adding within 10' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Division facts' }).getByRole('button', { name: 'Open early' })).toBeVisible();
    await checkScreen(page, 'grown-ups fast facts', 44);
  });

  test('a worksheet is made from chosen skills, fits the screen, and prints without its buttons', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.getByRole('button', { name: 'Grown-ups' }).click();
    await page.getByRole('tab', { name: 'Worksheets' }).click();
    const form = page.getByRole('region', { name: 'Make a worksheet' });
    await form.getByLabel('What to practise').selectOption('choose');
    await form.getByRole('switch', { name: 'B.1 Add within 20' }).click();
    await form.getByRole('switch', { name: 'A.1 Count to 120' }).click({ timeout: 3000 }).catch(() => undefined);
    await form.getByRole('button', { name: /Make the worksheet/ }).click();
    const sheet = page.getByRole('article', { name: 'Worksheet' });
    await expect(sheet.locator('[data-paper-type]')).toHaveCount(10);
    await expect(page.getByRole('article', { name: 'Answer key' }).locator('[data-answer]')).toHaveCount(10);
    await checkScreen(page, 'worksheet', 44);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: /Print/ })).toBeHidden();
    await expect(sheet).toBeVisible();
  });
});
