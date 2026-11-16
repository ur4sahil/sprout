import { Navigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { skillById } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import PracticeSession from './PracticeSession';

// /skill/:skillId. Needs a child and a skill that is ready. Otherwise it goes back.
export default function Practice() {
  const { skillId } = useParams();
  const child = useAppStore((s) => s.child);
  const skill = skillId ? skillById(skillId) : undefined;
  if (!child) return <Navigate to="/" replace />;
  if (!skill || skill.retired || !allGenerators().some((generator) => generator.skillId === skill.id)) return <Navigate to="/home" replace />;
  // A new key for each child and skill, so a session never carries over into another.
  return <PracticeSession key={`${child.id}|${skill.id}`} child={child} skill={skill} />;
}
