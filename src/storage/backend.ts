import type { QuarantinedItem } from './repo';

// The plain key-value layer under a Repo. memoryRepo and idbRepo differ only here,
// so every rule above it (validation, quarantine, reset, merge) is written once.

export const STORES = [
  'children',
  'skillStates',
  'attempts',
  'sessions',
  'awards',
  'plans',
  'diagnostics',
  'flags',
  'diagnosticProgress',
  'clips',
  'family',
  'device',
  'outbox', // which family records this device has changed and not yet sent to the server
] as const;
export type StoreName = (typeof STORES)[number];

// Stores whose rows belong to one child, and carry a childId.
export const CHILD_STORES: readonly StoreName[] = ['skillStates', 'attempts', 'sessions', 'awards', 'diagnostics', 'flags', 'diagnosticProgress'];

export interface Row {
  key: string;
  value: unknown;
}

export interface Backend {
  all(store: StoreName): Promise<Row[]>;
  byChild(store: StoreName, childId: string): Promise<Row[]>;
  get(store: StoreName, key: string): Promise<unknown | undefined>;
  keys(store: StoreName): Promise<string[]>;
  // Every write in one call lands together or not at all.
  write(changes: { puts?: { store: StoreName; key: string; value: unknown }[]; removes?: { store: StoreName; key: string }[] }): Promise<void>;
  // Keeps the first copy of a quarantined item. A later copy with the same store and key is ignored.
  quarantine(item: QuarantinedItem): Promise<void>;
  quarantined(): Promise<QuarantinedItem[]>;
}

export function memoryBackend(): Backend {
  const data = new Map<StoreName, Map<string, unknown>>(STORES.map((store) => [store, new Map<string, unknown>()]));
  const held = new Map<string, QuarantinedItem>();
  const table = (store: StoreName): Map<string, unknown> => data.get(store) as Map<string, unknown>;
  const copy = <T>(value: T): T => structuredClone(value);
  return {
    async all(store) {
      return [...table(store)].map(([key, value]) => ({ key, value: copy(value) }));
    },
    async byChild(store, childId) {
      return [...table(store)]
        .filter(([, value]) => typeof value === 'object' && value !== null && (value as { childId?: unknown }).childId === childId)
        .map(([key, value]) => ({ key, value: copy(value) }));
    },
    async get(store, key) {
      const value = table(store).get(key);
      return value === undefined ? undefined : copy(value);
    },
    async keys(store) {
      return [...table(store).keys()];
    },
    async write(changes) {
      for (const put of changes.puts ?? []) table(put.store).set(put.key, copy(put.value));
      for (const remove of changes.removes ?? []) table(remove.store).delete(remove.key);
    },
    async quarantine(item) {
      const id = `${item.store}|${item.key}`;
      if (!held.has(id)) held.set(id, copy(item));
    },
    async quarantined() {
      return [...held.values()].map(copy);
    },
  };
}
