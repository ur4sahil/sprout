import { expect, signUp, test } from './support/fixtures';

import { checkScreen } from './support/layout';
import { addChild, answer, answerRight, gotIt, holdHome, openOnMath, openSkill, shoot, sum, tapInOrder } from './support/kid';
import { BASE_URL } from './support/paths';

test.describe('practice', () => {
  test('a grown-up adds a child, and the child completes a 3-question session, with nothing spilling sideways', async ({ page }) => {
    await signUp(page);
    await page.getByRole('button', { name: 'Add a child' }).click();
    await checkScreen(page, 'child setup, step 1');
    await shoot(page, 'child-setup');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await addChild(page, 'Robin', 'Kindergarten');
    await checkScreen(page, 'profile picker', 44);
    await shoot(page, 'picker');

    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
    await checkScreen(page, 'home', 64);
    await shoot(page, 'home');
    // "Add to 10" is no longer one of the first picks, so it is opened from the Math page.
    await openOnMath(page, 'Add to 10');
    await checkScreen(page, 'practice', 64);
    await shoot(page, 'practice');

    for (let i = 1; i <= 3; i += 1) {
      await answerRight(page);
      await expect(page.locator('[data-answered]')).toHaveText(String(i));
    }
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '31');
    await expect(page.locator('[data-score]')).toHaveAttribute('data-stage', 'gettingStarted');
  });

  test('a wrong answer shows what was answered, the right answer and the explanation, then moves on', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await openSkill(page, 'Robin', 'Add to 10');
    const right = await sum(page);
    const options = await page.locator('[data-option]').evaluateAll((els) => els.map((el) => Number(el.getAttribute('aria-label'))));
    const wrong = options.find((option) => option !== right) ?? right + 1;
    await answer(page, wrong);
    const panel = page.getByRole('region', { name: 'Explanation' });
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-given]')).toHaveText(String(wrong));
    await expect(panel.locator('[data-correct]')).toHaveText(String(right));
    // It says so, the question stays in view, and the steps come one at a time.
    await expect(panel.locator('[data-verdict]')).toHaveText(/Not quite/);
    await expect(panel.locator('[data-asked]')).toContainText('equals what?');
    await expect(panel.locator('ol li')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Hear again/ })).toBeVisible();
    await checkScreen(page, 'explanation', 64);
    await shoot(page, 'explanation');
    await page.getByRole('button', { name: /Next step/ }).click();
    await expect(panel.locator('ol li')).toHaveCount(2);
    await gotIt(page);
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await expect(page.locator('[data-answered]')).toHaveText('1');
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '0');
  });

  test('progress is saved on the device: it is still there after the app is closed and opened again', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    await answerRight(page);
    await answerRight(page);
    await page.reload();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('img', { name: /^2 of \d+ questions today$/ })).toBeVisible();
    // Today's plan has it (started today, so it is today's new skill), counting the 2 answers already given.
    await expect(page.getByRole('button', { name: /\. Add to 10 · 2 of \d+/ })).toBeVisible();
    // And the next question is a new one, picking up from where the child was.
    await page.getByRole('button', { name: /\. Add to 10 ·/ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '20');
    await answerRight(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '31');
  });

  test('the other question types work by touch: counting, and putting numbers in order', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();

    await openOnMath(page, 'Count to 5');
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    const group = (await page.locator('[data-visual="emojiGroup"]').first().getAttribute('aria-label')) ?? '';
    await answer(page, Number(/^\d+/.exec(group)?.[0]));
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openOnMath(page, 'Put numbers in order');
    await tapInOrder(page);
    const submit = page.getByRole('button', { name: /Submit/ });
    await expect(async () => {
      if ((await submit.isVisible()) && (await submit.isEnabled())) await submit.click({ timeout: 1000 });
      await expect(submit).toBeHidden({ timeout: 300 });
    }).toPass();
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
  });

  test('kid screens replace history: only the step from the picker to home adds an entry', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    const before = await page.evaluate(() => history.length);
    await openSkill(page, 'Robin', 'Add to 10');
    await page.getByRole('button', { name: 'Learn this skill' }).click();
    await page.getByRole('button', { name: 'Back to practice' }).click();
    await holdHome(page);
    await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
    expect(await page.evaluate(() => history.length)).toBe(before + 1);
  });

  test('with no child chosen, a skill address goes to the profile picker', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.goto('/skill/M-K-C4');
    await expect(page.getByRole('button', { name: 'Robin', exact: true })).toBeVisible();
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });
});

test.describe('the install guide', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' });

  test('a Safari tab on an iPhone or iPad sees only the install guide, until a grown-up chooses to carry on', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Add Sprout to the Home Screen' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
    await checkScreen(page, 'install guide', 44);
    await shoot(page, 'install-guide');

    await page.getByRole('button', { name: 'Use in this browser anyway' }).click();
    await expect(page.getByRole('alert')).toContainText('will not appear in the installed app');
    await page.getByRole('button', { name: 'Carry on in this browser' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Sprout to the Home Screen' })).toHaveCount(0);
  });
});
