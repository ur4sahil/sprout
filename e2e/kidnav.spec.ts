import { KEEP_GOING_QUESTIONS } from '../src/app/todaysPlan';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answerAnything, answerRight, holdHome, openSkill, shoot, sum } from './support/kid';
import { checkScreen } from './support/layout';
import { pickHelp } from './support/lesson';
import { groupNames, skillCount } from './support/catalogue';

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
  test("a child who cannot read goes from the picker through today's plan with no text-only control", async ({ page }) => {
    test.setTimeout(240_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten'); // pre-reader mode is on by default
    // The child's own button is a picture. ("Add a child" on this screen is for grown-ups.)
    await expect(page.getByRole('button', { name: 'Robin', exact: true }).locator('[aria-hidden="true"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    const plan = page.getByRole('list', { name: "Today's plan" });
    // A practice skill in Math, Language Arts and Reasoning, a new skill, and the Mixed bag, open from the start.
    await expect(plan.locator('[data-skill]')).toHaveCount(4);
    await expect(plan.locator('[data-plan-part="mixed"]').getByRole('button', { name: /^Mixed bag\./ })).toBeEnabled();
    // One big button starts the plan.
    await expect(page.getByRole('button', { name: /Start today's plan/ })).toBeVisible();
    await expectNoTextOnlyControls(page, 'home');
    await checkScreen(page, 'home with the plan', 64);
    await shoot(page, 'home-plan');
    // Home is the plan's cards under a strip of the garden. The strip opens the whole garden and its path.
    await expect(page.getByRole('button', { name: /^Your garden\. Open it\. 0 of \d+ questions today\.$/ })).toBeVisible();
    await page.getByRole('button', { name: /^Your garden\. Open it\./ }).click();
    await expect(page.getByRole('region', { name: 'Your garden' })).toBeVisible();
    await expect(page.getByRole('img', { name: /^0 of \d+ questions today$/ })).toBeVisible();
    await checkScreen(page, 'the whole garden', 64);
    await shoot(page, 'garden-visit');
    await page.getByRole('button', { name: 'Back to home' }).click();
    // The ringed card starts the first part.
    await plan.locator('[data-plan-part][data-next] > button').first().click();

    // The first part: keep going with one skill until its answers are in.
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    for (let answered = 0; answered < KEEP_GOING_QUESTIONS; ) {
      if (await page.locator('[data-celebration]').isVisible()) {
        await page.getByRole('button', { name: /Keep going/ }).click();
        continue;
      }
      await answerAnything(page);
      answered += 1;
    }
    await holdHome(page);
    await expect(plan.locator('[data-done]')).toHaveCount(1);
    // Sprout says what is next. (A skill first tried today counts as today's new skill, so the Math card may now
    // show another skill: the owner's choice, Nov 18, 2026, to leave it so.)
    await expect(page.getByRole('button', { name: /^Next up: / })).toBeVisible();
    await expectNoTextOnlyControls(page, 'home after one part');
    await shoot(page, 'home-after-one-part');
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
    await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
    // Back on home stays on home too.
    await page.goBack();
    await page.waitForTimeout(300);
    await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
  });

  test('the subject page: grade tabs, categories, and a speaker on every tile', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /^Math$/ }).click();
    await expect(page.getByRole('tab', { name: 'Kindergarten' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-skill]')).toHaveCount(skillCount('math', 'K'));
    await checkScreen(page, 'subject page', 64);
    await shoot(page, 'subject');
    await page.getByRole('button', { name: 'Hear the name: Add to 10' }).click();
    await expect(page.getByRole('heading', { name: /Math/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Pre-K' }).click();
    await expect(page.locator('[data-skill]')).toHaveCount(skillCount('math', 'PK'));
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(groupNames('math', 'PK'));
    await checkScreen(page, 'subject page, pre-K', 64);
    await shoot(page, 'subject-prek');
    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
  });

  test('the lesson plays its four beats by itself, and the example goes step by step', async ({ page }) => {
    test.setTimeout(90_000);
    await signUp(page);
    // A Grade 2 skill: it has no teaching lesson yet (plan section 16 covers K, Grade 1 and Reasoning), so it plays the four beats.
    await addChild(page, 'Robin', 'Grade 2');
    await openSkill(page, 'Robin', 'Hundreds, tens, ones');
    await page.getByRole('button', { name: 'Learn this skill' }).click();
    await pickHelp(page, 'Lesson');
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
    // Each beat after the one it was paused on comes in turn. (On a slow machine the pause may land past "see".)
    const beats = ['see', 'watch', 'try', 'remember'];
    for (const beat of beats.slice(beats.indexOf(held ?? 'see') + 1)) await expect(lesson).toHaveAttribute('data-beat', beat, { timeout: 20_000 });
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
          if ((await submit.isVisible()) && (await submit.isEnabled())) await submit.click({ timeout: 1000 });
          await expect(submit).toBeHidden({ timeout: 300 });
        }).toPass();
        await expect(page.locator('[data-phase="asking"], [data-celebration], [data-break]').first()).toBeVisible();
      }
    }
    await page.getByRole('button', { name: /All done/ }).click();
    await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
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
        if ((await submit.isVisible()) && (await submit.isEnabled())) await submit.click({ timeout: 1000 });
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
