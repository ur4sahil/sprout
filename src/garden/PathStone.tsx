import type { CSSProperties } from 'react';
import { PALETTE } from '../visuals/palette';
import type { Stone } from './layout';
import { SLOT } from './layout';
import styles from './PathStone.module.css';

interface Props {
  stone: Stone;
  label: string; // what the stone is for, for a screen reader
  onOpen: (stone: Stone) => void;
}

const C = PALETTE.garden;

// The picture on a stone says what kind of step it is, with no words: a watering can for a review, a pencil for
// practice, a seed packet for a new skill, a basket for the Mixed bag.
function picture(icon: Stone['icon']) {
  switch (icon) {
    case 'can':
      return (
        <g data-stone-icon="can">
          <path d="M24 20 L 15 11" stroke={C.canDark} strokeWidth="3" strokeLinecap="round" />
          <path d="M38 17 C 46 17, 46 29, 38 29" stroke={C.canDark} strokeWidth="2.5" fill="none" />
          <rect x="23" y="14" width="16" height="19" rx="2.5" fill={C.can} />
          <rect x="23" y="14" width="16" height="4" rx="2" fill={C.canDark} />
        </g>
      );
    case 'pencil':
      return (
        <g data-stone-icon="pencil" transform="rotate(35 30 22)">
          <rect x="26" y="6" width="8" height="24" rx="1.5" fill={C.pencil} stroke={C.pencilTip} strokeWidth="1" />
          <path d="M26 30 L 30 38 L 34 30 Z" fill={C.packet} stroke={C.pencilTip} strokeWidth="1" />
          <path d="M28.5 35 L 30 38 L 31.5 35 Z" fill={C.pencilTip} />
          <rect x="26" y="6" width="8" height="4" rx="1.5" fill={C.petalPink} />
        </g>
      );
    case 'seed':
      return (
        <g data-stone-icon="seed">
          <rect x="20" y="8" width="20" height="26" rx="3" fill={C.packet} stroke={C.packetStick} strokeWidth="1.5" />
          <rect x="20" y="8" width="20" height="7" rx="3" fill={C.packetBand} />
          <path d="M30 30 L 30 23" stroke={C.stem} strokeWidth="2" strokeLinecap="round" />
          <path d="M30 24 C 25 24, 23 21, 23 18 C 27 18, 30 21, 30 24 Z" fill={C.leaf} />
          <path d="M30 24 C 35 24, 37 21, 37 18 C 33 18, 30 21, 30 24 Z" fill={C.bud} />
        </g>
      );
    case 'basket':
      return (
        <g data-stone-icon="basket">
          <path d="M20 20 C 20 6, 40 6, 40 20" stroke={C.basketDark} strokeWidth="3" fill="none" />
          <path d="M16 19 L 44 19 L 40 35 L 20 35 Z" fill={C.basket} stroke={C.basketDark} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M18 24 L 42 24 M 19 29 L 41 29" stroke={C.basketDark} strokeWidth="1.2" />
        </g>
      );
  }
}

// One of today's stepping stones, as a button that opens its part of the plan. A finished stone has become a
// patch of flowers. A locked Mixed bag is grey with a padlock, and cannot be opened yet.
export default function PathStone({ stone, label, onOpen }: Props) {
  const place = { '--set-x': stone.x - SLOT / 2, '--set-y': stone.y - SLOT / 2 } as CSSProperties;
  const locked = stone.state === 'locked';
  return (
    <button type="button" className={styles.stone} style={place} aria-label={label} disabled={locked} data-stone={stone.index} data-stone-part={stone.part.kind} data-stone-state={stone.state} data-skill={stone.skillId ?? undefined} onClick={() => onOpen(stone)}>
      <svg className={styles.picture} viewBox="0 0 60 60" aria-hidden="true">
        {stone.state === 'next' && <ellipse cx="30" cy="42" rx="29" ry="15" fill="none" stroke={C.sunRay} strokeWidth="2.5" />}
        <ellipse cx="30" cy="44" rx="25" ry="11" fill={C.stoneEdge} />
        <ellipse cx="30" cy="42" rx="25" ry="11" fill={locked ? C.stoneLocked : stone.state === 'next' ? C.stoneNext : C.stone} />
        {stone.state === 'done' ? (
          <g data-stone-icon="flowers">
            <path d="M12 44 C 14 34, 20 32, 22 42 C 24 30, 32 28, 34 42 C 38 32, 46 34, 48 44 Z" fill={C.leaf} />
            {[
              { x: 19, y: 30, petal: C.petalPink },
              { x: 31, y: 24, petal: C.petalYellow },
              { x: 42, y: 31, petal: C.petalBlue },
            ].map((flower) => (
              <g key={flower.x}>
                <path d={`M${flower.x} ${flower.y} L ${flower.x} 42`} stroke={C.stem} strokeWidth="1.8" />
                <circle cx={flower.x} cy={flower.y} r="5.5" fill={flower.petal} />
                <circle cx={flower.x} cy={flower.y} r="2" fill={C.centreGold} />
              </g>
            ))}
          </g>
        ) : (
          <g opacity={locked ? 0.45 : 1}>{picture(stone.icon)}</g>
        )}
        {locked && (
          <g data-stone-icon="padlock">
            <path d="M36 40 L 36 35 C 36 28, 48 28, 48 35 L 48 40" stroke={C.padlock} strokeWidth="2.5" fill="none" />
            <rect x="33" y="39" width="18" height="14" rx="3" fill={C.padlock} />
            <circle cx="42" cy="46" r="2" fill={C.stone} />
          </g>
        )}
      </svg>
    </button>
  );
}
