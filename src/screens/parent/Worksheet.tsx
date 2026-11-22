import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hasPass } from '../../app/pin';
import type { Sheet, SheetItem, Shift } from '../../app/worksheet';
import { LETTERS, buildSheet } from '../../app/worksheet';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import Icon from '../../components/Icon';
import Notice from '../../components/Notice';
import { skillById } from '../../content/catalogue';
import type { Skill } from '../../content/catalogue';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';
import VisualView from '../../visuals/VisualView';
import Gate from './Gate';
import styles from './Worksheet.module.css';

// /parent/worksheet?child=&skills=&n=&shift=&seed=. A worksheet and its answer key, laid out for US Letter
// paper (plan section 15.6). The address holds everything, so the same sheet prints again. Only the sheet
// is printed: the buttons stay on the screen.
export default function Worksheet() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [, setPassed] = useState(0);
  const [found, setFound] = useState<{ child: Child; sheet: Sheet } | null | 'missing'>(null);
  const passed = hasPass();
  const childId = params.get('child') ?? '';
  const skillIds = (params.get('skills') ?? '').split(',').filter((id) => id.length > 0);
  const count = Math.min(Math.max(Number(params.get('n') ?? '10') || 10, 1), 40);
  const shift = (Number(params.get('shift') ?? '0') || 0) as Shift;
  const seed = Number(params.get('seed') ?? '1') || 1;
  const key = `${childId}|${skillIds.join(',')}|${count}|${shift}|${seed}`;

  useEffect(() => {
    if (!passed) return;
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const child = (await repo.listChildren()).find((each) => each.id === childId);
      const skills = skillIds.map((id) => skillById(id)).filter((skill): skill is Skill => skill !== undefined);
      if (!child || skills.length === 0) {
        if (alive) setFound('missing');
        return;
      }
      const sheet = buildSheet(skills, await repo.getSkillStates(child.id), { skillIds, count, shift, seed });
      if (alive) setFound({ child, sheet });
    })().catch((error: unknown) => {
      logError(error);
      if (alive) setFound('missing');
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the address decides the sheet
  }, [passed, key]);

  const back = (): void => {
    void navigate('/parent/worksheets', { replace: true });
  };
  if (!passed) return <Gate onPass={() => setPassed((n) => n + 1)} onCancel={() => void navigate('/', { replace: true })} />;
  if (found === null) return null;
  const day = now().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <main className={styles.page} data-parent-page="worksheet">
      {found === 'missing' ? (
        <Notice role="alert">This worksheet could not be made. Go back and choose again.</Notice>
      ) : (
        <>
          <article className={styles.sheet} aria-label="Worksheet" data-sheet-seed={seed}>
            <header className={styles.head}>
              <h1 className={styles.title}>Sprout worksheet</h1>
              <p className={styles.meta}>
                Name: <strong>{found.child.name}</strong> · {day}
              </p>
            </header>
            {found.sheet.left.length > 0 && (
              <p className={styles.note} data-left-off="">
                Left off: {found.sheet.left.map(({ skill }) => skill.name).join(', ')}, because {found.sheet.left.length === 1 ? 'it is' : 'they are'} answered by listening, and a sheet of paper cannot speak.
              </p>
            )}
            <ol className={styles.items}>
              {found.sheet.items.map((item) => (
                <PaperQuestion key={item.number} item={item} />
              ))}
            </ol>
            <p className={styles.seed}>Sheet {seed}</p>
          </article>
          <article className={`${styles.sheet} ${styles.key}`} aria-label="Answer key" data-answer-key="">
            <h2 className={styles.title}>Answer key</h2>
            <ol className={styles.answers}>
              {found.sheet.items.map((item) => (
                <li key={item.number} data-answer={item.number}>
                  {item.answer} <span className={styles.from}>({item.skill.code} {item.skill.name})</span>
                </li>
              ))}
            </ol>
            <p className={styles.seed}>Sheet {seed}</p>
          </article>
        </>
      )}
      <div className={styles.screenOnly}>
        <CenterRow>
          {found !== 'missing' && (
            <BigButton onClick={() => window.print()}>
              <Icon name="printer" />
              Print
            </BigButton>
          )}
          <BigButton tone="quiet" onClick={back}>
            <Icon name="back" />
            Back
          </BigButton>
        </CenterRow>
      </div>
    </main>
  );
}

// One question as it goes on paper: what to do, the picture, then a place to answer.
function PaperQuestion({ item }: { item: SheetItem }) {
  const { question } = item;
  return (
    <li className={styles.item} data-paper-type={question.type}>
      <p className={styles.prompt}>{question.prompt.text}</p>
      {question.stimulus && <VisualView visual={question.stimulus} />}
      {question.type === 'tapCount' && <VisualView visual={{ kind: 'emojiGroup', emoji: question.emoji, count: question.shown, layout: 'row' }} />}
      <Answer question={question} />
    </li>
  );
}

