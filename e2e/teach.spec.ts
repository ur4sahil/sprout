import type { Page } from '@playwright/test';
import { describeVisual } from '../src/engine/describe';
import { LESSONS } from '../src/lessons';
import type { Turn } from '../src/lessons/types';
import { expect, test } from './support/fixtures';
import { shoot } from './support/kid';
import { openLesson } from './support/lesson';
import { checkScreen } from './support/layout';

// Lessons that teach (plan section 16): played through by touch. The first turn is answered wrong twice
// (the why plays, then the answer shows), the others right.

const SAMPLES = [{ id: 'M-K-C1' }, { id: 'E-K-B1' }, { id: 'M-1-B5' }] as const;

function labels(turn: Turn): { right: string; wrong: string[] } {
  const q = turn.question;
  if (q.type !== 'choice') throw new Error(`A ${q.type} turn is not answered here yet`);
  const all = q.options.map((option) => describeVisual(option));
  return { right: all[q.answerIndex] ?? '', wrong: all.filter((_, i) => i !== q.answerIndex) };
}

async function tapAnswer(page: Page, label: string): Promise<void> {
  await page.locator(`[data-option][aria-label="${label}"]`).click();
  await page.getByRole('button', { name: /Check/ }).click();
}

for (const sample of SAMPLES) {
  test(`the ${sample.id} lesson moves with its words, takes answers by touch, and ends on Practise`, async ({ page }) => {
    test.setTimeout(240_000);
    const lesson = LESSONS[sample.id]?.();
    if (!lesson) throw new Error(`No lesson for ${sample.id}`);
    const turns = lesson.parts.flatMap((part) => (part.kind === 'turn' ? [part.turn] : []));
    await openLesson(page, sample.id);
    const card = page.getByRole('region', { name: 'Lesson' });
    await expect(card).toHaveAttribute('data-teach-phase', 'showing');
    const stage = page.locator('[data-lesson-stage]');
    await expect(stage).toBeVisible();
    await checkScreen(page, `${sample.id} lesson`, 64);
    await shoot(page, `teach-${sample.id}`);

    for (const [index, turn] of turns.entries()) {
      await expect(card).toHaveAttribute('data-teach-phase', 'asking', { timeout: 120_000 });
      const part = (await card.getAttribute('data-part')) ?? '';
      await checkScreen(page, `${sample.id} turn ${index + 1}`, 64);
      const { right, wrong } = labels(turn);
      if (index === 0) {
        await tapAnswer(page, wrong[0] ?? '');
        await expect(card).toHaveAttribute('data-teach-phase', 'why');
        await expect(stage).toBeVisible();
        await expect(card).toHaveAttribute('data-teach-phase', 'again', { timeout: 60_000 });
        await expect(page.getByText('Try it again!')).toBeVisible();
        await tapAnswer(page, wrong[1] ?? wrong[0] ?? '');
        await expect(card).toHaveAttribute('data-teach-phase', 'shown');
        await expect(page.locator('[data-lesson-answer]')).toBeVisible();
        await page.getByRole('button', { name: /Next/ }).click();
      } else {
        await tapAnswer(page, right);
      }
      // The lesson moves on to its next part (which may be the next turn).
      await expect(card).not.toHaveAttribute('data-part', part);
    }
    await expect(page.getByRole('button', { name: /Practise/ })).toBeVisible({ timeout: 120_000 });
    await page.getByRole('button', { name: /Practise/ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  });
}

test('pause holds the lesson on its moment, and play carries on', async ({ page }) => {
  await openLesson(page, SAMPLES[0].id);
  const words = page.locator('[data-moment-text]');
  await expect(words).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  const held = await words.textContent();
  await page.waitForTimeout(1500);
  await expect(words).toHaveText(held ?? '');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(words).not.toHaveText(held ?? '', { timeout: 15_000 });
});
