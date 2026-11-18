import type { Skill } from '../content/catalogue';
import { CATALOGUE } from '../content/catalogue';
import { isStarted, stageOf } from '../garden/layout';
import type { SkillState } from '../storage/schema';
import type { GrowthStage } from '../worlds/types';
import type { PlanPart } from './todaysPlan';

// The little garden on a child's profile card (game feel, phase 8): a few of their own plants, at the stages their
// saved scores give them. Worked out from what is saved; nothing new is saved.

export const PROFILE_PLANTS = 4;

export interface ProfilePlant {
  skillId: string;
  subject: Skill['subject'];
  stage: GrowthStage;
}

// The plants to show: the most grown of the skills the child has begun (the highest stage first, then the
// highest score, then the catalogue's order, so the same child always gets the same picture). A child with few
// begun is shown today's new seeds and practice skills next. A child with none of either has an empty bed.
export function profilePlants(states: readonly SkillState[], plan: readonly PlanPart[], skills: readonly Skill[] = CATALOGUE, most: number = PROFILE_PLANTS): ProfilePlant[] {
  const order = new Map(skills.filter((skill) => !skill.retired).map((skill, i) => [skill.id, { skill, i }]));
  const stateOf = new Map(states.map((state) => [state.skillId, state]));
  const begun = states
    .filter((state) => isStarted(state) && order.has(state.skillId))
    .sort((a, b) => stageOf(b) - stageOf(a) || b.score - a.score || (order.get(a.skillId)?.i ?? 0) - (order.get(b.skillId)?.i ?? 0))
    .map((state) => state.skillId);
  const planned = plan.flatMap((part) => (part.kind === 'keepGoing' || part.kind === 'new' ? [part.skillId] : [])).filter((skillId) => order.has(skillId));
  const chosen = [...new Set([...begun, ...planned])].slice(0, Math.max(0, most));
  return chosen.flatMap((skillId) => {
    const skill = order.get(skillId)?.skill;
    return skill ? [{ skillId, subject: skill.subject, stage: stageOf(stateOf.get(skillId)) }] : [];
  });
}
