import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EPISODES } from '../../src/stories/episodes';
import StoryBook from '../../src/stories/StoryBook';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: vi.fn(async () => false),
  stop: vi.fn(),
}));

afterEach(() => {
  delete document.documentElement.dataset.calm;
});

const finished = [EPISODES[0]!.id, EPISODES[2]!.id];

for (const mode of ['normal', 'calm'] as const) {
  describe(`StoryBook, ${mode} mode`, () => {
    const calm = mode === 'calm';

    it('shows a cover with a title and picture for each finished story, and a closed cover with no title for the rest', () => {
      const { container } = render(<StoryBook episodes={EPISODES} finishedIds={finished} rate={0.85} calm={calm} onClose={() => undefined} />);
      expect(container.querySelector('[aria-label="Story book"]')?.hasAttribute('data-still')).toBe(calm);
      expect(container.querySelectorAll('[data-cover="open"]')).toHaveLength(2);
      expect(container.querySelectorAll('[data-cover="closed"]')).toHaveLength(EPISODES.length - 2);
      expect(screen.getByRole('button', { name: EPISODES[0]!.title })).toBeTruthy();
      expect(screen.getByRole('button', { name: EPISODES[2]!.title })).toBeTruthy();
      const pictures = [...container.querySelectorAll('[data-cover="open"] img')].map((img) => img.getAttribute('data-emoji'));
      expect(pictures).toEqual([EPISODES[0]!.cover, EPISODES[2]!.cover]);
      // A story not reached yet keeps its name a surprise.
      for (const episode of EPISODES.slice(3)) expect(screen.queryByText(episode.title)).toBeNull();
      expect(screen.queryByText(EPISODES[1]!.title)).toBeNull();
      expect(screen.getAllByRole('img', { name: 'A story still to come' })).toHaveLength(EPISODES.length - 2);
    });

    it('opens a finished story in the reader and comes back to the shelf at Done or Close', () => {
      const onClose = vi.fn();
      const { container } = render(<StoryBook episodes={EPISODES} finishedIds={finished} rate={0.85} calm={calm} onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: EPISODES[2]!.title }));
      expect(container.querySelector('[data-story]')?.getAttribute('data-story')).toBe(EPISODES[2]!.id);
      fireEvent.click(screen.getByRole('button', { name: 'Close the story' }));
      expect(container.querySelector('[data-story]')).toBeNull();
      expect(container.querySelectorAll('[data-cover="open"]')).toHaveLength(2);
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Close the story book' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows a shelf of closed covers for a child who has not finished a story yet', () => {
      const { container } = render(<StoryBook episodes={EPISODES} finishedIds={[]} rate={0.85} calm={calm} onClose={() => undefined} />);
      expect(container.querySelectorAll('[data-cover="open"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-cover="closed"]')).toHaveLength(EPISODES.length);
    });
  });
}
