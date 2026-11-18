import type { ReactNode } from 'react';
import type { BackdropName } from '../lessons/types';
import { PALETTE } from '../visuals/palette';
import styles from './StageBackdrop.module.css';

// The place behind a lesson (game feel, phase 6). Drawn in stage squares, anchored to the bottom: the surface the
// pieces stand on always starts three squares above the bottom edge (row 3 of a 6-row stage), whatever the stage's
// size. The middle stays plain and pale; the small things that make it a place sit at the edges and the top.

interface Props {
  place: BackdropName;
  cols: number;
  rows: number;
}

const P = PALETTE.places;

// `n` copies of something along the stage, `step` squares apart, starting at `from`.
function along(cols: number, step: number, from: number, draw: (x: number, i: number) => ReactNode): ReactNode[] {
  return Array.from({ length: Math.max(0, Math.ceil((cols - from) / step)) }, (_, i) => draw(from + i * step, i));
}

function table(cols: number, rows: number): ReactNode {
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={PALETTE.wall} />
      {along(cols, 1.2, 0, (x) => <rect key={x} x={x} y="0" width="0.6" height="3" fill={PALETTE.wallStripe} />)}
      <rect x="0.2" y="3" width={cols - 0.4} height="0.35" rx="0.08" fill={PALETTE.tableTop} />
      <rect x="0.3" y="3.35" width={cols - 0.6} height={rows - 3.35} fill={PALETTE.tableEdge} />
      <rect x="0.5" y="3.35" width={cols - 1} height="0.12" fill={PALETTE.tableLeg} opacity="0.5" />
    </>
  );
}

// A picnic: a sky with a sun and a cloud, a far hill, and a checked blanket on the grass.
function picnic(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.picnic.ground, ...P.picnic.trim };
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.sky} />
      <circle cx={cols - 0.8} cy="0.75" r="0.45" fill={c.sun} />
      <ellipse cx="1.4" cy="0.7" rx="0.7" ry="0.22" fill={c.cloud} />
      <ellipse cx="1.9" cy="0.55" rx="0.45" ry="0.2" fill={c.cloud} />
      <ellipse cx={cols * 0.3} cy={top} rx={cols * 0.45} ry="0.6" fill={c.hill} />
      <ellipse cx={cols * 0.8} cy={top} rx={cols * 0.35} ry="0.45" fill={c.hill} />
      <rect x="0" y={top} width={cols} height={rows - top} fill={c.grass} />
      <rect x="0.35" y={top + 0.15} width={cols - 0.7} height={rows - top - 0.3} rx="0.12" fill={c.blanket} />
      {along(cols - 0.7, 1, 0.5, (x) => <rect key={`v${x}`} x={0.35 + x} y={top + 0.15} width="0.5" height={rows - top - 0.3} fill={c.check} opacity="0.55" />)}
      {along(rows - top - 0.3, 1, 0.5, (y) => <rect key={`h${y}`} x="0.35" y={top + 0.15 + y} width={cols - 0.7} height="0.5" fill={c.check} opacity="0.55" />)}
    </>
  );
}

// A market stall: a striped awning along the top, two poles, and a wooden counter.
function stall(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.stall.ground, ...P.stall.trim };
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.wall} />
      <rect x="0.12" y="0.5" width="0.18" height={top} fill={c.pole} />
      <rect x={cols - 0.3} y="0.5" width="0.18" height={top} fill={c.pole} />
      {along(cols, 1, 0, (x, i) => (
        <path key={x} d={`M${x} 0 h1 v0.5 a0.5 0.22 0 0 1 -1 0 z`} fill={i % 2 === 0 ? c.awningA : c.awningB} />
      ))}
      <rect x="0" y={top} width={cols} height="0.3" rx="0.06" fill={c.counterTop} />
      <rect x="0.1" y={top + 0.3} width={cols - 0.2} height={rows - top - 0.3} fill={c.counter} />
      {along(cols, 1.6, 0.8, (x) => <rect key={x} x={x} y={top + 0.3} width="0.06" height={rows - top - 0.3} fill={c.plank} />)}
    </>
  );
}

