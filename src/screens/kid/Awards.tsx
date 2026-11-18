import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { awardSkills, stickerFor, syncAwards } from '../../app/awardsRun';
import type { Telling } from '../../app/stickerBook';
import { BOOK_LINES, firstPage, howToEarn, looseStickers, stickerTelling, usePlacedStickers, wordsSay } from '../../app/stickerBook';
import { useAppStore } from '../../app/store';
import { playSound } from '../../audio/sounds';
import { speak } from '../../audio/speech';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import LooseSticker from '../../components/LooseSticker';
import Notice from '../../components/Notice';
import StickerSlot from '../../components/StickerSlot';
import TileGrid from '../../components/TileGrid';
import type { AwardDef } from '../../engine/awards';
import { allAwards } from '../../engine/awards';
import type { Say } from '../../engine/types';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { AwardEarned } from '../../storage/schema';
import { currentWorld } from '../../worlds';
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

// A finger that moves sideways this share of the book's width turns the page.
const SWIPE_SHARE = 0.18;

// The sticker book (game feel, phase 7): each board is a page, turned with a swipe or the arrows. A sticker the
// child has earned but not pressed on lies loose at the foot of its page until the child taps it on. Stickers
// not earned yet are dotted outlines; a tap shows and says what earns one. Every page stays in the page (out of
// sight but for the open one), so a count or a sticker can always be found by its mark.
export default function Awards() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const [earned, setEarned] = useState<AwardEarned[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const [turn, setTurn] = useState<'next' | 'back' | null>(null);
  const [telling, setTelling] = useState<Telling | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const book = useRef<HTMLDivElement>(null);
  const { placed, onPlace } = usePlacedStickers(child?.id, earned ?? NO_AWARDS);

  const awards = useMemo(() => allAwards(awardSkills()), []);
  const pages = useMemo(() => [...new Set(awards.map((award) => award.board))].map((id) => ({ id, awards: awards.filter((award) => award.board === id) })), [awards]);
  const loose = useMemo(() => looseStickers(earned ?? [], placed), [earned, placed]);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    void (async () => {
      try {
        const { repo } = await openRepo();
        const awardsNow = await syncAwards(repo, child, now().toISOString());
        if (alive) setEarned(awardsNow.earned);
      } catch (error) {
        logError(error);
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [child]);

  // The book opens once, on the page with a sticker waiting (and says so), or on the child's own Math page.
  const opened = useRef(false);
  useEffect(() => {
    if (!earned || !child || opened.current) return;
    opened.current = true;
    const waiting = looseStickers(earned, placed);
    setIndex(firstPage(pages, waiting, child.grade));
    if (waiting.length > 0) void speak(waiting.length === 1 ? BOOK_LINES.press : BOOK_LINES.pressMany, child.settings.speechRate);
  }, [earned, child, placed, pages]);

  if (!child) return <Navigate to="/" replace />;
  const say = (text: Say): void => void speak(text, child.settings.speechRate);
  const have = new Set((earned ?? []).map((award) => award.awardId));
  const waiting = new Set(loose);
  const at = index ?? 0;

  const goTo = (next: number): void => {
    if (next < 0 || next >= pages.length || next === at) return;
    const forward = next > at;
    playSound(forward ? currentWorld().sounds.open : currentWorld().sounds.close);
    setTurn(forward ? 'next' : 'back');
    setIndex(next);
    setTelling(null);
    setLanded(null);
    say(wordsSay(boardName(pages[next]?.id ?? '')));
  };

  const tell = (award: AwardDef): void => {
    let told: Telling;
    if (waiting.has(award.id)) told = { text: 'Tap the sticker at the bottom to press it on.', say: BOOK_LINES.press };
    else if (have.has(award.id)) told = stickerTelling(award);
    else told = howToEarn(award, boardName(award.board));
    setTelling(told);
    say(told.say);
  };

  const placedNow = (id: string): void => {
    onPlace(id);
    setLanded(id);
    playSound('pop');
  };

  const down = (event: PointerEvent<HTMLDivElement>): void => {
    swipe.current = { x: event.clientX, y: event.clientY };
  };
  const up = (event: PointerEvent<HTMLDivElement>): void => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const wide = book.current?.getBoundingClientRect().width || 1;
    // Sideways and far enough: a turn. A finger that mostly went up or down was scrolling.
    if (Math.abs(dx) < wide * SWIPE_SHARE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goTo(dx < 0 ? at + 1 : at - 1);
  };

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
      {earned && index !== null && (
        <div ref={book} className={styles.book} onPointerDown={down} onPointerUp={up} onPointerCancel={() => (swipe.current = null)} data-book="" data-page={pages[at]?.id}>
          {pages.map((sheet, i) => {
            const open = i === at;
            const count = sheet.awards.filter((award) => have.has(award.id)).length;
            const lying = sheet.awards.filter((award) => waiting.has(award.id));
            return (
              <section
                key={sheet.id}
                className={`${styles.board} ${open && turn === 'next' ? styles.turnNext : ''} ${open && turn === 'back' ? styles.turnBack : ''}`}
                aria-label={boardName(sheet.id)}
                data-board={sheet.id}
                hidden={!open}
              >
                <div className={styles.boardHead}>
                  <h2 className={page.heading}>
                    {boardName(sheet.id)}: {count} of {sheet.awards.length}
                  </h2>
                  <progress className={styles.meter} value={count} max={sheet.awards.length} aria-hidden="true" />
                </div>
                <TileGrid dense label={`${boardName(sheet.id)} stickers`}>
                  {sheet.awards.map((award) => (
                    <StickerSlot
                      key={award.id}
                      id={award.id}
                      label={award.label}
                      sticker={stickerFor(award.id)}
                      state={waiting.has(award.id) ? 'loose' : have.has(award.id) ? 'placed' : 'locked'}
                      landed={landed === award.id}
                      active={open}
                      onTap={() => tell(award)}
                    />
                  ))}
                </TileGrid>
                {open && lying.length > 0 && (
                  <div className={styles.tray} role="group" aria-label="New stickers to press on">
                    {lying.map((award) => (
                      <LooseSticker key={award.id} id={award.id} label={award.label} sticker={stickerFor(award.id)} onPlaced={() => placedNow(award.id)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {telling && (
            <div className={styles.telling} data-telling="">
              <p className={styles.tellingText} aria-live="polite">
                {telling.text}
              </p>
              <IconButton icon="speaker" label="Hear it again" onClick={() => say(telling.say)} />
            </div>
          )}
          <div className={styles.turns}>
            <IconButton icon="back" label="Page before" disabled={at === 0} onClick={() => goTo(at - 1)} />
            <span className={styles.dots} aria-hidden="true">
              {pages.map((sheet, i) => (
                <span key={sheet.id} className={`${styles.dot} ${i === at ? styles.dotOn : ''}`} />
              ))}
            </span>
            <IconButton icon="next" label="Next page" disabled={at === pages.length - 1} onClick={() => goTo(at + 1)} />
          </div>
        </div>
      )}
    </KidScreen>
  );
}

const NO_AWARDS: AwardEarned[] = [];
