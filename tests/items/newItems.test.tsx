import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { questionKey } from '../../src/engine/canonical';
import { check } from '../../src/engine/check';
import { describeAnswer, describeResponse } from '../../src/engine/describe';
import type { Question, QuestionBase, Response, Visual } from '../../src/engine/types';
import { validateQuestion } from '../../src/engine/validate';
import ItemView from '../../src/items/ItemView';

// The five question types of plan section 15.4.

function base(): QuestionBase {
  const facts = { id: 'x' };
  return { skillId: 'T-1', level: 1, seed: 1, key: questionKey('T-1', 1, facts), facts, mode: 'look', prompt: { text: 'Do it.', speak: ['Do it.'] }, explanation: { speak: ['Like this.'], steps: ['Like this.'] } };
}
const word = (value: string): Visual => ({ kind: 'text', value, size: 'l' });

function setup(question: Question, disabled = false) {
  const responses: (Response | null)[] = [];
  render(<ItemView question={question} disabled={disabled} onChange={(r) => responses.push(r)} onSpeak={() => undefined} />);
  return { user: userEvent.setup(), last: (): Response | null => responses[responses.length - 1] ?? null, responses };
}

describe('numberLineTap', () => {
  const question: Question = { ...base(), type: 'numberLineTap', line: { min: 0, max: 4, step: 1, denominator: 4 }, answer: 3 };

  it('is valid, and is checked by the mark chosen', () => {
    expect(validateQuestion(question)).toEqual([]);
    expect(check(question, { value: 3 })).toBe(true);
    expect(check(question, { value: 2 })).toBe(false);
    expect(describeAnswer(question)).toBe('3/4');
    expect(describeResponse(question, { value: 2 })).toBe('2/4');
    expect(validateQuestion({ ...question, answer: 5 })).toContain('17: the answer must be a mark on the line');
  });

  it('the arrows move the dot one mark at a time, and its number is never shown', async () => {
    const { user, last } = setup(question);
    expect(last()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    expect(last()).toEqual({ value: 2 });
    await user.click(screen.getByRole('button', { name: 'Move right' }));
    expect(last()).toEqual({ value: 3 });
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('A mark is chosen');
    // Only the ends and the whole are labelled: 0 and 1.
    expect([...document.querySelectorAll('[data-mark] text')].map((text) => text.textContent)).toEqual(['0', '1']);
  });

  it('a tap on the line picks the nearest mark', () => {
    const { last } = setup(question);
    const line = screen.getByRole('slider');
    line.getBoundingClientRect = () => ({ left: 0, width: 320, top: 0, height: 70, right: 320, bottom: 70, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(line, { clientX: 20 + 0.75 * 280 + 4 });
    expect(last()).toEqual({ value: 3 });
  });
});

describe('setClock', () => {
  const question: Question = { ...base(), type: 'setClock', start: { hour: 12, minute: 0 }, minuteStep: 5, answer: { hour: 3, minute: 45 } };

  it('is valid, and is checked by both hands', () => {
    expect(validateQuestion(question)).toEqual([]);
    expect(check(question, { time: { hour: 3, minute: 45 } })).toBe(true);
    expect(check(question, { time: { hour: 4, minute: 45 } })).toBe(false);
    expect(describeAnswer(question)).toBe('3:45');
    expect(validateQuestion({ ...question, answer: { hour: 3, minute: 47 } })).toContain('17: the times must be clock times on the minute step');
    expect(validateQuestion({ ...question, answer: { hour: 12, minute: 0 } })).toContain('17: the hands must not start at the answer');
  });

  it('the buttons turn the hands, and going back past the 12 takes the hour back', async () => {
    const { user, last } = setup(question);
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: 'Hour on' }));
    expect(last()).toEqual({ time: { hour: 3, minute: 0 } });
    await user.click(screen.getByRole('button', { name: 'Minutes back' }));
    expect(last()).toEqual({ time: { hour: 2, minute: 55 } });
    await user.click(screen.getByRole('button', { name: 'Minutes on' }));
    expect(last()).toEqual({ time: { hour: 3, minute: 0 } });
    expect(document.querySelector('[data-set-clock]')?.getAttribute('data-set-clock')).toBe('3:00');
  });
});

describe('buildBar', () => {
  const question: Question = { ...base(), type: 'buildBar', categories: [{ label: 'cats', emoji: '🐱' }, { label: 'dogs', emoji: '🐶' }], max: 10, scale: 2, answer: [4, 6] };

  it('is valid, and is checked bar by bar', () => {
    expect(validateQuestion(question)).toEqual([]);
    expect(check(question, { values: [4, 6] })).toBe(true);
    expect(check(question, { values: [6, 4] })).toBe(false);
    expect(validateQuestion({ ...question, answer: [3, 6] })).toContain('17: each value must be a step of the scale, from 0 to max');
  });

  it('raise and lower move a bar by one step of the scale', async () => {
    const { user, last } = setup(question);
    await user.click(screen.getByRole('button', { name: 'cats: raise' }));
    await user.click(screen.getByRole('button', { name: 'cats: raise' }));
    await user.click(screen.getByRole('button', { name: 'dogs: raise' }));
    expect(last()).toEqual({ values: [4, 2] });
    await user.click(screen.getByRole('button', { name: 'cats: lower' }));
    expect(last()).toEqual({ values: [2, 2] });
    expect(screen.getByText('Each block is 2.')).toBeTruthy();
  });
});