// A workshop: a pegboard wall with a hammer and a ruler hung at the edges, and a workbench.
function workshop(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.workshop.ground, ...P.workshop.trim };
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.board} />
      {along(cols, 0.6, 0.3, (x) => along(top, 0.6, 0.3, (y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.05" fill={c.peg} />))}
      <rect x="0.55" y="0.35" width="0.14" height="1.1" rx="0.05" fill={c.tool} />
      <rect x="0.3" y="0.3" width="0.65" height="0.28" rx="0.06" fill={c.tool} />
      <rect x={cols - 0.75} y="0.3" width="0.3" height="1.6" rx="0.04" fill={c.tool} />
      <rect x="0" y={top} width={cols} height="0.32" rx="0.06" fill={c.benchTop} />
      <rect x="0.15" y={top + 0.32} width={cols - 0.3} height={rows - top - 0.32} fill={c.bench} />
      <rect x="0.15" y={top + 0.32} width={cols - 0.3} height="0.08" fill={c.benchLine} />
      <rect x="0.4" y={top + 0.32} width="0.12" height={rows - top - 0.32} fill={c.benchLine} />
      <rect x={cols - 0.52} y={top + 0.32} width="0.12" height={rows - top - 0.32} fill={c.benchLine} />
    </>
  );
}

// A building site: a crane against the sky, a cone, a plank platform on sand, and a row of bricks.
function site(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.site.ground, ...P.site.trim };
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.sky} />
      <ellipse cx={cols - 1.6} cy="0.6" rx="0.6" ry="0.2" fill={c.cloud} />
      <rect x="0.45" y="0.3" width="0.16" height={top - 0.3} fill={c.crane} />
      <rect x="0.2" y="0.3" width="2.2" height="0.14" fill={c.crane} />
      <rect x="2.25" y="0.44" width="0.04" height="0.7" fill={c.crane} />
      <rect x="2.12" y="1.14" width="0.3" height="0.16" rx="0.04" fill={c.crane} />
      <path d={`M${cols - 0.75} ${top} l0.25 -0.75 l0.25 0.75 z`} fill={c.cone} />
      <rect x="0" y={top} width={cols} height={rows - top} fill={c.sand} />
      <rect x="0.3" y={top} width={cols - 0.6} height="0.3" rx="0.05" fill={c.plank} />
      {along(cols, 0.9, 0.05, (x, i) => <rect key={x} x={x} y={rows - 0.32} width="0.8" height="0.26" rx="0.04" fill={c.brick} opacity={i % 2 === 0 ? 1 : 0.7} />)}
    </>
  );
}

// A shop: shelves of jars at the two ends of the wall, and a long counter with a panel.
function shop(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.shop.ground, ...P.shop.trim };
  const shelf = (x: number, key: string): ReactNode => (
    <g key={key}>
      {[0.9, 1.9].filter((y) => y < top - 0.2).map((y) => (
        <g key={y}>
          <rect x={x} y={y} width="1.3" height="0.1" fill={c.shelf} />
          <rect x={x + 0.1} y={y - 0.45} width="0.32" height="0.45" rx="0.08" fill={c.jarA} />
          <rect x={x + 0.5} y={y - 0.35} width="0.3" height="0.35" rx="0.05" fill={c.jarB} />
          <rect x={x + 0.88} y={y - 0.45} width="0.32" height="0.45" rx="0.08" fill={c.jarA} />
        </g>
      ))}
    </g>
  );
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.wall} />
      {shelf(0.15, 'left')}
      {shelf(cols - 1.45, 'right')}
      <rect x="0" y={top} width={cols} height="0.3" rx="0.06" fill={c.counterTop} />
      <rect x="0.1" y={top + 0.3} width={cols - 0.2} height={rows - top - 0.3} fill={c.counter} />
      <rect x="0.5" y={top + 0.65} width={cols - 1} height={rows - top - 1.1} rx="0.12" fill="none" stroke={c.panel} strokeWidth="0.08" />
    </>
  );
}

// A treehouse: board walls, a round window with leaves at its corner, and a plank floor.
function treehouse(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.treehouse.ground, ...P.treehouse.trim };
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.boards} />
      {along(cols, 0.8, 0.8, (x) => <rect key={x} x={x} y="0" width="0.05" height={top} fill={c.boardLine} />)}
      <circle cx="1" cy="1" r="0.62" fill={c.frame} />
      <circle cx="1" cy="1" r="0.5" fill={c.window} />
      <rect x="0.97" y="0.5" width="0.06" height="1" fill={c.frame} />
      <rect x="0.5" y="0.97" width="1" height="0.06" fill={c.frame} />
      <ellipse cx={cols - 0.5} cy="0.3" rx="0.7" ry="0.35" fill={c.leaf} />
      <ellipse cx={cols - 1.3} cy="0.15" rx="0.55" ry="0.25" fill={c.leaf} />
      <ellipse cx={cols - 0.25} cy="0.85" rx="0.35" ry="0.3" fill={c.leaf} />
      <rect x="0" y={top} width={cols} height="0.28" fill={c.floorTop} />
      <rect x="0" y={top + 0.28} width={cols} height={rows - top - 0.28} fill={c.floor} />
      {[0.9, 1.7].map((y) => <rect key={y} x="0" y={top + y} width={cols} height="0.05" fill={c.floorLine} />)}
    </>
  );
}

