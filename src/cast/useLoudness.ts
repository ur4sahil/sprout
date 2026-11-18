import { useEffect, useState } from 'react';
import { audioContext } from '../audio/context';

// How loud the voice is right now, from 0 to 1, so a friend's mouth can open with the sound. Hand the result
// straight to `<Character talking={...} />`.
//
// Give it what is playing: a sound node (the recorded voice is one) or an audio element. Where the sound can be
// measured it answers with a number. Where it cannot (no WebAudio on the device, a sound the browser will not
// let the app listen to, the device's own voice, which is not a sound the app holds) it answers `true` while
// `playing`, and the friend's mouth runs its own talk loop. It answers `false` when nothing is playing.

type Source = HTMLMediaElement | AudioNode | null | undefined;

const QUIET_FOR_MS = 600; // a playing sound that measures silent for this long cannot be heard by the app: use the loop
const STEP = 0.05; // loudness is rounded to this, so the friend is redrawn only when the mouth would change
const GAIN = 4; // speech is quiet as a share of full volume; this brings a normal voice up to about 1

// An audio element can be tapped only once in its life, so the tap is kept.
const taps = new WeakMap<HTMLMediaElement, AudioNode>();

function isElement(source: HTMLMediaElement | AudioNode): source is HTMLMediaElement {
  return typeof HTMLMediaElement !== 'undefined' && source instanceof HTMLMediaElement;
}

// The node to listen to, or null when this sound cannot be listened to.
function nodeFor(source: HTMLMediaElement | AudioNode): AudioNode | null {
  if (!isElement(source)) return source;
  const known = taps.get(source);
  if (known) return known;
  const ctx = audioContext();
  if (!ctx) return null;
  // Once tapped, an element's sound reaches the speaker only through the tap.
  const tap = ctx.createMediaElementSource(source);
  tap.connect(ctx.destination);
  taps.set(source, tap);
  return tap;
}

export function useLoudness(source: Source, playing: boolean = source !== null && source !== undefined): number | boolean {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    setLevel(null);
    if (!source || !playing || typeof requestAnimationFrame !== 'function') return;
    const tapped = isElement(source);
    let node: AudioNode;
    let meter: AnalyserNode;
    try {
      const found = nodeFor(source);
      if (!found) return;
      node = found;
      meter = node.context.createAnalyser();
      meter.fftSize = 256;
      node.connect(meter);
    } catch {
      return; // this sound cannot be measured: the caller gets the loop
    }
    const wave = new Uint8Array(meter.fftSize);
    let frame = 0;
    let shown: number | null = null;
    let smooth = 0;
    let quietSince: number | null = null;
    const read = (at: number): void => {
      frame = requestAnimationFrame(read);
      meter.getByteTimeDomainData(wave);
      let sum = 0;
      for (const sample of wave) sum += ((sample - 128) / 128) ** 2;
      const loud = Math.min(1, Math.sqrt(sum / wave.length) * GAIN);
      // Open fast, close a little slower, as a mouth does.
      smooth = loud > smooth ? loud : smooth * 0.7 + loud * 0.3;
      // Only an audio element can play and still measure as nothing (a sound from another site the browser will
      // not let the app listen to). A node that measures nothing is simply between words.
      if (sum > 0 || !tapped) quietSince = null;
      else quietSince ??= at;
      const unheard = quietSince !== null && at - quietSince > QUIET_FOR_MS;
      const next = unheard ? null : Math.round(smooth / STEP) * STEP;
      if (next !== shown) {
        shown = next;
        setLevel(next);
      }
    };
    frame = requestAnimationFrame(read);
    return () => {
      cancelAnimationFrame(frame);
      try {
        node.disconnect(meter);
      } catch {
        // It had already been taken apart.
      }
    };
  }, [source, playing]);

  if (!source || !playing) return false;
  return level ?? true;
}
