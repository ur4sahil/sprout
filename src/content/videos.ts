import list from './videos.json';

// Concept videos (plan sections 10 and 12). The list is curated by hand and checked by
// `npm run check:videos`. A skill with no good video has no entry: its lesson covers it.

export interface Video {
  youtubeId: string;
  title: string;
  source: string;
  seconds: number; // the video's length. The player closes just before the end
}

const VIDEOS = list.videos as Readonly<Record<string, Video>>;

// One switch for every child. Turned off if the hand check on the iPad fails.
export const VIDEOS_ENABLED: boolean = list.enabled;

export function allVideos(): Readonly<Record<string, Video>> {
  return VIDEOS;
}

// The video for a skill, unless videos are off or a parent removed this one.
export function videoFor(skillId: string, removed: readonly string[] = []): Video | null {
  if (!VIDEOS_ENABLED || removed.includes(skillId)) return null;
  return VIDEOS[skillId] ?? null;
}

// The player closes this long before the end, before YouTube shows its suggestions.
export const CLOSE_BEFORE_END_SECONDS = 3;

export const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';

// YouTube's privacy-enhanced player, with its own controls. Related videos stay on the same channel.
export function embedAddress(video: Video, pageOrigin: string): string {
  const query = new URLSearchParams({ rel: '0', playsinline: '1', enablejsapi: '1', origin: pageOrigin });
  return `${PLAYER_ORIGIN}/embed/${video.youtubeId}?${query.toString()}`;
}

// What the frame may do: run its player, and nothing that leads out of the app.
// No pop-ups and no top-level navigation, so a tap on the YouTube logo or the title has nowhere to go.
export const FRAME_SANDBOX = 'allow-scripts allow-same-origin';

// The play time in a message from the player, or null when the message says something else.
// `ended` is true when the player reports that the video has finished.
export function playTime(data: unknown): { seconds: number | null; ended: boolean } | null {
  let message: unknown = data;
  if (typeof data === 'string') {
    try {
      message = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (typeof message !== 'object' || message === null) return null;
  const info = (message as { info?: unknown }).info;
  if (typeof info !== 'object' || info === null) return null;
  const { currentTime, playerState } = info as { currentTime?: unknown; playerState?: unknown };
  const seconds = typeof currentTime === 'number' && Number.isFinite(currentTime) ? currentTime : null;
  const ended = playerState === 0;
  return seconds === null && !ended ? null : { seconds, ended };
}

export function shouldClose(video: Video, time: { seconds: number | null; ended: boolean }): boolean {
  return time.ended || (time.seconds !== null && time.seconds >= video.seconds - CLOSE_BEFORE_END_SECONDS);
}
