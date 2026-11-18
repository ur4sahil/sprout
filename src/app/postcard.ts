import { skillById } from '../content/catalogue';
import { addDays, localDayOf, localWeek, now } from '../lib/clock';
import { openRepo } from '../storage/index';
import type { Attempt, Child, SkillState } from '../storage/schema';
import { growthStage } from '../worlds/types';
import { answersByDay, sunnyDays } from './sunnyDays';

// The weekly postcard (game feel, phase 7): a week with 4 or more sunny days sends a postcard to the grown-ups'
// dashboard. It says which week, how many sunny days, which skills grew a stage and which came into full bloom.
// Worked out from the answers and skill states the dashboard already reads; nothing new is saved.

export const POSTCARD_DAYS = 4; // sunny days in a week that make a postcard

export interface PostcardSkill {
  skillId: string;
  name: string;
  from: number; // growth stage at the start of the week (0 to 4)
  to: number; // and at its end
}

export interface PostcardFacts {
  monday: string; // the week's first local day, YYYY-MM-DD
  sunday: string; // its last
  dates: string; // "Nov 9 to 15", "Oct 27 to Nov 2"
  current: boolean; // the week is still going on
  week: boolean[]; // Monday to Sunday: sunny days
  sunny: number; // how many
  grew: PostcardSkill[]; // grew one stage or more, but not yet into bloom
  bloomed: PostcardSkill[]; // came into full bloom this week
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A local day a number of days after another, both YYYY-MM-DD, worked out at noon so a clock change cannot slip a day.
function shift(day: string, days: number): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  const at = new Date(year, month - 1, date + days, 12);
  return `${String(at.getFullYear()).padStart(4, '0')}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
}

// "Nov 9 to 15" within a month, "Oct 27 to Nov 2" across two.
export function weekDates(monday: string, sunday: string): string {
  const [, m1 = 1, d1 = 1] = monday.split('-').map(Number);
  const [, m2 = 1, d2 = 1] = sunday.split('-').map(Number);
  return m1 === m2 ? `${MONTHS[m1 - 1]} ${d1} to ${d2}` : `${MONTHS[m1 - 1]} ${d1} to ${MONTHS[m2 - 1]} ${d2}`;
}

// What one week's postcard shows, or null when that week had fewer than 4 sunny days.
// `attempts` must hold every answer of the week; `name` names a skill.
export function weekPostcard(monday: string, attempts: readonly Attempt[], states: readonly SkillState[], at: Date, name: (skillId: string) => string): PostcardFacts | null {
  const sunday = shift(monday, 6);
  const inWeek = attempts.filter((attempt) => attempt.day >= monday && attempt.day <= sunday).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Sunny days are counted the same way the child sees them, from noon on that Sunday (or now, in this week).
  const sunnyAt = localWeek(at) === monday ? at : new Date(Number(sunday.slice(0, 4)), Number(sunday.slice(5, 7)) - 1, Number(sunday.slice(8, 10)), 12);
  const days = sunnyDays(answersByDay(inWeek), sunnyAt);
  if (days.thisWeek < POSTCARD_DAYS) return null;

  const stateById = new Map(states.map((state) => [state.skillId, state]));
  const first = new Map<string, Attempt>();
  const last = new Map<string, Attempt>();
  for (const attempt of inWeek) {
    if (!first.has(attempt.skillId)) first.set(attempt.skillId, attempt);
    last.set(attempt.skillId, attempt);
  }
  const grew: PostcardSkill[] = [];
  const bloomed: PostcardSkill[] = [];
  for (const [skillId, start] of first) {
    const end = last.get(skillId) ?? start;
    const masteredDay = stateById.get(skillId)?.masteredAt ? localDayOf(stateById.get(skillId)?.masteredAt ?? '') : null;
    const from = growthStage(start.scoreBefore, masteredDay !== null && masteredDay < monday);
    const to = growthStage(end.scoreAfter, masteredDay !== null && masteredDay <= sunday);
    if (to <= from) continue;
    const row = { skillId, name: name(skillId), from, to };
    if (to === 4) bloomed.push(row);
    else grew.push(row);
  }
  return { monday, sunday, dates: weekDates(monday, sunday), current: localWeek(at) === monday, week: days.week, sunny: days.thisWeek, grew, bloomed };
}

// The postcard the dashboard shows: this week's once it has 4 sunny days, otherwise last week's if it had them.
export function latestPostcard(attempts: readonly Attempt[], states: readonly SkillState[], at: Date, name: (skillId: string) => string): PostcardFacts | null {
  const thisMonday = localWeek(at);
  return weekPostcard(thisMonday, attempts, states, at, name) ?? weekPostcard(shift(thisMonday, -7), attempts, states, at, name);
}

// Reads what the postcard needs for one child: the answers since last Monday, and the skill states.
export async function loadPostcard(child: Pick<Child, 'id'>): Promise<PostcardFacts | null> {
  const { repo } = await openRepo();
  const at = now();
  const since = addDays(at.toISOString(), -15);
  const [attempts, states] = await Promise.all([repo.listAttempts(child.id, { since }), repo.getSkillStates(child.id)]);
  return latestPostcard(attempts, states, at, (skillId) => skillById(skillId)?.name ?? skillId);
}
