import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FRIEND_PRAISE_AFTER, praiseFor } from '../../src/app/usePractice';
import { PRAISE } from '../../src/audio/say';
import { LINES as CAST_LINES } from '../../src/cast';
import Celebration from '../../src/components/Celebration';
import GrowthShow, { SHOW_DONE, setGrowthShowForTests } from '../../src/components/GrowthShow';
import type { GrowthInfo } from '../../src/components/GrowthShow';
import PracticeFriend, { FRIEND_START, friendStep } from '../../src/components/PracticeFriend';
import ReviewPot from '../../src/components/ReviewPot';
import SoftBreak from '../../src/components/SoftBreak';
import StatusPanel from '../../src/components/StatusPanel';
import { plantKindFor } from '../../src/components/plantKind';
import { CATALOGUE, skillById } from '../../src/content/catalogue';
import type { Skill } from '../../src/content/catalogue';
import { LADDERS } from '../../src/content/ladders';
import type { Question } from '../../src/engine/types';
import { layoutGarden, plantOf } from '../../src/garden/layout';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { GARDEN } from '../../src/worlds/garden';
import type { FlowerKind } from '../../src/worlds/types';

// The payoff (game feel, phase 5): the friend in the corner, the plant in the status panel, the growth show,
// review pots, and the friend's own praise.

const kinds = Object.values(GARDEN.home?.areas ?? {}).flatMap((area) => area.kinds);
const daisy = kinds[0] as FlowerKind;
const calm = (): void => {
  document.documentElement.dataset.calm = '';
};

afterEach(() => {
  delete document.documentElement.dataset.calm;
  setGrowthShowForTests(0);
  vi.useRealTimers();
});

