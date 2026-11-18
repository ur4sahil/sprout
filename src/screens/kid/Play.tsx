import { Navigate } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import { nextPart, partPath } from '../../app/todaysPlan';

// /play. Goes to the first part of today's plan that is not done yet (plan section 18), or home when it is all done.
export default function Play() {
  const child = useAppStore((s) => s.child);
  const { day } = useChildDay(child);
  if (!child) return <Navigate to="/" replace />;
  if (!day) return null;
  const next = nextPart(day.plan);
  return <Navigate to={next ? partPath(next) : '/home'} replace />;
}
