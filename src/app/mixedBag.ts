import type { Skill } from '../content/catalogue';
import { skillById } from '../content/catalogue';
import type { Ladder } from '../content/ladders';
import { allGenerators, nextQuestion } from '../content/registry';
import { seedFor } from '../engine/seed';
import { lastWasMiss, levelToAsk } from '../engine/skillscore';
import type { Question } from '../engine/types';
import type { Child, SkillState } from '../storage/schema';

// The Mixed bag (plan section 17): 20 questions, 5 from each of up to 4 topics, taken from the skills the child is
// practising now and shuffled together so the child keeps switching topics. Every answer is ordinary practice.

export const MIXED_TOPICS = 4;
export const MIXED_PER_TOPIC = 5;

// In progress: started, and not yet mastered or placed past, with a generator.
export function inProgress(state: SkillState): boolean {
  const skill = skillById(state.skillId);
  return !!skill && !skill.retired && state.attempts > 0 && state.score < 100 && !state.placedOut && allGenerators().some((generator) => generator.skillId === skill.id);
}

// The order of skills for one Mixed bag: up to 4 topics with skills in progress (the most recently practised first),
// 5 turns each, dealt round the topics so two turns in a row are never from the same topic.
// Empty when fewer than two topics have a skill in progress: one topic alone is not a mix.
export function mixedBagOrder(states: readonly SkillState[], ladders: readonly Ladder[]): string[] {
  const going = states.filter(inProgress);
  const lastPractised = (state: SkillState): string => state.lastPracticedAt ?? '';
  const topics: { ladder: string; skills: string[]; latest: string }[] = [];
  for (const ladder of ladders) {
    const mine = going.filter((state) => ladder.skillIds.includes(state.skillId));
    if (mine.length === 0) continue;
    // Within a topic, the skill furthest along the ladder first: it is the one being learnt now.
    const skills = mine.map((state) => state.skillId).sort((a, b) => ladder.skillIds.indexOf(b) - ladder.skillIds.indexOf(a));
    topics.push({ ladder: ladder.id, skills, latest: mine.map(lastPractised).sort().at(-1) ?? '' });
  }
  if (topics.length < 2) return [];
  const chosen = topics.sort((a, b) => b.latest.localeCompare(a.latest) || a.ladder.localeCompare(b.ladder)).slice(0, MIXED_TOPICS);
  const order: string[] = [];
  for (let turn = 0; turn < MIXED_PER_TOPIC; turn += 1) {
    for (const topic of chosen) order.push(topic.skills[turn % topic.skills.length] as string);
  }
  return order;
}

// The question a skill would ask next in practice, at its level, avoiding the questions just asked.
export function mixedTurn(child: Child, skill: Skill, state: SkillState, recentKeys: readonly string[]): Question {
  const level = levelToAsk(state.score, lastWasMiss(state), skill.maxLevel);
  return nextQuestion(skill.id, level, seedFor(child.id, skill.id, 'practice', state.attempts), recentKeys);
}
