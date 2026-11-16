import { CATALOGUE } from '../content/catalogue';
import { LADDERS } from '../content/ladders';
import { allGenerators } from '../content/registry';
import { newId } from '../lib/ids';
import type { Plan } from '../storage/schema';

// Skill plans (plan section 10). Nothing is created on first run: a plan exists only once a parent makes one.

export const EXTRA_PRACTICE = 'Extra practice';

// The one ready-made plan the screen offers: all the reasoning skills, in ladder order.
export function reasoningTemplate(): { name: string; skillIds: string[] } {
  const ready = new Set(allGenerators().map((generator) => generator.skillId));
  const known = new Set(CATALOGUE.filter((skill) => !skill.retired).map((skill) => skill.id));
  return {
    name: 'Reasoning practice',
    skillIds: LADDERS.filter((ladder) => ladder.subject === 'reasoning').flatMap((ladder) => ladder.skillIds.filter((id) => ready.has(id) && known.has(id))),
  };
}

export function newPlan(name: string, skillIds: string[], childIds: string[], nowIso: string): Plan {
  return { id: newId(), name: name.trim(), skillIds: [...new Set(skillIds)], childIds: [...new Set(childIds)], createdAt: nowIso, updatedAt: nowIso, deletedAt: null };
}

// A plan with one skill moved one place earlier (-1) or later (+1). At either end it stays put.
export function moveSkill(plan: Plan, skillId: string, by: -1 | 1, nowIso: string): Plan {
  const from = plan.skillIds.indexOf(skillId);
  const to = from + by;
  if (from === -1 || to < 0 || to >= plan.skillIds.length) return plan;
  const skillIds = plan.skillIds.slice();
  [skillIds[from], skillIds[to]] = [skillIds[to] as string, skillIds[from] as string];
  return { ...plan, skillIds, updatedAt: nowIso };
}

// Adds a skill to the child's "Extra practice" plan, making the plan if the child has none.
// Returns the plan to save, or null when the skill is already on it.
export function addToExtraPractice(plans: readonly Plan[], childId: string, skillId: string, nowIso: string): Plan | null {
  const plan = plans.find((candidate) => candidate.deletedAt === null && candidate.name === EXTRA_PRACTICE && candidate.childIds.includes(childId));
  if (!plan) return newPlan(EXTRA_PRACTICE, [skillId], [childId], nowIso);
  if (plan.skillIds.includes(skillId)) return null;
  return { ...plan, skillIds: [...plan.skillIds, skillId], updatedAt: nowIso };
}
