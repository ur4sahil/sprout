import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { questionKey } from '../../src/engine/canonical';
import type { Question, QuestionBase, Response, Visual } from '../../src/engine/types';
import ItemView from '../../src/items/ItemView';
import QuestionView from '../../src/items/QuestionView';

// A touch for each kind of question (game feel, phase 2b): what each one shows while the child answers and when
// the answer is right. Movement itself cannot be seen here; these tests check the marks the movement hangs on,
// the sounds, and that none of it changes the answer a question reports.

const played = vi.hoisted(() => ({ sounds: [] as [string, number][] }));
vi.mock('../../src/audio/sounds', async (original) => ({
  ...(await original<typeof import('../../src/audio/sounds')>()),
  playSound: (name: string, step = 0) => {
    played.sounds.push([name, step]);
  },
}));
const sounds = (): string[] => played.sounds.map(([name]) => name);

function base(): QuestionBase {
  const facts = { id: 'x' };
  return { skillId: 'T-1', level: 1, seed: 1, key: questionKey('T-1', 1, facts), facts, mode: 'look', prompt: { text: 'Do it.', speak: ['Do it.'] }, explanation: { speak: ['Like this.'], steps: ['Like this.'] } };
}
const t = (value: string): Visual => ({ kind: 'text', value, size: 'l' });

// Draws the answer area as the child sees it while answering; `markRight()` then draws it as a right answer.
function setup(question: Question) {
  const responses: (Response | null)[] = [];
  const draw = (right: boolean) => <ItemView question={question} disabled={right} right={right} onChange={(r) => responses.push(r)} onSpeak={() => undefined} />;
  const view = render(draw(false));
  return { user: userEvent.setup(), responses, last: (): Response | null => responses[responses.length - 1] ?? null, markRight: () => view.rerender(draw(true)) };
}
const one = (selector: string): Element | null => document.querySelector(selector);
const all = (selector: string): Element[] => [...document.querySelectorAll(selector)];
const tap = (user: ReturnType<typeof userEvent.setup>, selector: string) => user.click(one(selector) as Element);
const turnOf = (el: Element | null): string => (el as HTMLElement | null)?.style.getPropertyValue('--set-turn') ?? '';
const calmOn = (): void => {
  document.documentElement.dataset.calm = '';
};

afterEach(() => {
  played.sounds.length = 0;
  delete document.documentElement.dataset.calm;
  vi.restoreAllMocks();
});

describe('the right signal', () => {
  const question: Question = { ...base(), type: 'choice', options: [t('2'), t('3')], answerIndex: 1 };

  it('is on the question only once the answer is marked right', () => {
    const view = render(<QuestionView question={question} disabled={false} onChange={() => undefined} onSpeak={() => undefined} />);
    expect(one('[data-type="choice"]')?.hasAttribute('data-right')).toBe(false);
    view.rerender(<QuestionView question={question} disabled right onChange={() => undefined} onSpeak={() => undefined} />);
    expect(one('[data-type="choice"]')?.hasAttribute('data-right')).toBe(true);
  });
});

describe('choice', () => {
  const question: Question = { ...base(), type: 'choice', options: [t('2'), t('3'), t('4')], answerIndex: 1 };

  it('the chosen card, and only that one, turns to a tick when right; the answer and labels do not change', async () => {
    const { user, responses, markRight } = setup(question);
    await tap(user, '[data-option="1"]');
    expect(one('[data-tick]')).toBeNull();
    const before = responses.length;
    markRight();
    expect(one('[data-option="1"]')?.hasAttribute('data-right')).toBe(true);
    expect(one('[data-option="1"] [data-tick]')?.getAttribute('aria-hidden')).toBe('true');
    expect(all('[data-tick]')).toHaveLength(1);
    expect(one('[data-option="0"]')?.hasAttribute('data-right')).toBe(false);
    expect(one('[data-option="1"]')?.getAttribute('aria-label')).toBe('3');
    expect(responses).toHaveLength(before);
    expect(sounds()).toEqual([]); // the stage owns the right-answer sound
  });

  it('in Calm mode the tick is still shown, marked so it fades in and does not flip', async () => {
    calmOn();
    const { user, markRight } = setup(question);
    await tap(user, '[data-option="2"]');
    markRight();
    expect(one('[data-option="2"] [data-tick]')?.hasAttribute('data-feel')).toBe(true);
    expect(one('[data-option="2"]')?.hasAttribute('data-feel')).toBe(true);
  });
});

