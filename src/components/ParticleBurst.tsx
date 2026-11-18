import { useEffect, useRef } from 'react';
import { isLowFx } from '../lib/frameWatch';
import { burst, fade, step } from '../lib/particles';
import type { ParticleKind } from '../worlds';
import { currentWorld } from '../worlds';
import styles from './ParticleBurst.module.css';

interface Props {
  kind?: ParticleKind; // the world's "right answer" particles when left out
  at?: { x: number; y: number }; // where it starts, 0 to 1 across and down its parent; the middle when left out
  seed?: number;
}

// One burst of particles over its parent (which must be positioned). It draws itself and is done; nothing is
// drawn in Calm mode, with Reduce Motion on, or where a canvas cannot draw.
export default function ParticleBurst({ kind, at, seed = 1 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = currentWorld();
  const what = kind ?? world.particles.right;
  const x = at?.x ?? 0.5;
  const y = at?.y ?? 0.5;

  useEffect(() => {
    const el = canvas.current;
    if (!el || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
    if (document.documentElement.dataset.calm !== undefined) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let draw: CanvasRenderingContext2D | null = null;
    try {
      draw = el.getContext('2d');
    } catch {
      draw = null;
    }
    if (!draw) return;
    const ctx = draw;
    const box = el.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    el.width = Math.max(1, Math.round(box.width * scale));
    el.height = Math.max(1, Math.round(box.height * scale));
    // The world's colours are tokens; the page works them out.
    const style = getComputedStyle(el);
    const colours = world.particles.colours.map((colour) => {
      const name = /var\((--[a-z0-9-]+)\)/.exec(colour)?.[1];
      return (name ? style.getPropertyValue(name).trim() : colour) || colour;
    });
    let particles = burst(what, { x, y }, colours.length, seed);
    let last = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const seconds = Math.min((now - last) / 1000, 0.05);
      last = now;
      particles = step(particles, what, seconds);
      ctx.clearRect(0, 0, el.width, el.height);
      for (const each of particles) {
        const size = each.size * el.width;
        ctx.save();
        ctx.globalAlpha = fade(each);
        ctx.translate(each.x * el.width, each.y * el.height);
        ctx.rotate(each.turn);
        ctx.fillStyle = colours[each.colour] ?? '';
        if (what === 'confetti' || what === 'leaf' || what === 'petal') {
          ctx.beginPath();
          ctx.ellipse(0, 0, size, size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (what === 'drop') {
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // a four-point sparkle
          ctx.beginPath();
          for (let i = 0; i < 8; i += 1) {
            const r = i % 2 === 0 ? size : size * 0.38;
            ctx.lineTo(Math.cos((Math.PI / 4) * i) * r, Math.sin((Math.PI / 4) * i) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (particles.length > 0) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [what, x, y, seed, world]);

  // On a device that cannot keep up (the old-device fallback, `data-lowfx`), no particles are drawn at all.
  if (isLowFx()) return null;
  return <canvas ref={canvas} className={styles.layer} aria-hidden="true" data-particles={what} />;
}