function Answer({ question }: { question: SheetItem['question'] }) {
  switch (question.type) {
    case 'choice':
    case 'multiSelect':
      return (
        <>
          <p className={styles.how}>{question.type === 'choice' ? 'Circle the answer.' : 'Circle every answer.'}</p>
          <div className={styles.options}>
            {question.options.map((option, i) => (
              <div key={i} className={styles.option}>
                <span className={styles.letter}>{LETTERS[i]}</span>
                <VisualView visual={option} />
              </div>
            ))}
          </div>
        </>
      );
    case 'numberPad':
    case 'tapCount':
      return (
        <p className={styles.how}>
          Answer: <span className={styles.box} />
        </p>
      );
    case 'order':
      return (
        <>
          <p className={styles.how}>Write 1, 2, 3 in the boxes to put them in order.</p>
          <div className={styles.options}>
            {question.items.map((each, i) => (
              <div key={i} className={styles.option}>
                <span className={styles.box} />
                <VisualView visual={each} />
              </div>
            ))}
          </div>
        </>
      );
    case 'sort':
      return (
        <>
          <p className={styles.how}>Write each number in the right group.</p>
          <div className={styles.options}>
            {question.items.map((each, i) => (
              <div key={i} className={styles.option}>
                <span className={styles.letter}>{i + 1}</span>
                <VisualView visual={each} />
              </div>
            ))}
          </div>
          <div className={styles.bins}>
            {question.bins.map((bin) => (
              <div key={bin.label} className={styles.bin}>
                {bin.label}
              </div>
            ))}
          </div>
        </>
      );
    case 'match':
      return (
        <>
          <p className={styles.how}>Draw a line from each one on the left to its match.</p>
          <div className={styles.match}>
            <div className={styles.column}>
              {question.left.map((each, i) => (
                <div key={i} className={styles.option}>
                  <span className={styles.letter}>{i + 1}</span>
                  <VisualView visual={each} />
                </div>
              ))}
            </div>
            <div className={styles.column}>
              {question.right.map((each, i) => (
                <div key={i} className={styles.option}>
                  <span className={styles.letter}>{LETTERS[i]}</span>
                  <VisualView visual={each} />
                </div>
              ))}
            </div>
          </div>
        </>
      );
    case 'tiles':
      return (
        <p className={styles.how}>
          Use these: <strong>{question.bank.join('  ')}</strong>. Write it here: <span className={styles.line} />
        </p>
      );
    case 'fillShape':
      return (
        <>
          <p className={styles.how}>
            Count the pieces in the shape. Write how many: <span className={styles.line} />
          </p>
          <VisualView visual={{ kind: 'figure', figure: question.figure, show: 'cut' }} />
        </>
      );
    case 'numberLineTap':
      return (
        <>
          <p className={styles.how}>Draw a dot on the line at the right place.</p>
          <VisualView visual={{ kind: 'numberLine', min: question.line.min, max: question.line.max, step: question.line.step, ...(question.line.denominator ? { denominator: question.line.denominator } : {}) }} />
        </>
      );
    case 'setClock':
      return (
        <>
          <p className={styles.how}>Draw the hands.</p>
          <VisualView visual={{ kind: 'clock', hour: 12, minute: 0, noHands: true }} />
        </>
      );
    case 'buildBar':
      return (
        <>
          <p className={styles.how}>Colour the boxes to make each bar{question.scale && question.scale > 1 ? `. Each box is ${question.scale}` : ''}.</p>
          {question.title && (
            <p className={styles.barTitle} data-title="">
              {question.title}
            </p>
          )}
          <div className={styles.bars}>
            {question.categories.map((category) => (
              <div key={category.label} className={styles.option}>
                <span className={styles.letter}>{category.label}</span>
                {Array.from({ length: question.max / (question.scale ?? 1) }, (_, i) => (
                  <span key={i} className={styles.cell} />
                ))}
              </div>
            ))}
          </div>
        </>
      );
    case 'columnSum':
      return (
        <>
          <VisualView visual={{ kind: 'text', value: `${question.top} ${question.op === '+' ? '+' : '−'} ${question.bottom}`, size: 'l' }} />
          <p className={styles.how}>
            Work it out in columns. Answer: <span className={styles.box} />
          </p>
        </>
      );
    case 'dragWord':
      return (
        <>
          <p className={styles.how}>
            {question.before} <span className={styles.line} /> {question.after}
          </p>
          <p className={styles.how}>Circle the word that goes in the gap.</p>
          <div className={styles.options}>
            {question.options.map((option, i) => (
              <div key={i} className={styles.option}>
                <span className={styles.letter}>{LETTERS[i]}</span>
                <VisualView visual={option} />
              </div>
            ))}
          </div>
        </>
      );
  }
}
