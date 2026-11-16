import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { generateQuestion } from '../../src/content/registry';
import { questionKey } from '../../src/engine/canonical';
import { check } from '../../src/engine/check';
import type { Question, QuestionBase, Response, Say, Visual } from '../../src/engine/types';
import ItemView from '../../src/items/ItemView';
import QuestionView from '../../src/items/QuestionView';

const t = (value: string, speak?: Say): Visual => (speak ? { kind: 'text', value, size: 'l', speak } : { kind: 'text', value, size: 'l' });

function base(change: Partial<QuestionBase> = {}): QuestionBase {
  const facts = change.facts ?? { id: 'x' };
  return {
    skillId: 'T-1',
    level: 1,
    seed: 1,
    key: questionKey('T-1', 1, facts),
    facts,
    mode: 'look',
    prompt: { text: 'Pick one.', speak: ['Pick one.'] },
    explanation: { speak: ['This one.'], steps: ['This one.'] },
    ...change,
  };
}

function setup(question: Question, disabled = false) {
  const responses: (Response | null)[] = [];
  const spoken: Say[] = [];
  const view = render(<ItemView question={question} disabled={disabled} onChange={(r) => responses.push(r)} onSpeak={(say) => spoken.push(say)} />);
  const last = (): Response | null => responses[responses.length - 1] ?? null;
  return { user: userEvent.setup(), responses, spoken, last, view };
}

const tap = (user: ReturnType<typeof userEvent.setup>, selector: string) => user.click(document.querySelector(selector) as Element);

describe('ChoiceItem', () => {
  const question: Question = { ...base(), type: 'choice', options: [t('2', [{ number: 2 }]), t('3', [{ number: 3 }]), t('4', [{ number: 4 }])], answerIndex: 1 };

  it('a tap gives that option as the response, and the latest tap wins', async () => {
    const { user, last } = setup(question);
    expect(last()).toBeNull();
    await tap(user, '[data-option="0"]');
    expect(last()).toEqual({ index: 0 });
    expect(check(question, last() as Response)).toBe(false);
    await tap(user, '[data-option="1"]');
    expect(last()).toEqual({ index: 1 });
    expect(check(question, last() as Response)).toBe(true);
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
  });

  it('says an option\'s label when it is tapped', async () => {
    const { user, spoken } = setup(question);
    await tap(user, '[data-option="2"]');
    expect(spoken).toEqual([[{ number: 4 }]]);
  });

  it('every option is a button a child can find by what it shows', () => {
    setup(question);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['2', '3', '4']);
  });

  it('does nothing once locked', async () => {
    const { user, responses, spoken } = setup(question, true);
    await tap(user, '[data-option="1"]');
    expect(responses).toEqual([]);
    expect(spoken).toEqual([]);
    expect(screen.getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe('MultiSelectItem', () => {
  const question: Question = { ...base(), type: 'multiSelect', options: [t('a'), t('b'), t('c'), t('d')], answerIndexes: [0, 2] };

  it('collects every tapped option, in any order, and lets one be taken back', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-option="2"]');
    await tap(user, '[data-option="0"]');
    expect(last()).toEqual({ indexes: [0, 2] });
    expect(check(question, last() as Response)).toBe(true);
    await tap(user, '[data-option="3"]');
    expect(last()).toEqual({ indexes: [0, 2, 3] });
    expect(check(question, last() as Response)).toBe(false);
    await tap(user, '[data-option="3"]');
    expect(last()).toEqual({ indexes: [0, 2] });
  });

  it('has no answer when everything is taken back', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-option="1"]');
    await tap(user, '[data-option="1"]');
    expect(last()).toBeNull();
  });
});

