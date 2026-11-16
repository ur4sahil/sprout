import VisualView from '../../visuals/VisualView';
import styles from './Gallery.module.css';
import { GALLERY } from './gallerySamples';

// Every kind of picture on one page. Development builds only.
export default function Gallery() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Picture gallery</h1>
      {GALLERY.map((section) => (
        <section key={section.title} className={styles.section} data-section={section.title}>
          <h2 className={styles.heading}>{section.title}</h2>
          <div className={styles.samples}>
            {section.samples.map((sample) => (
              <figure key={sample.label} className={styles.sample} data-sample={`${section.title}: ${sample.label}`}>
                <div className={styles.frame}>
                  <VisualView visual={sample.visual} />
                </div>
                <figcaption className={styles.caption}>{sample.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
