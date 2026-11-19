import path from 'node:path';

// A second run on the same machine takes another port, so the two do not collide.
export const PORT = Number(process.env.SPROUT_E2E_PORT ?? 8799);
// The local test server, unless a run is pointed at a deployed copy (the staging check sets this).
export const BASE_URL = process.env.SPROUT_BASE_URL ?? `https://localhost:${PORT}`;
export const DIR = path.resolve('.e2e');
export const WORKER_LOG = path.join(DIR, 'worker.log');
export const COUNTER = path.join(DIR, 'counter');
// One address per signed-up test, two for the two-iPad test. The run has passed 600 tests; three digits allow 1,000.
export const POOL_SIZE = 1000;

// Made-up addresses on the family list for a test run.
export function poolEmail(index: number): string {
  return `e2e-${String(index).padStart(3, '0')}@example.com`;
}
