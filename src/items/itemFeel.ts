import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { playSound } from '../audio/sounds';
import { currentWorld } from '../worlds';

// What the question components share for their feel (game feel, phase 2b): whether to keep still, the small
// sounds, and things sliding to a new place.

// Calm mode, or the device's own Reduce Motion: nothing may fly, hop or slide.
export function isCalm(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.dataset.calm !== undefined) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Read once, as the question appears: a question lasts seconds, and the setting is changed on another screen.
export function useCalm(): boolean {
  const [calm] = useState(isCalm);
  return calm;
}

export type FeelSound = 'tick' | 'pop' | 'drop' | 'star';

// A small sound for something the child just did. The world names the ones it has; the rest are the same in
// every world. `step` lifts the pitch, so a bar that grows climbs a scale.
export function feelSound(name: FeelSound, step = 0): void {
  const world = currentWorld().sounds;
  playSound(name === 'drop' ? world.drop : name === 'star' ? world.star : name, step);
}

// A number handed to the style sheet, for things that move one after another: whose turn this one is.
export function turn(n: number): CSSProperties {
  return { '--set-turn': n } as CSSProperties;
}

const SLIDE_MS = 320; // the same as --t-move

// Things that slide to their new places when the order of a group changes (for a right answer that lines up).
// Give it the group; after every draw it compares where each child was with where it is now and glides the
// ones that moved, once. The caller leaves `on` false in Calm mode; nothing glides where the browser cannot animate.
export function useLineUp(group: RefObject<HTMLElement | null>, on: boolean): void {
  const was = useRef(new Map<Element, { x: number; y: number }>());
  const done = useRef(false);
  useLayoutEffect(() => {
    const el = group.current;
    if (!el || done.current) return;
    if (on) done.current = true;
    const frame = el.getBoundingClientRect();
    for (const child of Array.from(el.children)) {
      const box = child.getBoundingClientRect();
      const now = { x: box.left - frame.left, y: box.top - frame.top };
      const before = was.current.get(child);
      was.current.set(child, now);
      if (!on || !before || typeof (child as HTMLElement).animate !== 'function') continue;
      const dx = before.x - now.x;
      const dy = before.y - now.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      (child as HTMLElement).animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: SLIDE_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
  });
}
