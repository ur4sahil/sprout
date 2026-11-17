import path from 'node:path';

export const PORT = 8799;
// The local test server, unless a run is pointed at a deployed copy (the staging check sets this).
export const BASE_URL = process.env.SPROUT_BASE_URL ?? `https://localhost:${PORT}`;
export const DIR = path.resolve('.e2e');
export const WORKER_LOG = path.join(DIR, 'worker.log');
export const COUNTER = path.join(DIR, 'counter');
export const POOL_SIZE = 600;

// Made-up addresses on the family list for a test run.
export function poolEmail(index: number): string {
  return `e2e-${String(index).padStart(3, '0')}@example.com`;
}
