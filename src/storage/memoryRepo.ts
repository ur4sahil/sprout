import { memoryBackend } from './backend';
import type { Repo } from './repo';
import { makeRepo } from './repoCore';

// In memory only. Used in tests, and as the fallback when IndexedDB cannot be opened.
export function memoryRepo(): Repo {
  return makeRepo(memoryBackend());
}
