import { useState } from 'react';
import { isMuted } from '../../audio/mute';
import type { SfxName } from '../../audio/sfx';
import { playSfx, unlockAudio } from '../../audio/sfx';
import { speak, stop } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import Notice from '../../components/Notice';
import { ALPHABET } from '../../content/data/letters';
import type { Say } from '../../engine/types';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';

const SOUNDS: { name: SfxName; label: string }[] = [
  { name: 'chime', label: 'Chime' },
  { name: 'fanfare', label: 'Fanfare' },
  { name: 'clap', label: 'Clap' },
];

// Plays every letter name, the numbers 0 to 20 and each sound effect, so a parent hears exactly what the child will hear on this iPad.
export default function SoundCheck() {
  const [playing, setPlaying] = useState<string | null>(null);

  async function say(what: string, parts: Say): Promise<void> {
    await unlockAudio();
    setPlaying(what);
    await speak(parts);
    setPlaying((current) => (current === what ? null : current));
  }

  return (
    <ParentArea page="settings" title="Sound check">
      <section className={styles.panel} aria-label="Sound check">
        <Notice role="status">Everything is said in the recorded voice. With no internet, this device's own voice is used instead.</Notice>
        {isMuted() && <Notice role="alert">This device is muted in Settings. Nothing will play until that is turned off.</Notice>}
        <CenterRow>
          <BigButton disabled={playing !== null} onClick={() => void say('letters', ALPHABET.map((letter) => ({ letter })))}>
            {playing === 'letters' ? 'Playing letters' : 'Play the letter names'}
          </BigButton>
          <BigButton disabled={playing !== null} onClick={() => void say('numbers', Array.from({ length: 21 }, (_, number) => ({ number })))}>
            {playing === 'numbers' ? 'Playing numbers' : 'Play the numbers 0 to 20'}
          </BigButton>
          {playing !== null && (
            <BigButton
              onClick={() => {
                stop();
                setPlaying(null);
              }}
            >
              Stop
            </BigButton>
          )}
        </CenterRow>
        <CenterRow>
          {SOUNDS.map((sound) => (
            <BigButton
              key={sound.name}
              onClick={() => {
                void unlockAudio().then(() => playSfx(sound.name));
              }}
            >
              {sound.label}
            </BigButton>
          ))}
        </CenterRow>
        <p className={styles.soft}>If the voice plays but the chime does not, turn off mute in Control Center on the iPad.</p>
      </section>
    </ParentArea>
  );
}
