import Art from '../visuals/Art';
import { PALETTE } from '../visuals/palette';
import VisualView from '../visuals/VisualView';
import Character from '../cast/Character';
import StoryBackdrop from './StoryBackdrop';
import styles from './StoryScene.module.css';
import type { Scene } from './types';

const S = PALETTE.story;

// One page's picture: the backdrop, the friends who are there in their moods, and the things around them.
// Where each thing stands is a data attribute; the styles turn it into a place, so the data holds no sizes.
// Friends on the right face left, so everyone faces into the middle of the page.
export default function StoryScene({ scene, label }: { scene: Scene; label: string }) {
  const sign = scene.sign;
  const signWide = sign ? Math.max(40, sign.words.length * 7 + 16) : 0;
  return (
    <div className={styles.scene} role="img" aria-label={label} data-scene={scene.backdrop}>
      <div className={styles.backdrop}>
        <StoryBackdrop backdrop={scene.backdrop} />
      </div>
      {scene.picture && (
        <div className={styles.picture} data-at={scene.picture.at} data-scene-picture={scene.picture.visual.kind}>
          <VisualView visual={scene.picture.visual} />
        </div>
      )}
      {sign && (
        <div className={styles.sign} data-at={sign.at} data-sign={sign.words}>
          <svg viewBox={`0 0 ${signWide} 44`} aria-hidden="true">
            <rect x={signWide / 2 - 2.5} y="18" width="5" height="26" fill={S.signEdge} />
            <rect x="2" y="2" width={signWide - 4} height="22" rx="3" fill={S.sign} stroke={S.signEdge} strokeWidth="2" />
            <text x={signWide / 2} y="17.5" textAnchor="middle" fontSize="12" fontWeight="800" fill={PALETTE.ink}>
              {sign.words}
            </text>
          </svg>
        </div>
      )}
      {scene.props.map((prop, i) => (
        <div key={`prop-${i}`} className={styles.prop} data-at={prop.at} data-depth={prop.depth} data-size={prop.size} data-prop="">
          {prop.pictures.map((emoji, j) => (
            <Art key={j} emoji={emoji} />
          ))}
        </div>
      ))}
      {scene.cast.map((spot) => (
        <div key={spot.who} className={styles.friend} data-at={spot.at} data-depth={spot.depth} data-who={spot.who}>
          <Character who={spot.who} mood={spot.mood} flip={spot.at === 'right'} />
        </div>
      ))}
    </div>
  );
}
