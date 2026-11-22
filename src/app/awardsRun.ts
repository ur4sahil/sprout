import { CATALOGUE } from '../content/catalogue';
import type { Skill } from '../content/catalogue';
import { allGenerators } from '../content/registry';
import type { AwardDef } from '../engine/awards';
import { allAwards, evaluateAwards, isQuietAward } from '../engine/awards';
import type { Repo } from '../storage/repo';
import { offeredTo } from '../engine/grades';
import type { AwardEarned, Child, Grade } from '../storage/schema';

// Awards between the pure rules in engine/awards.ts and the screens.

// The skills that count toward awards: the ones a child can practise. Given the child's grade, only the skills that
// grade is offered (offeredTo), so a sticker or certificate for every Reasoning skill never waits on a word puzzle a
// pre-K or kindergarten child is not offered. Left out (a plan for several children, a list to choose from): all.
export function awardSkills(grade?: Grade): Skill[] {
  const ready = new Set(allGenerators().map((generator) => generator.skillId));
  return CATALOGUE.filter((skill) => !skill.retired && ready.has(skill.id) && (grade === undefined || offeredTo(skill, grade)));
}

export interface AwardsNow {
  earned: AwardEarned[]; // everything the child holds, old and new
  fresh: AwardDef[]; // newly earned and worth a celebration
}

// Works out what the child has earned, saves anything new, and says which new awards to celebrate.
// An award is never taken back: what was saved before stays. A category sticker earned only by
// placing out of every skill in it is saved quietly.
export async function syncAwards(repo: Repo, child: Child, nowIso: string): Promise<AwardsNow> {
  const skills = awardSkills(child.grade);
  const [states, attempts, saved, math, ela] = await Promise.all([
    repo.getSkillStates(child.id),
    repo.listAttempts(child.id, {}),
    repo.listAwards(child.id),
    repo.getDiagnosticProgress(child.id, 'math'),
    repo.getDiagnosticProgress(child.id, 'ela'),
  ]);
  const ids = evaluateAwards(
    states,
    { questionsAnswered: attempts.length, daysPractised: new Set(attempts.map((attempt) => attempt.day)).size, diagnosticsFinished: { math: math?.done === true, ela: ela?.done === true } },
    skills,
  );
  const have = new Set(saved.map((award) => award.awardId));
  const defs = new Map(allAwards(skills).map((award) => [award.id, award]));
  const added: AwardEarned[] = [];
  const fresh: AwardDef[] = [];
  for (const awardId of ids) {
    if (have.has(awardId)) continue;
    const award: AwardEarned = { childId: child.id, awardId, earnedAt: nowIso };
    await repo.addAward(award);
    added.push(award);
    const def = defs.get(awardId);
    if (def && !isQuietAward(awardId, states, skills)) fresh.push(def);
  }
  return { earned: [...saved, ...added], fresh };
}

const STICKERS = ['⭐', '🌟', '🏅', '🎖️', '🏆', '👑', '🎉', '🌈', '🚀', '🎈'];

// The sticker under an award's square. The same award always shows the same sticker.
export function stickerFor(awardId: string): string {
  let sum = 0;
  for (const char of awardId) sum = (sum * 31 + char.charCodeAt(0)) % 9973;
  return STICKERS[sum % STICKERS.length] as string;
}
