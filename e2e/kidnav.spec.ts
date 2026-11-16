import { expect, signUp, test } from './support/fixtures';
import { addChild, answerAnything, answerRight, holdHome, openSkill, shoot, sum } from './support/kid';
import { checkScreen } from './support/layout';

// Every control a child who cannot read meets must carry a picture, not only words.
async function expectNoTextOnlyControls(page: import('@playwright/test').Page, where: string): Promise<void> {
  const textOnly = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((button) => button.closest('[aria-label="Question"]') === null && button.offsetParent !== null)
      .filter((button) => button.querySelector('[aria-hidden="true"], svg, img') === null)
      .map((button) => button.getAttribute('aria-label') ?? button.textContent ?? ''),
  );
  expect(textOnly, `${where}: controls with words only`).toEqual([]);
}

test.describe('kid navigation', () => {
  test('a child who cannot read goes from the picker through a full Play run with no text-only control', async ({ page }) => {
    test.setTimeout(240_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten'); // pre-reader mode is on by default
    // The child's own button is a picture. ("Add a child" on this screen is for grown-ups.)
    await expect(page.getByRole('button', { name: 'Robin', exact: true }).locator('[aria-hidden="true"]')).toBeVisible();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    const picks = page.getByRole('group', { name: "Today's picks" });
    await expect(picks.locator('[data-skill]')).toHaveCount(3);
    await expect(page.getByText('Next up')).toHaveCount(0);
    await expectNoTextOnlyControls(page, 'home');
    await page.getByRole('button', { name: /Play/ }).click();

    // Each pick lasts one session: 8 questions for kindergarten. Then a break, with no menu.
    for (const pick of [1, 2, 3]) {
      await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
      for (;;) {
        if (await page.locator('[data-break]').isVisible()) break;
        const keepGoing = page.getByRole('button', { name: /Keep going/ });
        if (await page.locator('[data-celebration]').isVisible()) {
          await keepGoing.click();
          continue;
        }
        await answerAnything(page);
      }
      await expect(page.locator('[data-answered]')).toHaveText('8');
      await expectNoTextOnlyControls(page, `break ${pick}`);
      if (pick === 1) await shoot(page, 'play-break');
      await checkScreen(page, `break ${pick}`, 64);
      await page.getByRole('button', { name: /Next one/ }).click();
    }
    await expect(page.getByRole('dialog', { name: 'All done!' })).toBeVisible();
    await expectNoTextOnlyControls(page, 'all done');
    await page.getByRole('button', { name: /Home/ }).click();
    await expect(page.getByRole('img', { name: 'Daily goal reached: 24 questions today' })).toBeVisible();
    await shoot(page, 'home-goal-reached');
  });

  test('the kid lock: a tap does not leave practice, a Back press does not, a 2-second hold does', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    await answerRight(page);
    const question = await sum(page);
    const label = await page.locator('[data-visual="equation"]').first().getAttribute('aria-label');

    const home = page.getByRole('button', { name: /^Back to home\. Press and hold/ });
    await home.click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();

    // A hold let go after one second is not enough.
    await home.dispatchEvent('pointerdown');
    await page.waitForTimeout(1000);
    await home.dispatchEvent('pointerup');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();

    // Back, twice. The child stays on the same question in the same session.
    for (let i = 0; i < 2; i += 1) {
      await page.goBack();
      await page.waitForTimeout(300);
      await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
      await expect(page).toHaveURL(/\/skill\/M-K-C4$/);
    }
    expect(await page.locator('[data-visual="equation"]').first().getAttribute('aria-label')).toBe(label);
    await expect(page.locator('[data-answered]')).toHaveText('1');
    expect(await sum(page)).toBe(question);
    await answerRight(page);
    await expect(page.locator('[data-answered]')).toHaveText('2');

    await holdHome(page);
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    // Back on home stays on home too.
    await page.goBack();
    await page.waitForTimeout(300);
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
  });

  test('the subject page: grade tabs, categories, and a speaker on every tile', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /Math/ }).click();
    await expect(page.getByRole('tab', { name: 'Kindergarten' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-skill]')).toHaveCount(28);
    await checkScreen(page, 'subject page', 64);
    await shoot(page, 'subject');
    await page.getByRole('button', { name: 'Hear the name: Add to 10' }).click();
    await expect(page.getByRole('heading', { name: /Math/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Pre-K' }).click();
    await expect(page.locator('[data-skill]')).toHaveCount(16);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A. Counting', 'B. Comparing', 'C. Shapes and sizes', 'D. Patterns and sorting']);
    await checkScreen(page, 'subject page, pre-K', 64);
    await shoot(page, 'subject-prek');
    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
  });

  test('the lesson plays its four beats by itself, and the example goes step by step', async ({ page }) => {
    test.setTimeout(90_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    await page.getByRole('button', { name: 'Learn this skill' }).click();
    const lesson = page.getByRole('region', { name: 'Lesson' });
    await expect(lesson).toHaveAttribute('data-beat', 'see');
    await checkScreen(page, 'lesson', 64);
    await shoot(page, 'lesson');
    // Pause holds the beat. Play carries on.
    await page.getByRole('button', { name: 'Pause' }).click();
    const held = await lesson.getAttribute('data-beat');
    await page.waitForTimeout(1500);
    await expect(lesson).toHaveAttribute('data-beat', held ?? '');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    for (const beat of ['watch', 'try', 'remember']) await expect(lesson).toHaveAttribute('data-beat', beat, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Practise/ })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('tab', { name: /Example/ }).click();
    const example = page.getByRole('region', { name: 'Example' });
    await page.getByRole('button', { name: /Show me how/ }).click();
    await expect(example.locator('li')).toHaveCount(1);
    while (await page.getByRole('button', { name: /Next step/ }).isVisible()) await page.getByRole('button', { name: /Next step/ }).click();
    await expect(example.locator('[data-example-answer]')).toBeVisible();
    await checkScreen(page, 'example', 64);
    await shoot(page, 'example');
    await page.getByRole('button', { name: /Practise/ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await expect(page.locator('[data-answered]')).toHaveText('0');
  });

  test('a mastered skill comes back for review two days later, and three right answers keep the medal', async ({ page }) => {
    test.setTimeout(240_000);
    test.skip(!['ipad-landscape', 'laptop-chromium'].includes(test.info().project.name), 'a long run: the layout is checked at every size by the other tests');
    await page.clock.install();
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    for (;;) {
      const celebration = page.locator('[data-celebration]');
      if (await celebration.isVisible()) {
        if ((await celebration.getAttribute('data-celebration')) === '100') break;
        await page.getByRole('button', { name: /Keep going/ }).click();
      } else if (await page.locator('[data-break]').isVisible()) await page.getByRole('button', { name: /Keep going/ }).click();
      else {
        const value = await sum(page);
        const type = await page.getByRole('region', { name: 'Question' }).getAttribute('data-type');
        if (type === 'choice') await page.locator(`[data-option][aria-label="${value}"]`).click();
        else for (const digit of String(value)) await page.getByRole('button', { name: digit, exact: true }).click();
        const submit = page.getByRole('button', { name: /Submit/ });
        await expect(async () => {
          if (await submit.isVisible()) await submit.click();
          await expect(submit).toBeHidden({ timeout: 300 });
        }).toPass();
        await expect(page.locator('[data-phase="asking"], [data-celebration], [data-break]').first()).toBeVisible();
      }
    }
    await page.getByRole('button', { name: /All done/ }).click();
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    await expect(page.getByRole('button', { name: /Review/ })).toHaveCount(0);

    // Two days on, the app is opened again.
    await page.clock.fastForward('49:00:00');
    await page.reload();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /Review \(1\)/ }).click();
    await expect(page.getByRole('heading', { name: /Review: Add to 10/ })).toBeVisible();
    await checkScreen(page, 'review', 64);
    await shoot(page, 'review');
    for (let i = 0; i < 3; i += 1) {
      await expect(page.locator('[data-review-count]')).toHaveText(`${i} of 3`);
      const value = await sum(page);
      const type = await page.getByRole('region', { name: 'Question' }).getAttribute('data-type');
      if (type === 'choice') await page.locator(`[data-option][aria-label="${value}"]`).click();
      else for (const digit of String(value)) await page.getByRole('button', { name: digit, exact: true }).click();
      const submit = page.getByRole('button', { name: /Submit/ });
      await expect(async () => {
        if (await submit.isVisible()) await submit.click();
        await expect(submit).toBeHidden({ timeout: 300 });
      }).toPass();
      await expect(page.locator('[data-review-count]')).toHaveText(`${i + 1} of 3`);
      // The next question, or the end card, before reading anything more off the screen.
      await expect(page.locator('[data-phase="asking"], [data-card]').first()).toBeVisible();
    }
    const card = page.getByRole('dialog', { name: 'Review done' });
    await expect(card).toContainText('1 of 1 medal kept');
    await checkScreen(page, 'review done', 64);
    await page.getByRole('button', { name: /All done/ }).click();
    await expect(page.getByRole('button', { name: /Review/ })).toHaveCount(0);
  });
});
