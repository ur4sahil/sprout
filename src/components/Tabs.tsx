import Icon, { type IconName } from './Icon';
import styles from './Tabs.module.css';

interface Props {
  label: string;
  tabs: { id: string; label: string; icon?: IconName }[];
  current: string;
  onPick: (id: string) => void;
  look?: 'buttons' | 'strip'; // strip: one line with the current page underlined, for a page menu
}

// A row of tabs, such as the grades on a subject page.
export default function Tabs({ label, tabs, current, onPick, look = 'buttons' }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label} data-look={look}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={tab.id === current} className={`${styles.tab} ${tab.id === current ? styles.current : ''}`} onClick={() => onPick(tab.id)}>
          {tab.icon && <Icon name={tab.icon} />}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