describe('multiSelect', () => {
  const question: Question = { ...base(), type: 'multiSelect', options: [t('a'), t('b'), t('c'), t('d')], answerIndexes: [0, 2] };

  it('pins are numbered in the order picked, while the answer stays in screen order', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-option="2"]');
    await tap(user, '[data-option="0"]');
    expect(one('[data-option="2"] [data-pin]')?.textContent).toBe('1');
    expect(one('[data-option="0"] [data-pin]')?.textContent).toBe('2');
    expect(last()).toEqual({ indexes: [0, 2] });
    // Taking the first one back moves the other up to 1.
    await tap(user, '[data-option="2"]');
    expect(one('[data-option="2"] [data-pin]')).toBeNull();
    expect(one('[data-option="0"] [data-pin]')?.textContent).toBe('1');
    expect(last()).toEqual({ indexes: [0] });
    expect(one('[data-option="0"]')?.getAttribute('aria-label')).toBe('a'); // the pin is not read out
  });

  it('when right, each pin becomes a tick, in pick order', async () => {
    const { user, markRight } = setup(question);
    await tap(user, '[data-option="2"]');
    await tap(user, '[data-option="0"]');
    markRight();
    expect(all('[data-pin]')).toHaveLength(0);
    expect(turnOf(one('[data-option="2"] [data-tick]'))).toBe('0');
    expect(turnOf(one('[data-option="0"] [data-tick]'))).toBe('1');
  });
});

describe('tapCount', () => {
  const question: Question = { ...base(), type: 'tapCount', emoji: '🍎', shown: 5, answer: 3 };

  it('each tapped object shows its number, and the numbers close up when one is taken back', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-object="3"]');
    await tap(user, '[data-object="0"]');
    await tap(user, '[data-object="4"]');
    expect(all('[data-object]').map((el) => el.querySelector('[data-count]')?.textContent ?? '')).toEqual(['2', '', '', '1', '3']);
    await tap(user, '[data-object="3"]');
    expect(all('[data-object]').map((el) => el.querySelector('[data-count]')?.textContent ?? '')).toEqual(['1', '', '', '', '2']);
    expect(last()).toEqual({ count: 2 });
    expect(one('[data-object="0"]')?.getAttribute('aria-label')).toBe('Object 1');
  });

  it('when right, the counted objects line up in counting order and the last number is the total', async () => {
    const { user, markRight } = setup(question);
    for (const index of [3, 0, 4]) await tap(user, `[data-object="${index}"]`);
    expect(one('[data-total]')).toBeNull();
    markRight();
    expect(one('[data-total]')?.textContent).toBe('3');
    expect(one('[data-object="4"] [data-total]')).not.toBeNull();
    expect(one('[data-lined-up]')).not.toBeNull();
    expect(all('[data-object]').map((el) => (el as HTMLElement).style.order)).toEqual(['1', '5', '5', '0', '2']);
  });

  it('in Calm mode nothing changes place', async () => {
    calmOn();
    const { user, markRight } = setup(question);
    for (const index of [3, 0, 4]) await tap(user, `[data-object="${index}"]`);
    markRight();
    expect(one('[data-lined-up]')).toBeNull();
    expect(all('[data-object]').map((el) => (el as HTMLElement).style.order)).toEqual(['', '', '', '', '']);
    expect(one('[data-total]')?.textContent).toBe('3');
  });
});

describe('numberPad', () => {
  const question: Question = { ...base(), type: 'numberPad', answer: 12, maxDigits: 2 };

  it('each key ticks and its digit drops into the box; a key past the limit does neither', async () => {
    const { user, last } = setup(question);
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '3' }));
    expect(sounds()).toEqual(['tick', 'tick']);
    expect(all('[data-display] [data-digit]').map((el) => el.textContent)).toEqual(['1', '2']);
    expect(one('[data-display]')?.textContent).toBe('12');
    expect(last()).toEqual({ value: 12 });
  });

  it('the number glows only when right', async () => {
    const { user, markRight } = setup(question);
    await user.click(screen.getByRole('button', { name: '1' }));
    expect(one('[data-glow]')).toBeNull();
    markRight();
    expect(one('[data-display]')?.hasAttribute('data-glow')).toBe(true);
  });
});

