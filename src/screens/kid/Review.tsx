import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import { skillById } from '../../content/catalogue';
import type { Skill } from '../../content/catalogue';
import DailyLimit from './DailyLimit';
import ReviewSession from './ReviewSession';

// /review. A review session for the mastered skills that are due, up to 4.
export default function Review() {
  const navigate = useNavigate();
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
  return <ReviewSession child={child} skills={skills} doneLabel="All done" onDone={goHome} onLeave={goHome} />;
}