describe('TapCountItem', () => {
  const question: Question = { ...base(), type: 'tapCount', emoji: '🍎', shown: 6, answer: 3 };

  it('shows that many objects and counts the ones tapped', async () => {
    const { user, last } = setup(question);
    expect(document.querySelectorAll('[data-object]')).toHaveLength(6);
    await tap(user, '[data-object="0"]');
    await tap(user, '[data-object="4"]');
    expect(last()).toEqual({ count: 2 });
    await tap(user, '[data-object="5"]');
    expect(last()).toEqual({ count: 3 });
    expect(check(question, last() as Response)).toBe(true);
  });

  it('tapping an object again takes it back', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-object="1"]');
    await tap(user, '[data-object="2"]');
    await tap(user, '[data-object="1"]');
    expect(last()).toEqual({ count: 1 });
    await tap(user, '[data-object="2"]');
    expect(last()).toBeNull();
  });

  it('cannot count more than are shown', async () => {
    const { user, last } = setup(question);
    for (let i = 0; i < 6; i += 1) await tap(user, `[data-object="${i}"]`);
    expect(last()).toEqual({ count: 6 });
  });
});

describe('NumberPadItem', () => {
  const question: Question = { ...base(), type: 'numberPad', answer: 12, maxDigits: 2 };
  const press = (user: ReturnType<typeof userEvent.setup>, name: string) => user.click(screen.getByRole('button', { name }));

  it('builds a number from the keys', async () => {
    const { user, last } = setup(question);
    await press(user, '1');
    expect(last()).toEqual({ value: 1 });
    await press(user, '2');
    expect(last()).toEqual({ value: 12 });
    expect(check(question, last() as Response)).toBe(true);
    expect(document.querySelector('[data-display]')?.textContent).toBe('12');
  });

  it('stops at maxDigits', async () => {
    const { user, last } = setup(question);
    await press(user, '1');
    await press(user, '2');
    await press(user, '3');
    expect(last()).toEqual({ value: 12 });
  });

  it('Delete removes the last digit, and an empty pad has no answer', async () => {
    const { user, last } = setup(question);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveProperty('disabled', true);
    await press(user, '4');
    await press(user, '7');
    await press(user, 'Delete');
    expect(last()).toEqual({ value: 4 });
    await press(user, 'Delete');
    expect(last()).toBeNull();
  });

  it('can type zero, and a leading zero is replaced', async () => {
    const { user, last } = setup({ ...question, answer: 0 });
    await press(user, '0');
    expect(last()).toEqual({ value: 0 });
    await press(user, '7');
    expect(last()).toEqual({ value: 7 });
    expect(document.querySelector('[data-display]')?.textContent).toBe('7');
  });

  it('has all ten digits and never a text field that would open the keyboard', () => {
    setup(question);
    for (const digit of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) expect(screen.getByRole('button', { name: digit })).toBeTruthy();
    expect(document.querySelectorAll('input, textarea')).toHaveLength(0);
  });
});

describe('OrderItem', () => {
  const question: Question = { ...base(), type: 'order', items: [t('3'), t('1'), t('2')], answerOrder: [1, 2, 0] };

  it('gives the order the items were tapped in, once all are tapped', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-item="1"]');
    expect(last()).toBeNull();
    await tap(user, '[data-item="2"]');
    expect(last()).toBeNull();
    await tap(user, '[data-item="0"]');
    expect(last()).toEqual({ order: [1, 2, 0] });
    expect(check(question, last() as Response)).toBe(true);
    expect([...document.querySelectorAll('[data-place]')].map((el) => el.textContent)).toEqual(['3', '1', '2']);
  });

  it('tapping an item again undoes it, and the later ones move up', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-item="0"]');
    await tap(user, '[data-item="1"]');
    await tap(user, '[data-item="2"]');
    expect(last()).toEqual({ order: [0, 1, 2] });
    await tap(user, '[data-item="0"]');
    expect(last()).toBeNull();
    await tap(user, '[data-item="0"]');
    expect(last()).toEqual({ order: [1, 2, 0] });
  });
});