describe('order', () => {
  const question: Question = { ...base(), type: 'order', items: [t('3'), t('1'), t('2')], answerOrder: [1, 2, 0] };

  it('a picked tile leans toward the place it is heading for', async () => {
    const { user } = setup(question);
    await tap(user, '[data-item="1"]'); // first place: it will travel left
    await tap(user, '[data-item="2"]'); // second place: left again
    await tap(user, '[data-item="0"]'); // last place: right
    expect(all('[data-item]').map((el) => el.getAttribute('data-lean'))).toEqual(['1', '-1', '-1']);
  });

  it('when right, the tiles take the order chosen, link up (all but the last) and chug; the answer is untouched', async () => {
    const { user, responses, markRight } = setup(question);
    for (const index of [1, 2, 0]) await tap(user, `[data-item="${index}"]`);
    const before = responses.length;
    markRight();
    expect(all('[data-chug]')).toHaveLength(3);
    expect(all('[data-lean]')).toHaveLength(0);
    expect(all('[data-item]').map((el) => (el as HTMLElement).style.order)).toEqual(['2', '0', '1']);
    expect(one('[data-item="1"]')?.getAttribute('aria-label')).toBe('1, number 1');
    expect(responses).toHaveLength(before);
  });

  it('in Calm mode the tiles stay where they are', async () => {
    calmOn();
    const { user, markRight } = setup(question);
    for (const index of [1, 2, 0]) await tap(user, `[data-item="${index}"]`);
    markRight();
    expect(one('[data-lined-up]')).toBeNull();
    expect(all('[data-item]').map((el) => (el as HTMLElement).style.order)).toEqual(['', '', '']);
  });
});

describe('sort', () => {
  const question: Question = { ...base(), type: 'sort', items: [t('cat'), t('red')], bins: [{ label: 'Animals', speak: ['Animals'] }, { label: 'Colours', speak: ['Colours'] }], answerBin: [0, 1] };

  it('the groups lift only while something is in hand, and a thing dropped in makes the drop sound', async () => {
    const { user, last } = setup(question);
    expect(all('[data-ready]')).toHaveLength(0);
    await tap(user, '[data-item="0"]');
    expect(all('[data-ready]')).toHaveLength(2);
    await tap(user, '[data-bin="0"]');
    expect(all('[data-ready]')).toHaveLength(0);
    expect(sounds()).toEqual(['drop']);
    await tap(user, '[data-bin="1"]'); // empty hands: nothing drops
    expect(sounds()).toEqual(['drop']);
    await tap(user, '[data-item="1"]');
    await tap(user, '[data-bin="1"]');
    expect(last()).toEqual({ bins: [0, 1] });
  });

  it('when right, each group shakes in turn', async () => {
    const { user, markRight } = setup(question);
    await tap(user, '[data-item="0"]');
    await tap(user, '[data-bin="0"]');
    expect(all('[data-happy]')).toHaveLength(0);
    markRight();
    expect(all('[data-happy]').map(turnOf)).toEqual(['0', '1']);
    expect(one('[data-bin="0"]')?.getAttribute('aria-label')).toBe('Animals group');
  });
});

describe('match', () => {
  const question: Question = { ...base(), type: 'match', left: [t('A'), t('B')], right: [t('b'), t('a')], answerPairs: [[0, 1], [1, 0]] };

  it('a held thing shows the thread end; each pair made gets one thread, and an undone pair loses it', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-left="0"]');
    expect(one('[data-left="0"]')?.hasAttribute('data-thread-end')).toBe(true);
    await tap(user, '[data-right="1"]');
    expect(all('[data-thread-end]')).toHaveLength(0);
    expect(all('[data-thread]')).toHaveLength(1);
    await tap(user, '[data-left="1"]');
    await tap(user, '[data-right="0"]');
    expect(all('[data-thread]')).toHaveLength(2);
    expect(last()).toEqual({ pairs: [[0, 1], [1, 0]] });
    await tap(user, '[data-left="0"]');
    expect(all('[data-thread]')).toHaveLength(1);
    expect(last()).toBeNull();
  });

  it('when right, every thread is tied with a bow, one after another, and none before', async () => {
    const { user, markRight } = setup(question);
    await tap(user, '[data-left="0"]');
    await tap(user, '[data-right="1"]');
    await tap(user, '[data-left="1"]');
    await tap(user, '[data-right="0"]');
    expect(all('[data-bow]')).toHaveLength(0);
    markRight();
    expect(all('[data-bow]').map(turnOf)).toEqual(['0', '1']);
    // The threads are a picture: a screen reader is not told about them, and the tiles keep their marks.
    expect(one('[data-threads]')?.getAttribute('aria-hidden')).toBe('true');
    expect(one('[data-right="1"]')?.getAttribute('aria-label')).toBe('a, pair 1');
  });
});

