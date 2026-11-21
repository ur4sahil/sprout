import { useMemo } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import { skillById } from '../../content/catalogue';
import type { Skill } from '../../content/catalogue';
import DailyLimit from './DailyLimit';
import ReviewSession from './ReviewSession';

// /review. A review session for the mastered skills that are due, up to 4.
export default function Review() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // ?run=: one part of a run through today's plan; when the review is done the run goes on.
  const inRun = params.get('run') !== null;
  const child = useAppStore((s) => s.child);
  const { day } = useChildDay(child);
  const due = day?.reviewsDue;
  const skills = useMemo(() => (due ?? []).map((id) => skillById(id)).filter((skill): skill is Skill => skill !== undefined), [due]);
  if (!child) return <Navigate to="/" replace />;
  if (!day) return null;
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };
  if (day.limitReached) return <DailyLimit child={child} onDone={() => void navigate('/', { replace: true })} />;
  const onDone = inRun ? () => void navigate('/play', { replace: true }) : goHome;
  return <ReviewSession child={child} skills={skills} doneLabel={inRun ? 'Next one' : 'All done'} onDone={onDone} onLeave={goHome} />;
}
