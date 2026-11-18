import { useEffect, useState } from 'react';

// True when movement should be off: the child's Calm mode (the app marks the page with `data-calm`) or the
// device's own Reduce Motion. A friend then holds each mood as a still pose.

const QUERY = '(prefers-reduced-motion: reduce)';

function reduceMotion(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
}

export function isStill(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.calm !== undefined || (reduceMotion()?.matches ?? false);
}

export function useStill(): boolean {
  const [still, setStill] = useState(isStill);
  useEffect(() => {
    // Calm mode is set as a child is chosen, which can be just after a friend is first drawn: look once more.
    setStill(isStill());
    const media = reduceMotion();
    if (!media || typeof media.addEventListener !== 'function') return;
    const changed = (): void => setStill(isStill());
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  return still;
}