describe('SortItem', () => {
  const question: Question = {
    ...base(),
    type: 'sort',
    items: [t('cat'), t('red'), t('dog')],
    bins: [
      { label: 'Animals', speak: ['Animals'] },
      { label: 'Colours', speak: ['Colours'] },
    ],
    answerBin: [0, 1, 0],
  };

  it('tap an item, then a bin: the response gives a bin for every item', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-item="0"]');
    await tap(user, '[data-bin="0"]');
    expect(last()).toBeNull();
    await tap(user, '[data-item="1"]');
    await tap(user, '[data-bin="1"]');
    await tap(user, '[data-item="2"]');
    await tap(user, '[data-bin="0"]');
    expect(last()).toEqual({ bins: [0, 1, 0] });
    expect(check(question, last() as Response)).toBe(true);
    expect(document.querySelectorAll('[data-bin="0"] [data-placed]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-item]')).toHaveLength(0);
  });

  it('tapping a bin with nothing held does nothing', async () => {
    const { user, responses } = setup(question);
    await tap(user, '[data-bin="0"]');
    expect(responses).toEqual([]);
  });

  it('an item in a bin can be taken back out and put somewhere else', async () => {
    const { user, last } = setup(question);
    for (const [item, bin] of [[0, 1], [1, 1], [2, 0]]) {
      await tap(user, `[data-item="${item}"]`);
      await tap(user, `[data-bin="${bin}"]`);
    }
    expect(last()).toEqual({ bins: [1, 1, 0] });
    await tap(user, '[data-placed="0"]');
    expect(last()).toBeNull();
    await tap(user, '[data-item="0"]');
    await tap(user, '[data-bin="0"]');
    expect(last()).toEqual({ bins: [0, 1, 0] });
  });

  it('with an item in hand, a tap on a picture already in a group drops the item there, and takes nothing out', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-item="0"]');
    await tap(user, '[data-bin="0"]');
    await tap(user, '[data-item="2"]');
    // A small finger lands on the cat that is already in the group, not on the empty part of the box.
    await tap(user, '[data-placed="0"]');
    expect(document.querySelectorAll('[data-bin="0"] [data-placed]')).toHaveLength(2);
    await tap(user, '[data-item="1"]');
    await tap(user, '[data-bin="1"]');
    expect(last()).toEqual({ bins: [0, 1, 0] });
  });

  it('tapping the held item again puts it down', async () => {
    const { user, responses } = setup(question);
    await tap(user, '[data-item="0"]');
    await tap(user, '[data-item="0"]');
    await tap(user, '[data-bin="1"]');
    expect(responses).toEqual([]);
  });
});

describe('MatchItem', () => {
  const question: Question = {
    ...base(),
    type: 'match',
    left: [t('A'), t('B'), t('C')],
    right: [t('c'), t('a'), t('b')],
    answerPairs: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  };

  it('tap a left item, then its partner: the response lists every pair', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-left="0"]');
    await tap(user, '[data-right="1"]');
    expect(last()).toBeNull();
    await tap(user, '[data-left="2"]');
    await tap(user, '[data-right="0"]');
    await tap(user, '[data-left="1"]');
    await tap(user, '[data-right="2"]');
    expect(last()).toEqual({ pairs: [[0, 1], [2, 0], [1, 2]] });
    expect(check(question, last() as Response)).toBe(true);
  });

  it('tapping the right side first does nothing', async () => {
    const { user, responses } = setup(question);
    await tap(user, '[data-right="1"]');
    expect(responses).toEqual([]);
  });

  it('a pair can be undone from either side, and no item ends up in two pairs', async () => {
    const { user, last } = setup(question);
    for (const [l, r] of [[0, 0], [1, 1], [2, 2]]) {
      await tap(user, `[data-left="${l}"]`);
      await tap(user, `[data-right="${r}"]`);
    }
    expect(last()).toEqual({ pairs: [[0, 0], [1, 1], [2, 2]] });
    await tap(user, '[data-right="0"]'); // undo the first pair from the right
    expect(last()).toBeNull();
    await tap(user, '[data-left="1"]'); // undo the second pair from the left
    await tap(user, '[data-left="0"]');
    await tap(user, '[data-right="1"]');
    await tap(user, '[data-left="1"]');
    await tap(user, '[data-right="0"]');
    const pairs = (last() as { pairs: [number, number][] }).pairs;
    expect(pairs).toHaveLength(3);
    expect(new Set(pairs.map(([l]) => l)).size).toBe(3);
    expect(new Set(pairs.map(([, r]) => r)).size).toBe(3);
  });
});

