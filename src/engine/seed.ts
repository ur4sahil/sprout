export type SeedKind = 'practice' | 'review' | 'diagnostic';

// 32-bit FNV-1a. No clock and no random call, so any question can be replayed.
// n is how many attempts the child has already made at that skill and kind.
export function seedFor(childId: string, skillId: string, kind: SeedKind, n: number): number {
  const text = `${childId}|${skillId}|${kind}|${n}`;
  const bytes = new TextEncoder().encode(text);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
