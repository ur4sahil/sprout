import type { ReactNode } from 'react';
import styles from './Icon.module.css';

// The app's own icons: one drawn set, in the colour of the text around them.
// Every button and menu uses these. Emoji are kept for a child's avatar, stickers and the pictures in questions.
const DRAWINGS = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  next: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  star: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8z" />,
  pencil: <path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3" />,
  check: <path d="M5 12l5 5 9-10" />,
  repeat: <path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />,
  play: <path d="M7 4l13 8-13 8z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  thumb: <path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7" />,
  printer: (
    <>
      <path d="M7 8V4h10v4M7 14h10v6H7z" />
      <rect x="4" y="8" width="16" height="8" rx="2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l3 3" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 6l2 4M12 6l2 4M17 6l2 4" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M10 8.5l5 2.5-5 2.5zM8 21h8" />
    </>
  ),
  skip: <path d="M5 5l9 7-9 7zM18 5v14" />,
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.700M12 17h.01" />
    </>
  ),
  eraser: <path d="M4 16l9-9 6 6-6 6H8zM9 21h11" />,
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.400 3.600-7 8-7s8 2.600 8 7" />
    </>
  ),
  math: <path d="M5 7h6M8 4v6M14 7h5M5 17h6M14 15h5M14 19h5" />,
  book: <path d="M4 5a8 8 0 0 1 8 2 8 8 0 0 1 8-2v13a8 8 0 0 0-8 2 8 8 0 0 0-8-2zM12 7v13" />,
  shapes: (
    <>
      <circle cx="7" cy="7" r="3" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <path d="M7 13l4 7H3zM17 14l3 3-3 3-3-3z" />
    </>
  ),
  balloon: (
    <>
      <ellipse cx="12" cy="9" rx="5.5" ry="6.5" />
      <path d="M12 15.500l-1 2h2zM12 17.500c0 2-2 2-2 4" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="7" width="10" height="13" rx="2" />
      <path d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4" />
    </>
  ),
  thought: (
    <>
      <path d="M7 16a4 4 0 0 1-.5-8 5 5 0 0 1 9.600-1.200A4.500 4.500 0 0 1 17 16z" />
      <circle cx="6" cy="20" r="1" />
    </>
  ),
  sprout: <path d="M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-3 2.500-5 6.500-5 0 3.500-2.500 5-6.500 5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof DRAWINGS;

// These are filled shapes, not outlines.
const SOLID: ReadonlySet<IconName> = new Set<IconName>(['play', 'skip']);

export default function Icon({ name }: { name: IconName }) {
  return (
    <svg className={`${styles.icon} ${SOLID.has(name) ? styles.solid : ''}`} viewBox="0 0 24 24" aria-hidden="true" data-icon={name}>
      {DRAWINGS[name]}
    </svg>
  );
}
