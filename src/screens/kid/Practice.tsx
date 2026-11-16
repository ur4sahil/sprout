import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import { skillById } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import DailyLimit from './DailyLimit';
import PracticeSession from './PracticeSession';

// /skill/:skillId. Needs a child and a skill that is ready. Otherwise it goes back.
export default function Practice() {
  const navigate = useNavigate();
  const { skillId } = useParams();
  const child = useAppStore((s) => s.child);
  const { day } = useChildDay(child);
  const skill = skillId ? skillById(skillId) : undefined;
  if (!child) return <Navigate to="/" replace />;
  if (!skill || skill.retired || !allGenerators().some((generator) => generator.skillId === skill.id)) return <Navigate to="/home" replace />;
  // The daily limit is checked on the way in, never in the middle of a question.
  if (day?.limitReached) return <DailyLimit child={child} onDone={() => void navigate('/', { replace: true })} />;
  // A new key for each child and skill, so a session never carries over into another.
  return <PracticeSession key={`${child.id}|${skill.id}`} child={child} skill={skill} />;
}
