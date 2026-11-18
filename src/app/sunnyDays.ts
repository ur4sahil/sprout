import { localDay, localWeek } from '../lib/clock';

// Sunny days (docs/GAME_FEEL.md, phase 7): the days a child learned, counted so that a missed day can never cost
// anything. There is no streak that resets. A child sees this week as seven suns, lit for the days they learned,
// and the total of sunny days so far, which only ever goes up.

export const SUNNY_ANSWERS = 5; // answers in a day that make it a sunny day

export interface SunnyDays {
  week: boolean[]; // Monday to Sunday of this week: was it a sunny day
  today: number; // which of the seven is today, 0 = Monday
  thisWeek: number; // sunny days this week
  total: number; // sunny days ever
}

const dayFrom = (day: string, add: number): string => {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return localDay(new Date(year, month - 1, date + add, 12));
};

// `answersByDay`: how many answers the child gave on each local day (YYYY-MM-DD). `now`: the time to count from.
export function sunnyDays(answersByDay: Readonly<Record<string, number>>, now: Date): SunnyDays {
  const sunny = (day: string): boolean => (answersByDay[day] ?? 0) >= SUNNY_ANSWERS;
  const monday = localWeek(now);
  const week = Array.from({ length: 7 }, (_, i) => sunny(dayFrom(monday, i)));
  const today = (now.getDay() + 6) % 7;
  return { week, today, thisWeek: week.filter(Boolean).length, total: Object.keys(answersByDay).filter(sunny).length };
}

// Answers a day, from a list of attempts (each carries its local day).
export function answersByDay(attempts: readonly { day: string }[]): Record<string, number> {
  const count: Record<string, number> = {};
  for (const attempt of attempts) count[attempt.day] = (count[attempt.day] ?? 0) + 1;
  return count;
}
