import type { PointerEvent } from 'react';
import { useRef, useState } from 'react';
import IconButton from './IconButton';
import styles from './Scratchpad.module.css';

interface Props {
  onClose: () => void;
}

type Point = [number, number];

// A drawing layer over the question, for working things out (plan section 10, Scratchpad).
// A finger or a pencil draws. It has undo and clear, and nothing is ever saved: closing it throws
// the drawing away. The layer does not scroll or zoom the page while a line is being drawn.
export default function Scratchpad({ onClose }: Props) {
  const [lines, setLines] = useState<Point[][]>([]);
  const drawing = useRef(false);

  const place = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return [Math.round(event.clientX - box.left), Math.round(event.clientY - box.top)];
  };

  function start(event: PointerEvent<SVGSVGElement>): void {
    drawing.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = place(event);
    setLines((all) => [...all, [point]]);
  }

  function move(event: PointerEvent<SVGSVGElement>): void {
    if (!drawing.current) return;
    const point = place(event);
    setLines((all) => all.map((line, i) => (i === all.length - 1 ? [...line, point] : line)));
  }

  const end = (): void => {
    drawing.current = false;
  };

  return (
    <div className={styles.layer} role="dialog" aria-label="Scratchpad" data-scratchpad="" data-lines={lines.length}>
      <svg className={styles.paper} role="img" aria-label="Drawing area" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        {lines.map((line, i) =>
          // A tap leaves a dot. A drag leaves a line.
          line.length === 1 ? <circle key={i} className={styles.dot} cx={line[0]?.[0]} cy={line[0]?.[1]} r="3" /> : <polyline key={i} className={styles.ink} points={line.map(([x, y]) => `${x},${y}`).join(' ')} />,
        )}
      </svg>
      <div className={styles.tools}>
        <IconButton icon="back" label="Undo" disabled={lines.length === 0} onClick={() => setLines((all) => all.slice(0, -1))} />
        <IconButton icon="eraser" label="Clear" disabled={lines.length === 0} onClick={() => setLines([])} />
        <IconButton icon="close" label="Close the scratchpad" onClick={onClose} />
      </div>
    </div>
  );
}
