import type { IconName } from '../components/Icon';
import IconButton from '../components/IconButton';
import NavButton from '../components/NavButton';
import type { HomeScene } from '../worlds/types';
import styles from './Signpost.module.css';

// The places the signpost can send a child. The garden only names them; the screen that shows the garden goes.
export type GardenPlace = 'subjects:math' | 'subjects:ela' | 'subjects:reasoning' | 'stickers' | 'facts' | 'switch';
export const ALL_PLACES: readonly GardenPlace[] = ['subjects:math', 'subjects:ela', 'subjects:reasoning', 'stickers', 'facts', 'switch'];

const ICONS: Record<GardenPlace, IconName> = { 'subjects:math': 'math', 'subjects:ela': 'book', 'subjects:reasoning': 'shapes', stickers: 'star', facts: 'bolt', switch: 'person' };

interface Props {
  places: readonly GardenPlace[];
  words: HomeScene['signpost'];
  onPlace: (place: GardenPlace) => void;
  onClose: () => void;
}

// The signpost's board: one row for each place, each with its picture.
export default function Signpost({ places, words, onPlace, onClose }: Props) {
  const label = (place: GardenPlace): string => {
    if (place === 'subjects:math') return words.math;
    if (place === 'subjects:ela') return words.ela;
    if (place === 'subjects:reasoning') return words.reasoning;
    return words[place];
  };
  const marker = (place: GardenPlace): 'math' | 'ela' | 'reasoning' | undefined => (place === 'subjects:math' ? 'math' : place === 'subjects:ela' ? 'ela' : place === 'subjects:reasoning' ? 'reasoning' : undefined);
  return (
    <div className={styles.board} role="dialog" aria-label={words.open} data-signpost="" data-arrive="">
      <div className={styles.close}>
        <IconButton icon="close" label={words.close} onClick={onClose} />
      </div>
      {places.map((place) => (
        <NavButton key={place} icon={ICONS[place]} label={label(place)} marker={marker(place)} data-place={place} onClick={() => onPlace(place)} />
      ))}
    </div>
  );
}