describe('TilesItem', () => {
  const question: Question = { ...base(), type: 'tiles', slots: 3, bank: ['t', 'a', 'c', 'x', 'o'], answer: 'cat' };

  it('tapped tiles fill the blanks left to right, and the response is the tiles in order', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-tile="2"]');
    await tap(user, '[data-tile="1"]');
    expect(last()).toBeNull();
    await tap(user, '[data-tile="0"]');
    expect(last()).toEqual({ tiles: ['c', 'a', 't'] });
    expect(check(question, last() as Response)).toBe(true);
    expect([...document.querySelectorAll('[data-slot]')].map((el) => el.textContent)).toEqual(['c', 'a', 't']);
  });

  it('a tile can be used once, and no more tiles go in when the blanks are full', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-tile="2"]');
    expect(document.querySelector('[data-tile="2"]')).toHaveProperty('disabled', true);
    await tap(user, '[data-tile="1"]');
    await tap(user, '[data-tile="0"]');
    await tap(user, '[data-tile="3"]');
    expect(last()).toEqual({ tiles: ['c', 'a', 't'] });
  });

  it('tapping a filled blank sends its tile back, and the next tile fills that blank', async () => {
    const { user, last } = setup(question);
    await tap(user, '[data-tile="2"]');
    await tap(user, '[data-tile="4"]'); // o, a mistake
    await tap(user, '[data-tile="0"]');
    expect(last()).toEqual({ tiles: ['c', 'o', 't'] });
    await tap(user, '[data-slot="1"]');
    expect(last()).toBeNull();
    expect(document.querySelector('[data-tile="4"]')).toHaveProperty('disabled', false);
    await tap(user, '[data-tile="1"]');
    expect(last()).toEqual({ tiles: ['c', 'a', 't'] });
  });

  it('two tiles with the same letter are two separate tiles', async () => {
    const see: Question = { ...base(), type: 'tiles', slots: 3, bank: ['e', 's', 'e', 'a', 'x'], answer: 'see' };
    const { user, last } = setup(see);
    await tap(user, '[data-tile="1"]');
    await tap(user, '[data-tile="0"]');
    await tap(user, '[data-tile="2"]');
    expect(last()).toEqual({ tiles: ['s', 'e', 'e'] });
    expect(check(see, last() as Response)).toBe(true);
  });
});

