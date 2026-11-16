import { expect, test } from '@playwright/test';

// Read-only checks of the live site. No code is requested, so no email is sent.
const ORIGIN = 'https://sprout.logstocks.com';

test.describe('the live site', () => {
  test('serves the sign-in screen at the root and at a deep link, with no errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    for (const path of ['/', '/parent/dashboard']) {
      await page.goto(path);
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
    }
    await expect(page).toHaveTitle('Sprout');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    expect(problems).toEqual([]);
  });

  test('a made-up address gets the usual message, through the real password stretch', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(`live-check-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('not-a-real-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('That email or password is not right.');
  });

  test('serves the manifest and icons over HTTPS only', async ({ request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png']) {
      const reply = await request.get(icon);
      expect(reply.status(), icon).toBe(200);
      expect(reply.headers()['content-type'], icon).toBe('image/png');
    }
    for (const path of ['/', '/parent/dashboard?x=1', '/api/auth/session']) {
      const plain = await request.get(`http://sprout.logstocks.com${path}`, { maxRedirects: 0 });
      expect(plain.status(), path).toBe(301);
      expect(plain.headers().location, path).toBe(`${ORIGIN}${path}`);
    }
    const headers = (await request.get('/')).headers();
    expect(headers['strict-transport-security']).toBe('max-age=31536000');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('guards /api and refuses writes from other sites', async ({ request }) => {
    for (const path of ['/api', '/api/nothing', '/api/backup', '/api/voice-pack', '/api/auth/session']) {
      const reply = await request.get(path);
      expect(reply.status(), path).toBe(401);
      expect(reply.headers()['content-type'], path).toBe('application/json');
    }
    for (const origin of ['https://evil.example.com', 'http://sprout.logstocks.com', `${ORIGIN}:8443`, 'null']) {
      const foreign = await request.post('/api/auth/login', {
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        data: { email: 'someone@example.com', passwordKey: 'a'.repeat(64) },
      });
      expect(foreign.status(), origin).toBe(403);
    }
    const own = await request.post('/api/auth/login', {
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      data: { email: `live-check-${Date.now()}@example.com`, passwordKey: 'a'.repeat(64) },
    });
    expect(own.status()).toBe(401);
    expect(await own.json()).toEqual({ error: 'invalid' });
  });
});
