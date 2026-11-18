import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speak } from '../../src/audio/speech';
import { EPISODES } from '../../src/stories/episodes';
import StoryReader from '../../src/stories/StoryReader';
import { WORDS_PER_SECOND } from '../../src/stories/words';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: vi.fn(async () => false),
  stop: vi.fn(),
}));

const spoken = vi.mocked(speak);
const episode = EPISODES[0]!;
const RATE = 0.85; // the usual rate, so a word lasts 1 / WORDS_PER_SECOND seconds
const PER_WORD = 1000 / WORDS_PER_SECOND;

function show(calm = false) {
  const onDone = vi.fn();
  const onClose = vi.fn();
  const view = render(<StoryReader episode={episode} rate={RATE} calm={calm} onDone={onDone} onClose={onClose} />);
  return { ...view, onDone, onClose };
}

const words = (container: HTMLElement): string[] => [...container.querySelectorAll('[data-story-text] button')].map((word) => word.textContent ?? '');
const litWord = (container: HTMLElement): string | null => container.querySelector('[data-story-text] [data-lit]')?.textContent ?? null;

beforeEach(() => {
  spoken.mockClear();
  spoken.mockImplementation(async () => false);
});

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.calm;
});

for (const mode of ['normal', 'calm'] as const) {
  describe(`StoryReader, ${mode} mode`, () => {
    const calm = mode === 'calm';

    it('shows the first page: its scene with the friends in it, its words, and Olive reading it at the lesson pace', () => {
      const { container } = show(calm);
      const reader = container.querySelector('[data-story]') as HTMLElement;
      expect(reader.hasAttribute('data-still')).toBe(calm);
      expect(container.querySelector('[data-story-text]')?.hasAttribute('data-still')).toBe(calm);
      expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('1');
      expect(container.querySelector('[data-scene]')?.getAttribute('aria-label')).toBe(episode.pages[0]?.text);
      expect(container.querySelector('[data-backdrop]')?.getAttribute('data-backdrop')).toBe(episode.pages[0]?.scene.backdrop);
      expect(words(container).join(' ')).toBe(episode.pages[0]?.text);
      // Olive beside the words, and every friend in the scene.
      expect(container.querySelectorAll('[data-character="olive"]').length).toBeGreaterThanOrEqual(1);
      for (const spot of episode.pages[0]?.scene.cast ?? []) expect(container.querySelector(`[data-who="${spot.who}"] [data-character="${spot.who}"]`)).not.toBeNull();
      expect(spoken).toHaveBeenCalledWith(episode.pages[0]?.say, RATE, 'lesson', 'olive');
    });

    it('lights each word in turn while it is read, and nothing once the line is over', () => {
      vi.useFakeTimers();
      const { container } = show(calm);
      const shown = words(container);
      act(() => vi.advanceTimersByTime(1));
      expect(litWord(container)).toBe(shown[0]);
      act(() => vi.advanceTimersByTime(PER_WORD));
      expect(litWord(container)).toBe(shown[1]);
      act(() => vi.advanceTimersByTime(60_000));
      expect(litWord(container)).toBeNull();
    });

    it('turns the light off as soon as the voice finishes', async () => {
      vi.useFakeTimers();
      let finish: (done: boolean) => void = () => undefined;
      spoken.mockImplementation(() => new Promise<boolean>((resolve) => (finish = resolve)));
      const { container } = show(calm);
      act(() => vi.advanceTimersByTime(1));
      expect(litWord(container)).not.toBeNull();
      await act(async () => finish(true));
      expect(litWord(container)).toBeNull();
    });

    it('turns pages forward and back, reads the new page, and reads a page again', () => {
      const { container } = show(calm);
      expect((screen.getByRole('button', { name: 'Back a page' }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('2');
      expect(container.querySelector('[data-page]')?.getAttribute('data-turn')).toBe('forward');
      expect(words(container).join(' ')).toBe(episode.pages[1]?.text);
      expect(spoken).toHaveBeenLastCalledWith(episode.pages[1]?.say, RATE, 'lesson', 'olive');
      fireEvent.click(screen.getByRole('button', { name: 'Back a page' }));
      expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('1');
      expect(container.querySelector('[data-page]')?.getAttribute('data-turn')).toBe('back');
      const before = spoken.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: 'Read it again' }));
      expect(spoken.mock.calls.length).toBe(before + 1);
      expect(spoken).toHaveBeenLastCalledWith(episode.pages[0]?.say, RATE, 'lesson', 'olive');
    });

    it('says a tapped word alone', () => {
      show(calm);
      fireEvent.click(screen.getByRole('button', { name: 'Spring' }));
      expect(spoken).toHaveBeenLastCalledWith([{ word: 'Spring' }], RATE, 'normal', 'olive');
    });

    it('asks the question on the last page; the right answer gets "Yes!", the reply and "The end", then Done', () => {
      const { container, onDone } = show(calm);
      for (let i = 0; i < episode.pages.length; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('question');
      expect(words(container).join(' ')).toBe(episode.question.text);
      expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
      const right = episode.question.options[episode.question.answer]!;
      fireEvent.click(screen.getByRole('button', { name: right.text }));
      expect(words(container).join(' ')).toBe(`Yes! ${episode.question.replyText} The end.`);
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('gives any other answer a warm reply too, and closes when asked', () => {
      const { container, onClose, onDone } = show(calm);
      for (let i = 0; i < episode.pages.length; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      const other = episode.question.options.find((_, i) => i !== episode.question.answer)!;
      fireEvent.click(screen.getByRole('button', { name: other.text }));
      expect(words(container).join(' ')).toBe(`Good thinking! ${episode.question.replyText} The end.`);
      expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Close the story' }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onDone).not.toHaveBeenCalled();
    });
  });
}

describe('every episode in the reader', () => {
  it.each(EPISODES.map((each) => [each.title, each] as const))('draws every page of "%s"', (_title, each) => {
    const { container } = render(<StoryReader episode={each} rate={RATE} calm={false} onDone={() => undefined} onClose={() => undefined} />);
    each.pages.forEach((page, i) => {
      expect(words(container).join(' '), `page ${i + 1}`).toBe(page.text);
      expect(container.querySelectorAll('[data-prop]').length).toBe(page.scene.props.length);
      expect(container.querySelector('[data-sign]')?.getAttribute('data-sign') ?? null).toBe(page.scene.sign?.words ?? null);
      expect(container.querySelector('[data-scene-picture]')?.getAttribute('data-scene-picture') ?? null).toBe(page.scene.picture?.visual.kind ?? null);
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    });
    expect(screen.getAllByRole('button', { pressed: false }).length).toBe(each.question.options.length);
  });
});
