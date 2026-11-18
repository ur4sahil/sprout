import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PostcardFacts } from '../../src/app/postcard';
import { latestPostcard, loadPostcard, weekDates, weekPostcard } from '../../src/app/postcard';
import Postcard from '../../src/components/Postcard';
import { freezeClock, localDay } from '../../src/lib/clock';
import { openRepo } from '../../src/storage/index';
import type { Attempt, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

// The weekly postcard (game feel, phase 7).
const THURSDAY = new Date(2026, 10, 19, 17); // Nov 19, 2026; the week began Monday Nov 16
const day = (date: number, month = 11): string => localDay(new Date(2026, month - 1, date, 12));
let n = 0;
function answer(date: string, skillId: string, before: number, after: number, hour = 10): Attempt {
  n += 1;
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return {
    id: `a${n}`,
    childId: 'kid-1',
    skillId,
    sessionId: 's1',
    level: 1,
    seed: n,
    itemType: 'choice',
    response: 0,
    contentVersion: 1,
    snapshot: { prompt: '', correct: '', given: '' },
    correct: true,
    ms: 3000,
    scoreBefore: before,
    scoreAfter: after,
    kind: 'practice',
    day: date,
    createdAt: new Date(y, m - 1, d, hour, n % 60).toISOString(),
  } as Attempt;
}
// Five answers on a day: a sunny day. The skill climbs from `from` to `to` across them.
function sunnyDay(date: string, skillId = 'M-K-A1', from = 30, to = 30): Attempt[] {
  return Array.from({ length: 5 }, (_, i) => answer(date, skillId, i === 0 ? from : to, to, 9 + i));
}
const name = (id: string): string => `Skill ${id}`;
const mastered = (skillId: string, at: Date): SkillState => ({ ...newSkillState('kid-1', skillId, at.toISOString()), score: 100, bestScore: 100, masteredAt: at.toISOString() });

afterEach(() => {
  delete document.documentElement.dataset.calm;
});

describe('what the postcard shows', () => {
  it('no postcard for a week with fewer than four sunny days', () => {
    const attempts = [...sunnyDay(day(16)), ...sunnyDay(day(17)), ...sunnyDay(day(18)), ...sunnyDay(day(19)).slice(0, 4)];
    expect(weekPostcard(day(16), attempts, [], THURSDAY, name)).toBeNull();
    expect(latestPostcard(attempts, [], THURSDAY, name)).toBeNull();
  });

  it('this week, once it has four sunny days: its dates, its suns, and what grew and bloomed', () => {
    const attempts = [
      ...sunnyDay(day(16), 'M-K-A1', 10, 30), // a little sprout (1) to a plant with a bud (2)
      ...sunnyDay(day(17), 'M-K-A2', 80, 100), // a bud opening (3) to full bloom (4)
      ...sunnyDay(day(18), 'M-K-A3', 30, 50), // stays a plant with a bud
      ...sunnyDay(day(19), 'M-K-A1', 30, 80), // and on, to a bud opening
    ];
    const card = latestPostcard(attempts, [mastered('M-K-A2', new Date(2026, 10, 17, 10))], THURSDAY, name) as PostcardFacts;
    expect(card.monday).toBe(day(16));
    expect(card.sunday).toBe(day(22));
    expect(card.dates).toBe('Nov 16 to 22');
    expect(card.current).toBe(true);
    expect(card.week).toEqual([true, true, true, true, false, false, false]);
    expect(card.sunny).toBe(4);
    expect(card.bloomed).toEqual([{ skillId: 'M-K-A2', name: 'Skill M-K-A2', from: 3, to: 4 }]);
    expect(card.grew).toEqual([{ skillId: 'M-K-A1', name: 'Skill M-K-A1', from: 1, to: 3 }]);
  });

  it('last week’s postcard while this week has not reached four, and only last week’s answers count', () => {
    const last = [day(9), day(10), day(12), day(15)].flatMap((date) => sunnyDay(date, 'E-K-A1', 0, 20));
    const card = latestPostcard([...last, ...sunnyDay(day(16), 'E-K-A2', 0, 90)], [], THURSDAY, name) as PostcardFacts;
    expect(card.dates).toBe('Nov 9 to 15');
    expect(card.current).toBe(false);
    expect(card.week).toEqual([true, true, false, true, false, false, true]);
    expect(card.grew.map((skill) => skill.skillId)).toEqual(['E-K-A1']);
    expect(card.bloomed).toEqual([]);
  });

  it('a skill already mastered before the week does not bloom again', () => {
    const attempts = [day(16), day(17), day(18), day(19)].flatMap((date) => sunnyDay(date, 'M-K-A1', 100, 100));
    const card = latestPostcard(attempts, [mastered('M-K-A1', new Date(2026, 10, 2, 10))], THURSDAY, name) as PostcardFacts;
    expect(card.bloomed).toEqual([]);
    expect(card.grew).toEqual([]);
  });

  it('writes a week across two months', () => {
    expect(weekDates('2026-10-26', '2026-11-01')).toBe('Oct 26 to Nov 1');
    expect(weekDates('2026-11-16', '2026-11-22')).toBe('Nov 16 to 22');
  });

  it('reads what it needs from the device', async () => {
    freezeClock(THURSDAY);
    const { repo } = await openRepo();
    for (const attempt of [day(16), day(17), day(18), day(19)].flatMap((date) => sunnyDay(date))) await repo.saveAnswer({ attempt });
    expect((await loadPostcard({ id: 'kid-1' }))?.sunny).toBe(4);
    expect(await loadPostcard({ id: 'kid-2' })).toBeNull();
  });
});

const FACTS: PostcardFacts = {
  monday: '2026-11-16',
  sunday: '2026-11-22',
  dates: 'Nov 16 to 22',
  current: false,
  week: [true, true, false, true, true, false, false],
  sunny: 4,
  grew: [{ skillId: 'M-K-A1', name: 'Count to 10', from: 1, to: 2 }],
  bloomed: [{ skillId: 'M-K-A2', name: 'Count to 20', from: 3, to: 4 }],
};
const CHILD = { id: 'kid-1', name: 'Robin', avatar: '🐢' };

for (const mode of ['normal', 'calm'] as const) {
  describe(`Postcard, ${mode} mode`, () => {
    it('draws the card: avatar stamp, the dates, sunny days, what grew and what bloomed', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      const { container } = render(<Postcard child={CHILD} facts={FACTS} />);
      const card = container.querySelector('[data-postcard]') as HTMLElement;
      expect(card.getAttribute('aria-label')).toBe("A postcard from Robin's week");
      expect(card.querySelector('[data-postcard-dates]')?.textContent).toBe("Robin's week, Nov 16 to 22");
      expect(card.querySelector('[data-sunny-total]')?.textContent).toBe('4 sunny days');
      expect(card.querySelectorAll('[data-sun-day][data-lit]')).toHaveLength(4);
      expect(card.querySelector('[data-today]')).toBeNull();
      expect(card.querySelector('[data-postcard-fact="bloomed"]')?.textContent).toBe('In full bloom: Count to 20');
      expect(card.querySelector('[data-postcard-fact="grew"]')?.textContent).toBe('Grew a stage: Count to 10');
      expect(card.querySelector('[data-emoji]')?.getAttribute('data-emoji')).toBe('🐢');
    });

    it('a week with no stage changes still sends a warm card, and no facts means no card', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      const quiet = render(<Postcard child={CHILD} facts={{ ...FACTS, grew: [], bloomed: [], current: true }} />).container;
      expect(quiet.querySelector('[data-postcard-fact="steady"]')).not.toBeNull();
      expect(quiet.querySelector('[data-postcard-dates]')?.textContent).toContain('(so far)');
      expect(render(<Postcard child={CHILD} facts={null} />).container.innerHTML).toBe('');
    });

    it('reads its own facts when none are given', async () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      freezeClock(THURSDAY);
      const { repo } = await openRepo();
      for (const attempt of [day(16), day(17), day(18), day(19)].flatMap((date) => sunnyDay(date))) await repo.saveAnswer({ attempt });
      const { container } = render(<Postcard child={CHILD} />);
      await waitFor(() => expect(container.querySelector('[data-postcard]')).not.toBeNull());
    });
  });
}
