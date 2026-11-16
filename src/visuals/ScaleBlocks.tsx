import { INK } from './geometry';
import { PALETTE } from './palette';

const BLOCK = 30;

// The number blocks on one pan of the balance scale. A blank block shows a question mark.
export default function ScaleBlocks({ values, centre }: { values: (number | 'blank')[]; centre: number }) {
  const left = centre - (values.length * (BLOCK + 4) - 4) / 2;
  return (
    <>
      {values.map((value, i) => (
        <g key={i} data-block={value}>
          <rect x={left + i * (BLOCK + 4)} y={52 - BLOCK} width={BLOCK} height={BLOCK} rx="4" fill={value === 'blank' ? PALETTE.paper : PALETTE.block} stroke={INK} strokeWidth="2" strokeDasharray={value === 'blank' ? '5 3' : undefined} />
          <text x={left + i * (BLOCK + 4) + BLOCK / 2} y={52 - BLOCK / 2 + 6} textAnchor="middle" fontSize="17" fontWeight="700" fill={INK}>
            {value === 'blank' ? '?' : value}
          </text>
        </g>
      ))}
    </>
  );
}
