import { Navigate, useNavigate } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import { speak } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import GoalRing from '../../components/GoalRing';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import SkillTile from '../../components/SkillTile';
import TileGrid from '../../components/TileGrid';
import { CATALOGUE, skillById } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import type { PickReason } from '../../engine/recommend';
import type { Say } from '../../engine/types';
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

// The child's home: the daily goal, today's picks, Play, reviews that are due, and the subjects.
export default function Home() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const { day, failed } = useChildDay(child);
  if (!child) return <Navigate to="/" replace />;

  const go = (path: string): void => {
    void navigate(path, { replace: true });
  };
  const say = (text: Say): void => void speak(text, child.settings.speechRate);
  if (day?.limitReached) return <DailyLimit child={child} onDone={() => go('/')} />;

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
          </CenterRow>
        </>
      )}
    </KidScreen>
  );
}
