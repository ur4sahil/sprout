import BigButton from '../components/BigButton';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import type { FlowerKind, GrowthStage, HomeScene } from '../worlds/types';
import Plant from './Plant';
import styles from './PlantCard.module.css';

interface Props {
  name: string; // the skill's name
  stage: GrowthStage;
  droop: boolean;
  kind: FlowerKind;
  home: HomeScene; // the world's words
  onPractice: () => void;
  onLesson: () => void;
  onHear: () => void;
  onClose: () => void;
}

// The small card a tapped plant opens: the skill's name, its stage in the world's words, and two ways in.
// A child who cannot read has the plant's own picture, the speaker, and an icon on each button.
export default function PlantCard({ name, stage, droop, kind, home, onPractice, onLesson, onHear, onClose }: Props) {
  return (
    <div className={styles.card} role="dialog" aria-label={name} data-plant-card="" data-arrive="">
      <div className={styles.top}>
        <span className={styles.picture}>
          <Plant stage={stage} kind={kind} droop={droop} />
        </span>
        <div className={styles.words}>
          <h2 className={styles.name}>{name}</h2>
          <p className={styles.stage} data-card-stage={stage}>
            {home.stages[stage]}
          </p>
          {droop && (
            <p className={styles.stage} data-card-thirsty="">
              {home.thirsty}
            </p>
          )}
        </div>
        <IconButton icon="speaker" label={`${home.card.hear}: ${name}`} onClick={onHear} />
        <IconButton icon="close" label={home.card.close} onClick={onClose} />
      </div>
      <div className={styles.ways}>
        <BigButton size="kid" className={styles.way} data-card-way="practice" onClick={onPractice}>
          <Icon name="pencil" />
          {home.card.practice}
        </BigButton>
        <BigButton size="kid" tone="quiet" className={styles.way} data-card-way="learn" onClick={onLesson}>
          <Icon name="bulb" />
          {home.card.lesson}
        </BigButton>
      </div>
    </div>
  );
}
