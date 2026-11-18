import { Navigate, useNavigate } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import DailyLimit from './DailyLimit';
import MixedBagSession from './MixedBagSession';

// /mixed. The Mixed bag (plan section 17): questions from several topics in progress, mixed together.
export default function MixedBag() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const { day } = useChildDay(child);
  if (!child) return <Navigate to="/" replace />;
  if (!day) return null;
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };
  if (day.limitReached) return <DailyLimit child={child} onDone={() => void navigate('/', { replace: true })} />;
  return <MixedBagSession child={child} onDone={goHome} />;
}

