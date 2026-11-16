import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import ScoreRing from '../../components/ScoreRing';
import TileButton from '../../components/TileButton';
import { CATALOGUE } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { SkillState } from '../../storage/schema';
import VisualView from '../../visuals/VisualView';
import styles from './Home.module.css';

// The child's home: every skill that is ready, as a picture tile with its score ring.
export default function Home() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const [states, setStates] = useState<SkillState[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    void (async () => {
      try {
        const saved = await (await openRepo()).repo.getSkillStates(child.id);
        if (alive) setStates(saved);
      } catch (error) {
        logError(error);
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [child]);

  if (!child) return <Navigate to="/" replace />;

  const ready = new Set(allGenerators().map((generator) => generator.skillId));
  const skills = CATALOGUE.filter((skill) => !skill.retired && ready.has(skill.id));

  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="👤" label="Change who is playing" onClick={() => void navigate('/', { replace: true })} />
          <span className={styles.avatar} aria-hidden="true">
            {child.avatar}
          </span>
          <h1 className={styles.name}>{child.name}</h1>
        </>
      }
    >
      {failed && <Notice role="alert">Your scores could not be read. Close the app and open it again.</Notice>}
      <div className={styles.skills} role="group" aria-label="Skills">
        {skills.map((skill) => {
          const state = states.find((s) => s.skillId === skill.id);
          return (
            <TileButton key={skill.id} label={`${skill.name}. Score ${state?.score ?? 0}`} onClick={() => void navigate(`/skill/${skill.id}`, { replace: true })}>
              <span className={styles.icon}>
                <VisualView visual={skill.icon} />
              </span>
              <ScoreRing small score={state?.score ?? 0} attempts={state?.attempts ?? 0} placedOut={state?.placedOut ?? false} />
              <span className={styles.skillName}>{skill.name}</span>
            </TileButton>
          );
        })}
      </div>
    </KidScreen>
  );
}
