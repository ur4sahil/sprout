import { useEffect, useRef, useState } from 'react';
import { deviceTalking, onPlayingChange, playingRecording, recordingAt } from '../audio/playing';
import type { PlayingRecording } from '../audio/playing';
import { onSpeaking, speakingAs } from '../audio/speaking';
import { shapeAt, timingOf } from '../audio/voice';
import type { TalkShape } from '../audio/voice';
import type { Who } from './types';
import { useLoudness } from './useLoudness';
import { mouthNow } from './voiceMouth';
import type { Talking } from './voiceMouth';

// The friend's mouth while its own voice speaks (plan section 20, phase 2): the timing of the recording that is
// playing (Piper sends one with every sentence), its loudness when it has none, and a talk loop for the device's
// voice. Only the friend that uses this is redrawn, and only when the shape changes: a frame loop reads the audio
// clock while a timed recording plays, and nothing runs while the friend is silent.
export function useVoiceMouth(voice: Who): { speaking: boolean; talking: Talking | undefined } {
  const [mine, setMine] = useState(() => speakingAs() === voice);
  const [recording, setRecording] = useState<PlayingRecording | null>(playingRecording);
  const [device, setDevice] = useState(deviceTalking);
  const [shape, setShape] = useState<TalkShape>('closed');
  const shown = useRef<TalkShape>('closed');

  useEffect(() => {
    const heard = (): void => setMine(speakingAs() === voice);
    const played = (): void => {
      setRecording(playingRecording());
      setDevice(deviceTalking());
    };
    heard();
    played();
    const stopHearing = onSpeaking(heard);
    const stopWatching = onPlayingChange(played);
    return () => {
      stopHearing();
      stopWatching();
    };
  }, [voice]);

  const timing = recording ? timingOf(recording.bytes) : null;
  useEffect(() => {
    if (!mine || !recording || !timing || typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    const read = (): void => {
      const next = shapeAt(timing, recordingAt(recording));
      if (next !== shown.current) {
        shown.current = next;
        setShape(next);
      }
      frame = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(frame);
  }, [mine, recording, timing]);

  // The loudness is measured only for a recording of the friend's voice that came without a timing.
  const loudness = useLoudness(mine && recording !== null && timing === null ? recording.node : null);
  // While a timed recording plays, the shape the frame loop last read is the shape now.
  const talking = mine && recording && timing ? shape : mouthNow({ mine, recording: recording ? { timing: null, at: 0 } : null, loudness: recording && recording.node === undefined ? true : loudness, device });
  return { speaking: mine, talking };
}
