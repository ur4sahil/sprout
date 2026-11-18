import { useEffect } from 'react';
import { useAppStore } from '../app/store';
import type { Mood } from './music';
import { setMusic } from './music';

// Plays a mood of music while the calling screen is on show (game feel, phase 8). `mood` null: none here.
// `hush`: silent for now, but the loop keeps its place (practice hushes it while a question is not being chosen).
// Only while a child is playing and their Music setting is on; quieter in Calm mode. Leaving the screen fades it.
export function useMusic(mood: Mood | null, hush = false): void {
  const child = useAppStore((s) => s.child);
  const wanted = child?.settings.music ? mood : null;
  const calm = child?.settings.calm ?? false;
  useEffect(() => {
    setMusic({ mood: wanted, hush, calm });
  }, [wanted, hush, calm]);
  useEffect(() => () => setMusic({ mood: null, hush: false, calm: false }), []);
}
