// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseParentEmails } from '../../worker/auth';

interface WranglerConfig {
  main: string;
  workers_dev: boolean;
  vars: Record<string, string>;
  assets: { directory: string; not_found_handling: string; run_worker_first: string[] };
  routes: { pattern: string; custom_domain: boolean }[];
}

function readConfig(): WranglerConfig {
  const text = readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(text) as WranglerConfig;
}

describe('wrangler.jsonc', () => {
  it('says ENVIRONMENT is production and nothing else', () => {
    expect(readConfig().vars.ENVIRONMENT).toBe('production');
  });

  it('holds no private setting', () => {
    const vars = Object.keys(readConfig().vars);
    expect(vars.sort()).toEqual(['APP_ORIGIN', 'ENVIRONMENT']);
  });

  it('serves the app for deep links and sends /api to the Worker first', () => {
    const config = readConfig();
    expect(config.assets.directory).toBe('./dist/');
    expect(config.assets.not_found_handling).toBe('single-page-application');
    expect(config.assets.run_worker_first).toEqual(['/api', '/api/*']);
  });

  it('is reachable only at the app address', () => {
    const config = readConfig();
    expect(config.workers_dev).toBe(false);
    expect(config.routes).toEqual([{ pattern: 'sprout.logstocks.com', custom_domain: true }]);
    expect(config.vars.APP_ORIGIN).toBe('https://sprout.logstocks.com');
  });
});

describe('parseParentEmails', () => {
  it('splits on commas, trims and lower-cases', () => {
    expect(parseParentEmails(' One@Example.com , two@example.com,, ')).toEqual([
      'one@example.com',
      'two@example.com',
    ]);
  });

  it('gives an empty list when the setting is missing', () => {
    expect(parseParentEmails(undefined)).toEqual([]);
    expect(parseParentEmails('')).toEqual([]);
  });
});

describe('the Worker entry file', () => {
  it('exports only functions beside its default: the runtime refuses to start on any other named value', async () => {
    const entry = (await import('../../worker/index')) as Record<string, unknown>;
    for (const [name, value] of Object.entries(entry)) {
      if (name === 'default') continue;
      expect(typeof value, `export ${name}`).toBe('function');
    }
    expect(typeof (entry.default as { fetch?: unknown }).fetch).toBe('function');
  });
});
