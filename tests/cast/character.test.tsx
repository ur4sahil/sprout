import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Character from '../../src/cast/Character';
import { ARMS, MOODS, MOOD_POSES, armAngles, mouthFor } from '../../src/cast/moods';
import { MOUTHS, WHO } from '../../src/cast/types';
import LessonHost from '../../src/components/LessonHost';

afterEach(() => {
  delete document.documentElement.dataset.calm;
});

const calm = (): void => {
  document.documentElement.dataset.calm = '';
};

function drawn(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('nothing was drawn');
  return svg;
}

// Every friend has every part the plan lists, in every mood.
function expectWholeFriend(svg: SVGSVGElement): void {
  expect(svg.querySelectorAll('[data-part="body"]')).toHaveLength(1);
  expect(svg.querySelectorAll('[data-part="head"]')).toHaveLength(1);
  expect(svg.querySelectorAll('[data-part="eye"]')).toHaveLength(2);
  expect(svg.querySelectorAll('[data-part="brows"] path')).toHaveLength(2);
  expect(svg.querySelectorAll('[data-part="mouth"]')).toHaveLength(1);
  expect(svg.querySelectorAll('[data-part="arm-left"]')).toHaveLength(1);
  expect(svg.querySelectorAll('[data-part="arm-right"]')).toHaveLength(1);
  expect(svg.querySelectorAll('[data-part="foot"]')).toHaveLength(2);
  expect(svg.querySelectorAll('[data-part="signature"]')).toHaveLength(1);
}

describe('the cast: every friend in every mood', () => {
  for (const who of WHO) {
    for (const mood of MOODS) {
      it(`${who} is drawn whole when ${mood}`, () => {
        const svg = drawn(render(<Character who={who} mood={mood} />).container);
        expect(svg.dataset.character).toBe(who);
        expect(svg.dataset.mood).toBe(mood);
        expect(svg.dataset.still).toBeUndefined();
        expect(svg.dataset.eyes).toBe(MOOD_POSES[mood].eyes);
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expectWholeFriend(svg);
        // An open eye has a pupil and a lid to blink with; a smiling or sleeping eye is one curve.
        expect(svg.querySelectorAll('[data-part="lid"]')).toHaveLength(MOOD_POSES[mood].eyes === 'open' ? 2 : 0);
        expect(svg.querySelectorAll('[data-part="z"]')).toHaveLength(mood === 'sleep' ? 1 : 0);
      });

      it(`${who} holds a still pose when ${mood} in Calm mode`, () => {
        calm();
        const svg = drawn(render(<Character who={who} mood={mood} />).container);
        expect(svg.dataset.still).toBe('');
        expect(svg.dataset.mood).toBe(mood);
        expectWholeFriend(svg);
        // Nothing loops: the mouth is one shape, even in the talking mood.
        expect(svg.querySelectorAll('[data-talk-shape]')).toHaveLength(0);
        expect(MOUTHS).toContain(svg.dataset.mouth);
        // The pose itself is still there: the arms are where the mood puts them.
        const arms = armAngles(who, mood);
        expect(svg.style.getPropertyValue('--set-arm-left')).toBe(`${arms.left}deg`);
        expect(svg.style.getPropertyValue('--set-arm-right')).toBe(`${arms.right}deg`);
      });
    }
  }

  it("the device's Reduce Motion also gives the still pose", () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener: () => undefined, removeEventListener: () => undefined }));
    const svg = drawn(render(<Character who="pip" mood="talk" />).container);
    expect(svg.dataset.still).toBe('');
    expect(svg.dataset.mouth).toBe('small');
  });
});

