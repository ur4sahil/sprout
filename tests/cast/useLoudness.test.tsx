import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { resetAudioContext } from '../../src/audio/context';
import { useLoudness } from '../../src/cast/useLoudness';

// A stand-in for a playing sound node whose meter always reads the same wave.
function fakeNode(fill: number): { node: AudioNode; disconnect: ReturnType<typeof vi.fn> } {
  const meter = { fftSize: 0, getByteTimeDomainData: (wave: Uint8Array) => wave.fill(fill) };
  const disconnect = vi.fn();
  const node = { context: { createAnalyser: () => meter }, connect: vi.fn(), disconnect };
  return { node: node as unknown as AudioNode, disconnect };
}

describe('useLoudness', () => {
  it('is false when nothing is playing', () => {
    expect(renderHook(() => useLoudness(null)).result.current).toBe(false);
    expect(renderHook(() => useLoudness(fakeNode(200).node, false)).result.current).toBe(false);
  });

  it('gives a number from 0 to 1 for a sound it can measure', async () => {
    const { node, disconnect } = fakeNode(160);
    const { result, unmount } = renderHook(() => useLoudness(node));
    await waitFor(() => expect(typeof result.current).toBe('number'));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(1);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('falls back to the talk loop (true) where the sound cannot be measured', () => {
    // No WebAudio here, as on a device without it: an audio element cannot be tapped.
    const element = document.createElement('audio');
    expect(renderHook(() => useLoudness(element)).result.current).toBe(true);
    // A node that refuses to be listened to.
    const broken = { context: { createAnalyser: () => { throw new Error('not allowed'); } }, connect: vi.fn(), disconnect: vi.fn() } as unknown as AudioNode;
    expect(renderHook(() => useLoudness(broken)).result.current).toBe(true);
  });

  it('a node that measures as silence is just between words: the mouth shuts and stays the caller\'s to drive', async () => {
    const { node } = fakeNode(128);
    const { result } = renderHook(() => useLoudness(node));
    await waitFor(() => expect(result.current).toBe(0));
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(result.current).toBe(0);
  });

  it('an audio element that plays but measures as silence for a while falls back to the talk loop', async () => {
    // A stand-in for WebAudio whose tap on the element hears nothing, as with a sound from another site.
    const { node } = fakeNode(128);
    class FakeContext {
      destination = {};
      createMediaElementSource(): AudioNode {
        return node;
      }
    }
    vi.stubGlobal('AudioContext', FakeContext);
    resetAudioContext();
    try {
      const element = document.createElement('audio');
      const { result } = renderHook(() => useLoudness(element));
      await waitFor(() => expect(result.current).toBe(0));
      await waitFor(() => expect(result.current).toBe(true), { timeout: 3000 });
    } finally {
      resetAudioContext();
    }
  });
});
