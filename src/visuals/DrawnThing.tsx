import { INK } from './geometry';
import { PALETTE } from './palette';

export type ThingName = 'pencil' | 'crayon' | 'ribbon' | 'spoon';

interface Props {
  object: ThingName;
  x0: number; // its left end
  x1: number; // its right end
  y: number; // the top of the band 16 high it lies in
}

// A thing to be measured, lying flat from x0 to x1, inside an SVG picture. It is drawn, never an emoji, which would
// stretch out of shape. A ruler, two rulers and a row of paper clips all draw their thing with this.
export default function DrawnThing({ object, x0, x1, y }: Props) {
  return (
    <g data-object={object} data-from={x0} data-to={x1}>
      {object === 'pencil' && (
        <>
          <rect x={x0} y={y} width={Math.max(x1 - x0 - 14, 2)} height="16" fill={PALETTE.pencil} stroke={INK} strokeWidth="1.5" />
          <polygon points={`${x1 - 14},${y} ${x1},${y + 8} ${x1 - 14},${y + 16}`} fill={PALETTE.pencilWood} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points={`${x1 - 5},${y + 5.2} ${x1},${y + 8} ${x1 - 5},${y + 10.8}`} fill={INK} />
          <rect x={x0} y={y} width="7" height="16" fill={PALETTE.eraser} stroke={INK} strokeWidth="1.5" />
        </>
      )}
      {object === 'crayon' && (
        <>
          <rect x={x0} y={y} width={Math.max(x1 - x0 - 10, 2)} height="16" rx="2" fill={PALETTE.crayon} stroke={INK} strokeWidth="1.5" />
          <polygon points={`${x1 - 10},${y + 2} ${x1},${y + 8} ${x1 - 10},${y + 14}`} fill={PALETTE.crayonTip} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x={x0 + 8} y={y} width={Math.max((x1 - x0) * 0.4, 2)} height="16" fill={PALETTE.paper} opacity="0.45" />
        </>
      )}
      {object === 'ribbon' && <rect x={x0} y={y + 2} width={x1 - x0} height="12" fill={PALETTE.ribbon} stroke={INK} strokeWidth="1.5" />}
      {object === 'spoon' && (
        <>
          <rect x={x0} y={y + 5} width={Math.max(x1 - x0 - 18, 2)} height="6" rx="3" fill={PALETTE.spoon} stroke={INK} strokeWidth="1.5" />
          <ellipse cx={x1 - 10} cy={y + 8} rx="10" ry="7" fill={PALETTE.spoon} stroke={INK} strokeWidth="1.5" />
          <ellipse cx={x1 - 10} cy={y + 8} rx="5.5" ry="3.5" fill={PALETTE.spoonShade} />
        </>
      )}
    </g>
  );
}
