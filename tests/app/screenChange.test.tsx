import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useNavigate, useRoutes } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { resetScreensForTests, screenChange, screenDepth } from '../../src/app/screenChange';
import KidScreen from '../../src/components/KidScreen';

// Screen changes (game feel, phase 8): deeper in pushes, back out pulls, sideways fades, the first screen just shows.

afterEach(() => {
  resetScreensForTests();
  delete document.documentElement.dataset.calm;
});

describe('which way a change goes', () => {
  it('pushes in from home to a skill or a lesson, and pulls back out to home', () => {
    expect(screenChange('/home', '/skill/M-K-A1')).toBe('push');
    expect(screenChange('/skill/M-K-A1', '/skill/M-K-A1/learn')).toBe('push');
    expect(screenChange('/home', '/games/pop')).toBe('push');
    expect(screenChange('/', '/home')).toBe('push');
    expect(screenChange('/skill/M-K-A1', '/home')).toBe('pull');
    expect(screenChange('/skill/M-K-A1/learn', '/skill/M-K-A1')).toBe('pull');
    expect(screenChange('/facts/add10', '/facts')).toBe('pull');
    expect(screenChange('/home', '/')).toBe('pull');
  });

  it('fades sideways and to or from a grown-ups page, and the first screen has no change', () => {
    expect(screenChange('/subject/math', '/subject/ela')).toBe('fade');
    expect(screenChange('/games/pop', '/review')).toBe('fade');
    expect(screenChange('/parent/settings', '/')).toBe('fade');
    expect(screenChange(null, '/home')).toBe('none');
    expect(screenChange('/home', '/home')).toBe('none');
    expect(screenDepth('/parent/dashboard')).toBeNull();
    expect(screenDepth('/skill/M-K-A1/learn')).toBe(4);
  });
});

describe('a kid screen arriving', () => {
  let go: NavigateFunction = () => undefined;
  // Two different screens, as in the app (the same screen at a new address is not a new arrival).
  const HomeScreen = () => <KidScreen>home</KidScreen>;
  const SkillScreen = () => <KidScreen>skill</KidScreen>;
  function Screens() {
    go = useNavigate();
    const screen = useRoutes([
      { path: '/home', element: <HomeScreen /> },
      { path: '/skill/:skillId', element: <SkillScreen /> },
    ]);
    return screen;
  }
  const frame = (): HTMLElement | null => document.querySelector('main')?.parentElement?.parentElement ?? null;

  for (const mode of ['normal', 'calm'] as const) {
    it(`plays the entrance for the way the child moved, without view transitions (${mode})`, async () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      render(
        <MemoryRouter initialEntries={['/home']}>
          <Screens />
        </MemoryRouter>,
      );
      // The first screen of a launch just shows.
      expect(frame()?.hasAttribute('data-screen-in')).toBe(false);
      await act(async () => {
        await go('/skill/M-K-A1', { replace: true });
      });
      expect(frame()?.textContent).toBe('skill');
      expect(frame()?.getAttribute('data-screen-in')).toBe('push');
      expect(document.documentElement.dataset.screenChange).toBe('push');
      await act(async () => {
        await go('/home', { replace: true });
      });
      expect(frame()?.textContent).toBe('home');
      expect(frame()?.getAttribute('data-screen-in')).toBe('pull');
      expect(document.documentElement.dataset.screenChange).toBe('pull');
    });
  }

  it('draws outside a router too, with no entrance', () => {
    render(<KidScreen>alone</KidScreen>);
    expect(frame()?.textContent).toBe('alone');
    expect(frame()?.hasAttribute('data-screen-in')).toBe(false);
  });
});