describe('tiles', () => {
  const question: Question = { ...base(), type: 'tiles', slots: 3, bank: ['t', 'a', 'c', 'x'], answer: 'cat' };

  it('a tile clicks in with the drop sound, and only a tile sent back slides home', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-tile="2"]');
    await tap(user, '[data-tile="3"]');
    expect(sounds()).toEqual(['drop', 'drop']);
    expect(one('[data-slot="1"] [data-dropped]')?.textContent).toBe('x');
    expect(all('[data-back]')).toHaveLength(0);
    await tap(user, '[data-slot="1"]');
    expect(all('[data-back]').map((el) => el.getAttribute('data-tile'))).toEqual(['3']);
    await tap(user, '[data-tile="1"]');
    expect(all('[data-back]')).toHaveLength(0);
    await tap(user, '[data-tile="0"]');
    expect(last()).toEqual({ tiles: ['c', 'a', 't'] });
  });

  it('when right, the letters light in turn from the first', async () => {
    const { user, markRight } = setup(question);
    for (const index of [2, 1, 0]) await tap(user, `[data-tile="${index}"]`);
    expect(all('[data-light]')).toHaveLength(0);
    markRight();
    expect(all('[data-light]').map(turnOf)).toEqual(['0', '1', '2']);
    expect(one('[data-slot="0"]')?.getAttribute('aria-label')).toBe('c, in blank 1. Tap to take out');
  });
});

