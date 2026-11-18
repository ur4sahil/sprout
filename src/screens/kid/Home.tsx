import { localDay } from '../../lib/clock';
import { EPISODES } from '../../stories/episodes';
import { storyForToday } from '../../stories/progress';
import { LINES } from '../../audio/lines';
import Art from '../../visuals/Art';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { stickerFor, syncAwards } from '../../app/awardsRun';
import { useChildDay } from '../../app/childDay';
import { popSkills } from '../../app/games';
import { useAppStore } from '../../app/store';
import { speak } from '../../audio/speech';
import { gardenMood } from '../../audio/music';
import { useMusic } from '../../audio/useMusic';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import GoalRing from '../../components/GoalRing';
import Icon, { type IconName } from '../../components/Icon';
import KidScreen from '../../components/KidScreen';
import { openSets } from '../../engine/facts';
import NavButton from '../../components/NavButton';
import TodayPlan, { partSay, partTitle } from '../../components/TodayPlan';
import SproutSays from '../../components/SproutSays';
import GardenStrip from '../../garden/GardenStrip';
import { nextPart, partPath, planProgress } from '../../app/todaysPlan';
import Notice from '../../components/Notice';
import { CATALOGUE } from '../../content/catalogue';
import { allGenerators } from '../../content/registry';
import type { AwardDef } from '../../engine/awards';
import type { Say } from '../../engine/types';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import awardStyles from './Awards.module.css';
import DailyLimit from './DailyLimit';
import styles from './Home.module.css';


export const SUBJECTS: { id: 'math' | 'ela' | 'reasoning'; label: string; icon: IconName }[] = [
  { id: 'math', label: 'Math', icon: 'math' },
  { id: 'ela', label: 'Language Arts', icon: 'book' },
  { id: 'reasoning', label: 'Reasoning', icon: 'shapes' },
];

export const GRADE_NAME: Record<string, string> = { PK: 'Pre-K', K: 'Kindergarten', '1': 'Grade 1', '2': 'Grade 2', '3': 'Grade 3', all: 'All' };

