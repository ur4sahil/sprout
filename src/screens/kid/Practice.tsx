import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { moreAfter } from '../../app/todaysPlan';
import { useAppStore } from '../../app/store';
import { skillById } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import DailyLimit from './DailyLimit';
import PracticeSession from './PracticeSession';

// /skill/:skillId. Needs a child and a skill that is ready. Otherwise it goes back.
export default function Practice() {
  const navigate = useNavigate();
  const { skillId } = useParams();
  const [params] = useSearchParams();
  const child = useAppStore((s) => s.child);
  const { day } = useChildDay(child);
  const skill = skillId ? skillById(skillId) : undefined;
  // ?run=N: one part of a run through today's plan, with N answers left for the part. `more`: another part comes after
  // this one, so a medal here says "Next one"; on the plan's last part it says "All done" (the owner's choice, Nov 22,
  // 2026). Until the day is read, the run is taken to go on.
  const left = Number(params.get('run'));
  const more = day && skillId ? moreAfter(day.plan, skillId) : true;
  const run = Number.isInteger(left) && left > 0 ? { left, more, onDone: () => void navigate('/play', { replace: true }) } : undefined;
  if (!child) return <Navigate to="/" replace />;
  if (!skill || skill.retired || !allGenerators().some((generator) => generator.skillId === skill.id)) return <Navigate to="/home" replace />;
  // The daily limit is checked on the way in, never in the middle of a question.
  if (day?.limitReached) return <DailyLimit child={child} onDone={() => void navigate('/', { replace: true })} />;
  // A new key for each child and skill, so a session never carries over into another.
  return <PracticeSession key={`${child.id}|${skill.id}`} child={child} skill={skill} run={run} />;
}