describe('the friend in the corner', () => {
  const walk = (steps: [string, string][]) => steps.reduce((track, [key, phase]) => friendStep(track, key, phase), FRIEND_START);

  it('listens while the child chooses, cheers a right answer, thinks on a miss and encourages on a second miss in a row', () => {
    expect(walk([['q1', 'asking']]).mood).toBe('listen');
    expect(walk([['q1', 'asking'], ['q1', 'saving']]).mood).toBe('listen');
    expect(walk([['q1', 'asking'], ['q1', 'correct']]).mood).toBe('cheer');
    expect(walk([['q1', 'asking'], ['q1', 'wrong']]).mood).toBe('think');
    expect(walk([['q1', 'wrong'], ['q2', 'asking'], ['q2', 'wrong']]).mood).toBe('encourage');
    // A right answer between two misses starts the count again.
    expect(walk([['q1', 'wrong'], ['q2', 'correct'], ['q3', 'wrong']]).mood).toBe('think');
    expect(walk([['q1', 'asking'], ['q1', 'celebrating']]).mood).toBe('idle');
  });

  it('does the big cheer once, on the fifth right answer in a row, and the small one on either side', () => {
    const moods: string[] = [];
    let track = FRIEND_START;
    for (let i = 1; i <= 7; i += 1) {
      track = friendStep(friendStep(track, `q${i}`, 'asking'), `q${i}`, 'correct');
      moods.push(track.mood);
    }
    expect(moods).toEqual(['cheer', 'cheer', 'cheer', 'cheer', 'cheerBig', 'cheer', 'cheer']);
  });

  it('the same phase of the same question changes nothing, so a re-render never cheers twice', () => {
    const once = walk([['q1', 'correct']]);
    expect(friendStep(once, 'q1', 'correct')).toBe(once);
  });

  it('draws the friend, hidden from screen readers, and follows the phase', () => {
    const view = render(<PracticeFriend who="pip" questionKey="q1" phase="asking" />);
    const box = view.container.querySelector('[data-friend]') as HTMLElement;
    expect(box.getAttribute('data-friend')).toBe('pip');
    expect(box.querySelector('[data-character="pip"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(box.getAttribute('data-friend-mood')).toBe('listen');
    view.rerender(<PracticeFriend who="pip" questionKey="q1" phase="correct" />);
    expect(view.container.querySelector('[data-character]')?.getAttribute('data-mood')).toBe('cheer');
  });

  it('in Calm mode it holds each mood as a still pose', () => {
    calm();
    const view = render(<PracticeFriend who="olive" questionKey="q1" phase="wrong" />);
    const friend = view.container.querySelector('[data-character="olive"]') as Element;
    expect(friend.getAttribute('data-mood')).toBe('think');
    expect(friend.hasAttribute('data-still')).toBe(true);
  });
});

describe('the friend says the praise sometimes', () => {
  const question = (seed: number): Question => ({ seed }) as Question;
  const generic = new Set(PRAISE.map((p) => JSON.stringify(p.say)));
  const cheers = new Set(CAST_LINES.pip.cheer.map((say) => JSON.stringify(say)));

  it('never in the first three right answers of a sitting', () => {
    for (let seed = 1; seed < 200; seed += 1) {
      for (let before = 0; before < FRIEND_PRAISE_AFTER; before += 1) {
        const said = praiseFor(question(seed), before, 'pip', { index: null });
        expect(generic.has(JSON.stringify(said.say))).toBe(true);
        expect(said.who).toBe('sprout');
      }
    }
  });

  it('after that, about one right answer in three, in the friend\'s own words and never both', () => {
    let friend = 0;
    for (let seed = 1; seed <= 600; seed += 1) {
      const praise = praiseFor(question(seed), 5, 'pip', { index: null });
      const said = JSON.stringify(praise.say);
      expect(generic.has(said) !== cheers.has(said)).toBe(true);
      // A friend's own words are said in the friend's own voice; the usual praise in Sprout's.
      expect(praise.who).toBe(cheers.has(said) ? 'pip' : 'sprout');
      if (cheers.has(said)) friend += 1;
    }
    expect(friend).toBeGreaterThan(150);
    expect(friend).toBeLessThan(250);
  });

  it('the same question always gets the same words, and the generic praise is the one it always was', () => {
    for (let seed = 1; seed < 100; seed += 1) {
      const a = praiseFor(question(seed), 4, 'finn', { index: null });
      const b = praiseFor(question(seed), 4, 'finn', { index: null });
      expect(a).toEqual(b);
      if (generic.has(JSON.stringify(a.say))) expect(PRAISE.map((p) => p.say)).toContainEqual(a.say);
    }
  });

  it('the friend never says the same cheer twice running', () => {
    const last = { index: null as number | null };
    let before: string | null = null;
    for (let seed = 1; seed <= 300; seed += 1) {
      const said = JSON.stringify(praiseFor(question(seed), 10, 'olive', last).say);
      if (!generic.has(said)) {
        expect(said).not.toBe(before);
        before = said;
      }
    }
  });
});

describe('a skill grows as the same flower everywhere', () => {
  it('the plant beside a question is the plant the garden draws for that skill', () => {
    const states: SkillState[] = CATALOGUE.filter((s) => !s.retired && s.grade === 'K').map((s) => ({ ...newSkillState('kid-1', s.id, '2026-11-18T15:00:00.000Z'), attempts: 2, score: 30 }));
    const layout = layoutGarden({ grade: 'K', states, skills: CATALOGUE, ladders: LADDERS, plan: [], reviewsDue: [] });
    let checked = 0;
    for (const state of states.slice(0, 60)) {
      const place = plantOf(layout, state.skillId);
      const skill = skillById(state.skillId) as Skill;
      if (!place) continue;
      expect(plantKindFor(skill)).toEqual(GARDEN.home?.areas[skill.subject].kinds[place.kind]);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('the plant in the status panel', () => {
  const panel = (score: number, stage: 0 | 1 | 2 | 3 | 4) => <StatusPanel answered={3} score={score} attempts={3} placedOut={false} seconds={null} plant={{ kind: daisy, stage }} />;

  it('shows the plant at its stage beside the Skill Score ring, and keeps the panel\'s marks', () => {
    const view = render(panel(30, 2));
    expect(view.container.querySelector('[data-score="30"]')).not.toBeNull();
    expect(view.container.querySelector('[data-answered]')?.textContent).toBe('3');
    const plant = view.container.querySelector('[data-status-plant]') as HTMLElement;
    expect(plant.getAttribute('data-stage')).toBe('2');
    expect(plant.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('2');
  });

  it('grows live when the score crosses into the next stage, with a puff of leaves', () => {
    const view = render(panel(70, 2));
    expect(view.container.querySelector('[data-particles]')).toBeNull();
    view.rerender(panel(76, 3));
    expect(view.container.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('3');
    expect(view.container.querySelector('[data-particles="leaf"]')).not.toBeNull();
  });

  it('is left out where the world has no plant, and draws the same in Calm mode', () => {
    expect(render(<StatusPanel answered={0} score={0} attempts={0} placedOut={false} seconds={null} />).container.querySelector('[data-status-plant]')).toBeNull();
    calm();
    const view = render(panel(100, 4));
    expect(view.container.querySelector('[data-status-plant] [data-plant]')?.getAttribute('data-stage')).toBe('4');
  });
});

describe('the growth show', () => {
  const info = (change: Partial<GrowthInfo> = {}): GrowthInfo => ({ who: 'pip', kind: daisy, from: 1, to: 2, right: 7, score: 42, sunny: [true, true, false, false, false, false, false], ...change });
  const facts = (root: Element): string[] => [...root.querySelectorAll('[data-fact]')].filter((fact) => fact.hasAttribute('data-on')).map((fact) => fact.getAttribute('data-fact') ?? '');
  const show = (change: Partial<GrowthInfo> = {}, bloom = false) =>
    render(
      <GrowthShow info={info(change)} bloom={bloom} head={<h2>Nice work!</h2>}>
        <button type="button">Keep going</button>
      </GrowthShow>,
    );

  it('plays in order: the plant as it was, water falling, it grows, three facts one by one, then the buttons', () => {
    vi.useFakeTimers();
    setGrowthShowForTests(2900);
    const view = show();
    const root = view.container.querySelector('[data-growth-show]') as HTMLElement;
    const plant = (): string | null => root.querySelector('[data-plant]')?.getAttribute('data-stage') ?? null;
    expect(root.getAttribute('data-step')).toBe('0');
    expect(plant()).toBe('1');
    expect(root.querySelector('[data-particles="drop"]')).not.toBeNull();
    expect(facts(root)).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Keep going' })).toBeNull();
    act(() => vi.advanceTimersByTime(900));
    expect(plant()).toBe('2');
    expect(root.querySelector('[data-character]')?.getAttribute('data-mood')).toBe('cheer');
    act(() => vi.advanceTimersByTime(600));
    expect(facts(root)).toEqual(['right']);
    act(() => vi.advanceTimersByTime(400));
    expect(facts(root)).toEqual(['right', 'score']);
    act(() => vi.advanceTimersByTime(400));
    expect(facts(root)).toEqual(['right', 'score', 'sunny']);
    expect(screen.queryByRole('button', { name: 'Keep going' })).toBeNull();
    act(() => vi.advanceTimersByTime(700));
    expect(root.getAttribute('data-step')).toBe(String(SHOW_DONE));
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy();
    expect(root.textContent).toContain('7 right');
    expect(root.textContent).toContain('Skill Score 42');
    expect(root.textContent).toContain('2 sunny days this week');
    expect(root.querySelectorAll('[data-lit]')).toHaveLength(2);
  });

  it('a tap skips to the end: the plant at its stage now, every fact, the buttons', () => {
    vi.useFakeTimers();
    setGrowthShowForTests(2900);
    const view = show();
    const root = view.container.querySelector('[data-growth-show]') as HTMLElement;
    fireEvent.click(root);
    expect(root.getAttribute('data-step')).toBe(String(SHOW_DONE));
    expect(root.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('2');
    expect(facts(root)).toEqual(['right', 'score', 'sunny']);
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy();
  });

  it('a plant whose stage did not change rustles instead of growing', () => {
    vi.useFakeTimers();
    setGrowthShowForTests(2900);
    const view = show({ from: 2, to: 2 });
    act(() => vi.advanceTimersByTime(900));
    const box = view.container.querySelector('[data-growth-plant]') as HTMLElement;
    expect(box.className).toMatch(/rustle/);
    expect(box.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('2');
  });

  it('at 100 petals fly, the plant blooms with its visitor, and the friend does the big cheer', () => {
    vi.useFakeTimers();
    setGrowthShowForTests(2900);
    const view = show({ from: 3, to: 4, score: 100 }, true);
    act(() => vi.advanceTimersByTime(900));
    expect(view.container.querySelector('[data-particles="petal"]')).not.toBeNull();
    expect(view.container.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('4');
    expect(view.container.querySelector('[data-character]')?.getAttribute('data-mood')).toBe('cheerBig');
  });

  it('in Calm mode there is no show: the plant stands at its stage now and the facts and buttons are there at once', () => {
    setGrowthShowForTests(2900);
    calm();
    const view = show();
    const root = view.container.querySelector('[data-growth-show]') as HTMLElement;
    expect(root.getAttribute('data-step')).toBe(String(SHOW_DONE));
    expect(root.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('2');
    expect(root.querySelector('[data-particles]')).toBeNull();
    expect(facts(root)).toEqual(['right', 'score', 'sunny']);
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy();
  });

  it('waits to show the sunny days until they are counted', () => {
    const view = show({ sunny: null });
    expect(facts(view.container)).toEqual(['right', 'score']);
  });

  it('the break card and the medal play it; the other milestones keep their picture', () => {
    const growth = info({ from: 3, to: 4, score: 100, right: 10 });
    const medal = render(<Celebration milestone={100} skillName="Add to 10" onDone={() => undefined} growth={growth} />);
    expect(medal.container.querySelector('[data-celebration="100"] [data-growth-show]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Mastered!' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /All done/ })).toBeTruthy();
    medal.unmount();
    const half = render(<Celebration milestone={50} skillName="Add to 10" onDone={() => undefined} growth={growth} />);
    expect(half.container.querySelector('[data-growth-show]')).toBeNull();
    half.unmount();
    const rest = render(<SoftBreak answered={10} score={42} onKeepGoing={() => undefined} onAllDone={() => undefined} growth={info()} />);
    expect(rest.container.querySelector('[data-break] [data-growth-show]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Stop for now/ })).toBeTruthy();
  });
});

describe('a plant in a review pot', () => {
  const pot = (watered: number, done = false) => <ReviewPot kind={daisy} stage={4} watered={watered} done={done} current={!done} label="Add to 10" />;

  beforeEach(() => {
    vi.useRealTimers();
  });

  it('waits a little droopy, and each right answer pours water on it', () => {
    const view = render(<ul>{pot(0)}</ul>);
    const plant = (): Element => view.container.querySelector('[data-plant]') as Element;
    expect(plant().hasAttribute('data-droop')).toBe(true);
    expect(view.container.querySelector('[data-particles]')).toBeNull();
    view.rerender(<ul>{pot(1)}</ul>);
    expect(view.container.querySelector('[data-particles="drop"]')).not.toBeNull();
    expect(view.container.querySelector('[data-review-pot]')?.getAttribute('data-watered')).toBe('1');
  });

  it('a miss changes nothing, and when its questions are done it stands tall', () => {
    const view = render(<ul>{pot(1)}</ul>);
    view.rerender(<ul>{pot(1)}</ul>);
    expect(view.container.querySelector('[data-particles]')).toBeNull();
    expect(view.container.querySelector('[data-plant]')?.getAttribute('data-stage')).toBe('4');
    view.rerender(<ul>{pot(1, true)}</ul>);
    expect(view.container.querySelector('[data-plant]')?.hasAttribute('data-droop')).toBe(false);
    expect(view.container.querySelector('[data-review-pot]')?.hasAttribute('data-done')).toBe(true);
  });

  it('draws the same in Calm mode, with no water drawn', () => {
    calm();
    const view = render(<ul>{pot(0)}</ul>);
    view.rerender(<ul>{pot(1)}</ul>);
    expect(view.container.querySelector('[data-review-pot]')?.getAttribute('aria-label')).toBe('Add to 10');
    // The particle layer is there but draws nothing in Calm mode.
    expect(view.container.querySelector('canvas')?.getAttribute('data-particles')).toBe('drop');
  });
});
