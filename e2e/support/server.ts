import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { BASE_URL, COUNTER, DIR, POOL_SIZE, PORT, WORKER_LOG, poolEmail } from './paths';

// Builds the app and starts the real Worker locally over HTTPS, with its own
// throwaway database and settings. Nothing here touches Cloudflare.

function status(url: string): Promise<number> {
  return new Promise((resolve) => {
    const request = https.get(url, { rejectUnauthorized: false }, (reply) => {
      reply.resume();
      resolve(reply.statusCode ?? 0);
    });
    request.on('error', () => resolve(0));
    request.setTimeout(2000, () => {
      request.destroy();
      resolve(0);
    });
  });
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(COUNTER, '0');

  execFileSync('npm', ['run', 'build'], { stdio: 'ignore' });

  const root = process.cwd();
  const source = fs.readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const config = JSON.parse(source) as Record<string, unknown> & { assets: Record<string, unknown> };
  delete config.routes;
  delete config.$schema;
  config.main = path.join(root, 'worker/index.ts');
  config.assets = { ...config.assets, directory: path.join(root, 'dist') };
  config.vars = {};
  const configPath = path.join(DIR, 'wrangler.jsonc');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const emails = Array.from({ length: POOL_SIZE }, (_, i) => poolEmail(i)).join(',');
  fs.writeFileSync(
    path.join(DIR, '.dev.vars'),
    [
      'ENVIRONMENT=dev',
      `APP_ORIGIN=${BASE_URL}`,
      `PARENT_EMAILS=${emails}`,
      'AUTH_PEPPER=e2e-only-pepper-0123456789abcdef0123456789abcdef',
      'MAIL_FROM=sprout@example.com',
      '',
    ].join('\n'),
  );

  const state = path.join(DIR, 'state');
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'sprout', '--local', '-c', configPath, '--persist-to', state, '--file', 'worker/schema.sql'],
    { stdio: 'ignore' },
  );

  const log = fs.openSync(WORKER_LOG, 'a');
  const child = spawn(
    'npx',
    ['wrangler', 'dev', '-c', configPath, '--port', String(PORT), '--local-protocol', 'https', '--persist-to', state],
    { stdio: ['ignore', log, log], detached: true },
  );

  const deadline = Date.now() + 60_000;
  for (;;) {
    if ((await status(`${BASE_URL}/api/auth/session`)) === 401) break;
    if (Date.now() > deadline) {
      if (child.pid) process.kill(-child.pid);
      throw new Error(`The local Worker did not start. See ${WORKER_LOG}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return async () => {
    if (child.pid) {
      try {
        process.kill(-child.pid);
      } catch {
        // already gone
      }
    }
  };
}
