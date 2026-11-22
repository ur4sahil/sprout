import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTimingForTests } from '../../src/app/timing';
import LessonStage from '../../src/components/LessonStage';
import StageBackdrop from '../../src/components/StageBackdrop';
import TeachLesson from '../../src/components/TeachLesson';
import { generateQuestion } from '../../src/content/registry';
import { PLACES } from '../../src/lessons/backdrops';
import { art, group, moment, rich, scene, set } from '../../src/lessons/build';
import type { Lesson } from '../../src/lessons/types';

// Lessons 2.0 (game feel, phase 6) on screen: the place, the friend, the camera, the chapter dots and the turn.

const spoken = vi.hoisted(() => ({ said: [] as string[], sounds: [] as string[], host: [] as string[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown[], _rate?: number, pace?: string) => {
    spoken.said.push(`${pace ?? 'normal'}:${JSON.stringify(say)}`);
    // What the host on the stage is doing as each sentence starts.
    const body = document.querySelector('[data-actor]');
    spoken.host.push(body ? ['data-look-up', 'data-nod', 'data-hop'].filter((name) => body.hasAttribute(name)).join(' ') : '');
    return true;
  },
  stop: () => undefined,
}));
vi.mock('../../src/audio/sounds', async (original) => ({
  ...(await original<typeof import('../../src/audio/sounds')>()),
  playSound: (name: string) => {
    spoken.sounds.push(name);
  },
}));

const question = generateQuestion('M-K-A1', 1, 3);
const plain: Lesson = {
  parts: [
    { kind: 'show', moment: moment(['First moment.'], 'First', scene([{ id: 'a', look: { kind: 'text', text: 'A' }, x: 0, y: 0 }])) },
    { kind: 'show', moment: moment(['Second moment.'], 'Second', scene([{ id: 'a', look: { kind: 'text', text: 'A' }, x: 3, y: 1, lit: true }])) },
    { kind: 'turn', turn: { question, why: [moment(['Count with me.'], 'Count with me', scene([]))] } },
    { kind: 'show', moment: moment(['Last moment.'], 'Last', scene([])) },
  ],
};

function calm(on: boolean): void {
  if (on) document.documentElement.dataset.calm = '';
  else delete document.documentElement.dataset.calm;
}

beforeEach(() => {
  spoken.said = [];
  spoken.sounds = [];
  spoken.host = [];
  setTimingForTests({ momentGapMs: 0 });
});
afterEach(() => {
  setTimingForTests({});
  calm(false);
});

describe.each([false, true])('lessons 2.0 on screen (Calm mode %s)', (isCalm) => {
  beforeEach(() => calm(isCalm));

  it('draws every place behind the pieces', () => {
    for (const place of PLACES) {
      for (const [cols, rows] of [
        [10, 6],
        [14, 7],
      ] as const) {
        const view = render(<StageBackdrop place={place} cols={cols} rows={rows} />);
        expect(view.container.querySelector(`[data-backdrop="${place}"]`)?.getAttribute('viewBox')).toBe(`0 0 ${cols} ${rows}`);
        view.unmount();
      }
    }
  });

  it('a Math lesson is taught by Sprout at the stall, with Pip beside the words', async () => {
    const { container } = render(<TeachLesson lesson={rich(plain, 'stall')} rate={0.85} who="pip" onPractise={() => undefined} />);
    await waitFor(() => expect(spoken.said).toContain('lesson:["First moment."]'));
    expect(container.querySelector('[data-backdrop="stall"]')).not.toBeNull();
    expect(container.querySelector('[data-lesson-stage] [data-character="sprout"]')).not.toBeNull();
    expect(container.querySelector('[data-helper="pip"] [data-character="pip"]')).not.toBeNull();
  });

  it('while a turn is asked, the teacher stays beside the question, listening', async () => {
    const { container } = render(<TeachLesson lesson={rich(plain, 'pond')} rate={0.85} who="finn" onPractise={() => undefined} />);
    await screen.findByText('Your turn!');
    expect(container.querySelector('[data-turn-host="finn"] [data-mood="listen"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Check/ })).toBeTruthy();
  });

  it('nods and looks up on the moment before a turn', async () => {
    const { container } = render(<TeachLesson lesson={rich(plain, 'nook')} rate={0.85} who="olive" onPractise={() => undefined} />);
    await screen.findByText('Your turn!');
    expect(container.querySelector('[data-turn-host="olive"]')).not.toBeNull();
    const second = spoken.said.indexOf('lesson:["Second moment."]');
    expect(spoken.host[0]).toBe('');
    expect(spoken.host[second]).toBe('data-look-up data-nod');
  });

  it('hops when a count finishes', async () => {
    const apples = scene(group('a', art('🍎'), 2, 2, 2));
    const counting: Lesson = rich(
      { parts: [moment([{ number: 1 }], '1', set(apples, ['a0'], { lit: true })), moment([{ number: 2 }], '2', set(apples, ['a1'], { lit: true })), moment(['Two apples.'], '2 apples', apples)].map((each) => ({ kind: 'show' as const, moment: each })) },
      'picnic',
    );
    render(<TeachLesson lesson={counting} rate={0.85} who="pip" onPractise={() => undefined} />);
    await waitFor(() => expect(spoken.said).toContain('lesson:["Two apples."]'));
    expect(spoken.host.slice(0, 3)).toEqual(['', 'data-hop', '']);
  });

  it('chapter dots: one per stretch and per turn, the current one marked; a tap plays from there', async () => {
    const user = userEvent.setup();
    render(<TeachLesson lesson={rich(plain, 'picnic')} rate={0.85} who="pip" onPractise={() => undefined} />);
    await waitFor(() => expect(spoken.said).toContain('lesson:["First moment."]'));
    const dots = screen.getAllByRole('button', { name: /^Part \d$/ });
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual(['Part 1', 'Part 2', 'Part 3']);
    expect(dots[0]?.getAttribute('aria-current')).toBe('step');
    await user.click(screen.getByRole('button', { name: 'Part 3' }));
    await waitFor(() => expect(spoken.said).toContain('lesson:["Last moment."]'));
    expect(screen.queryByText('Your turn!')).toBeNull();
  });

  it('the camera leans in toward the focus, except in Calm mode', () => {
    const small = scene([{ id: 'a', look: art('🍎'), x: 4, y: 3 }], 10, 6);
    const view = render(<LessonStage scene={small} label="An apple" lively actor="idle" />);
    view.rerender(<LessonStage scene={set(small, ['a'], { lit: true })} label="An apple" lively actor="idle" />);
    const zoom = Number(view.container.querySelector('[data-camera]')?.getAttribute('data-camera'));
    if (isCalm) expect(zoom).toBe(1);
    else expect(zoom).toBeGreaterThan(1);
  });

  it('counters clack once a moment as they land, however many land', () => {
    const frame = scene(group('r', art('🔴'), 5, 0, 1).map((piece) => ({ ...piece, gone: true })));
    const view = render(<LessonStage scene={frame} label="A frame" />);
    view.rerender(<LessonStage scene={set(frame, ['r0', 'r1', 'r2'], { gone: false })} label="A frame" />);
    expect(spoken.sounds).toEqual(['drop']);
    view.rerender(<LessonStage scene={set(frame, ['r0', 'r1', 'r2', 'r3'], { gone: false })} label="A frame" />);
    expect(spoken.sounds).toEqual(['drop', 'drop']);
  });
});
