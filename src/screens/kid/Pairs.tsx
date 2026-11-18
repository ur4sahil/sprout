import Icon from '../../components/Icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PAIR_COUNT, pairsDeck } from '../../app/games';
import { useAppStore } from '../../app/store';
import { TIMING } from '../../app/timing';
import { playSfx } from '../../audio/sfx';
import { playSound } from '../../audio/sounds';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import type { GameBeat } from '../../components/GameFriend';
import GameFriend from '../../components/GameFriend';
import GameButton from '../../components/GameButton';
import HoldButton from '../../components/HoldButton';
import KidScreen from '../../components/KidScreen';
import ParticleBurst from '../../components/ParticleBurst';
import { burstAt } from '../../lib/burstAt';
import { castFor } from '../../cast';
import { currentWorld } from '../../worlds';
import { makeRng } from '../../engine/rng';
import { now } from '../../lib/clock';
import type { Child } from '../../storage/schema';
import VisualView from '../../visuals/VisualView';
import styles from './Games.module.css';

// /games/pairs. A memory game of 6 face-down pairs, made from what the child's grade practises.
// It is a reward. It saves nothing and changes no score: a missed flip is a slip of memory, not a wrong answer.
export default function Pairs() {
  const child = useAppStore((s) => s.child);
  if (!child) return <Navigate to="/" replace />;
  return <PairsGame key={child.id} child={child} />;
}

function PairsGame({ child }: { child: Child }) {
  const navigate = useNavigate();
  const [game, setGame] = useState(0);
  // A new deck for each game. The clock only chooses which cards: nothing here is saved or scored.
  const deck = useMemo(() => pairsDeck(child.grade, makeRng(now().getTime() + game)), [child.grade, game]);
  const [up, setUp] = useState<number[]>([]); // face up and not yet matched: at most two
  const [found, setFound] = useState<number[]>([]); // pairs found
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The feel of the game: the friend's reaction to each pair turned, and sparkles where a pair was found.
  const [feel, setFeel] = useState<{ last: GameBeat; run: number; beat: number }>({ last: null, run: 0, beat: 0 });
  const [burst, setBurst] = useState<{ key: number; at: { x: number; y: number } } | null>(null);
  const table = useRef<HTMLDivElement>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };

  function flip(id: number, face: Element | null): void {
    const card = deck.cards[id];
    if (!card || up.length >= 2 || up.includes(id) || found.includes(card.pair)) return;
    const next = [...up, id];
    setUp(next);
    playSound(currentWorld().sounds.pick);
    if (next.length < 2) return;
    const [one, two] = next.map((each) => deck.cards[each]);
    if (one && two && one.pair === two.pair) {
      playSfx('chime', Math.min(feel.run, 7));
      setFeel((before) => ({ last: 'right', run: before.run + 1, beat: before.beat + 1 }));
      setBurst((before) => ({ key: (before?.key ?? 0) + 1, at: burstAt(table.current, face) }));
      setFound((all) => [...all, one.pair]);
      setUp([]);
      return;
    }
    // Two cards that are not a pair are a slip of memory: the friend smiles them on, and nothing else changes.
    setFeel((before) => ({ last: 'miss', run: 0, beat: before.beat + 1 }));
    // Not a pair: both stay up long enough to be seen, then turn back.
    timer.current = setTimeout(() => setUp([]), TIMING.pairsLookMs);
  }

  function again(): void {
    setUp([]);
    setFound([]);
    setFeel({ last: null, run: 0, beat: 0 });
    setBurst(null);
    setGame(game + 1);
  }

  if (found.length === PAIR_COUNT) {
    return (
      <FullScreenCard emoji="🃏" title="You found them all!" line="Every pair is matched." name="pairs-done">
        <BigButton size="kid" onClick={again}>
          <Icon name="repeat" />Play again
        </BigButton>
        <BigButton size="kid" onClick={goHome}>
          <Icon name="home" />Home
        </BigButton>
      </FullScreenCard>
    );
  }
  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="home" label="Back to home" onHeld={goHome} />
          <h1 className={styles.title}>
            <Icon name="cards" />Pairs
          </h1>
          <span className={styles.spacer} />
          <span className={styles.count} data-pairs-found={found.length} aria-label={`${found.length} of ${PAIR_COUNT} pairs found`}>
            {found.length} / {PAIR_COUNT}
          </span>
          <GameFriend who={castFor(deck.kind === 'letters' ? 'ela' : 'math')} last={feel.last} run={feel.run} beat={feel.beat} />
        </>
      }
    >
      <div ref={table} className={styles.cards} role="group" aria-label="Cards" data-kind={deck.kind}>
        {deck.cards.map((card) => {
          const matched = found.includes(card.pair);
          const shown = matched || up.includes(card.id);
          return (
            <GameButton key={`${game}-${card.id}`} look="card" data-card={card.id} data-pair={card.pair} data-up={shown ? '' : undefined} data-matched={matched ? '' : undefined} aria-label={shown ? card.name : `Card ${card.id + 1}, face down`} disabled={matched} onClick={(event) => flip(card.id, event.currentTarget)}>
              {shown ? <VisualView visual={card.visual} /> : <Icon name="question" />}
            </GameButton>
          );
        })}
        {burst && <ParticleBurst key={burst.key} seed={burst.key} at={burst.at} />}
      </div>
    </KidScreen>
  );
}
