import type { FlowerKind } from '../worlds/types';

// A flower's head, drawn around the point (30, 30) of the plant's picture, about 15 units across each way.
// Each head shape is drawn once here; a world's flower kinds choose a shape and two colours.

const AROUND = (count: number): number[] => Array.from({ length: count }, (_, i) => (360 / count) * i);

// The corners of a five-point star, out and in by turns.
const STAR = Array.from({ length: 10 }, (_, i) => {
  const reach = i % 2 === 0 ? 15 : 7;
  const turn = (Math.PI / 5) * i - Math.PI / 2;
  return `${(30 + Math.cos(turn) * reach).toFixed(1)},${(30 + Math.sin(turn) * reach).toFixed(1)}`;
}).join(' ');

export default function PlantHead({ kind }: { kind: FlowerKind }) {
  switch (kind.head) {
    case 'daisy':
      return (
        <g data-head="daisy">
          {AROUND(8).map((turn) => (
            <ellipse key={turn} cx="30" cy="20" rx="4.6" ry="8.5" fill={kind.petal} transform={`rotate(${turn} 30 30)`} />
          ))}
          <circle cx="30" cy="30" r="6" fill={kind.centre} />
        </g>
      );
    case 'tulip':
      return (
        <g data-head="tulip">
          <path d="M17 29 C 17 15, 21 13, 24 20 L 30 12 L 36 20 C 39 13, 43 15, 43 29 C 43 41, 17 41, 17 29 Z" fill={kind.petal} />
          <path d="M30 14 C 26 22, 26 32, 30 38 C 34 32, 34 22, 30 14 Z" fill={kind.centre} opacity="0.55" />
        </g>
      );
    case 'bell':
      return (
        <g data-head="bell">
          <path d="M16 37 C 16 15, 44 15, 44 37 L 39.300 33 L 34.700 37 L 30 33 L 25.300 37 L 20.700 33 Z" fill={kind.petal} />
          <circle cx="30" cy="38.500" r="3" fill={kind.centre} />
        </g>
      );
    case 'star':
      return (
        <g data-head="star">
          <polygon points={STAR} fill={kind.petal} strokeLinejoin="round" stroke={kind.petal} strokeWidth="3" />
          <circle cx="30" cy="30" r="4.5" fill={kind.centre} />
        </g>
      );
    case 'puff':
      return (
        <g data-head="puff">
          {AROUND(7).map((turn) => (
            <circle key={turn} cx="30" cy="20" r="5.5" fill={kind.petal} transform={`rotate(${turn} 30 30)`} />
          ))}
          <circle cx="30" cy="30" r="9" fill={kind.petal} />
          {AROUND(5).map((turn) => (
            <circle key={turn} cx="30" cy="25.500" r="1.4" fill={kind.centre} transform={`rotate(${turn} 30 30)`} />
          ))}
        </g>
      );
    case 'cattail':
      return (
        <g data-head="cattail">
          <path d="M30 14 L 30 5" stroke={kind.centre} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="24.500" y="12" width="11" height="28" rx="5.5" fill={kind.petal} />
        </g>
      );
  }
}
