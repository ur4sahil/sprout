import Art from '../../visuals/Art';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hasPass } from '../../app/pin';
import Gate from './Gate';
import { CHECK_IN_SUBJECTS, SUBJECT_NAME } from '../../app/checkIn';
import { useAppStore } from '../../app/store';
import { isMuted, setMuted } from '../../audio/mute';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import Notice from '../../components/Notice';
import SelectField from '../../components/SelectField';
import Tabs from '../../components/Tabs';
import ToggleField from '../../components/ToggleField';
import { VIDEOS_ENABLED } from '../../content/videos';
import { newProgress } from '../../engine/diagnostic';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child, ChildSettings, DiagnosticSubject, Grade } from '../../storage/schema';
import ChildSetup from './ChildSetup';
import ChoosePin from './ChoosePin';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

const GRADES = [
  { value: 'PK', label: 'Pre-K' },
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
];
const numbers = (values: number[], unit: (n: number) => string): { value: string; label: string }[] => values.map((n) => ({ value: String(n), label: unit(n) }));
const SESSION = numbers([5, 6, 8, 10, 12, 15, 20], (n) => `${n} questions`);
const GOAL = numbers([5, 10, 15, 20, 25, 30, 40, 50], (n) => `${n} questions`);
const MINUTES = numbers([0, 10, 15, 20, 30, 45, 60, 90], (n) => (n === 0 ? 'No limit' : `${n} minutes`));
const RATE = [
  { value: '0.7', label: 'Slow' },
  { value: '0.85', label: 'Normal' },
  { value: '1', label: 'Fast' },
];
// A saved value that is not on the list is still shown, so opening the screen never changes it.
const withValue = (options: { value: string; label: string }[], value: number, unit: string): { value: string; label: string }[] =>
  options.some((option) => Number(option.value) === value) ? options : [...options, { value: String(value), label: `${value} ${unit}` }];

// Per child: grade and how practice behaves. For the device: mute. For the family: the PIN.
export default function Settings() {
  const navigate = useNavigate();
  const { children, child, pick, reload } = useChildren();
  // Opened from the profile page's "Add a child" (?add=1): straight to adding a child, then back to that page.
  const [params] = useSearchParams();
  const fromStart = params.get('add') === '1';
  const [mode, setMode] = useState<'settings' | 'addChild' | 'pin'>(fromStart ? 'addChild' : 'settings');
  const [, setPassed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [muted, setMutedHere] = useState(isMuted());

  async function save(next: Child): Promise<void> {
    try {
      await (await openRepo()).repo.saveChild({ ...next, updatedAt: now().toISOString() });
      setMessage('Saved.');
      reload();
    } catch (error) {
      logError(error);
      setMessage('That could not be saved. Try again.');
    }
  }
  const set = (change: Partial<ChildSettings>): void => {
    if (child) void save({ ...child, settings: { ...child.settings, ...change } });
  };

  // Starts the check-in again for one subject. Skill Scores are not touched, and the new check-in starts from the last placement.
  async function restart(subject: DiagnosticSubject): Promise<void> {
    if (!child) return;
    try {
      await (await openRepo()).repo.saveDiagnosticProgress(newProgress(child.id, subject, now().toISOString()));
      setMessage(`${child.name} will be offered the ${SUBJECT_NAME[subject]} check-in again.`);
    } catch (error) {
      logError(error);
      setMessage('That could not be saved. Try again.');
    }
  }

  async function mute(value: boolean): Promise<void> {
    setMuted(value);
    setMutedHere(value);
    useAppStore.getState().setMuted(value);
    await (await openRepo()).repo.updateDeviceState({ muted: value }).catch(logError);
  }

  if (mode === 'addChild') {
    // Adding a child is for grown-ups: the PIN first, as for every grown-up page.
    if (!hasPass()) return <Gate onPass={() => setPassed((n) => n + 1)} onCancel={() => void navigate('/', { replace: true })} />;
    const back = (): void => {
      if (fromStart) void navigate('/', { replace: true });
      else {
        setMode('settings');
        reload();
      }
    };
    return <ChildSetup onDone={back} onCancel={back} />;
  }
  if (mode === 'pin') return <ChoosePin title="Choose a new PIN" onDone={() => setMode('settings')} onCancel={() => setMode('settings')} />;

  return (
    <ParentArea page="settings" title="Settings">
      {message && <Notice role="status">{message}</Notice>}
      {children !== null && children.length > 1 && child && <Tabs label="Child" tabs={children.map((each) => ({ id: each.id, label: each.name }))} current={child.id} onPick={pick} />}
      {child && (
        <section className={styles.panel} aria-label={`Settings for ${child.name}`}>
          <h2>
            <Art emoji={child.avatar} /> {child.name}
          </h2>
          <SelectField label="Grade" value={child.grade} options={GRADES} onValue={(grade) => void save({ ...child, grade: grade as Grade })} />
          <SelectField label="Questions in a session" value={String(child.settings.sessionLength)} options={withValue(SESSION, child.settings.sessionLength, 'questions')} onValue={(value) => set({ sessionLength: Number(value) })} />
          <SelectField label="Daily goal" value={String(child.settings.dailyGoalQuestions)} options={withValue(GOAL, child.settings.dailyGoalQuestions, 'questions')} onValue={(value) => set({ dailyGoalQuestions: Number(value) })} />
          <SelectField label="Daily time limit" value={String(child.settings.dailyMinutes)} options={withValue(MINUTES, child.settings.dailyMinutes, 'minutes')} onValue={(value) => set({ dailyMinutes: Number(value) })} />
          <SelectField label="Voice speed" value={String(child.settings.speechRate)} options={withValue(RATE, child.settings.speechRate, '')} onValue={(value) => set({ speechRate: Number(value) })} />
          <ToggleField label="Read questions aloud" checked={child.settings.autoSpeak} onChange={(autoSpeak) => set({ autoSpeak })} />
          <ToggleField label="Pre-reader mode" hint="Picture tiles and spoken buttons, for a child who cannot read yet." checked={child.settings.preReader} onChange={(preReader) => set({ preReader })} />
          <ToggleField label="Gentle scoring" hint="A wrong answer takes fewer points away." checked={child.settings.gentleScoring} onChange={(gentleScoring) => set({ gentleScoring })} />
          <ToggleField label="Show a timer" checked={child.settings.showTimer} onChange={(showTimer) => set({ showTimer })} />
          {VIDEOS_ENABLED && <ToggleField label="Videos in lessons" checked={child.settings.allowVideos} onChange={(allowVideos) => set({ allowVideos })} />}
          <h3>Check-in</h3>
          <CenterRow>
            {CHECK_IN_SUBJECTS.map((subject) => (
              <BigButton key={subject} onClick={() => void restart(subject)}>
                Restart {SUBJECT_NAME[subject]} check-in
              </BigButton>
            ))}
          </CenterRow>
        </section>
      )}
      <section className={styles.panel} aria-label="Family and device">
        <h2>Family and this device</h2>
        <ToggleField label="Mute this device" hint="Turns off the voice and the sounds here." checked={muted} onChange={(value) => void mute(value)} />
        <CenterRow>
          <BigButton onClick={() => setMode('addChild')}>Add a child</BigButton>
          <BigButton onClick={() => setMode('pin')}>Change the PIN</BigButton>
          <BigButton onClick={() => void navigate('/parent/sound', { replace: true })}>Sound check</BigButton>
        </CenterRow>
      </section>
    </ParentArea>
  );
}
