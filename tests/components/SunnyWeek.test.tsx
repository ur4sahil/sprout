import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import SunnyWeek, { sunnySay, sunnyWords } from '../../src/components/SunnyWeek';

// Seven small suns for this week, with the total that only goes up. Nothing shows a missed day as a loss.
afterEach(() => {
  delete document.documentElement.dataset.calm;
});

for (const mode of ['normal', 'calm'] as const) {
  describe(`SunnyWeek, ${mode} mode`, () => {
    it('lights the sunny days, rings today, and writes the total', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      const { container } = render(<SunnyWeek week={[true, false, true, false, false, false, false]} today={2} total={12} />);
      const week = container.querySelector('[data-sunny-week]') as HTMLElement;
      expect(week.getAttribute('aria-label')).toBe('12 sunny days. This week: 2.');
      const suns = [...container.querySelectorAll('[data-sun-day]')];
      expect(suns).toHaveLength(7);
      expect(suns.map((sun) => sun.hasAttribute('data-lit'))).toEqual([true, false, true, false, false, false, false]);
      expect(suns.map((sun) => sun.hasAttribute('data-today'))).toEqual([false, false, true, false, false, false, false]);
      expect(container.querySelector('[data-sunny-total]')?.textContent).toBe('12 sunny days');
    });

    it('a day without learning looks exactly like a day still to come, and no words mention missing', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      const { container } = render(<SunnyWeek week={[false, false, false, true, false, false, false]} today={3} total={1} small />);
      const suns = [...container.querySelectorAll('[data-sun-day]')];
      // Monday (passed, no learning) and Friday (to come) are drawn the same.
      expect(suns[0]?.innerHTML).toBe(suns[4]?.innerHTML);
      expect(container.textContent).toBe('1 sunny day');
      expect(container.innerHTML).not.toMatch(/miss|lost|broke|streak|0 sunny/i);
    });
  });
}

describe('sunny words', () => {
  it('reads one and many, and says the number as a number', () => {
    expect(sunnyWords(1)).toBe('1 sunny day');
    expect(sunnyWords(0)).toBe('0 sunny days');
    expect(sunnySay(7)).toEqual([{ number: 7 }, 'sunny days']);
  });
});
