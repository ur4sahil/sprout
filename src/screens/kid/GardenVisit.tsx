import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useChildDay } from '../../app/childDay';
import { partPath } from '../../app/todaysPlan';
import { useAppStore } from '../../app/store';
import { gardenMood } from '../../audio/music';
import { speak } from '../../audio/speech';
import { useMusic } from '../../audio/useMusic';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import { CATALOGUE } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import { openSets } from '../../engine/facts';
import type { Say } from '../../engine/types';
import Garden from '../../garden/Garden';
import type { GardenPlace } from '../../garden/Signpost';
import { now } from '../../lib/clock';
import { currentWorld } from '../../worlds';
import { SUBJECTS } from './Home';
import titles from './SubjectPage.module.css';
import styles from './GardenVisit.module.css';

// Where each place on the garden's signpost leads: the same screens home's menu opens.
const PLACE_PATH: Record<GardenPlace, string> = { 'subjects:math': '/subject/math', 'subjects:ela': '/subject/ela', 'subjects:reasoning': '/subject/reasoning', stickers: '/awards', facts: '/facts', switch: '/' };

// /garden: the whole garden, a place to visit (the owner's choice A, Nov 18, 2026). Home shows today's plan as
// cards with a strip of the garden over them; tapping the strip comes here. Every plant, the path of today's plan
// and the signpost work as they did when the garden was home.
export default function GardenVisit() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const { day, failed } = useChildDay(child);
  useMusic(child && day && !day.limitReached ? gardenMood(now()) : null);
  const readySkills = useMemo(() => {
    const ready = new Set(allGenerators().map((generator) => generator.skillId));
    return CATALOGUE.filter((skill) => ready.has(skill.id));
  }, []);
  if (!child) return <Navigate to="/" replace />;
  if (day?.limitReached) return <Navigate to="/home" replace />;

  const go = (path: string): void => void navigate(path, { replace: true });
  const say = (text: Say): void => void speak(text, child.settings.speechRate);
  const subjects = SUBJECTS.filter((subject) => readySkills.some((skill) => skill.subject === subject.id && !skill.retired));
  const factsOpen = openSets(child.grade, child.settings.factSets).length > 0;
  const places: GardenPlace[] = [...subjects.map((subject): GardenPlace => `subjects:${subject.id}`), 'stickers', ...(factsOpen ? (['facts'] as const) : []), 'switch'];

  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="home" label="Back to home" onClick={() => go('/home')} />
          <h1 className={titles.title}>{currentWorld().home?.title ?? 'Your garden'}</h1>
        </>
      }
    >
      {failed && <Notice role="alert">Your scores could not be read. Close the app and open it again.</Notice>}
      {day && (
        <div className={styles.page} data-garden-visit="">
          <Garden
            grade={child.grade}
            day={day}
            skills={readySkills}
            places={places}
            onOpen={(part) => go(partPath(part))}
            onSkill={(skillId, mode) => go(mode === 'learn' ? `/skill/${skillId}/learn` : `/skill/${skillId}`)}
            onPlace={(place) => go(PLACE_PATH[place])}
            onSpeak={say}
          />
        </div>
      )}
    </KidScreen>
  );
}
