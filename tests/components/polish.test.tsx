import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CATALOGUE } from '../../src/content/catalogue';
import GameFriend, { gameMood } from '../../src/components/GameFriend';
import ParticleBurst from '../../src/components/ParticleBurst';
import ProfileCard from '../../src/components/ProfileCard';
import { resetFrameWatchForTests, setLowFx } from '../../src/lib/frameWatch';
import { burstAt } from '../../src/lib/burstAt';

// Polish (game feel, phase 8): the profile card's little garden, the friend in a game's corner, and the old-device
// fallback for particles.

afterEach(() => {
  delete document.documentElement.dataset.calm;
  resetFrameWatchForTests();
});

const [one, two] = CATALOGUE.filter((skill) => !skill.retired) as [(typeof CATALOGUE)[number], (typeof CATALOGUE)[number]];
const week = { week: [true, false, true, false, false, false, false], today: 2, thisWeek: 2, total: 9 };

for (const mode of ['normal', 'calm'] as const) {
  describe(`the profile card, ${mode} mode`, () => {
    it('stands the child in front of their own plants, with their suns, and keeps its name and description', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      const pick = vi.fn();
      const { container } = render(
        <ProfileCard
          name="Robin"
          avatar="🐢"
          grade="Kindergarten"
          done={4}
          goal={35}
          plants={[
            { skillId: one.id, subject: one.subject, stage: 4 },
            { skillId: two.id, subject: two.subject, stage: 1 },
          ]}
          sunny={week}
          onClick={pick}
        />,
      );
      const card = container.querySelector('[data-profile="Robin"]') as HTMLButtonElement;
      expect(card.getAttribute('aria-label')).toBe('Robin');
      expect(document.getElementById(card.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Kindergarten. 4 of 35 questions today.');
      expect(card.querySelector('[data-today]')?.getAttribute('data-today')).toBe('4');
      expect(card.textContent).toContain('4 of 35 today');
      // The plants are the child's, at their stages.
      const plants = [...card.querySelectorAll('[data-profile-plant]')];
      expect(plants.map((plant) => plant.getAttribute('data-profile-plant'))).toEqual([one.id, two.id]);
      expect(plants.map((plant) => plant.querySelector('[data-plant]')?.getAttribute('data-stage'))).toEqual(['4', '1']);
      expect(card.querySelector('[data-sunny-week]')?.getAttribute('data-total')).toBe('9');
      expect(card.hasAttribute('data-flying')).toBe(false);
      card.click();
      expect(pick).toHaveBeenCalledOnce();
    });

    it('marks the picked card to fly, and shows an empty bed and no suns while they are counted', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      const { container } = render(<ProfileCard name="Ada" avatar="🦄" grade="Grade 1" done={0} goal={10} flying onClick={() => undefined} />);
      const card = container.querySelector('[data-profile="Ada"]') as HTMLElement;
      expect(card.hasAttribute('data-flying')).toBe(true);
      expect(card.querySelectorAll('[data-profile-plant]')).toHaveLength(0);
      expect(card.querySelector('[data-sunny-week]')).toBeNull();
    });
  });

  describe(`the friend in a game's corner, ${mode} mode`, () => {
    it('listens, cheers a right answer, and encourages after a miss', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      expect(gameMood(null, 0)).toBe('listen');
      expect(gameMood('right', 1)).toBe('cheer');
      expect(gameMood('right', 5)).toBe('cheerBig');
      expect(gameMood('miss', 0)).toBe('encourage');
      const { container, rerender } = render(<GameFriend who="pip" last={null} beat={0} />);
      const corner = container.querySelector('[data-game-friend="pip"]');
      expect(corner?.getAttribute('data-friend-mood')).toBe('listen');
      expect(corner?.querySelector('[data-character="pip"]')).not.toBeNull();
      rerender(<GameFriend who="pip" last="right" run={1} beat={1} />);
      expect(container.querySelector('[data-game-friend]')?.getAttribute('data-friend-mood')).toBe('cheer');
      rerender(<GameFriend who="pip" last="miss" beat={2} />);
      expect(container.querySelector('[data-game-friend]')?.getAttribute('data-friend-mood')).toBe('encourage');
    });
  });
}

describe('particles on a device that cannot keep up', () => {
  it('are drawn normally, and not at all once data-lowfx is on', () => {
    const first = render(<ParticleBurst />);
    expect(first.container.querySelector('[data-particles]')).not.toBeNull();
    first.unmount();
    setLowFx();
    const second = render(<ParticleBurst />);
    expect(second.container.querySelector('[data-particles]')).toBeNull();
  });
});

describe('where a burst starts', () => {
  it('is the middle of the thing tapped, as a share of the area; the middle when nothing has a size', () => {
    const box = (left: number, top: number, width: number, height: number): Element => ({ getBoundingClientRect: () => ({ left, top, width, height }) }) as unknown as Element;
    expect(burstAt(box(0, 0, 200, 100), box(150, 50, 20, 20))).toEqual({ x: 0.8, y: 0.6 });
    expect(burstAt(box(0, 0, 0, 0), box(10, 10, 10, 10))).toEqual({ x: 0.5, y: 0.5 });
    expect(burstAt(null, null)).toEqual({ x: 0.5, y: 0.5 });
  });
});
