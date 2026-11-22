import { CATALOGUE } from '../content/catalogue';
import { LADDERS } from '../content/ladders';
import { allGenerators } from '../content/registry';
import type { DiagnosticLadder } from '../engine/diagnostic';
import { applyPlacement, placementsOf, shouldWalk } from '../engine/diagnostic';
import { maxLevelFor } from '../engine/grades';
import { newId } from '../lib/ids';
import type { Repo } from '../storage/repo';
import type { Child, DiagnosticProgress, DiagnosticResult, DiagnosticSubject, Grade, SkillState } from '../storage/schema';

// The placement check-in (plan section 7), between the pure walk in engine/diagnostic.ts and the screens.

export const CHECK_IN_SUBJECTS: readonly DiagnosticSubject[] = ['math', 'ela'];
export const SUBJECT_NAME: Record<DiagnosticSubject, string> = { math: 'Math', ela: 'Language Arts' };

// A subject's ladders, holding only the skills that are built. Reasoning is never checked. With the child's grade,
// each skill's top level is the one that child is asked (maxLevelFor), so a check-in never asks above it.
export function diagnosticLadders(subject: DiagnosticSubject, grade?: Grade): DiagnosticLadder[] {
  const ready = new Set(allGenerators().map((generator) => generator.skillId));
  const rows = new Map(CATALOGUE.filter((skill) => !skill.retired && ready.has(skill.id)).map((skill) => [skill.id, skill]));
  // A ladder with no skill built yet is left out. Saving a placement on it would say the child had
  // passed a ladder that does not exist yet, and its skills would be skipped when they arrive.
  return LADDERS.filter((ladder) => ladder.subject === subject)
    .map((ladder) => ({
      id: ladder.id,
      skills: ladder.skillIds.flatMap((id) => {
        const skill = rows.get(id);
        return skill ? [{ id, grade: skill.grade, maxLevel: grade ? maxLevelFor(skill, grade) : skill.maxLevel }] : [];
      }),
    }))
    .filter((ladder) => ladder.skills.length > 0);
}

// Whether the subject has any ladder to ask this child questions on.
export function hasWalk(subject: DiagnosticSubject, grade: Grade): boolean {
  return diagnosticLadders(subject).some((ladder) => shouldWalk(ladder, grade));
}

// The latest placement on each ladder. null means the child passed the whole ladder.
export function latestPlacements(results: readonly DiagnosticResult[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const result of results.slice().sort((a, b) => a.takenAt.localeCompare(b.takenAt))) out[result.ladderId] = result.placementSkillId;
  return out;
}

type BothProgress = Readonly<Record<DiagnosticSubject, DiagnosticProgress | null>>;

// A child who has never opened the math check-in starts with it (plan section 7, Short sittings).
export function isFirstVisit(grade: Grade, progress: BothProgress): boolean {
  return progress.math === null && hasWalk('math', grade);
}

// The check-in home offers today, if any: at most one sitting per local day, swapping between
// math and Language Arts, until every walked ladder is placed.
export function checkInToday(grade: Grade, progress: BothProgress, today: string): DiagnosticSubject | null {
  const open = CHECK_IN_SUBJECTS.filter((subject) => hasWalk(subject, grade) && progress[subject]?.done !== true);
  if (open.length === 0) return null;
  if (CHECK_IN_SUBJECTS.some((subject) => progress[subject]?.lastSittingDay === today)) return null;
  // The subject with fewer sittings so far goes next. Math goes first.
  return open.slice().sort((a, b) => (progress[a]?.sittings ?? 0) - (progress[b]?.sittings ?? 0))[0] ?? null;
}

export interface Settled {
  results: DiagnosticResult[];
  states: SkillState[]; // skills placed out
}

// What to save when an answer finishes a ladder: its placement, and the skills below it placed out at 80.
// When the answer finishes the whole subject, the ladders that are never walked get their placement too.
export function settle(input: {
  child: Child;
  subject: DiagnosticSubject;
  before: DiagnosticProgress;
  after: DiagnosticProgress;
  ladders: readonly DiagnosticLadder[];
  states: readonly SkillState[];
  nowIso: string;
}): Settled {
  const { child, subject, before, after, ladders, nowIso } = input;
  const out: Settled = { results: [], states: [] };
  let states = input.states.slice();
  for (const placement of placementsOf(after, ladders, child.grade)) {
    const ladder = ladders.find((candidate) => candidate.id === placement.ladderId);
    if (!ladder) continue;
    const newlyDone = placement.walked ? before.ladders[ladder.id]?.done !== true : after.done && !before.done;
    if (!newlyDone) continue;
    out.results.push({
      id: newId(),
      childId: child.id,
      subject,
      ladderId: ladder.id,
      placementSkillId: placement.placementSkillId,
      estimateGrade: placement.estimateGrade,
      estimateFraction: placement.estimateFraction,
      takenAt: nowIso,
    });
    const placed = applyPlacement(states, ladder, placement.placementSkillId, child.id, nowIso);
    out.states.push(...placed);
    states = [...states.filter((state) => !placed.some((changed) => changed.skillId === state.skillId)), ...placed];
  }
  return out;
}

// Catalogue growth (plan section 7): a skill that now sits below a saved placement on its ladder,
// and has no saved state, is placed out at 80. A skill the child has already touched is left alone.
export function growthStates(child: Child, results: readonly DiagnosticResult[], states: readonly SkillState[], nowIso: string): SkillState[] {
  const have = new Set(states.map((state) => state.skillId));
  const placements = latestPlacements(results);
  const out: SkillState[] = [];
  for (const subject of CHECK_IN_SUBJECTS) {
    for (const ladder of diagnosticLadders(subject)) {
      if (!(ladder.id in placements)) continue;
      const placement = placements[ladder.id] ?? null;
      const at = placement === null ? ladder.skills.length : ladder.skills.findIndex((skill) => skill.id === placement);
      // A placement that is no longer on the ladder places nothing out.
      if (at === -1) continue;
      const missing = ladder.skills.slice(0, at).filter((skill) => !have.has(skill.id));
      out.push(...applyPlacement([], { id: ladder.id, skills: missing }, null, child.id, nowIso));
    }
  }
  return out;
}

// Runs the growth step once after the catalogue has grown, then notes the new version on the device.
export async function runCatalogueGrowth(repo: Repo, catalogueVersion: number, nowIso: string): Promise<number> {
  const device = await repo.getDeviceState();
  if (device.catalogueVersion >= catalogueVersion) return 0;
  let placedOut = 0;
  for (const child of await repo.listChildren()) {
    const grown = growthStates(child, await repo.listDiagnostics(child.id), await repo.getSkillStates(child.id), nowIso);
    for (const state of grown) await repo.saveSkillState(state);
    placedOut += grown.length;
  }
  await repo.updateDeviceState({ catalogueVersion });
  return placedOut;
}
