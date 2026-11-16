import { Navigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { skillById } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import LessonPlayer from './LessonPlayer';

// /skill/:skillId/learn. The help behind a skill's Learn button.
export default function Lesson() {
  const { skillId } = useParams();
  const child = useAppStore((s) => s.child);
  const skill = skillId ? skillById(skillId) : undefined;
  if (!child) return <Navigate to="/" replace />;
  if (!skill || skill.retired || !allGenerators().some((generator) => generator.skillId === skill.id)) return <Navigate to="/home" replace />;
  return <LessonPlayer key={`${child.id}|${skill.id}`} child={child} skill={skill} />;
}
