import type { Page } from '@playwright/test';
import path from 'node:path';
import { expect, test } from './fixtures';
import { DIR } from './paths';

// Saved for a person to look at: .e2e/shots/<device>-<screen>.png
export async function shoot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(DIR, 'shots', `${test.info().project.name}-${name}.png`) });
}

// Adds a child through the screens. Ends on the profile picker.
export async function addChild(page: Page, name: string, grade: string): Promise<void> {
  await page.getByRole('button', { name: 'Add a child' }).click();
  await page.getByLabel('First name').fill(name);
  await page.getByRole('button', { name: 'turtle' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: grade, exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
}

// From home: opens Math and taps a skill's tile, looking under each grade tab.
export async function openOnMath(page: Page, skill: string): Promise<void> {
  await page.getByRole('button', { name: /Math/ }).click();
  await expect(page.getByRole('heading', { name: /Math/ })).toBeVisible();
  const tile = page.getByRole('button', { name: new RegExp(`^${skill}\\.`) });
  const tabs = page.getByRole('tab');
  for (let i = 0; i < (await tabs.count()) && !(await tile.isVisible()); i += 1) await tabs.nth(i).click();
  await tile.click();
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
}

export async function openSkill(page: Page, child: string, skill: string): Promise<void> {
  await page.getByRole('button', { name: child, exact: true }).click();
  await openOnMath(page, skill);
}

// Presses and holds the home button for longer than the kid lock's 2 seconds.
export async function holdHome(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: /^Back to home\. Press and hold/ });
  await button.dispatchEvent('pointerdown');
  await expect(button).toHaveAttribute('data-holding', 'true');
  await expect(button).toBeHidden({ timeout: 6000 });
}

// The sum the question on screen asks for, read from its picture.
export async function sum(page: Page): Promise<number> {
  const label = (await page.locator('[data-visual="equation"]').first().getAttribute('aria-label')) ?? '';
  const numbers = (label.match(/\d+/g) ?? []).map(Number);
  return (numbers[0] ?? 0) + (numbers[1] ?? 0);
}

// Answers with a number: a numeral option, or digits on the number pad.
// With `by` set to 'index', `value` is the place of the option to tap, counted from 0.
export async function answer(page: Page, value: number, by: 'label' | 'index' = 'label'): Promise<void> {
  const type = await page.getByRole('region', { name: 'Question' }).getAttribute('data-type');
  if (type === 'choice' && by === 'index') await page.locator('[data-option]').nth(value).click();
  else if (type === 'choice') await page.locator(`[data-option][aria-label="${value}"]`).click();
  else for (const digit of String(value)) await page.getByRole('button', { name: digit, exact: true }).click();
  const submit = page.getByRole('button', { name: /Submit/ });
  await expect(submit).toBeEnabled();
  // Taps in the first 400 ms after a question appears are ignored, so keep tapping until one lands.
  await expect(async () => {
    if (await submit.isVisible()) await submit.click();
    await expect(submit).toBeHidden({ timeout: 300 });
  }).toPass();
}

export async function answerRight(page: Page): Promise<number> {
  // The question must be on screen and ready before anything is read off it.
  await expect(page.locator('[data-phase="asking"]')).toBeVisible();
  const value = await sum(page);
  const before = await page.locator('[data-answered]').textContent();
  await answer(page, value);
  await expect(page.locator('[data-answered]')).not.toHaveText(before ?? '');
  await expect(page.locator('[data-phase="asking"]')).toBeVisible();
  return value;
}


// Answers an "order" question correctly: taps the number tiles from smallest to largest.
// Tiles are found by position, because the label "1" is also the start of "10".
export async function tapInOrder(page: Page): Promise<void> {
  const tiles = await page.locator('[data-item]').evaluateAll((els) => els.map((el) => ({ index: el.getAttribute('data-item') ?? '', value: Number.parseInt(el.getAttribute('aria-label') ?? '', 10) })));
  for (const tile of tiles.slice().sort((a, b) => a.value - b.value)) await page.locator(`[data-item="${tile.index}"]`).click();
}

// Answers whatever question is on screen, right or wrong, and taps through the explanation if there is one.
// Ends on the next question, a celebration, a break or the end of a review.
export async function answerAnything(page: Page): Promise<void> {
  const question = page.getByRole('region', { name: 'Question' });
  const type = await question.getAttribute('data-type');
  if (type === 'choice') await page.locator('[data-option]').first().click();
  else if (type === 'numberPad') await page.getByRole('button', { name: '1', exact: true }).click();
  else if (type === 'order') {
    await tapInOrder(page);
  } else throw new Error(`No way to answer a "${type}" question yet`);
  const submit = page.getByRole('button', { name: /Submit/ });
  await expect(async () => {
    if (await submit.isVisible()) await submit.click();
    await expect(submit).toBeHidden({ timeout: 300 });
  }).toPass();
  const gotIt = page.getByRole('button', { name: /Got it/ });
  const settled = page.locator('[data-phase="asking"], [data-celebration], [data-break], [data-card]');
  await expect(gotIt.or(settled).first()).toBeVisible();
  if (await gotIt.isVisible()) {
    await gotIt.click();
    await expect(settled.first()).toBeVisible();
  }
}

// A child's name no other test run has used. For tests that use the real backup,
// where every run adds to the one test family.
export function freshName(): string {
  return `Kid ${Date.now().toString(36).slice(-6)}`;
}
