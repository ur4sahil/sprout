import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { awardSkills, stickerFor, syncAwards } from '../../app/awardsRun';
import { useAppStore } from '../../app/store';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import TileGrid from '../../components/TileGrid';
import type { AwardDef } from '../../engine/awards';
import { allAwards } from '../../engine/awards';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import styles from './Awards.module.css';
import { GRADE_NAME, SUBJECTS } from './Home';
import page from './SubjectPage.module.css';

// 'math-PK' is "Math, Pre-K". Reasoning and Milestones have one board each.
export function boardName(board: string): string {
  if (board === 'milestones') return 'Milestones';
  const [subject, grade] = board.split('-');
  const label = SUBJECTS.find((candidate) => candidate.id === subject)?.label ?? board;
  return grade ? `${label}, ${GRADE_NAME[grade] ?? grade}` : label;
}

// The awards boards: a grid of covered squares for each board. Earning an award uncovers its sticker.
export default function Awards() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const [earned, setEarned] = useState<Set<string> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    void (async () => {
      try {
        const { repo } = await openRepo();
        const awards = await syncAwards(repo, child, now().toISOString());
        if (alive) setEarned(new Set(awards.earned.map((award) => award.awardId)));
      } catch (error) {
        logError(error);
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [child]);

  if (!child) return <Navigate to="/" replace />;
  const awards = allAwards(awardSkills());
  const boards = [...new Set(awards.map((award) => award.board))];

  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="home" label="Back to home" onClick={() => void navigate('/home', { replace: true })} />
          <h1 className={page.title}>
            <Icon name="star" />Stickers
          </h1>
        </>
      }
    >
      {failed && <Notice role="alert">Your stickers could not be read. Close the app and open it again.</Notice>}
      {earned &&
        boards.map((board) => {
          const squares = awards.filter((award) => award.board === board);
          const have = squares.filter((award) => earned.has(award.id)).length;
          return (
            <section key={board} className={styles.board} aria-label={boardName(board)} data-board={board}>
              <div className={styles.boardHead}>
                <h2 className={page.heading}>
                  {boardName(board)}: {have} of {squares.length}
                </h2>
                <progress className={styles.meter} value={have} max={squares.length} aria-hidden="true" />
              </div>
              <TileGrid dense label={`${boardName(board)} stickers`}>
                {squares.map((award) => (
                  <Square key={award.id} award={award} earned={earned.has(award.id)} />
                ))}
              </TileGrid>
            </section>
          );
        })}
    </KidScreen>
  );
}

function Square({ award, earned }: { award: AwardDef; earned: boolean }) {
  return (
    <p className={`${styles.square} ${earned ? styles.earned : ''}`} data-award={award.id} data-earned={earned ? 'yes' : 'no'} aria-label={`${award.label}. ${earned ? 'Earned' : 'Not yet'}`}>
      <span className={`${styles.sticker} ${earned ? '' : styles.covered}`} aria-hidden="true">
        {earned ? stickerFor(award.id) : <Icon name="lock" />}
      </span>
      <span aria-hidden="true">{award.label}</span>
    </p>
  );
}
