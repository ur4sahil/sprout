import BigButton from './BigButton';
import Icon from './Icon';
import styles from './UpdateNotice.module.css';

interface Props {
  updating: boolean; // the button was pressed and the new version is taking over
  onUpdate: () => void;
}

// A strip across the top when a new version is ready. Nothing changes until the button is pressed.
export default function UpdateNotice({ updating, onUpdate }: Props) {
  return (
    <div className={styles.strip} role="status" data-update-ready="">
      <span className={styles.words}>A new version of Sprout is ready.</span>
      <BigButton disabled={updating} onClick={onUpdate}>
        <Icon name="repeat" />
        {updating ? 'Updating' : 'Update now'}
      </BigButton>
    </div>
  );
}
