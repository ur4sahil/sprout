import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Checks one screen at the current size: nothing spills sideways, every
// control is big enough to tap and can be brought on screen.
export async function checkScreen(page: Page, label: string, minTap = 44): Promise<void> {
  const size = page.viewportSize();
  if (!size) throw new Error('no viewport');

  const widths = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(widths.doc, `${label}: page scrolls sideways`).toBeLessThanOrEqual(widths.inner);
  expect(widths.body, `${label}: body scrolls sideways`).toBeLessThanOrEqual(widths.inner);

  const controls = page.locator('button, input:not([aria-hidden="true"])');
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    const name = (await control.textContent()) || (await control.getAttribute('name')) || `#${i}`;
    if (!box) throw new Error(`${label}: ${name} has no box`);
    expect(box.height, `${label}: ${name} is too short to tap`).toBeGreaterThanOrEqual(minTap);
    expect(box.x, `${label}: ${name} is cut off on the left`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${label}: ${name} is cut off on the right`).toBeLessThanOrEqual(size.width + 0.5);
    expect(box.y, `${label}: ${name} cannot be scrolled into view`).toBeGreaterThanOrEqual(-0.5);
    expect(box.y + box.height, `${label}: ${name} cannot be scrolled into view`).toBeLessThanOrEqual(size.height + 0.5);
  }

  // Text is not cut off inside its box.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('h1, p, label span, button')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent ?? ''),
  );
  expect(clipped, `${label}: text is cut off`).toEqual([]);

  // Typing on an iPad or iPhone must not zoom the page: inputs need 16px text or more.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([aria-hidden="true"])')]
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => el.getAttribute('name') ?? ''),
  );
  expect(small, `${label}: input text under 16px makes iOS zoom`).toEqual([]);
}