// A reading nook: bookshelves at both ends, and a soft rug on the floor.
function nook(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.nook.ground, ...P.nook.trim };
  const books = [c.bookA, c.bookB, c.bookC, c.bookA, c.bookC];
  const shelf = (x: number, key: string): ReactNode => (
    <g key={key}>
      {[1, 2].filter((y) => y < top).map((y) => (
        <g key={y}>
          <rect x={x} y={y} width="1.15" height="0.09" fill={c.shelf} />
          {books.map((book, i) => (
            <rect key={i} x={x + 0.06 + i * 0.21} y={y - (i % 2 === 0 ? 0.62 : 0.52)} width="0.17" height={i % 2 === 0 ? 0.62 : 0.52} rx="0.03" fill={book} />
          ))}
        </g>
      ))}
    </g>
  );
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.wall} />
      {shelf(0.15, 'left')}
      {shelf(cols - 1.3, 'right')}
      <rect x="0" y={top} width={cols} height={rows - top} fill={c.floor} />
      <rect x="0.4" y={top + 0.2} width={cols - 0.8} height={rows - top - 0.35} rx="0.4" fill={c.rug} />
      <rect x="0.6" y={top + 0.4} width={cols - 1.2} height={rows - top - 0.75} rx="0.3" fill="none" stroke={c.rugEdge} strokeWidth="0.08" />
    </>
  );
}

// A pond: reeds at the edges with cattails, a grassy far bank, and calm water with lily pads in the corners.
function pond(cols: number, rows: number, top: number): ReactNode {
  const c = { ...P.pond.ground, ...P.pond.trim };
  const reeds = (x: number, key: string): ReactNode => (
    <g key={key}>
      {[0, 0.22, 0.44].map((dx, i) => (
        <g key={dx}>
          <rect x={x + dx} y={top - 1.6 + i * 0.25} width="0.06" height={1.6 - i * 0.25} fill={c.reed} />
          <rect x={x + dx - 0.04} y={top - 1.6 + i * 0.25} width="0.14" height="0.4" rx="0.07" fill={c.cattail} />
        </g>
      ))}
    </g>
  );
  return (
    <>
      <rect x="0" y="0" width={cols} height={rows} fill={c.sky} />
      <rect x="0" y={top - 0.35} width={cols} height="0.4" fill={c.bank} />
      {reeds(0.25, 'left')}
      {reeds(cols - 0.75, 'right')}
      <rect x="0" y={top} width={cols} height={rows - top} fill={c.water} />
      {[0.8, 1.7, 2.5].map((y, i) => (
        <rect key={y} x={i % 2 === 0 ? 1.2 : 2.2} y={top + y} width={cols - 3.4} height="0.05" rx="0.025" fill={c.ripple} />
      ))}
      <ellipse cx="0.55" cy={rows - 0.35} rx="0.5" ry="0.2" fill={c.pad} />
      <ellipse cx={cols - 0.6} cy={rows - 0.5} rx="0.45" ry="0.18" fill={c.pad} />
    </>
  );
}

export default function StageBackdrop({ place, cols, rows }: Props) {
  const top = rows - 3;
  let drawn: ReactNode;
  switch (place) {
    case 'table':
      drawn = table(cols, rows);
      break;
    case 'picnic':
      drawn = picnic(cols, rows, top);
      break;
    case 'stall':
      drawn = stall(cols, rows, top);
      break;
    case 'workshop':
      drawn = workshop(cols, rows, top);
      break;
    case 'site':
      drawn = site(cols, rows, top);
      break;
    case 'shop':
      drawn = shop(cols, rows, top);
      break;
    case 'treehouse':
      drawn = treehouse(cols, rows, top);
      break;
    case 'nook':
      drawn = nook(cols, rows, top);
      break;
    case 'pond':
      drawn = pond(cols, rows, top);
      break;
  }
  return (
    <svg className={styles.backdrop} viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none" aria-hidden="true" data-backdrop={place}>
      {drawn}
    </svg>
  );
}
