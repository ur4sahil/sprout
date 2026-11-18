import { useEffect, useRef, useState } from 'react';
import { FIGURES, inside, pointsText } from '../engine/figures';
import type { Point } from '../engine/figures';
import { INK } from '../visuals/geometry';
import { PALETTE } from '../visuals/palette';
import { feelSound } from './itemFeel';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Fill a shape with pieces (the owner's request, Nov 18, 2026). The big shape shows a dashed spot for each piece.
// A piece is dragged from the tray onto a spot, or tapped and then a spot tapped; it snaps in and the count goes up.
// A placed piece is tapped to take it out. With `odd`, the tray also holds a piece that does not fit: it slides back.
// The answer is how many pieces were placed. The tray holds one more fitting piece than is needed.
// A piece that fits lands with a soft sound. When the answer is right the filled shape glows and turns once.

type Kind = 'fit' | 'odd';

// A polygon moved so its own box starts at 0,0, and that box's size: for drawing a piece in the tray.
function framed(polygon: readonly Point[]): { points: Point[]; w: number; h: number } {
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { points: polygon.map(([x, y]) => [x - left, y - top] as Point), w: Math.max(...xs) - left, h: Math.max(...ys) - top };
}

function PieceDrawing({ polygon, colour }: { polygon: readonly Point[]; colour: string }) {
  const { points, w, h } = framed(polygon);
  const pad = 4;
  return (
    <svg className={styles.fillPiece} viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`} aria-hidden="true">
      <polygon points={pointsText(points)} fill={colour} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function FillShapeItem({ question, disabled, onChange, right }: ItemProps<'fillShape'>) {
  const figure = FIGURES[question.figure];
  const [placed, setPlaced] = useState<boolean[]>(() => figure.slots.map(() => false));
  const [held, setHeld] = useState<Kind | null>(null); // a piece picked up by a tap
  const [bounced, setBounced] = useState(0); // goes up each time a piece does not fit, to replay the shake
  const [drag, setDrag] = useState<{ kind: Kind; x: number; y: number } | null>(null);
  const shape = useRef<SVGSVGElement>(null);
  const count = placed.filter(Boolean).length;
  const fitLeft = figure.slots.length + 1 - count;

  useEffect(() => {
    onChange(count > 0 ? { value: count } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the count matters
  }, [count]);

  // Puts a piece of this kind on this spot, if it fits there.
  function put(kind: Kind, slot: number): void {
    if (disabled) return;
    if (kind === 'odd' || placed[slot]) {
      setBounced((n) => n + 1);
      return;
    }
    if (fitLeft <= 0) return;
    feelSound('drop');
    setPlaced((now) => now.map((was, i) => (i === slot ? true : was)));
    setHeld(null);
  }

  function takeOut(slot: number): void {
    if (disabled) return;
    setPlaced((now) => now.map((was, i) => (i === slot ? false : was)));
  }

  // The spot under a point on the screen, or null.
  function spotAt(clientX: number, clientY: number): number | null {
    const box = shape.current?.getBoundingClientRect();
    if (!box) return null;
    const point: Point = [((clientX - box.left) / box.width) * 100, ((clientY - box.top) / box.height) * 100];
    const found = figure.slots.findIndex((slot) => inside(point, slot));
    return found === -1 ? null : found;
  }

  function overShape(clientX: number, clientY: number): boolean {
    const box = shape.current?.getBoundingClientRect();
    return !!box && clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
  }

  // Dragging a piece from the tray: it follows the finger and lands on the spot it is let go over.
  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent): void => setDrag((now) => (now ? { ...now, x: event.clientX, y: event.clientY } : now));
    const drop = (event: PointerEvent): void => {
      const spot = spotAt(event.clientX, event.clientY);
      if (spot !== null) put(drag.kind, spot);
      else if (drag.kind === 'odd' && overShape(event.clientX, event.clientY)) setBounced((n) => n + 1);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop, { once: true });
    window.addEventListener('pointercancel', () => setDrag(null), { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', drop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one listener pair for each drag
  }, [drag !== null]);

  const fitPiece = figure.slots[0] ?? [];
  const label = (kind: Kind): string => (kind === 'fit' ? `A ${figure.piece}` : `A different ${figure.piece}`);

  return (
    <div className={styles.column} data-fill={question.figure} data-placed={count}>
      <svg ref={shape} className={`${styles.fillShape} ${right ? styles.fillDone : ''}`} data-feel={right ? '' : undefined} data-turned={right ? '' : undefined} viewBox="0 0 100 100" role="group" aria-label={`A ${figure.whole} to fill with ${figure.piece}s`}>
        <polygon points={pointsText(figure.outline)} fill={PALETTE.paper} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        {figure.slots.map((slot, i) => (
          <polygon
            key={i}
            points={pointsText(slot)}
            className={placed[i] ? styles.fillPlaced : styles.fillSpot}
            fill={placed[i] ? PALETTE.solidMid : 'transparent'}
            stroke={INK}
            strokeWidth={placed[i] ? 2 : 1.2}
            strokeDasharray={placed[i] ? undefined : '4 3'}
            strokeLinejoin="round"
            role="button"
            aria-label={placed[i] ? `${figure.piece} in spot ${i + 1}. Tap to take it out` : `Empty spot ${i + 1}`}
            data-spot={i}
            data-filled={placed[i] ? '' : undefined}
            onClick={() => (placed[i] ? takeOut(i) : held ? put(held, i) : undefined)}
          />
        ))}
      </svg>
      <p className={styles.fillCount} aria-live="polite" data-fill-count={count}>
        {count} {count === 1 ? figure.piece : `${figure.piece}s`}
      </p>
      <div className={styles.options} role="group" aria-label="Pieces" key={bounced} data-bounced={bounced > 0 ? '' : undefined}>
        {Array.from({ length: Math.max(fitLeft, 0) }, (_, i) => (
          <button
            key={`fit${i}`}
            type="button"
            className={`${styles.tile} ${styles.small} ${held === 'fit' && i === 0 ? styles.picked : ''}`}
            aria-label={label('fit')}
            aria-pressed={held === 'fit' && i === 0}
            disabled={disabled}
            data-tray="fit"
            onClick={() => setHeld(held === 'fit' ? null : 'fit')}
            onPointerDown={(event) => {
              if (!disabled && event.pointerType !== 'mouse') setDrag({ kind: 'fit', x: event.clientX, y: event.clientY });
            }}
          >
            <PieceDrawing polygon={fitPiece} colour={PALETTE.solidMid} />
          </button>
        ))}
        {question.odd && (
          <button
            type="button"
            className={`${styles.tile} ${styles.small} ${styles.fillOdd} ${held === 'odd' ? styles.picked : ''}`}
            aria-label={label('odd')}
            aria-pressed={held === 'odd'}
            disabled={disabled}
            data-tray="odd"
            onClick={() => setHeld(held === 'odd' ? null : 'odd')}
            onPointerDown={(event) => {
              if (!disabled && event.pointerType !== 'mouse') setDrag({ kind: 'odd', x: event.clientX, y: event.clientY });
            }}
          >
            <PieceDrawing polygon={figure.odd} colour={PALETTE.solidLight} />
          </button>
        )}
      </div>
      {drag && (
        <div className={styles.fillGhost} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <PieceDrawing polygon={drag.kind === 'fit' ? fitPiece : figure.odd} colour={drag.kind === 'fit' ? PALETTE.solidMid : PALETTE.solidLight} />
        </div>
      )}
    </div>
  );
}
