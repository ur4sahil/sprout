import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { addChild, holdHome, shoot } from './support/kid';
import { checkScreen } from './support/layout';

// The placement check-in and the sticker boards, added in Phase 7.

// Taps "I don't know yet" once the question is ready, and waits for the count to move.
async function dontKnow(page: Page): Promise<void> {
  const count = page.locator('[data-check-in-count]');
  const before = await count.textContent();
  const button = page.getByRole('button', { name: /I don't know yet/ });
  // Taps in the first 400 ms after a question appears are ignored, so keep tapping until one lands.
  await expect(async () => {
    if ((await count.textContent()) === before) await button.click({ timeout: 500 });
    await expect(count).not.toHaveText(before ?? '', { timeout: 500 });
  }).toPass();
}

// Gives the one child on this device a mastered skill, as if earned on another day.
async function masterSkill(page: Page, skillId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('sprout');
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const tx = db.transaction(['children', 'skillStates'], 'readwrite');
    const children = await new Promise<{ id: string }[]>((resolve) => {
      const all = tx.objectStore('children').getAll();
      all.onsuccess = () => resolve(all.result as { id: string }[]);
    });
    const childId = (children[0] as { id: string }).id;
    const at = new Date().toISOString();
    tx.objectStore('skillStates').put(
      { childId, skillId: id, score: 100, bestScore: 100, streak: 5, attempts: 15, correct: 15, recent: Array.from({ length: 10 }, () => true), masteredAt: at, placedOut: false, reviewBox: 1, reviewDueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), lastPracticedAt: at, updatedAt: at },
      `${childId}|${id}`,
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, skillId);
}

test.describe('check-in and stickers', () => {
  test('a new child starts with the math check-in, one short sitting, and ends with a sticker', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten', 'new');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();

    // The first visit opens the check-in, not home.
    await expect(page.getByRole('heading', { name: /Check-in: Math/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await expect(page.getByRole('button', { name: /I don't know yet/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Skip for now/ })).toBeVisible();
    await checkScreen(page, 'check-in question', 64);
    await shoot(page, 'checkin-question');

    // A child can leave. Home opens, with the check-in offered again and today's picks already there.
    await holdHome(page);
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    const offer = page.getByRole('button', { name: /Check-in/ });
    await expect(offer).toHaveAttribute('data-check-in', 'math');
    await checkScreen(page, 'home with a check-in', 64);
    await shoot(page, 'checkin-home');
    await offer.click();

    // A kindergarten sitting is 16 questions. Nothing says right or wrong on the way.
    for (let i = 0; i < 16; i += 1) {
      await dontKnow(page);
      await expect(page.locator('[data-correct]')).toHaveCount(0);
    }
    const card = page.locator('[data-card="sitting-over"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('All done for today');
    await checkScreen(page, 'end of a sitting', 64);
    await shoot(page, 'checkin-sticker');
    await page.getByRole('button', { name: /Home/ }).click();

    // One sitting a day: home no longer offers it, and a Skill Score was never moved.
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    await expect(page.getByRole('button', { name: /Check-in/ })).toHaveCount(0);
    await expect(page.locator('[data-skill] button[aria-label$=". Score 0"]').first()).toBeVisible();

    // It is still not offered after the app is closed and opened again the same day.
    await page.reload();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    await expect(page.getByRole('button', { name: /Check-in/ })).toHaveCount(0);
  });

  test('a mastered skill brings a new sticker on home, and the boards show it uncovered', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await masterSkill(page, 'M-K-C4');
    await page.reload();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();

    const card = page.locator('[data-card="new-stickers"]');
    await expect(card).toBeVisible();
    await expect(card.locator('[data-new-award="mastered:math-K:1"]')).toContainText('1 skill mastered');
    await checkScreen(page, 'new sticker', 64);
    await shoot(page, 'sticker-new');
    await page.getByRole('button', { name: /Yay/ }).click();
    await expect(card).toHaveCount(0);

    await page.getByRole('button', { name: /Stickers/ }).click();
    await expect(page.getByRole('heading', { name: /Stickers/ })).toBeVisible();
    // A board for each subject and grade with skills, one for Reasoning and one for Milestones.
    for (const board of ['math-PK', 'math-K', 'ela-PK', 'reasoning', 'milestones']) await expect(page.locator(`[data-board="${board}"]`)).toBeVisible();
    await expect(page.locator('[data-award="mastered:math-K:1"]')).toHaveAttribute('data-earned', 'yes');
    await expect(page.locator('[data-award="mastered:math-K:3"]')).toHaveAttribute('data-earned', 'no');
    await expect(page.locator('[data-board="math-K"] h2')).toHaveText(/^Math, Kindergarten: 1 of \d+$/);
    await checkScreen(page, 'sticker boards', 44);
    await shoot(page, 'sticker-boards');

    // Home does not celebrate the same sticker again.
    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    await page.waitForTimeout(400);
    await expect(card).toHaveCount(0);
  });
});

test.describe('a short check-in', () => {
  test('a pre-K child who knows none of it finishes math in one sitting, and gets the check-in sticker', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Pre-K', 'new');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Check-in: Math/ })).toBeVisible();
    // Five ladders start in pre-K (counting, comparing, shapes, patterns, length). Two questions each: the
    // bottom skill of every ladder is not known, so each stops there. Ten fits in one pre-K sitting of 12.
    for (let i = 0; i < 10; i += 1) await dontKnow(page);
    const card = page.locator('[data-card="check-in-done"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Check-in finished');
    await page.getByRole('button', { name: /Home/ }).click();
    // Home celebrates the Math check-in sticker, and offers no second check-in today.
    const sticker = page.locator('[data-card="new-stickers"]');
    await expect(sticker.locator('[data-new-award="diagnostic:math"]')).toBeVisible();
    await page.getByRole('button', { name: /Yay/ }).click();
    await expect(page.getByRole('button', { name: /Check-in/ })).toHaveCount(0);
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
  });
});