describe('columnSum', () => {
  const question: Question = { ...base(), type: 'columnSum', top: 436, bottom: 278, op: '+', answer: 714 };

  it('is valid, and checks only the answer row', () => {
    expect(validateQuestion(question)).toEqual([]);
    expect(check(question, { value: 714 })).toBe(true);
    expect(validateQuestion({ ...question, answer: 704 })).toContain('17: the answer must be the sum or difference, zero or more');
  });

  it('digits go in from the ones box leftwards, carry marks can be written, and a gap gives no answer', async () => {
    const { user, last } = setup(question);
    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '7' }));
    expect(last()).toEqual({ value: 714 });
    await user.click(screen.getByRole('button', { name: 'Carry mark, column 2' }));
    expect(screen.getByRole('button', { name: 'Carry mark, column 2' }).getAttribute('aria-pressed')).toBe('true');
    // Clear the tens: the answer has a gap, so there is none.
    await user.click(screen.getByRole('button', { name: /^Answer, column 2/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(last()).toBeNull();
  });
});

describe('dragWord', () => {
  const question: Question = { ...base(), facts: { id: 'x', options: ['run', 'runs', 'ran'] }, key: questionKey('T-1', 1, { id: 'x', options: ['run', 'runs', 'ran'] }), type: 'dragWord', before: 'The dog', after: 'fast.', options: [word('run'), word('runs'), word('ran')], answerIndex: 1 };

  it('is valid, and is checked by the word in the gap', () => {
    expect(validateQuestion(question)).toEqual([]);
    expect(check(question, { index: 1 })).toBe(true);
    expect(describeAnswer(question)).toBe('runs');
  });

  it('a tap puts a word in the gap, and a tap on the gap takes it out', async () => {
    const { user, last } = setup(question);
    await user.click(screen.getByRole('button', { name: 'runs' }));
    expect(last()).toEqual({ index: 1 });
    expect(document.querySelector('[data-gap]')?.getAttribute('data-gap')).toBe('1');
    await user.click(screen.getByRole('button', { name: /^Gap: runs/ }));
    expect(last()).toBeNull();
  });

  it('a drag that ends on the gap places the word; one that ends elsewhere does not', () => {
    const { last, responses } = setup(question);
    const gap = document.querySelector('[data-gap]') as HTMLElement;
    gap.getBoundingClientRect = () => ({ left: 100, right: 200, top: 0, bottom: 60, width: 100, height: 60, x: 100, y: 0, toJSON: () => ({}) });
    const ran = screen.getByRole('button', { name: 'ran' });
    fireEvent.pointerDown(ran, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(ran, { clientX: 300, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(ran, { clientX: 300, clientY: 300, pointerId: 1 });
    expect(responses).toEqual([]);
    fireEvent.pointerDown(ran, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(ran, { clientX: 150, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(ran, { clientX: 150, clientY: 30, pointerId: 1 });
    expect(last()).toEqual({ index: 2 });
  });
});

describe('fillShape', () => {
  const question: Question = { ...base(), type: 'fillShape', figure: 'square-2tri', odd: true, answer: 2 };

  it('is valid, and is answered by how many pieces were placed', () => {
    expect(validateQuestion(question)).toEqual([]);
    expect(validateQuestion({ ...question, answer: 3 })).toContain('17: the answer must be the number of pieces that fill the figure');
    expect(check(question, { value: 2 })).toBe(true);
    expect(check(question, { value: 1 })).toBe(false);
    expect(describeAnswer(question)).toBe('2');
    expect(describeResponse(question, { value: 1 })).toBe('1');
  });

  it('a piece tapped and then a spot tapped fills the spot; a filled spot tapped empties it', async () => {
    const { user, last } = setup(question);
    expect(screen.getAllByRole('button', { name: 'A triangle' })).toHaveLength(3); // one more than it takes
    await user.click(screen.getAllByRole('button', { name: 'A triangle' })[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Empty spot 1' }));
    expect(last()).toEqual({ value: 1 });
    await user.click(screen.getAllByRole('button', { name: 'A triangle' })[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Empty spot 2' }));
    expect(last()).toEqual({ value: 2 });
    expect(document.querySelector('[data-fill-count]')?.getAttribute('data-fill-count')).toBe('2');
    await user.click(screen.getByRole('button', { name: /triangle in spot 1/ }));
    expect(last()).toEqual({ value: 1 });
  });

  it('the piece that does not fit never fills a spot: it shakes and stays in the tray', async () => {
    const { user, responses } = setup(question);
    await user.click(screen.getByRole('button', { name: 'A different triangle' }));
    await user.click(screen.getByRole('button', { name: 'Empty spot 1' }));
    expect(responses.filter((r) => r !== null)).toEqual([]);
    expect(document.querySelector('[data-bounced]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'A different triangle' })).toBeTruthy();
  });
});
