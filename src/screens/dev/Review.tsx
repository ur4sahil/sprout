import { useParams } from 'react-router-dom';
import { skillById } from '../../content/catalogue';
import { generateQuestion, generatorFor } from '../../content/registry';
import { describeAnswer, describePrompt } from '../../engine/describe';
import type { Level } from '../../engine/types';
import QuestionView from '../../items/QuestionView';
import styles from './Gallery.module.css';

const SEEDS = [1, 2, 3];

// Content samples for one skill: three questions at every level, drawn as a child sees them.
// Registered only in a development build.
export default function Review() {
  const { skillId = '' } = useParams();
  const skill = skillById(skillId);
  if (!skill) return <main className={styles.page}>No skill called {skillId}.</main>;
  const levels = Array.from({ length: generatorFor(skillId).maxLevel }, (_, i) => (i + 1) as Level);
  return (
    <main className={styles.page}>
      <h1>
        {skill.code} {skill.name}
      </h1>
      {levels.map((level) => (
        <section key={level} aria-label={`Level ${level}`}>
          <h2>Level {level}</h2>
          {SEEDS.map((seed) => {
            const question = generateQuestion(skillId, level, seed);
            return (
              <div key={seed} data-sample={`${level}-${seed}`}>
                <p>
                  Seed {seed}: {describePrompt(question)}
                </p>
                <QuestionView question={question} disabled onChange={() => undefined} onSpeak={() => undefined} />
                <p>Answer: {describeAnswer(question)}</p>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
