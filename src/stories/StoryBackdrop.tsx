import type { ReactNode } from 'react';
import { PALETTE } from '../visuals/palette';
import type { Backdrop } from './types';

// The place behind a story page, drawn flat in the garden's colours. Every backdrop is a still picture (nothing in
// it moves), so it needs no Calm form. Drawn 160 wide and 100 tall; the scene crops it to fit the screen.

const G = PALETTE.garden;
const S = PALETTE.story;

// A row of rounded hills across the picture.
function hills(crest: number, each: number, rise: number): string {
  let d = `M0 100 L0 ${crest}`;
  for (let x = 0, i = 0; x < 160; x += each, i += 1) d += ` Q${x + each / 2} ${crest - rise - (i % 2) * 2} ${x + each} ${crest}`;
  return `${d} L160 100 Z`;
}

// A plain sky, light at the bottom.
function sky(top: string, bottom: string): ReactNode {
  return (
    <>
      <rect x="0" y="0" width="160" height="100" fill={bottom} />
      <rect x="0" y="0" width="160" height="30" fill={top} opacity="0.7" />
    </>
  );
}

function tree(x: number, ground: number, tall: number, light: boolean): ReactNode {
  return (
    <g key={`tree-${x}`}>
      <rect x={x - 1.4} y={ground - tall * 0.5} width="2.8" height={tall * 0.5} fill={G.trunk} />
      <ellipse cx={x} cy={ground - tall * 0.72} rx={tall * 0.3} ry={tall * 0.34} fill={light ? G.treeLight : G.tree} />
    </g>
  );
}

function cloud(x: number, y: number): ReactNode {
  return (
    <g key={`cloud-${x}`} fill={G.cloud} opacity="0.9">
      <ellipse cx={x} cy={y} rx="11" ry="3.6" />
      <ellipse cx={x - 4} cy={y - 2.4} rx="5.5" ry="3.4" />
      <ellipse cx={x + 4} cy={y - 3} rx="6" ry="4" />
    </g>
  );
}