describe('the three modes', () => {
  const listen: Question = {
    ...base({ mode: 'listen', facts: { target: 'B', options: ['B', 'M'] }, prompt: { text: 'Find the letter.', speak: ['Find the letter', { letter: 'B' }] } }),
    type: 'choice',
    // Even if a label slipped through, a listen question must not say it.
    options: [t('B', [{ letter: 'B' }]), t('M', [{ letter: 'M' }])],
    answerIndex: 0,
  };

  function show(question: Question) {
    const spoken: Say[] = [];
    render(<QuestionView question={question} disabled={false} onChange={() => undefined} onSpeak={(say) => spoken.push(say)} />);
    return { user: userEvent.setup(), spoken };
  }

  it('a listen question shows no target, and its options do not speak', async () => {
    const { user, spoken } = show(listen);
    expect(screen.getByText('Find the letter.')).toBeTruthy();
    expect(document.querySelector('p')?.textContent).not.toContain('B');
    await tap(user, '[data-option="0"]');
    await tap(user, '[data-option="1"]');
    expect(spoken).toEqual([]);
  });

  it('a listen question has a large speaker button that says the target again', async () => {
    const { user, spoken } = show(listen);
    await user.click(screen.getByRole('button', { name: 'Hear it again' }));
    expect(spoken).toEqual([['Find the letter', { letter: 'B' }]]);
    expect(screen.queryByRole('button', { name: 'Hear the question' })).toBeNull();
  });

  it('a look question has a speaker button for its prompt, and its options speak', async () => {
    const look: Question = { ...base({ prompt: { text: 'How many?', speak: ['How many?'] } }), type: 'choice', options: [t('2', [{ number: 2 }]), t('3', [{ number: 3 }])], answerIndex: 0 };
    const { user, spoken } = show(look);
    await user.click(screen.getByRole('button', { name: 'Hear the question' }));
    await tap(user, '[data-option="1"]');
    expect(spoken).toEqual([['How many?'], [{ number: 3 }]]);
    expect(screen.queryByRole('button', { name: 'Hear it again' })).toBeNull();
  });

  it('a read question never speaks the words to be read: they carry no label, so a tap says nothing', async () => {
    const read: Question = {
      ...base({ mode: 'read', facts: { target: 'cat', read: ['cat'], options: ['cat', 'dog'] }, prompt: { text: 'Which picture matches this word?', speak: ['Which picture matches this word?'] } }),
      type: 'choice',
      stimulus: t('cat'),
      options: [t('🐱', [{ word: 'cat' }]), t('🐶', [{ word: 'dog' }])],
      answerIndex: 0,
    };
    const { user, spoken } = show(read);
    await user.click(screen.getByRole('button', { name: 'Hear the question' }));
    expect(spoken).toEqual([['Which picture matches this word?']]);
    expect(spoken.flat().some((part) => typeof part !== 'string' && 'word' in part)).toBe(false);
  });

  it('draws the stimulus, and starts fresh when the question changes', async () => {
    const first = generateQuestion('M-K-C4', 3, 5);
    const second = generateQuestion('M-K-C4', 3, 6);
    const responses: (Response | null)[] = [];
    const view = render(<QuestionView question={first} disabled={false} onChange={(r) => responses.push(r)} onSpeak={() => undefined} />);
    expect(document.querySelector('[data-visual="equation"]')).not.toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: '5' }));
    expect(document.querySelector('[data-display]')?.textContent).toBe('5');
    view.rerender(<QuestionView question={second} disabled={false} onChange={(r) => responses.push(r)} onSpeak={() => undefined} />);
    expect(document.querySelector('[data-display]')?.textContent).toBe('');
  });
});

describe('real generated questions', () => {
  it('each reference skill can be answered correctly through its component', async () => {
    const user = userEvent.setup();
    for (const [skillId, level] of [['M-PK-A2', 1], ['M-PK-A2', 3], ['M-K-B3', 2], ['M-K-C4', 1], ['M-K-C4', 3], ['M-K-C4', 4]] as const) {
      for (const seed of [1, 2, 3]) {
        const question = generateQuestion(skillId, level, seed);
        const onChange = vi.fn<(r: Response | null) => void>();
        const view = render(<QuestionView question={question} disabled={false} onChange={onChange} onSpeak={() => undefined} />);
        if (question.type === 'choice') await user.click(document.querySelector(`[data-option="${question.answerIndex}"]`) as Element);
        if (question.type === 'order') for (const index of question.answerOrder) await user.click(document.querySelector(`[data-item="${index}"]`) as Element);
        if (question.type === 'numberPad') for (const digit of String(question.answer)) await user.click(screen.getByRole('button', { name: digit }));
        const response = onChange.mock.calls.at(-1)?.[0] ?? null;
        expect(response, `${skillId} level ${level} seed ${seed}`).not.toBeNull();
        expect(check(question, response as Response), `${skillId} level ${level} seed ${seed}`).toBe(true);
        view.unmount();
      }
    }
  });
});
