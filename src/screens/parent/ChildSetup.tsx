import Art from '../../visuals/Art';
import { useState } from 'react';
import type { FormEvent } from 'react';
import BigButton from '../../components/BigButton';
import FormCard from '../../components/FormCard';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import TextField from '../../components/TextField';
import TileButton from '../../components/TileButton';
import { AVATARS } from '../../content/data/avatars';
import { nowIso } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { newId } from '../../lib/ids';
import { openRepo } from '../../storage/index';
import type { Child, Grade } from '../../storage/schema';
import { defaultSettings } from '../../storage/schema';
import styles from './ChildSetup.module.css';

interface Props {
  onDone: (child: Child) => void;
  onCancel: () => void;
}

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'PK', label: 'Pre-K' },
  { grade: 'K', label: 'Kindergarten' },
  { grade: '1', label: 'Grade 1' },
  { grade: '2', label: 'Grade 2' },
  { grade: '3', label: 'Grade 3' },
];

// A grown-up adds a child in two steps: name and picture, then grade.
export default function ChildSetup({ onDone, onCancel }: Props) {
  const [step, setStep] = useState<'who' | 'grade'>('who');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]?.emoji ?? '🐶');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function next(event: FormEvent): void {
    event.preventDefault();
    if (name.trim().length === 0) {
      setMessage('Type a name first.');
      return;
    }
    setMessage(null);
    setStep('grade');
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    if (grade === null) {
      setMessage('Choose a grade first.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const at = nowIso();
      const child: Child = { id: newId(), name: name.trim(), avatar, grade, settings: defaultSettings(grade), resetAt: null, createdAt: at, updatedAt: at, deletedAt: null };
      await (await openRepo()).repo.saveChild(child);
      onDone(child);
    } catch (error) {
      logError(error);
      setMessage('The profile could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'who') {
    return (
      <FormCard title="Add a child" lead="For grown-ups. Step 1 of 2: name and picture." onSubmit={next}>
        <TextField label="First name" type="text" name="child-name" autoComplete="off" maxLength={40} required value={name} onValue={setName} />
        <div className={styles.grid} role="group" aria-label="Picture">
          {AVATARS.map((option) => (
            <TileButton key={option.emoji} label={option.name} selected={avatar === option.emoji} onClick={() => setAvatar(option.emoji)}>
              <span className={styles.emoji} aria-hidden="true">
                <Art emoji={option.emoji} />
              </span>
            </TileButton>
          ))}
        </div>
        {message && <Notice role="alert">{message}</Notice>}
        <BigButton type="submit">Next</BigButton>
        <LinkButton onClick={onCancel}>Cancel</LinkButton>
      </FormCard>
    );
  }

  return (
    <FormCard mark={avatar} title={name.trim()} lead="Step 2 of 2: which grade?" onSubmit={save}>
      <div className={styles.grid} role="group" aria-label="Grade">
        {GRADES.map((option) => (
          <TileButton key={option.grade} label={option.label} selected={grade === option.grade} onClick={() => setGrade(option.grade)}>
            <span>{option.label}</span>
          </TileButton>
        ))}
      </div>
      {message && <Notice role="alert">{message}</Notice>}
      <BigButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </BigButton>
      <LinkButton onClick={() => setStep('who')}>Back</LinkButton>
    </FormCard>
  );
}