function drawing(backdrop: Backdrop): ReactNode {
  switch (backdrop) {
    case 'garden':
      return (
        <>
          {sky(G.sky.morning[0], G.sky.morning[1])}
          {cloud(30, 14)}
          {cloud(118, 10)}
          <path d={hills(48, 40, 6)} fill={G.hillFar} />
          <path d={hills(56, 32, 3)} fill={G.hillMid} />
          {/* a low wooden fence along the back of the garden */}
          {Array.from({ length: 17 }, (_, i) => (
            <rect key={i} x={i * 10 + 2} y="50" width="5" height="12" rx="1.5" fill={S.fence} stroke={S.fenceEdge} strokeWidth="0.5" />
          ))}
          <rect x="0" y="54" width="160" height="2" fill={S.fenceEdge} />
          <rect x="0" y="61" width="160" height="39" fill={G.grass} />
          {/* three beds of soil */}
          {[16, 66, 116].map((x) => (
            <ellipse key={x} cx={x + 14} cy="72" rx="20" ry="4" fill={G.soil} />
          ))}
          <rect x="0" y="88" width="160" height="12" fill={G.grassFront} />
        </>
      );
    case 'meadow':
      return (
        <>
          {sky(G.sky.afternoon[0], G.sky.afternoon[1])}
          {cloud(40, 12)}
          {cloud(100, 18)}
          {cloud(146, 9)}
          <path d={hills(46, 54, 7)} fill={S.meadowFar} />
          <path d={hills(58, 36, 5)} fill={G.hillMid} />
          <rect x="0" y="66" width="160" height="34" fill={G.grass} />
          {/* little flowers dotted over the grass */}
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={(i * 37) % 160} cy={62 + ((i * 13) % 30)} r="0.9" fill={i % 3 === 0 ? G.petalWhite : S.meadowFlower} />
          ))}
          <rect x="0" y="90" width="160" height="10" fill={G.grassFront} />
        </>
      );
    case 'woods':
      return (
        <>
          {sky(S.woodsSky, G.sky.morning[1])}
          <path d={hills(44, 30, 5)} fill={S.woodsFar} />
          {[6, 20, 34, 52, 70, 88, 108, 124, 140, 154].map((x, i) => tree(x, 58, 30 + (i % 3) * 6, i % 2 === 0))}
          <rect x="0" y="58" width="160" height="42" fill={S.woodsFloor} />
          {/* a little brook at the back, and a path that comes forward and forks */}
          <path d="M0 63 Q40 60 80 64 T160 62 L160 66 Q120 68 80 68 T0 67 Z" fill={S.brook} />
          <path d="M70 100 L76 80 L58 70 L62 69 L80 77 L98 69 L102 70 L84 80 L90 100 Z" fill={S.path} />
          {[20, 140].map((x) => tree(x, 92, 22, x > 100))}
        </>
      );
    case 'pond':
      return (
        <>
          {sky(G.sky.afternoon[0], G.sky.afternoon[1])}
          {cloud(52, 12)}
          {cloud(124, 16)}
          <path d={hills(48, 44, 6)} fill={G.hillFar} />
          <rect x="0" y="56" width="160" height="44" fill={G.grass} />
          <ellipse cx="80" cy="76" rx="62" ry="15" fill={G.pond} />
          <ellipse cx="74" cy="73" rx="46" ry="9" fill={G.pondLight} opacity="0.5" />
          {[
            [44, 78],
            [96, 82],
            [118, 72],
          ].map(([x, y]) => (
            <ellipse key={x} cx={x} cy={y} rx="7" ry="2.4" fill={G.lilyPad} />
          ))}
          {/* a log at the water's edge, for a frog to sit on */}
          <rect x="16" y="86" width="26" height="6" rx="3" fill={G.wood} />
          <ellipse cx="42" cy="89" rx="2.4" ry="3" fill={G.woodDark} />
          {[136, 141, 146].map((x, i) => (
            <g key={x}>
              <rect x={x} y={62 + i * 2} width="0.9" height="18" fill={G.stem} />
              <rect x={x - 0.6} y={60 + i * 2} width="2.1" height="6" rx="1" fill={G.cattail} />
            </g>
          ))}
        </>
      );
    case 'treehouse':
      return (
        <>
          {/* inside: plank walls, a window, a rug on the floor */}
          <rect x="0" y="0" width="160" height="100" fill={S.plank} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x="0" y={i * 8 + 4} width="160" height="0.6" fill={S.plankLine} />
          ))}
          <rect x="58" y="10" width="44" height="30" rx="2" fill={S.window} stroke={G.woodDark} strokeWidth="2.4" />
          <rect x="79.2" y="10" width="1.6" height="30" fill={G.woodDark} />
          <rect x="58" y="24.2" width="44" height="1.6" fill={G.woodDark} />
          {[66, 92].map((x) => (
            <ellipse key={x} cx={x} cy="16" rx="5" ry="2" fill={G.cloud} />
          ))}
          <rect x="0" y="72" width="160" height="28" fill={G.wood} />
          {Array.from({ length: 4 }, (_, i) => (
            <rect key={i} x="0" y={76 + i * 6} width="160" height="0.6" fill={G.woodDark} />
          ))}
          <ellipse cx="80" cy="88" rx="46" ry="7" fill={S.rug} />
        </>
      );
    case 'nightGarden':
      return (
        <>
          <rect x="0" y="0" width="160" height="100" fill={G.sky.night[1]} />
          <rect x="0" y="0" width="160" height="34" fill={G.sky.night[0]} />
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={(i * 41) % 160} cy={2 + ((i * 29) % 44)} r={0.35 + (i % 3) * 0.2} fill={G.starlight} />
          ))}
          <circle cx="132" cy="16" r="8" fill={S.moon} />
          <circle cx="136" cy="13" r="7" fill={G.sky.night[0]} />
          <path d={hills(54, 40, 6)} fill={S.nightHill} />
          <rect x="0" y="62" width="160" height="38" fill={S.nightGrass} />
          {[14, 150].map((x) => (
            <ellipse key={x} cx={x} cy="62" rx="14" ry="7" fill={S.nightBush} />
          ))}
        </>
      );
  }
}

export default function StoryBackdrop({ backdrop }: { backdrop: Backdrop }) {
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true" data-backdrop={backdrop} width="100%" height="100%">
      {drawing(backdrop)}
    </svg>
  );
}
