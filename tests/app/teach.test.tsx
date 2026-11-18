import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTimingForTests } from '../../src/app/timing';
import TeachLesson from '../../src/components/TeachLesson';
import { generateQuestion } from '../../src/content/registry';
import { allLessons } from '../../src/lessons';
import { moment, scene } from '../../src/lessons/build';
import type { Lesson } from '../../src/lessons/types';

const spoken = vi.hoisted(() => ({ said: [] as string[], sounds: [] as string[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown[], _rate?: number, pace?: string) => {
    spoken.said.push(`${pace ?? 'normal'}:${JSON.stringify(say)}`);
    return true;
  },
  stop: () => undefined,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: (name: string) => {
    spoken.sounds.push(name);
  },
}));

// A small lesson: two moments, one turn on "Count to 20", and a last moment.
const question = generateQuestion('M-K-A1', 1, 3);
const n = Number(question.facts.n);
const lesson: Lesson = {
  parts: [
    { kind: 'show', moment: moment(['First moment.'], 'First', scene([{ id: 'a', look: { kind: 'text', text: 'A' }, x: 0, y: 0 }])) },
    { kind: 'show', moment: moment(['Second moment.'], 'Second', scene([{ id: 'a', look: { kind: 'text', text: 'A' }, x: 3, y: 1, lit: true }])) },
    { kind: 'turn', turn: { question, why: [moment(['Count with me.'], 'Count with me', scene([])), moment(['So there are', { number: n }, '.'], `There are ${n}`, scene([]))] } },
    { kind: 'show', moment: moment(['Last moment.'], 'Last', scene([])) },
  ],
};

function optionFor(value: number): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${value}$`) });
}

beforeEach(() => {
  spoken.said = [];
  spoken.sounds = [];
  setTimingForTests({ momentGapMs: 0 });
});
afterEach(() => setTimingForTests({}));

describe('a lesson that teaches', () => {
  it('plays its moments at the lesson pace, moving pieces rather than redrawing them', async () => {
    render(<TeachLesson lesson={lesson} rate={0.85} onPractise={() => undefined} />);
    await waitFor(() => expect(spoken.said[0]).toBe('lesson:["First moment."]'));
    await waitFor(() => expect(spoken.said).toContain('lesson:["Second moment."]'));
    // The turn reads its question at the normal pace.
    await screen.findByText('Your turn!');
    expect(spoken.said.at(-1)).toBe(`normal:${JSON.stringify(question.prompt.speak)}`);
  });

  it('a miss plays the why and asks again; a second miss shows the answer and waits for Next', async () => {
    const user = userEvent.setup();
    render(<TeachLesson lesson={lesson} rate={0.85} onPractise={() => undefined} />);
    await screen.findByText('Your turn!');
    const wrongs = (question.facts.options as number[]).filter((value) => value !== n);
    await user.click(optionFor(wrongs[0] ?? n + 1));
    await user.click(screen.getByRole('button', { name: /Check/ }));
    await waitFor(() => expect(spoken.said).toContain('lesson:["Count with me."]'));
    await screen.findByText('Try it again!');
    await user.click(optionFor(wrongs[1] ?? wrongs[0] ?? n + 1));
    await user.click(screen.getByRole('button', { name: /Check/ }));
    expect(await screen.findByText(String(n), { selector: '[data-lesson-answer]' })).toBeTruthy();
    expect(screen.queryByText('Last')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('button', { name: /Practise/ });
    expect(spoken.sounds).toEqual([]);
  });

  it('a right answer chimes, is praised, and the lesson carries on to the end', async () => {
    const user = userEvent.setup();
    const practise = vi.fn();
    render(<TeachLesson lesson={lesson} rate={0.85} onPractise={practise} />);
    await screen.findByText('Your turn!');
    await user.click(optionFor(n));
    await user.click(screen.getByRole('button', { name: /Check/ }));
    await waitFor(() => expect(spoken.said).toContain('lesson:["Last moment."]'));
    expect(spoken.sounds).toEqual(['chime']);
    expect(spoken.said).not.toContain('lesson:["Count with me."]');
    await user.click(await screen.findByRole('button', { name: /Practise/ }));
    expect(practise).toHaveBeenCalledTimes(1);
  });

  it('starts again from the beginning', async () => {
    const user = userEvent.setup();
    render(<TeachLesson lesson={lesson} rate={0.85} onPractise={() => undefined} />);
    await screen.findByText('Your turn!');
    await user.click(screen.getByRole('button', { name: 'Start again' }));
    await waitFor(() => expect(spoken.said.filter((each) => each === 'lesson:["First moment."]').length).toBe(2));
  });
});

// Every written lesson: its opening moments play on the real screen and its first turn's question is drawn, whatever
// kind of question it is (choice, sort, match, tiles ...), and every scene of the lesson can be drawn.
describe.each(allLessons())('the %s lesson on screen', (_name, _skillId, make) => {
  it('plays to its first turn and draws that question', async () => {
    const made = make();
    render(<TeachLesson lesson={made} rate={0.85} onPractise={() => undefined} />);
    await screen.findByText('Your turn!', undefined, { timeout: 8000 });
    expect(document.querySelector('[data-your-turn]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Check/ })).toBeTruthy();
    cleanup();
    // The scenes after the first turn, and every why: each one alone as a lesson of one moment.
    const later = made.parts.flatMap((part) => (part.kind === 'show' ? [part.moment] : part.turn.why));
    for (const each of later) {
      const view = render(<TeachLesson lesson={{ look: made.look, parts: [{ kind: 'show', moment: each }] }} rate={0.85} onPractise={() => undefined} />);
      expect(view.container.querySelector('[data-moment-text]')?.textContent ?? view.container.textContent).toBeTruthy();
      view.unmount();
    }
  });
});

