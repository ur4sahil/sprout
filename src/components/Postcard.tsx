import { useEffect, useState } from 'react';
import type { PostcardFacts, PostcardSkill } from '../app/postcard';
import { loadPostcard } from '../app/postcard';
import { logError } from '../lib/errorLog';
import type { Child } from '../storage/schema';
import Art from '../visuals/Art';
import styles from './Postcard.module.css';
import SunnyWeek from './SunnyWeek';

interface Props {
  child: Pick<Child, 'id' | 'name' | 'avatar'>;
  facts?: PostcardFacts | null; // what it shows; left out, it reads them for the child itself
}

function names(list: readonly PostcardSkill[]): string {
  return list.map((skill) => skill.name).join(', ');
}

// The weekly postcard on the grown-ups' dashboard (game feel, phase 7): drawn as a postcard, with the child's
// avatar as the stamp and the week's dates in the postmark. Shows nothing for a week with fewer than 4 sunny days.
export default function Postcard({ child, facts }: Props) {
  const [loaded, setLoaded] = useState<PostcardFacts | null>(null);
  useEffect(() => {
    if (facts !== undefined) return;
    let alive = true;
    void loadPostcard(child)
      .then((found) => {
        if (alive) setLoaded(found);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [child, facts]);

  const card = facts === undefined ? loaded : facts;
  if (!card) return null;
  return (
    <section className={styles.card} aria-label={`A postcard from ${child.name}'s week`} data-postcard={card.monday}>
      <div className={styles.message}>
        <h2 className={styles.title}>Greetings from the garden!</h2>
        <p className={styles.week} data-postcard-dates="">
          {child.name}'s week, {card.dates}
          {card.current ? ' (so far)' : ''}
        </p>
        <SunnyWeek week={card.week} total={card.sunny} />
        <ul className={styles.facts}>
          {card.bloomed.length > 0 && (
            <li data-postcard-fact="bloomed">
              <span className={styles.label}>In full bloom:</span> {names(card.bloomed)}
            </li>
          )}
          {card.grew.length > 0 && (
            <li data-postcard-fact="grew">
              <span className={styles.label}>Grew a stage:</span> {names(card.grew)}
            </li>
          )}
          {card.bloomed.length === 0 && card.grew.length === 0 && <li data-postcard-fact="steady">A steady week of practice, with every plant well looked after.</li>}
        </ul>
      </div>
      <div className={styles.side} aria-hidden="true">
        <span className={styles.stamp}>
          <Art emoji={child.avatar} />
        </span>
        <span className={styles.postmark}>{card.dates}</span>
        <span className={styles.line} />
        <span className={styles.line} />
      </div>
    </section>
  );
}
