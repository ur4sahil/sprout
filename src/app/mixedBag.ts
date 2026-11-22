import type { Skill } from '../content/catalogue';
import { skillById } from '../content/catalogue';
import type { Ladder } from '../content/ladders';
import { gradeOfSkillId } from '../content/ladders';
import { allGenerators, nextQuestion } from '../content/registry';
import { maxLevelFor, offeredTo } from '../engine/grades';
import { seedFor } from '../engine/seed';
import { lastWasMiss, levelToAsk } from '../engine/skillscore';
import type { Question } from '../engine/types';
import type { Child, Grade, SkillState } from '../storage/schema';
import { newSkillState } from '../storage/schema';

const BLANK = newSkillState('', '', '');

// The Mixed bag (plan section 17): 20 questions, 5 from each of up to 4 topics, taken from the skills the child is
// practising now (or each topic's next skill) and shuffled together so the child keeps switching topics. Every answer is ordinary practice.

export const MIXED_TOPICS = 4;
export const MIXED_PER_TOPIC = 5;

// In progress: started, and not yet mastered or placed past, with a generator.
export function inProgress(state: SkillState): boolean {
  const skill = skillById(state.skillId);
  return !!skill && !skill.retired && state.attempts > 0 && state.score < 100 && !state.placedOut && allGenerators().some((generator) => generator.skillId === skill.id);
}

// A skill the bag may ask: real, not retired, with a generator, and not mastered or placed past. It may be one the
// child has not started yet (the owner's choice, Nov 19, 2026: the bag also starts each topic's next skill).
export function mixable(state: SkillState): boolean {
  const skill = skillById(state.skillId);
  return !!skill && !skill.retired && state.score < 100 && !state.placedOut && allGenerators().some((generator) => generator.skillId === skill.id);
}

const GRADE_RANK: Record<string, number> = { PK: 0, K: 1, '1': 2, '2': 3, '3': 4, '4': 5, '5': 6 };
const withinGrade = (skillId: string, grade: Grade): boolean => {
  const own = gradeOfSkillId(skillId);
  return own === 'all' || (GRADE_RANK[own] ?? 99) <= (GRADE_RANK[grade] ?? -1);
};
// A skill the child's grade is not offered (offeredTo: the word puzzles before grade 1) is left out of the bag as if
// it were not on its ladder: never asked, and never taken as started.
const offeredAt = (skillId: string, grade: Grade): boolean => {
  const skill = skillById(skillId);
  return !!skill && offeredTo(skill, grade);
};

// The order of skills for one Mixed bag: up to 4 topics (the most recently practised first), 5 turns each, dealt round
// the topics so two turns in a row are never from the same topic. In a topic the child has practised, the skills in
// progress; when none is (every one mastered), the topic's next skill up to the child's grade, started or not. When
// fewer than two topics have anything, topics not yet practised fill in with their first skill in the child's grade,
// so the bag is open from the start (the owner's choice, Nov 19, 2026). Empty only when nothing at all can be mixed.
export function mixedBagOrder(states: readonly SkillState[], ladders: readonly Ladder[], grade: Grade): string[] {
  const stateOf = new Map(states.map((state) => [state.skillId, state]));
  const touched = (skillId: string): boolean => {
    const state = stateOf.get(skillId);
    return !!state && (state.attempts > 0 || state.placedOut) && offeredAt(skillId, grade);
  };
  const canAsk = (skillId: string): boolean => mixable(stateOf.get(skillId) ?? { ...BLANK, skillId }) && withinGrade(skillId, grade) && offeredAt(skillId, grade);
  const lastPractised = (skillId: string): string => stateOf.get(skillId)?.lastPracticedAt ?? '';
  const topics: { ladder: string; skills: string[]; latest: string }[] = [];
  const untouched: { ladder: string; skills: string[]; latest: string }[] = [];
  for (const ladder of ladders) {
    const started = ladder.skillIds.filter(touched);
    if (started.length === 0) {
      // Not practised yet: its first skill in the child's own grade, kept in case two topics are needed.
      const first = ladder.skillIds.find((id) => canAsk(id) && gradeOfSkillId(id) === grade);
      if (first) untouched.push({ ladder: ladder.id, skills: [first], latest: '' });
      continue;
    }
    const latest = started.map(lastPractised).sort().at(-1) ?? '';
    const going = started.filter((id) => inProgress(stateOf.get(id) as SkillState));
    if (going.length > 0) {
      // The skill furthest along the ladder first: it is the one being learnt now.
      const skills = [...going].sort((a, b) => ladder.skillIds.indexOf(b) - ladder.skillIds.indexOf(a));
      topics.push({ ladder: ladder.id, skills, latest });
      continue;
    }
    // Every skill practised here is done: the next one along the ladder, if the child's grade reaches it.
    const after = Math.max(...started.map((id) => ladder.skillIds.indexOf(id)));
    const nextUp = ladder.skillIds.slice(after + 1).find((id) => !touched(id) && canAsk(id));
    if (nextUp) topics.push({ ladder: ladder.id, skills: [nextUp], latest });
  }
  topics.sort((a, b) => b.latest.localeCompare(a.latest) || a.ladder.localeCompare(b.ladder));
  if (topics.length < 2) topics.push(...untouched.slice(0, 2 - topics.length));
  if (topics.length < 2) return [];
  const chosen = topics.slice(0, MIXED_TOPICS);
  const order: string[] = [];
  for (let turn = 0; turn < MIXED_PER_TOPIC; turn += 1) {
    for (const topic of chosen) order.push(topic.skills[turn % topic.skills.length] as string);
  }
  return order;
}

// The question a skill would ask next in practice, at its level, avoiding the questions just asked.
export function mixedTurn(child: Child, skill: Skill, state: SkillState, recentKeys: readonly string[]): Question {
  const level = levelToAsk(state.score, lastWasMiss(state), maxLevelFor(skill, child.grade));
  return nextQuestion(skill.id, level, seedFor(child.id, skill.id, 'practice', state.attempts), recentKeys);
}