describe('numberLineTap', () => {
  const question: Question = { ...base(), type: 'numberLineTap', line: { min: 0, max: 20, step: 1 }, answer: 12 };
  // jsdom cannot animate, so the hop is watched through a stand-in.
  function watchHops() {
    const hops: Keyframe[][] = [];
    const proto = SVGElement.prototype as unknown as { animate?: unknown };
    proto.animate = function animate(frames: Keyframe[]) {
      hops.push(frames);
      return { cancel: () => undefined };
    };
    return { hops, done: () => delete proto.animate };
  }

  it('the frog sits on the marker and hops from the old mark to the new one', async () => {
    const watch = watchHops();
    const { user, last } = setup(question);
    expect(one('[data-hopper]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    expect(one('[data-hopper]')?.getAttribute('data-hopper')).toBe('10');
    expect(watch.hops).toHaveLength(0); // it appears; there is nowhere to hop from yet
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    expect(watch.hops).toHaveLength(1);
    expect(one('[data-hopper]')?.getAttribute('data-hopper')).toBe('11');
    expect(one('[data-hopper]')?.getAttribute('aria-hidden')).toBe('true');
    expect(one('[data-marker]')).not.toBeNull();
    expect(last()).toEqual({ value: 11 });
    watch.done();
  });

  it('in Calm mode the frog moves without a hop', async () => {
    calmOn();
    const watch = watchHops();
    const { user } = setup(question);
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    expect(one('[data-hopper]')?.getAttribute('data-hopper')).toBe('11');
    expect(watch.hops).toHaveLength(0);
    watch.done();
  });

  it('the number under the frog is written only when the answer is right', async () => {
    const { user, markRight } = setup(question);
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    expect(one('[data-lit]')).toBeNull();
    expect(all('[data-mark] text').map((el) => el.textContent)).not.toContain('12');
    expect(one('[data-landed]')).toBeNull();
    markRight();
    expect(one('[data-lit]')?.textContent).toBe('12');
    expect(one('[data-landed]')).not.toBeNull();
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('A mark is chosen');
  });
});

describe('setClock', () => {
  const question: Question = { ...base(), type: 'setClock', start: { hour: 12, minute: 0 }, minuteStep: 5, answer: { hour: 1, minute: 5 } };

  it('each step of a hand ticks, and the clock chimes once when right', async () => {
    const { user, last, markRight } = setup(question);
    await user.click(screen.getByRole('button', { name: 'Hour on' }));
    await user.click(screen.getByRole('button', { name: 'Minutes on' }));
    expect(sounds()).toEqual(['tick', 'tick']);
    expect(last()).toEqual({ time: { hour: 1, minute: 5 } });
    expect(one('[data-chimed]')).toBeNull();
    markRight();
    markRight();
    expect(sounds()).toEqual(['tick', 'tick', 'star']);
    expect(one('[data-set-clock]')?.hasAttribute('data-chimed')).toBe(true);
  });
});

describe('buildBar', () => {
  const question: Question = { ...base(), type: 'buildBar', categories: [{ label: 'cats', emoji: '🐱' }, { label: 'dogs', emoji: '🐶' }, { label: 'fish', emoji: '🐟' }], max: 5, answer: [3, 1, 2] };

  it('a bar rises with a pop that climbs as it grows; lowering makes none', async () => {
    const { user } = setup(question);
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: 'cats: raise' }));
    await user.click(screen.getByRole('button', { name: 'cats: lower' }));
    expect(played.sounds).toEqual([['pop', 0], ['pop', 1], ['pop', 2]]);
  });

  it('when right, the bars wave from the shortest to the tallest', async () => {
    const { user, last, markRight } = setup(question);
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: 'cats: raise' }));
    await user.click(screen.getByRole('button', { name: 'dogs: raise' }));
    for (let i = 0; i < 2; i += 1) await user.click(screen.getByRole('button', { name: 'fish: raise' }));
    expect(all('[data-wave]')).toHaveLength(0);
    markRight();
    // cats is tallest, so it goes last; dogs is shortest, so it goes first.
    expect(all('[data-bar]').map((row) => row.querySelector('[data-wave]')?.getAttribute('data-wave'))).toEqual(['3', '1', '2']);
    expect(last()).toEqual({ values: [3, 1, 2] });
    expect(screen.getByRole('img', { name: 'cats: 3' })).toBeTruthy();
  });
});

describe('columnSum', () => {
  const question: Question = { ...base(), type: 'columnSum', top: 36, bottom: 8, op: '+', answer: 44 };

  it('a carry mark hops in when written; when right, the line runs under the digits from the left', async () => {
    const { user, last, markRight } = setup(question);
    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: '4' }));
    expect(one('[data-carried]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Carry mark, column 2' }));
    expect(one('[data-carried]')?.textContent).toBe('1');
    expect(last()).toEqual({ value: 44 });
    expect(all('[data-underline]')).toHaveLength(0);
    markRight();
    // Three boxes (a sum may spill into a new column); only the two with digits are underlined.
    expect(all('[data-box]')).toHaveLength(3);
    expect(all('[data-underline]').map((el) => el.getAttribute('data-box'))).toEqual(['1', '2']);
    expect(all('[data-underline]').map(turnOf)).toEqual(['0', '1']);
    expect(screen.getByRole('button', { name: 'Answer, column 1: 4' })).toBeTruthy();
  });
});

