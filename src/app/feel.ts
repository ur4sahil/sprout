import { isMuted } from '../audio/mute';
import { loadSounds, playSound } from '../audio/sounds';
import type { Child } from '../storage/schema';
import { currentWorld, setWorld } from '../worlds';

// How the app feels for the child who is playing (plan section 19, phase 1): the world its look comes from, Calm
// mode, and a sound under every touch.

// Sets the page up for this child, or back to plain when no child is playing (the grown-ups' pages stay calm).
export function applyChildFeel(child: Child | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const world = setWorld(child?.settings.world);
  if (child?.settings.calm) root.dataset.calm = '';
  else delete root.dataset.calm;
  if (child) {
    root.dataset.world = world.id;
    for (const [name, value] of Object.entries(world.palette)) root.style.setProperty(name, value);
    loadSounds();
  } else {
    delete root.dataset.world;
    for (const name of Object.keys(world.palette)) root.style.removeProperty(name);
  }
}

const PRESSABLE = 'button, [role="button"], [role="tab"], [role="switch"], [data-option]';

// Whether a touch on this element should make the tap sound: a control that is not switched off.
export function isPressable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest(PRESSABLE);
  if (!control) return false;
  return !(control instanceof HTMLButtonElement && control.disabled) && control.getAttribute('aria-disabled') !== 'true';
}

// A soft tap under every touch of a control, while a child is playing. Returns how to stop it.
export function startTouchSounds(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const onDown = (event: PointerEvent): void => {
    if (isMuted() || !document.documentElement.dataset.world) return;
    if (isPressable(event.target)) playSound(currentWorld().sounds.tap);
  };
  document.addEventListener('pointerdown', onDown, { passive: true });
  return () => document.removeEventListener('pointerdown', onDown);
}
