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

function readConfig(file = 'wrangler.jsonc'): WranglerConfig {
  const text = readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(text) as WranglerConfig;
}

describe('wrangler.jsonc', () => {
  it('says ENVIRONMENT is production and nothing else', () => {
    expect(readConfig().vars.ENVIRONMENT).toBe('production');
  });

  it('holds no private setting', () => {
    const vars = Object.keys(readConfig().vars);
    // The voice machine's address is not private: it answers only to a key, and the key is a secret setting.
    expect(vars.sort()).toEqual(['APP_ORIGIN', 'ENVIRONMENT', 'VOICE_ENGINE', 'VOICE_URL']);
    expect(vars.some((name) => /KEY|SECRET|TOKEN|PEPPER|PASSWORD/i.test(name))).toBe(false);
  });

  it('runs the live app on the new voices: the owner switched on Nov 22, 2026 (plan section 20)', () => {
    expect(readConfig().vars.VOICE_ENGINE).toBe('piper');
    expect(readConfig().vars.VOICE_URL).toBe('https://sprout-piper.logstocks.com');
  });

  it('serves the app for deep links and sends /api to the Worker first, and the build file, which says the voice', () => {
    for (const file of ['wrangler.jsonc', 'wrangler.staging.jsonc']) {
      const config = readConfig(file);
      expect(config.assets.directory, file).toBe('./dist/');
      expect(config.assets.not_found_handling, file).toBe('single-page-application');
      expect(config.assets.run_worker_first, file).toEqual(['/api', '/api/*', '/build.json']);
    }
  });

  it('is reachable only at the app address', () => {
    const config = readConfig();
    expect(config.workers_dev).toBe(false);
    expect(config.routes).toEqual([{ pattern: 'sprout.logstocks.com', custom_domain: true }]);
    expect(config.vars.APP_ORIGIN).toBe('https://sprout.logstocks.com');
  });
});

describe('wrangler.staging.jsonc', () => {
  it('is the test copy, which speaks with Piper on its own voice machine and holds no private setting', () => {
    const config = readConfig('wrangler.staging.jsonc');
    expect(config.vars.ENVIRONMENT).toBe('dev');
    expect(config.vars.VOICE_ENGINE).toBe('piper');
    expect(config.vars.VOICE_URL).toBe('https://sprout-piper.logstocks.com');
    expect(config.routes).toEqual([{ pattern: 'sprout-staging.logstocks.com', custom_domain: true }]);
    expect(Object.keys(config.vars).some((name) => /KEY|SECRET|TOKEN|PEPPER|PASSWORD/i.test(name))).toBe(false);
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
