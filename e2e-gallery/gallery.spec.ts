import { expect, test } from '@playwright/test';

// Browser tests do not sign in for real: they answer every /api request themselves.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'parent.one@example.com', expiresAt: '2099-01-01T00:00:00.000Z' }) }),
  );
});

test('every picture in the gallery draws, fits its frame and has a label', async ({ page }, info) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });

  await page.goto('/dev/gallery');
  await expect(page.getByRole('heading', { name: 'Picture gallery' })).toBeVisible();

  const report = await page.evaluate(() => {
    const out: string[] = [];
    const samples = [...document.querySelectorAll<HTMLElement>('[data-sample]')];
    for (const sample of samples) {
      const name = sample.dataset.sample ?? '';
      const frame = sample.firstElementChild as HTMLElement;
      const picture = frame.firstElementChild as HTMLElement | null;
      if (!picture) {
        out.push(`${name}: nothing drawn`);
        continue;
      }
      const box = picture.getBoundingClientRect();
      const outer = frame.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) out.push(`${name}: drawn at ${Math.round(box.width)} by ${Math.round(box.height)}`);
      if (frame.scrollWidth > frame.clientWidth + 1 || frame.scrollHeight > frame.clientHeight + 1) out.push(`${name}: clipped by its frame`);
      if (box.left < outer.left - 1 || box.right > outer.right + 1) out.push(`${name}: wider than its frame`);
      if (outer.right > window.innerWidth + 1) out.push(`${name}: wider than the screen`);
      if (picture.getAttribute('role') !== 'img' || !picture.getAttribute('aria-label')) out.push(`${name}: no aria-label`);
      // Parts of one picture must not sit on top of each other.
      const items = [...picture.querySelectorAll<HTMLElement>('[data-item]')].map((item) => item.getBoundingClientRect());
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i] as DOMRect;
          const b = items[j] as DOMRect;
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > a.width * 0.35 && overlapY > a.height * 0.35) out.push(`${name}: objects ${i} and ${j} overlap`);
        }
      }
    }
    return { count: samples.length, out, sideways: document.documentElement.scrollWidth > window.innerWidth };
  });
  expect(report.count).toBeGreaterThan(70);
  expect(report.out).toEqual([]);
  expect(report.sideways).toBe(false);
  expect(problems).toEqual([]);

  // On a clock, neither hand may reach the ring of numbers.
  const reach = await page.evaluate(() =>
    [...document.querySelectorAll('[data-visual="clock"]')].map((clock) => {
      const far = (el: Element): number => Math.hypot(Number(el.getAttribute('x2')) - 50, Number(el.getAttribute('y2')) - 50);
      const hands = [...clock.querySelectorAll('[data-hand]')].map(far);
      const numbers = [...clock.querySelectorAll('[data-number]')].map((el) => Math.hypot(Number(el.getAttribute('x')) - 50, Number(el.getAttribute('y')) - 3.2 - 50));
      return Math.min(...numbers) - Math.max(...hands);
    }),
  );
  for (const gap of reach) expect(gap).toBeGreaterThan(6);

  // Each section on its own, then one tall picture of the whole gallery, for a person to look at.
  if (info.project.name === 'ipad') {
    for (const section of await page.locator('[data-section]').all()) {
      await section.scrollIntoViewIfNeeded();
      await section.screenshot({ path: `.e2e/gallery/${await section.getAttribute('data-section')}.png` });
    }
  }
  // One tall picture of the whole gallery, for a person to look at.
  const height = await page.evaluate(() => (document.querySelector('main')?.scrollHeight ?? 800) + 40);
  const size = page.viewportSize();
  await page.setViewportSize({ width: size?.width ?? 1024, height: Math.min(height, 12000) });
  await page.screenshot({ path: info.project.name === 'ipad' ? 'review/gallery.png' : '.e2e/gallery/gallery-phone.png' });
});

test('the gallery is not in the way of the rest of the app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sprout' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Picture gallery' })).toHaveCount(0);
});
