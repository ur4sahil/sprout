import Icon from '../../components/Icon';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import { skillById } from '../../content/catalogue';
import DailyLimit from './DailyLimit';
import PracticeSession from './PracticeSession';
import ReviewSession from './ReviewSession';

// /play. Runs today's picks one after another, with no menus in between.
// Each pick lasts one session length. The break between picks offers "Next one" or "All done".
export default function Play() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const { day } = useChildDay(child);
  const [index, setIndex] = useState(0);
  // The picks are fixed when Play starts, so the run does not change under the child.
  const picks = useMemo(() => (day ? day.picks.filter((pick) => skillById(pick.skillId) !== undefined) : []), [day]);
  const reviewSkills = useMemo(() => {
    const skill = picks[index] ? skillById(picks[index].skillId) : undefined;
    return skill ? [skill] : [];
  }, [picks, index]);
  if (!child) return <Navigate to="/" replace />;
  if (!day) return null;
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };
  if (day.limitReached) return <DailyLimit child={child} onDone={() => void navigate('/', { replace: true })} />;
  if (picks.length === 0) return <Navigate to="/home" replace />;

  const pick = picks[index];
  const skill = pick ? skillById(pick.skillId) : undefined;
  if (!pick || !skill) {
    return (
      <FullScreenCard emoji="🎉" title="All done!" line="You finished today's picks." name="play-done">
        <BigButton size="kid" onClick={goHome}>
          <Icon name="home" />Home
        </BigButton>
      </FullScreenCard>
    );
  }
  const next = (): void => setIndex(index + 1);
  if (pick.reason === 'review') return <ReviewSession key={`review|${skill.id}`} child={child} skills={reviewSkills} doneLabel="Next one" onDone={next} onLeave={goHome} />;
  return <PracticeSession key={`play|${index}|${skill.id}`} child={child} skill={skill} play={{ onNext: next }} />;
}