describe('dragWord', () => {
  const question: Question = { ...base(), type: 'dragWord', before: 'The dog', after: 'very fast.', options: [t('run'), t('runs')], answerIndex: 1 };

  it('the gap opens while a dragged word is near it, and closes when the word is let go', () => {
    setup(question);
    const gap = one('[data-gap]') as HTMLElement;
    gap.getBoundingClientRect = () => ({ left: 100, right: 200, top: 0, bottom: 60, width: 100, height: 60, x: 100, y: 0, toJSON: () => ({}) });
    const word = screen.getByRole('button', { name: 'runs' });
    fireEvent.pointerDown(word, { clientX: 150, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(word, { clientX: 150, clientY: 300, pointerId: 1 });
    expect(gap.hasAttribute('data-near')).toBe(false);
    fireEvent.pointerMove(word, { clientX: 170, clientY: 100, pointerId: 1 });
    expect(gap.hasAttribute('data-near')).toBe(true);
    fireEvent.pointerUp(word, { clientX: 170, clientY: 100, pointerId: 1 });
    expect(gap.hasAttribute('data-near')).toBe(false);
  });

  it('when right, the sentence glows word by word from the left, and reads exactly as before', async () => {
    const { user, markRight } = setup(question);
    const line = (): string => (one('[data-gap]')?.parentElement?.textContent ?? '').replace(/\s+/g, ' ');
    await user.click(screen.getByRole('button', { name: 'runs' }));
    expect(sounds()).toEqual(['drop']);
    const before = line();
    expect(all('[data-glow-word]')).toHaveLength(0);
    markRight();
    expect(all('[data-glow-word]').map((el) => el.textContent)).toEqual(['The', 'dog', 'very', 'fast.']);
    // The gap takes its turn between "dog" and "very".
    expect(all('[data-glow-word]').map(turnOf)).toEqual(['0', '1', '3', '4']);
    expect(turnOf(one('[data-gap]'))).toBe('2');
    expect(line()).toBe(before);
  });
});

describe('fillShape', () => {
  const question: Question = { ...base(), type: 'fillShape', figure: 'square-2tri', odd: true, answer: 2 };

  it('a piece that fits lands with the drop sound, one that does not makes none; the shape turns only when right', async () => {
    const { user, last, markRight } = setup(question);
    await user.click(screen.getByRole('button', { name: 'A different triangle' }));
    await user.click(screen.getByRole('button', { name: 'Empty spot 1' }));
    expect(sounds()).toEqual([]);
    await user.click(screen.getAllByRole('button', { name: 'A triangle' })[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Empty spot 1' }));
    await user.click(screen.getAllByRole('button', { name: 'A triangle' })[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Empty spot 2' }));
    expect(sounds()).toEqual(['drop', 'drop']);
    expect(last()).toEqual({ value: 2 });
    expect(one('[data-turned]')).toBeNull();
    markRight();
    expect(one('[data-turned]')).not.toBeNull();
    expect(one('[data-fill-count]')?.getAttribute('data-fill-count')).toBe('2');
  });
});

describe('every kind of question', () => {
  const kinds: Question[] = [
    { ...base(), type: 'choice', options: [t('2'), t('3')], answerIndex: 1 },
    { ...base(), type: 'multiSelect', options: [t('a'), t('b')], answerIndexes: [0] },
    { ...base(), type: 'tapCount', emoji: '🍎', shown: 3, answer: 2 },
    { ...base(), type: 'numberPad', answer: 4, maxDigits: 1 },
    { ...base(), type: 'order', items: [t('2'), t('1')], answerOrder: [1, 0] },
    { ...base(), type: 'sort', items: [t('cat')], bins: [{ label: 'Animals', speak: ['Animals'] }, { label: 'Colours', speak: ['Colours'] }], answerBin: [0] },
    { ...base(), type: 'match', left: [t('A')], right: [t('a')], answerPairs: [[0, 0]] },
    { ...base(), type: 'tiles', slots: 2, bank: ['g', 'o'], answer: 'go' },
    { ...base(), type: 'numberLineTap', line: { min: 0, max: 10, step: 1 }, answer: 4 },
    { ...base(), type: 'setClock', start: { hour: 12, minute: 0 }, minuteStep: 5, answer: { hour: 3, minute: 0 } },
    { ...base(), type: 'buildBar', categories: [{ label: 'cats', emoji: '🐱' }], max: 5, answer: [2] },
    { ...base(), type: 'columnSum', top: 12, bottom: 5, op: '+', answer: 17 },
    { ...base(), type: 'dragWord', before: 'I', after: 'fast.', options: [t('run'), t('runs')], answerIndex: 0 },
    { ...base(), type: 'fillShape', figure: 'square-2tri', odd: false, answer: 2 },
  ];

  it.each(kinds.map((question) => [question.type, question] as const))('%s draws as a right answer, in ordinary and Calm mode, without reporting a new answer', (_type, question) => {
    for (const calm of [false, true]) {
      if (calm) calmOn();
      const { responses, markRight } = setup(question);
      const before = responses.length;
      markRight();
      expect(responses).toHaveLength(before);
      cleanup();
    }
  });
});