// The child's home: the menu of places to go, and today's plan (plan section 18) with the daily goal. By default
// (the owner's choice A, Nov 18, 2026) the plan is big picture cards, the next one ringed, with Sprout saying what
// is next and a strip of the garden on top that opens the whole garden (/garden). When a grown-up chose "A list"
// in Settings: the goal card and the plain list.
export default function Home() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const { day, failed } = useChildDay(child);
  useMusic(child && child.settings.homeView !== 'list' && day && !day.limitReached && !day.firstVisit ? gardenMood(now()) : null);
  const [fresh, setFresh] = useState<AwardDef[]>([]);
  // Pop is offered when the child has a skill in progress whose next question is a choice.
  const [popOffered, setPopOffered] = useState(false);
  useEffect(() => {
    if (!child) return;
    let alive = true;
    void openRepo()
      .then(async ({ repo }) => popSkills(child, await repo.getSkillStates(child.id)).length > 0)
      .then((found) => {
        if (alive) setPopOffered(found);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [child]);
  // Stickers are worked out each time home opens: after practice, a review, a check-in or a backup from another iPad.
  useEffect(() => {
    if (!child || !day || day.firstVisit) return;
    let alive = true;
    void openRepo()
      .then(({ repo }) => syncAwards(repo, child, now().toISOString()))
      .then((awards) => {
        if (!alive || awards.fresh.length === 0) return;
        setFresh(awards.fresh);
        void speak(awards.fresh.length === 1 ? LINES.newSticker : LINES.newStickers, child.settings.speechRate);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [child, day]);
  // The garden's plants are the skills that are ready to play, as everywhere on home.
  const readySkills = useMemo(() => {
    const ready = new Set(allGenerators().map((generator) => generator.skillId));
    return CATALOGUE.filter((skill) => ready.has(skill.id));
  }, []);
  if (!child) return <Navigate to="/" replace />;

  const go = (path: string): void => {
    void navigate(path, { replace: true });
  };
  const say = (text: Say): void => void speak(text, child.settings.speechRate);
  if (day?.limitReached) return <DailyLimit child={child} onDone={() => go('/')} />;
  // A child who has never opened the check-in starts with it.
  if (day?.firstVisit) return <Navigate to="/diagnostic?subject=math" replace />;

  const next = day ? nextPart(day.plan) : null;
  // The day's goal is the plan's questions added up.
  const goal = day ? planProgress(day.plan) : { done: 0, goal: 0 };
  // Today's story (game feel, phase 7): once the plan is done, at most one new story a day.
  const storyWaits = !!day && day.plan.length > 0 && nextPart(day.plan) === null && storyForToday(EPISODES, child.storiesRead, true, localDay()) !== null;
  const subjects = SUBJECTS.filter((subject) => readySkills.some((skill) => skill.subject === subject.id && !skill.retired));
  const factsOpen = openSets(child.grade, child.settings.factSets).length > 0;
  const asGarden = child.settings.homeView !== 'list';
  // What Sprout says over the cards: the next part, or that the plan is done.
  const sproutSay: Say = next ? [...LINES.nextUp, ...partSay(next)] : LINES.planDone;
  const sproutWords = next ? `Next up: ${partTitle(next)}` : day && day.plan.length > 0 ? 'Plan done! Great work.' : null;

  return (
    <KidScreen
      nav={
        <>
          <div className={styles.who}>
            <span className={styles.avatar} aria-hidden="true">
              <Art emoji={child.avatar} />
            </span>
            <div className={styles.names}>
              <h1 className={styles.name}>{child.name}</h1>
              <span className={styles.grade}>{GRADE_NAME[child.grade] ?? child.grade}</span>
            </div>
            {/* Back to the profile page, where another child can be picked. At the top, where it is easy to find. */}
            <BigButton size="kid" tone="quiet" className={styles.switch} onClick={() => go('/')}>
              <Icon name="person" />
              Switch child
            </BigButton>
          </div>
          <div className={styles.places} role="group" aria-label="Places to go">
            {day?.checkIn && <NavButton icon="compass" label="Check-in" data-check-in={day.checkIn} onClick={() => go(`/diagnostic?subject=${day.checkIn}`)} />}
            {day && day.reviewsDue.length > 0 && <NavButton icon="repeat" label={`Review (${day.reviewsDue.length})`} onClick={() => go('/review')} />}
            {subjects.map((subject) => (
              <NavButton key={subject.id} icon={subject.icon} label={subject.label} marker={subject.id} onClick={() => go(`/subject/${subject.id}`)} />
            ))}
            {asGarden && <NavButton icon="sprout" label="Garden" onClick={() => go('/garden')} />}
            {factsOpen && <NavButton icon="bolt" label="Fast facts" onClick={() => go('/facts')} />}
            <NavButton icon="star" label="Stickers" onClick={() => go('/awards')} />
            {child.storiesRead.length > 0 && <NavButton icon="book" label="Stories" onClick={() => go('/stories')} />}
            {popOffered && <NavButton icon="balloon" label="Pop" onClick={() => go('/games/pop')} />}
            <NavButton icon="cards" label="Pairs" onClick={() => go('/games/pairs')} />
          </div>
        </>
      }
    >
      {failed && <Notice role="alert">Your scores could not be read. Close the app and open it again.</Notice>}
      {day && asGarden && (
        <div className={styles.page} data-home-view="cards">
          <GardenStrip grade={child.grade} day={day} skills={readySkills} onOpen={() => go('/garden')} />
          {sproutWords && (
            <SproutSays words={sproutWords} mood={next ? 'point' : 'cheer'} onHear={() => say(sproutSay)} />
          )}
          {storyWaits && (
            <BigButton size="kid" className={styles.playButton} onClick={() => go('/story')}>
              <Icon name="book" />
              Story time!
            </BigButton>
          )}
          {day.plan.length > 0 ? (
            <TodayPlan look="cards" plan={day.plan} onOpen={(part) => go(partPath(part))} onSpeak={say} />
          ) : (
            <Notice role="status">Pick anything to practice from the menu.</Notice>
          )}
        </div>
      )}
      {day && !asGarden && (
        <div className={styles.page} data-home-view="list">
          <section className={styles.today} aria-label="Today">
            {goal.goal > 0 && <GoalRing done={goal.done} goal={goal.goal} />}
            <div className={styles.todayText}>
              <span className={styles.eyebrow}>Today</span>
              <span className={styles.todayLine} data-today-line="">
                {goal.goal === 0 ? 'Pick anything to practice' : goal.done >= goal.goal ? 'Goal reached!' : `${goal.done} of ${goal.goal} questions`}
              </span>
            </div>
            {next ? (
              <BigButton size="kid" className={styles.playButton} onClick={() => go(partPath(next))}>
                <Icon name="play" />
                {day.plan.some((part) => part.done || part.answered > 0) ? 'Continue' : "Start today's plan"}
              </BigButton>
            ) : day.plan.length > 0 ? (
              <span className={styles.todayLine} data-plan-done="">
                <Icon name="check" />
                Plan done!
              </span>
            ) : null}
          </section>
          {day.plan.length > 0 && (
            <>
              <h2 className={styles.heading}>Today's plan</h2>
              <TodayPlan plan={day.plan} onOpen={(part) => go(partPath(part))} onSpeak={say} />
            </>
          )}
        </div>
      )}
      {fresh.length > 0 && (
        <FullScreenCard emoji={stickerFor(fresh[0]?.id ?? '')} title={fresh.length === 1 ? 'New sticker!' : 'New stickers!'} line="You earned:" name="new-stickers">
          <ul className={awardStyles.fresh}>
            {fresh.map((award) => (
              <li key={award.id} data-new-award={award.id}>
                <Art emoji={stickerFor(award.id)} />{" "}
                {award.label}
              </li>
            ))}
          </ul>
          <BigButton size="kid" onClick={() => setFresh([])}>
            <Icon name="star" />Yay
          </BigButton>
        </FullScreenCard>
      )}
    </KidScreen>
  );
}
