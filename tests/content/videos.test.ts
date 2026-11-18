// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/content/catalogue';
import list from '../../src/content/videos.json';
import { allVideos, CLOSE_BEFORE_END_SECONDS, embedAddress, FRAME_SANDBOX, playTime, shouldClose, videoFor, VIDEOS_ENABLED } from '../../src/content/videos';

// Concept videos (plan sections 10 and 12). `npm run check:videos` asks YouTube about each one; these tests need no network.

const video = { youtubeId: 'y2-uaPiyoxc', title: 'Counting with small numbers', source: 'Khan Academy', seconds: 55 };

describe('the video list', () => {
  it('names only skills in the catalogue, each with a YouTube id, a title, a source and a length', () => {
    const ids = new Set(CATALOGUE.map((skill) => skill.id));
    const entries = Object.entries(allVideos());
    expect(entries.length).toBeGreaterThan(40);
    for (const [skillId, each] of entries) {
      expect(ids.has(skillId), skillId).toBe(true);
      expect(each.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(each.title.length).toBeGreaterThan(3);
      // The channel, exactly as YouTube names it (npm run check:videos confirms it).
      expect(each.source.trim().length).toBeGreaterThan(0);
      expect(Number.isInteger(each.seconds) && each.seconds >= 20 && each.seconds <= 600).toBe(true);
    }
  });

  it('gives a skill its video, and nothing for a skill without one or one a parent removed', () => {
    expect(list.enabled).toBe(VIDEOS_ENABLED);
    expect(videoFor('M-PK-A1')).toEqual(video);
    expect(videoFor('M-PK-A1', ['M-PK-A1'])).toBeNull();
    expect(videoFor('M-PK-A1', ['M-K-C2'])).toEqual(video);
    expect(videoFor('R-A1')).toBeNull();
    expect(videoFor('no-such-skill')).toBeNull();
  });
});

describe('the player', () => {
  it("uses YouTube's privacy-enhanced address, keeps related videos to the same channel, and names this page", () => {
    const address = new URL(embedAddress(video, 'https://sprout.example'));
    expect(address.origin).toBe('https://www.youtube-nocookie.com');
    expect(address.pathname).toBe('/embed/y2-uaPiyoxc');
    expect(Object.fromEntries(address.searchParams)).toEqual({ rel: '0', playsinline: '1', enablejsapi: '1', origin: 'https://sprout.example' });
  });

  it('may run scripts, and may not open a window or move the page', () => {
    const allowed = FRAME_SANDBOX.split(' ');
    expect(allowed).toContain('allow-scripts');
    for (const never of ['allow-popups', 'allow-popups-to-escape-sandbox', 'allow-top-navigation', 'allow-top-navigation-by-user-activation', 'allow-forms', 'allow-modals']) expect(allowed).not.toContain(never);
  });

  it('reads the play time from a player message, as text or as an object, and ignores anything else', () => {
    expect(playTime(JSON.stringify({ event: 'infoDelivery', info: { currentTime: 12.5 } }))).toEqual({ seconds: 12.5, ended: false });
    expect(playTime({ event: 'infoDelivery', info: { currentTime: 3, playerState: 1 } })).toEqual({ seconds: 3, ended: false });
    expect(playTime({ event: 'infoDelivery', info: { playerState: 0 } })).toEqual({ seconds: null, ended: true });
    expect(playTime({ event: 'infoDelivery', info: { volume: 50 } })).toBeNull();
    expect(playTime({ event: 'initialDelivery' })).toBeNull();
    expect(playTime('not json')).toBeNull();
    expect(playTime(null)).toBeNull();
    expect(playTime(42)).toBeNull();
  });

  it('closes three seconds before the end, or when the player says the video has ended', () => {
    expect(CLOSE_BEFORE_END_SECONDS).toBe(3);
    expect(shouldClose(video, { seconds: 51.9, ended: false })).toBe(false);
    expect(shouldClose(video, { seconds: 52, ended: false })).toBe(true);
    expect(shouldClose(video, { seconds: 60, ended: false })).toBe(true);
    expect(shouldClose(video, { seconds: null, ended: true })).toBe(true);
    expect(shouldClose(video, { seconds: 0, ended: false })).toBe(false);
  });
});
