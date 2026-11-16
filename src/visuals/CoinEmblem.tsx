import type { CoinName } from '../engine/types';
import { INK } from './geometry';

// Each face carries a simple emblem and no words or numbers, so the picture never gives away the name or value.
export default function CoinEmblem({ coin, r }: { coin: CoinName; r: number }) {
  const s = r / 20;
  const line = { fill: 'none', stroke: INK, strokeWidth: 1.6 * s, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, opacity: 0.75 };
  if (coin === 'penny') return <path d={`M ${-8 * s} ${-9 * s} H ${8 * s} V ${1 * s} C ${8 * s} ${7 * s} ${3 * s} ${10 * s} 0 ${12 * s} C ${-3 * s} ${10 * s} ${-8 * s} ${7 * s} ${-8 * s} ${1 * s} Z`} {...line} />; // a shield
  if (coin === 'nickel') {
    return (
      <g {...line}>
        <path d={`M ${-11 * s} ${9 * s} H ${11 * s} M ${-9 * s} ${9 * s} V ${0} H ${9 * s} V ${9 * s} M ${-5 * s} ${9 * s} V ${0} M ${0} ${9 * s} V ${0} M ${5 * s} ${9 * s} V ${0}`} />
        <path d={`M ${-6 * s} ${0} A ${6 * s} ${7 * s} 0 0 1 ${6 * s} ${0}`} />
      </g>
    ); // a domed building
  }
  if (coin === 'dime') {
    return (
      <g {...line}>
        <path d={`M ${-2 * s} ${11 * s} L ${-3 * s} ${-2 * s} H ${3 * s} L ${2 * s} ${11 * s} Z`} />
        <path d={`M 0 ${-12 * s} C ${5 * s} ${-8 * s} ${4 * s} ${-4 * s} 0 ${-2 * s} C ${-4 * s} ${-4 * s} ${-5 * s} ${-8 * s} 0 ${-12 * s} Z`} />
      </g>
    ); // a torch
  }
  return (
    <g {...line}>
      <path d={`M 0 ${-4 * s} L 0 ${9 * s} M ${-3 * s} ${9 * s} L 0 ${5 * s} L ${3 * s} ${9 * s}`} />
      <path d={`M 0 ${-2 * s} C ${-6 * s} ${-9 * s} ${-12 * s} ${-7 * s} ${-14 * s} ${-2 * s} C ${-9 * s} ${-3 * s} ${-5 * s} ${1 * s} 0 ${3 * s} C ${5 * s} ${1 * s} ${9 * s} ${-3 * s} ${14 * s} ${-2 * s} C ${12 * s} ${-7 * s} ${6 * s} ${-9 * s} 0 ${-2 * s} Z`} />
      <circle cx="0" cy={-7 * s} r={2.2 * s} />
    </g>
  ); // an eagle
}