describe('the cast: mouths', () => {
  it('talking by itself draws the four talking shapes for the styles to show in turn', () => {
    const svg = drawn(render(<Character who="olive" talking />).container);
    expect(svg.dataset.mouth).toBe('talking');
    expect([...svg.querySelectorAll('[data-talk-shape]')].map((shape) => (shape as SVGElement).dataset.talkShape)).toEqual(['closed', 'small', 'wide', 'round']);
  });

  it('the talk mood talks unless told not to', () => {
    expect(drawn(render(<Character who="finn" mood="talk" />).container).dataset.mouth).toBe('talking');
    expect(drawn(render(<Character who="finn" mood="talk" talking={false} />).container).dataset.mouth).toBe('smile');
  });

  it('a number opens the mouth that far, and silence leaves the mood its own mouth', () => {
    const mouth = (level: number): string | undefined => drawn(render(<Character who="sprout" talking={level} />).container).dataset.mouth;
    expect(mouth(0)).toBe('smile');
    expect(mouth(0.2)).toBe('small');
    expect(mouth(0.5)).toBe('round');
    expect(mouth(1)).toBe('wide');
  });

  it('mouthFor never opens for silence or nonsense, and grows with loudness', () => {
    expect(mouthFor(0)).toBe('closed');
    expect(mouthFor(Number.NaN)).toBe('closed');
    expect(mouthFor(0.08)).toBe('closed');
    expect(mouthFor(0.29)).toBe('small');
    expect(mouthFor(0.3)).toBe('round');
    expect(mouthFor(0.65)).toBe('wide');
  });

  it('in Calm mode a talking mouth is one small open shape, held', () => {
    calm();
    expect(drawn(render(<Character who="pip" talking />).container).dataset.mouth).toBe('small');
    expect(drawn(render(<Character who="pip" talking={0.9} />).container).dataset.mouth).toBe('small');
    expect(drawn(render(<Character who="pip" talking={0} />).container).dataset.mouth).toBe('smile');
  });

  it('no mood has a frown: every mood rests on a smile, a small mouth or a closed one', () => {
    for (const mood of MOODS) expect(['smile', 'bigSmile', 'small', 'closed']).toContain(MOOD_POSES[mood].mouth);
  });
});

describe('the cast: eyes, arms and size', () => {
  const pupils = (svg: SVGSVGElement): string[] => [...svg.querySelectorAll('[data-part="pupil"]')].map((pupil) => pupil.getAttribute('transform') ?? '');
  const shift = (transform: string): [number, number] => {
    const found = /translate\((-?[\d.]+) (-?[\d.]+)\)/.exec(transform);
    if (!found) throw new Error(`no shift in "${transform}"`);
    return [Number(found[1]), Number(found[2])];
  };

  it('the eyes look straight ahead at rest and up when thinking', () => {
    expect(pupils(drawn(render(<Character who="sprout" />).container)).map(shift)).toEqual([[0, 0], [0, 0]]);
    for (const pupil of pupils(drawn(render(<Character who="sprout" mood="think" />).container))) expect(shift(pupil)[1]).toBeLessThan(0);
  });

  it('both pupils turn toward the point to look at, and the other way when the friend is flipped', () => {
    const right = pupils(drawn(render(<Character who="finn" lookAt={{ x: 500, y: 0 }} />).container)).map(shift);
    expect(right).toHaveLength(2);
    for (const [x] of right) expect(x).toBeGreaterThan(1);
    const down = pupils(drawn(render(<Character who="finn" lookAt={{ x: 0, y: 500 }} />).container)).map(shift);
    for (const [, y] of down) expect(y).toBeGreaterThan(1);
    const flipped = pupils(drawn(render(<Character who="finn" flip lookAt={{ x: 500, y: 0 }} />).container)).map(shift);
    for (const [x] of flipped) expect(x).toBeLessThan(-1);
  });

  it('a pupil never leaves its eye, however far away the point is', () => {
    for (const [x, y] of pupils(drawn(render(<Character who="olive" lookAt={{ x: 90000, y: -90000 }} />).container)).map(shift)) expect(Math.hypot(x, y)).toBeLessThan(3.2);
  });

  it('arms hang out a little at rest, go up to cheer, and one hand goes to the chin to think', () => {
    for (const who of WHO) {
      expect(armAngles(who, 'idle')).toEqual({ left: ARMS[who].rest, right: -ARMS[who].rest });
      expect(armAngles(who, 'cheer')).toEqual({ left: 150, right: -150 });
      expect(armAngles(who, 'think').right).toBe(ARMS[who].chin);
    }
  });

  it('takes a size, a label and a flip', () => {
    const plain = drawn(render(<Character who="pip" />).container);
    expect(plain.dataset.sized).toBeUndefined();
    const svg = drawn(render(<Character who="pip" size={120} label="Pip the ladybug" flip />).container);
    expect(svg.dataset.sized).toBe('');
    expect(svg.style.getPropertyValue('--set-size')).toBe('120');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Pip the ladybug');
    expect(svg.querySelector('g')?.getAttribute('transform')).toContain('scale(-1 1)');
  });
});

describe('the lesson host is Sprout from the cast', () => {
  it('keeps its three moods', () => {
    const host = (mood: 'idle' | 'talking' | 'cheering'): SVGSVGElement => drawn(render(<LessonHost mood={mood} />).container);
    expect(host('idle').dataset.character).toBe('sprout');
    expect(host('idle').dataset.mood).toBe('idle');
    expect(host('talking').dataset.mood).toBe('talk');
    expect(host('talking').dataset.mouth).toBe('talking');
    expect(host('cheering').dataset.mood).toBe('cheer');
    expect(host('cheering').dataset.eyes).toBe('smiling');
  });
});
