import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { stickerFor, syncAwards } from '../../app/awardsRun';
import { useChildDay } from '../../app/childDay';
import { popSkills } from '../../app/games';
import { useAppStore } from '../../app/store';
import { speak } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import FullScreenCard from '../../components/FullScreenCard';
import GoalRing from '../../components/GoalRing';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import SkillTile from '../../components/SkillTile';
import TileGrid from '../../components/TileGrid';
import { CATALOGUE, skillById } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import type { AwardDef } from '../../engine/awards';
import type { PickReason } from '../../engine/recommend';
import type { Say } from '../../engine/types';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import awardStyles from './Awards.module.css';
import DailyLimit from './DailyLimit';
import styles from './Home.module.css';

const WHY: Record<PickReason, string> = {
  review: 'Time to review',
  plan: 'From your plan',
  troubleSpot: 'Needs practice',
  continue: 'Keep going',
  next: 'Next up',
};

export const SUBJECTS: { id: 'math' | 'ela' | 'reasoning'; label: string; icon: string }[] = [
  { id: 'math', label: 'Math', icon: '🔢' },
  { id: 'ela', label: 'Language Arts', icon: '🔤' },
  { id: 'reasoning', label: 'Reasoning', icon: '🧩' },
];

export const GRADE_NAME: Record<string, string> = { PK: 'Pre-K', K: 'Kindergarten', '1': 'Grade 1', '2': 'Grade 2', all: 'All' };

// The child's home: the daily goal, today's picks, Play, reviews that are due, and the subjects.
export default function Home() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const { day, failed } = useChildDay(child);
  const [fresh, setFresh] = useState<AwardDef[]>([]);
  // Pop is offered when the child has a skill in progress whose next question is a choice.
  const [popOffered, setPopOffered] = useState(false);
  useEffect(() => {
    if (!child) return;
    let alive = true;
    void openRepo()
      .then(async ({ repo }) => popSkills(child, await repo.getSkillStates(child.id)).length > 0)
      .then((found) => {
        if (alive) setPopOffered(found);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [child]);
  // Stickers are worked out each time home opens: after practice, a review, a check-in or a backup from another iPad.
  useEffect(() => {
    if (!child || !day || day.firstVisit) return;
    let alive = true;
    void openRepo()
      .then(({ repo }) => syncAwards(repo, child, now().toISOString()))
      .then((awards) => {
        if (!alive || awards.fresh.length === 0) return;
        setFresh(awards.fresh);
        void speak([awards.fresh.length === 1 ? 'You earned a new sticker.' : 'You earned new stickers.'], child.settings.speechRate);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [child, day]);
  if (!child) return <Navigate to="/" replace />;

  const go = (path: string): void => {
    void navigate(path, { replace: true });
  };
  const say = (text: Say): void => void speak(text, child.settings.speechRate);
  if (day?.limitReached) return <DailyLimit child={child} onDone={() => go('/')} />;
  // A child who has never opened the check-in starts with it.
  if (day?.firstVisit) return <Navigate to="/diagnostic?subject=math" replace />;

  const ready = new Set(allGenerators().map((generator) => generator.skillId));
  const subjects = SUBJECTS.filter((subject) => CATALOGUE.some((skill) => skill.subject === subject.id && !skill.retired && ready.has(skill.id)));

  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="👤" label="Change who is playing" onClick={() => go('/')} />
          <span className={styles.avatar} aria-hidden="true">
            {child.avatar}
          </span>
          <h1 className={styles.name}>{child.name}</h1>
        </>
      }
    >
      {failed && <Notice role="alert">Your scores could not be read. Close the app and open it again.</Notice>}
      {day && (
        <>
          <CenterRow>
            <GoalRing done={day.answeredToday} goal={child.settings.dailyGoalQuestions} />
            {day.picks.length > 0 && (
              <BigButton size="kid" onClick={() => go('/play')}>
                <span className={styles.play} aria-hidden="true">
                  ▶️
                </span>{' '}
                Play
              </BigButton>
            )}
          </CenterRow>
          {day.picks.length > 0 && (
            <TileGrid label="Today's picks">
              {day.picks.map((pick) => {
                const skill = skillById(pick.skillId);
                if (!skill) return null;
                return (
                  <SkillTile
                    key={pick.skillId}
                    skill={skill}
                    state={day.states.find((state) => state.skillId === pick.skillId)}
                    note={child.settings.preReader ? undefined : WHY[pick.reason]}
                    onOpen={() => go(pick.reason === 'review' ? '/review' : `/skill/${pick.skillId}`)}
                    onSpeak={say}
                  />
                );
              })}
            </TileGrid>
          )}
          <CenterRow>
            {day.checkIn && (
              <BigButton size="kid" data-check-in={day.checkIn} onClick={() => go(`/diagnostic?subject=${day.checkIn}`)}>
                <span aria-hidden="true">🧭 </span>Check-in
              </BigButton>
            )}
            {day.reviewsDue.length > 0 && (
              <BigButton size="kid" onClick={() => go('/review')}>
                <span aria-hidden="true">🔁 </span>Review ({day.reviewsDue.length})
              </BigButton>
            )}
            {subjects.map((subject) => (
              <BigButton key={subject.id} size="kid" onClick={() => go(`/subject/${subject.id}`)}>
                <span aria-hidden="true">{subject.icon} </span>
                {subject.label}
              </BigButton>
            ))}
            <BigButton size="kid" onClick={() => go('/awards')}>
              <span aria-hidden="true">⭐ </span>Stickers
            </BigButton>
            {popOffered && (
              <BigButton size="kid" onClick={() => go('/games/pop')}>
                <span aria-hidden="true">🎈 </span>Pop
              </BigButton>
            )}
            <BigButton size="kid" onClick={() => go('/games/pairs')}>
              <span aria-hidden="true">🃏 </span>Pairs
            </BigButton>
          </CenterRow>
        </>
      )}
      {fresh.length > 0 && (
        <FullScreenCard emoji={stickerFor(fresh[0]?.id ?? '')} title={fresh.length === 1 ? 'New sticker!' : 'New stickers!'} line="You earned:" name="new-stickers">
          <ul className={awardStyles.fresh}>
            {fresh.map((award) => (
              <li key={award.id} data-new-award={award.id}>
                <span aria-hidden="true">{stickerFor(award.id)} </span>
                {award.label}
              </li>
            ))}
          </ul>
          <BigButton size="kid" onClick={() => setFresh([])}>
            <span aria-hidden="true">🎉 </span>Yay
          </BigButton>
        </FullScreenCard>
      )}
    </KidScreen>
  );
}
