import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { CATALOGUE } from '../../src/content/catalogue';
import { signUp } from './fixtures';
import { addChild } from './kid';

const GRADE_NAME: Record<string, string> = { PK: 'Pre-K', K: 'Kindergarten', '1': 'Grade 1', '2': 'Grade 2', '3': 'Grade 3' };

// A new family with a child in the skill's grade, on that skill's lesson screen.
export async function openLesson(page: Page, skillId: string): Promise<void> {
  const skill = CATALOGUE.find((each) => each.id === skillId);
  if (!skill) throw new Error(`No skill ${skillId}`);
  await signUp(page);
  await addChild(page, 'Robin', GRADE_NAME[skill.grade] ?? 'Kindergarten');
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
  await page.getByRole('button', { name: { math: 'Math', ela: 'Language Arts', reasoning: 'Reasoning' }[skill.subject], exact: true }).click();
  const tile = page.getByRole('button', { name: new RegExp(`^${skill.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`) });
  const tabs = page.getByRole('tab');
  for (let i = 0; i < (await tabs.count()) && !(await tile.isVisible()); i += 1) await tabs.nth(i).click();
  await tile.click();
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.getByRole('button', { name: 'Learn this skill' }).click();
  await pickHelp(page, 'Lesson');
}

// The lesson button names who tells the lesson: Sprout until the server speaks with the new voices, the subject's
// friend after that (plan section 20). Tests find it either way.
export const LESSON_BUTTON = /Lesson with (Sprout|Pip|Olive|Finn)/;

// The bulb opens on a choice: a video (when the skill has one), a lesson, or an example.
export async function pickHelp(page: Page, which: 'Watch a video' | 'Lesson' | 'Example'): Promise<void> {
  await page.getByRole('button', { name: which === 'Lesson' ? LESSON_BUTTON : new RegExp(which) }).click();
}
