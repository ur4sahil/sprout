import { LADDER_NAME } from './parentData';
import { CHECK_IN_SUBJECTS, SUBJECT_NAME, diagnosticLadders } from './checkIn';
import type { TopicLevel } from '../engine/topicLevel';
import { topicLevel } from '../engine/topicLevel';
import type { Child, SkillState } from '../storage/schema';

// The grown-ups' "Levels by topic" (plan section 15.3): one row for each Math and Language Arts ladder.

export interface TopicRow {
  ladderId: string;
  name: string; // "Math: Time"
  level: TopicLevel;
  change: number | null; // since the latest snapshot before this week, when both have a number
  history: { week: string; value: number }[]; // the saved weeks, oldest first, then this week
}

export function topicLevels(states: readonly SkillState[]): Map<string, TopicLevel> {
  const out = new Map<string, TopicLevel>();
  for (const subject of CHECK_IN_SUBJECTS) for (const ladder of diagnosticLadders(subject)) out.set(ladder.id, topicLevel(ladder.skills, states));
  return out;
}

const valueOf = (level: TopicLevel): number | null => (level.kind === 'notTried' ? null : level.value);

export function topicRows(child: Child, levels: Map<string, TopicLevel>, week: string): TopicRow[] {
  const before = child.levelWeeks.filter((snapshot) => snapshot.week < week).at(-1);
  return CHECK_IN_SUBJECTS.flatMap((subject) =>
    diagnosticLadders(subject).map((ladder): TopicRow => {
      const level = levels.get(ladder.id) ?? { kind: 'notTried' };
      const now = valueOf(level);
      const past = before?.levels[ladder.id];
      const history = child.levelWeeks.filter((snapshot) => snapshot.week < week && snapshot.levels[ladder.id] !== undefined).map((snapshot) => ({ week: snapshot.week, value: snapshot.levels[ladder.id] as number }));
      return {
        ladderId: ladder.id,
        name: `${SUBJECT_NAME[subject]}: ${LADDER_NAME[ladder.id] ?? ladder.id}`,
        level,
        change: now !== null && past !== undefined ? Math.round((now - past) * 10) / 10 : null,
        history: now === null ? history : [...history, { week, value: now }],
      };
    }),
  );
}

// This week's snapshot, written over each time the dashboard opens so the week ends on its last level.
// Null when nothing would change, so the dashboard saves only when it has to.
export function withWeek(child: Child, levels: Map<string, TopicLevel>, week: string, at: string): Child | null {
  const values: Record<string, number> = {};
  for (const [id, level] of levels) {
    const value = valueOf(level);
    if (value !== null) values[id] = value;
  }
  const held = child.levelWeeks.find((snapshot) => snapshot.week === week);
  if (held && JSON.stringify(held.levels) === JSON.stringify(values)) return null;
  if (!held && Object.keys(values).length === 0) return null;
  const others = child.levelWeeks.filter((snapshot) => snapshot.week !== week);
  return { ...child, levelWeeks: [...others, { week, at, levels: values }].sort((a, b) => (a.week < b.week ? -1 : 1)).slice(-26) };
}
