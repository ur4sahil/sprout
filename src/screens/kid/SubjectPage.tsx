import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { useAppStore } from '../../app/store';
import { speak } from '../../audio/speech';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import SkillTile from '../../components/SkillTile';
import Tabs from '../../components/Tabs';
import TileGrid from '../../components/TileGrid';
import { CATALOGUE } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import { gradeRank } from '../../engine/grades';
import type { Say, SkillGrade } from '../../engine/types';
import { GRADE_NAME, SUBJECTS } from './Home';
import styles from './SubjectPage.module.css';


// One subject: grade tabs, then lettered categories of skill tiles, each category in its own colour band.
export default function SubjectPage() {
  const navigate = useNavigate();
  const { subject: subjectId } = useParams();
  const child = useAppStore((s) => s.child);
  const { day, failed } = useChildDay(child);
  const [picked, setPicked] = useState<SkillGrade | null>(null);
  const subject = SUBJECTS.find((candidate) => candidate.id === subjectId);
  if (!child) return <Navigate to="/" replace />;
  if (!subject) return <Navigate to="/home" replace />;

  const ready = new Set(allGenerators().map((generator) => generator.skillId));
  const skills = CATALOGUE.filter((skill) => skill.subject === subject.id && !skill.retired && ready.has(skill.id));
  const grades = [...new Set(skills.map((skill) => skill.grade))].sort((a, b) => gradeRank(a) - gradeRank(b));
  // Open on the child's own grade when the subject has it, otherwise on the nearest grade below, otherwise the first.
  const own = grades.filter((grade) => gradeRank(grade, child.grade) <= gradeRank(child.grade)).at(-1) ?? grades[0] ?? null;
  const grade = picked !== null && grades.includes(picked) ? picked : own;
  const shown = skills.filter((skill) => skill.grade === grade);
  const categories = [...new Set(shown.map((skill) => skill.category))];
  const say = (text: Say): void => void speak(text, child.settings.speechRate);

  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="home" label="Back to home" onClick={() => void navigate('/home', { replace: true })} />
          <h1 className={styles.title}>
            <Icon name={subject.icon} />{' '}
            {subject.label}
          </h1>
        </>
      }
    >
      {failed && <Notice role="alert">Your scores could not be read. Close the app and open it again.</Notice>}
      {grades.length > 1 && grade !== null && (
        <Tabs label="Grade" tabs={grades.map((id) => ({ id, label: GRADE_NAME[id] ?? id }))} current={grade} onPick={(id) => setPicked(id as SkillGrade)} />
      )}
      {skills.length === 0 && <Notice role="status">New skills are on their way.</Notice>}
      {categories.map((category, index) => (
        <section key={category} className={styles.category} aria-label={category}>
          <h2 className={styles.heading}>{category}</h2>
          <TileGrid label={category} dense={child.settings.preReader} rows={!child.settings.preReader}>
            {shown
              .filter((skill) => skill.category === category)
              .map((skill) => (
                <SkillTile
                  key={skill.id}
                  skill={skill}
                  look={child.settings.preReader ? 'tile' : 'row'}
                  state={day?.states.find((state) => state.skillId === skill.id)}
                  band={index + 1}
                  onOpen={() => void navigate(`/skill/${skill.id}`, { replace: true })}
                  onSpeak={say}
                />
              ))}
          </TileGrid>
        </section>
      ))}
    </KidScreen>
  );
}
