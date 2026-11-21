import type { Attempt, Child, SkillState } from '../storage/schema';

// Merging two copies of one record (plan section 4). Used by import and by sync.

function later(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}

// The copy with the later updatedAt wins. On a tie the local copy stays.
export function laterWins<T extends { updatedAt: string }>(local: T, incoming: T): T {
  return incoming.updatedAt > local.updatedAt ? incoming : local;
}

// Children: the later copy wins, and resetAt is the later of the two.
export function mergeChild(local: Child, incoming: Child): Child {
  return {
    ...laterWins(local, incoming),
    resetAt: later(local.resetAt, incoming.resetAt),
    levelWeeks: mergeWeeks(local.levelWeeks, incoming.levelWeeks),
    storiesRead: mergeStories(local.storiesRead, incoming.storiesRead),
    // A sticker pressed on either iPad stays pressed.
    stickersPlaced: [...new Set([...local.stickersPlaced, ...incoming.stickersPlaced])].sort(),
  };
}

// Weekly level snapshots from two devices: every week either has, the later snapshot of a week both have.
// A story finished on either iPad is finished, on the earlier of the two days.
export function mergeStories(a: Child['storiesRead'], b: Child['storiesRead']): Child['storiesRead'] {
  const byId = new Map<string, Child['storiesRead'][number]>();
  for (const row of [...a, ...b]) {
    const known = byId.get(row.episodeId);
    if (!known || row.day < known.day) byId.set(row.episodeId, row);
  }
  return [...byId.values()].sort((x, y) => x.day.localeCompare(y.day) || x.episodeId.localeCompare(y.episodeId));
}

export function mergeWeeks(a: Child['levelWeeks'], b: Child['levelWeeks']): Child['levelWeeks'] {
  const byWeek = new Map<string, Child['levelWeeks'][number]>();
  for (const snapshot of [...a, ...b]) {
    const held = byWeek.get(snapshot.week);
    if (!held || snapshot.at > held.at) byWeek.set(snapshot.week, snapshot);
  }
  return [...byWeek.values()].sort((x, y) => (x.week < y.week ? -1 : 1)).slice(-26);
}

// Rows that are only ever added: one already on the device is skipped.
export function addOnly<T>(local: readonly T[], incoming: readonly T[], keyOf: (row: T) => string): { merged: T[]; added: T[] } {
  const seen = new Set(local.map(keyOf));
  const added: T[] = [];
  for (const row of incoming) {
    const key = keyOf(row);
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(row);
  }
  return { merged: [...local, ...added], added };
}

// A row made before the child's reset is dead everywhere.
export function isDead(madeAt: string, resetAt: string | null): boolean {
  return resetAt !== null && madeAt < resetAt;
}

// attempts, correct, hintedRight and recent, recounted from the practice answers in the attempt log.
export function recount(state: SkillState, attempts: readonly Attempt[]): SkillState {
  const mine = attempts
    .filter((attempt) => attempt.childId === state.childId && attempt.skillId === state.skillId && attempt.kind === 'practice')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return {
    ...state,
    attempts: mine.length,
    correct: mine.filter((attempt) => attempt.correct).length,
    hintedRight: mine.filter((attempt) => attempt.correct && attempt.hinted).length,
    recent: mine.slice(-10).map((attempt) => attempt.correct),
  };
}

// Skill state: score, streak, mastery and review come from the copy practised later.
// bestScore is the higher. placedOut is true if either says so.
// Pass the merged attempt log to recount the answer counts, so two devices never lose each other's answers.
export function mergeSkillState(local: SkillState, incoming: SkillState, attempts?: readonly Attempt[]): SkillState {
  const localAt = local.lastPracticedAt ?? '';
  const incomingAt = incoming.lastPracticedAt ?? '';
  const base = incomingAt > localAt || (incomingAt === localAt && incoming.updatedAt > local.updatedAt) ? incoming : local;
  const merged: SkillState = {
    ...base,
    bestScore: Math.max(local.bestScore, incoming.bestScore),
    placedOut: local.placedOut || incoming.placedOut,
    updatedAt: later(local.updatedAt, incoming.updatedAt) ?? base.updatedAt,
  };
  return attempts ? recount(merged, attempts) : merged;
}
