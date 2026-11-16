import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ScoreRing, { STAGE_COLOR, STAGE_NAME } from '../../src/components/ScoreRing';

const ring = (score: number, attempts: number, placedOut = false): SVGElement => render(<ScoreRing score={score} attempts={attempts} placedOut={placedOut} />).container.querySelector('svg') as SVGElement;

describe('ScoreRing', () => {
  it('says the score and the stage, and takes its colour from the stage tokens', () => {
    const cases: [number, number, string, string][] = [
      [0, 0, 'notStarted', 'Not started'],
      [0, 3, 'gettingStarted', 'Getting started'],
      [39, 5, 'gettingStarted', 'Getting started'],
      [40, 5, 'practising', 'Practising'],
      [79, 9, 'practising', 'Practising'],
      [80, 9, 'proficient', 'Proficient'],
      [90, 10, 'challenge', 'Challenge zone'],
      [100, 15, 'mastered', 'Mastered'],
    ];
    for (const [score, attempts, stage, name] of cases) {
      const svg = ring(score, attempts);
      expect(svg.getAttribute('data-stage'), `${score}`).toBe(stage);
      expect(svg.getAttribute('aria-label')).toBe(`Skill Score ${score} out of 100. ${name}`);
      if (score > 0) expect(svg.querySelectorAll('circle')[1]?.getAttribute('style')).toContain(`var(--stage-`);
    }
    expect(Object.keys(STAGE_COLOR)).toHaveLength(6);
    expect(new Set(Object.values(STAGE_COLOR)).size).toBe(6);
    expect(Object.keys(STAGE_NAME)).toHaveLength(6);
  });

  it('an empty ring draws no arc, so there is no stray dot', () => {
    expect(ring(0, 0).querySelectorAll('circle')).toHaveLength(1);
    expect(ring(1, 1).querySelectorAll('circle')).toHaveLength(2);
  });

  it('fills in proportion to the score, and shows a medal at 100', () => {
    const filled = (score: number): number => Number((ring(score, 5).querySelectorAll('circle')[1]?.getAttribute('style') ?? '').match(/stroke-dasharray:\s*([\d.]+)/)?.[1]);
    expect(filled(50) / filled(100)).toBeCloseTo(0.5);
    expect(filled(25) / filled(100)).toBeCloseTo(0.25);
    expect(ring(100, 15).querySelector('text')?.textContent).toBe('🏅');
    expect(ring(47, 5).querySelector('text')?.textContent).toBe('47');
  });

  it('a placed-out skill at 80 shows as proficient even with no answers', () => {
    expect(ring(80, 0, true).getAttribute('data-stage')).toBe('proficient');
  });
});
