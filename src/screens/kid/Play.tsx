import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import { nextPart, partRunPath } from '../../app/todaysPlan';
import { LINES } from '../../audio/lines';
import { speak } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import Icon from '../../components/Icon';
import { partSay, partTitle } from '../../components/TodayPlan';

export const NEXT_UP_MS = 2500; // how long "Next up" shows before the run goes on by itself

// /play: a run through the whole of today's plan (Start on home; the owner's choice, Nov 21, 2026). Each part hands
// back here when it is done; this says what is next and goes on into it, until the plan is done, then home.
// ?go=1 (from Start) goes straight into the first part, with no card.
export default function Play() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const child = useAppStore((s) => s.child);
  const { day } = useChildDay(child);
  const next = day ? nextPart(day.plan) : null;
  const straight = params.get('go') === '1';
  const target = next ? partRunPath(next) : null;

  useEffect(() => {
    if (!target || straight || !child) return;
    if (next) void speak([...LINES.nextUp, ...partSay(next)], child.settings.speechRate);
    const timer = setTimeout(() => void navigate(target, { replace: true }), NEXT_UP_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once for each part the run reaches
  }, [target, straight]);

  if (!child) return <Navigate to="/" replace />;
  if (!day) return null;
  if (!next || !target) return <Navigate to="/home" replace />;
  if (straight) return <Navigate to={target} replace />;
  return (
    <FullScreenCard emoji="🌱" title={`Next up: ${partTitle(next)}`} line="Here we go!" name="next-up">
      <BigButton size="kid" onClick={() => void navigate(target, { replace: true })}>
        <Icon name="play" />
        Go
      </BigButton>
    </FullScreenCard>
  );
}
