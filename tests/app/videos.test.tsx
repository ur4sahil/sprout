import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { openRepo } from '../../src/storage/index';
import { openApp, setUp } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));

// Concept videos in a lesson (plan section 10, Video safety). "Add to 5" (M-K-C2) has one. "Break apart numbers" does too; most reasoning skills have none.
const WITH_VIDEO = 'M-K-C2';
const NO_VIDEO = 'R-A2';
// The video is offered on the bulb's choice screen.
const videoTab = (): HTMLElement | null => screen.queryByRole('button', { name: /Watch a video/ });
const frame = (): HTMLIFrameElement | null => document.querySelector('[data-video] iframe');

async function openLesson(skillId: string, change: Parameters<typeof setUp>[1] = {}) {
  const child = await setUp('K', change);
  useAppStore.getState().setChild(child);
  const user = openApp(`/skill/${skillId}/learn`);
  await screen.findByRole('button', { name: /Lesson with Sprout/ });
  return user;
}

let online = true;
beforeEach(() => {
  online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
});
afterEach(() => vi.restoreAllMocks());

describe('a video in a lesson', () => {
  it('is offered when the skill has one, and opens in a sandboxed frame with one Close button', async () => {
    const user = await openLesson(WITH_VIDEO);
    await waitFor(() => expect(videoTab()).not.toBeNull());
    await user.click(videoTab() as HTMLElement);
    const player = await screen.findByRole('dialog', { name: 'Introduction to addition' });
    const shown = frame() as HTMLIFrameElement;
    expect(new URL(shown.src).origin).toBe('https://www.youtube-nocookie.com');
    expect(new URL(shown.src).pathname).toBe('/embed/fsTD_jqseBA');
    // The frame can run its player. It cannot open a window or move the page.
    const allowed = (shown.getAttribute('sandbox') ?? '').split(' ');
    expect(allowed).toContain('allow-scripts');
    expect(allowed.some((each) => each.startsWith('allow-popups') || each.startsWith('allow-top-navigation'))).toBe(false);
    // Nothing of the app's is drawn over the video: the dialog holds the frame and Close, and no more.
    expect(player.querySelectorAll('button')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Close/ }));
    expect(frame()).toBeNull();
    // The choice is still there behind it.
    expect(screen.getByRole('button', { name: /Lesson with Sprout/ })).toBeTruthy();
  });

  it('the bulb opens on a choice, and nothing plays until one is picked', async () => {
    const user = await openLesson(WITH_VIDEO);
    await screen.findByRole('button', { name: /Watch a video/ });
    expect(screen.getByRole('button', { name: /Lesson with Sprout/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Example/ })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Lesson' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Watch a video/ }));
    await screen.findByRole('dialog', { name: 'Introduction to addition' });
    await user.click(screen.getByRole('button', { name: /Close/ }));
    // Closing the video starts nothing: the tabs wait for the next pick.
    expect(frame()).toBeNull();
    expect(screen.queryByRole('region', { name: 'Lesson' })).toBeNull();
  });

  it('a skill with no video offers only the lesson and the example', async () => {
    await openLesson(NO_VIDEO);
    await screen.findByRole('button', { name: /Lesson with Sprout/ });
    expect(screen.queryByRole('button', { name: /Watch a video/ })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes by itself three seconds before the end, and ignores messages from anywhere else', async () => {
    const user = await openLesson(WITH_VIDEO);
    await waitFor(() => expect(videoTab()).not.toBeNull());
    await user.click(videoTab() as HTMLElement);
    const shown = (await waitFor(() => {
      const found = frame();
      if (!found) throw new Error('no frame');
      return found;
    })) as HTMLIFrameElement;
    const tell = (origin: string, source: MessageEventSource | null, seconds: number): void => {
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { origin, source, data: JSON.stringify({ event: 'infoDelivery', info: { currentTime: seconds } }) }));
      });
    };
    // The video is 191 seconds long.
    tell('https://www.youtube-nocookie.com', shown.contentWindow, 100);
    expect(frame()).not.toBeNull();
    tell('https://evil.example', shown.contentWindow, 190);
    expect(frame()).not.toBeNull();
    tell('https://www.youtube-nocookie.com', window, 190);
    expect(frame()).not.toBeNull();
    tell('https://www.youtube-nocookie.com', shown.contentWindow, 188);
    expect(frame()).toBeNull();
  });

  it('is not offered for a skill with no video, when videos are off for the child, or with no network', async () => {
    await openLesson(NO_VIDEO);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(videoTab()).toBeNull();
    document.body.innerHTML = '';

    await openLesson(WITH_VIDEO, { allowVideos: false });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(videoTab()).toBeNull();
    document.body.innerHTML = '';

    online = false;
    await openLesson(WITH_VIDEO);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(videoTab()).toBeNull();
  });
});

describe('a parent removes a video', () => {
  it('from the skill row on the scores screen, and the lesson no longer offers it', async () => {
    await setUp('K');
    const user = openApp('/parent/scores');
    const remove = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(`[data-remove-video="${WITH_VIDEO}"]`);
      if (!found) throw new Error('no rows yet');
      return found;
    });
    expect(remove.getAttribute('aria-label')).toBe('Remove the video from Add to 5');
    // A skill without a video has no button.
    expect(document.querySelector(`[data-remove-video="${NO_VIDEO}"]`)).toBeNull();
    await user.click(remove);
    await waitFor(() => expect(document.querySelector(`[data-remove-video="${WITH_VIDEO}"]`)).toBeNull());
    const { repo } = await openRepo();
    await waitFor(async () => expect((await repo.getFamily()).removedVideos).toEqual([WITH_VIDEO]));
    document.body.innerHTML = '';

    const child = (await repo.listChildren())[0]!;
    useAppStore.getState().setChild(child);
    openApp(`/skill/${WITH_VIDEO}/learn`);
    await screen.findByRole('button', { name: /Lesson with Sprout/ });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(videoTab()).toBeNull();
  });
});
