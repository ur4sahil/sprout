import type { CSSProperties } from 'react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChildDay } from '../app/childDay';
import type { PlanPart } from '../app/todaysPlan';
import { nextPart } from '../app/todaysPlan';
import BigButton from '../components/BigButton';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import type { Skill } from '../content/catalogue';
import { CATALOGUE } from '../content/catalogue';
import type { Ladder } from '../content/ladders';
import { LADDERS } from '../content/ladders';
import type { Say } from '../engine/types';
import { now } from '../lib/clock';
import type { Grade } from '../storage/schema';
import { PALETTE } from '../visuals/palette';
import { currentWorld } from '../worlds';
import { GARDEN } from '../worlds/garden';
import type { HomeScene, World } from '../worlds/types';
import styles from './Garden.module.css';
import GardenBackdrop, { FAR_SPEED, MID_SPEED } from './GardenBackdrop';
import GardenGround from './GardenGround';
import GardenSprout from './GardenSprout';
import GardenSun from './GardenSun';
import type { Stone } from './layout';
import { KINDS_PER_AREA, PLANT_TALL, SCENE_HEIGHT, SLOT, bedsNear, firstView, layoutGarden, lightAt, plantOf, stonesNear, sunShare } from './layout';
import PathStone from './PathStone';
import PlantButton from './PlantButton';
import PlantCard from './PlantCard';
import type { GardenPlace } from './Signpost';
import Signpost, { ALL_PLACES } from './Signpost';

interface Props {
  grade: Grade; // the child's grade: its skills are the garden's plants
  day: Pick<ChildDay, 'states' | 'plan' | 'reviewsDue'>; // what home already works out: scores, today's plan, reviews due
  calm?: boolean; // the child's Calm mode. Left out: read from the page, as the rest of the app does
  places?: readonly GardenPlace[]; // what the signpost offers. Left out: everything
  skills?: readonly Skill[]; // left out: the whole catalogue
  ladders?: readonly Ladder[];
  world?: World; // left out: the world in use
  onOpen: (part: PlanPart) => void; // the big button, or a stepping stone: open this part of today's plan
  onSkill: (skillId: string, mode: 'practice' | 'learn') => void; // a plant's card: Practice or Lesson
  onPlace: (place: GardenPlace) => void; // the signpost
  onSpeak: (say: Say) => void; // say this aloud (a child who cannot read hears the plant's name)
}

const FIRST_VIEW = 140; // how much of the scene is taken as on screen before the screen has been measured
const CHUNK = 20; // the list of beds to draw is worked out again each time the child has scrolled this far
const SPROUT_WIDE = 11; // small enough that Sprout, on a stone, hides little of the front row
const SPROUT_TALL = SPROUT_WIDE * 1.2;

// Whether movement should be kept to short fades: the child's Calm mode, or the device's Reduce Motion.
function wantsStill(calm: boolean | undefined): boolean {
  if (calm !== undefined) return calm;
  if (typeof document !== 'undefined' && document.documentElement.dataset.calm !== undefined) return true;
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The child's home as a garden (game feel, phase 4): one wide scene scrolled sideways by finger. Each skill is a
// plant, each topic a bed, each subject an area; today's plan is a path of stepping stones and the sun fills as
// it is answered. Everything shown is worked out from what is saved. The garden saves nothing and goes nowhere
// itself: it tells the screen that shows it what the child asked for.
export default function Garden({ grade, day, calm, places = ALL_PLACES, skills = CATALOGUE, ladders = LADDERS, world, onOpen, onSkill, onPlace, onSpeak }: Props) {
  const home: HomeScene = (world ?? currentWorld()).home ?? (GARDEN.home as HomeScene);
  const layout = useMemo(() => layoutGarden({ grade, states: day.states, skills, ladders, plan: day.plan, reviewsDue: day.reviewsDue }), [grade, day.states, day.plan, day.reviewsDue, skills, ladders]);
  const byId = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
  const still = wantsStill(calm);
  // The light is read once, as the garden opens: it does not change under a child who is looking at it.
  const [light] = useState(() => lightAt(now()));
  const [picked, setPicked] = useState<string | null>(null);
  const [signpost, setSignpost] = useState(false);

  // Which stretch of the scene is on screen, in scene units. Beds outside it (and a margin) are not drawn.
  const [view, setView] = useState(() => {
    const from = firstView(layout, FIRST_VIEW);
    return { from, to: from + FIRST_VIEW };
  });
  const viewport = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const unit = useRef(0); // how many screen dots one scene unit is, once measured
  const placed = useRef(false); // the scene has been moved to show Sprout

  const look = useCallback((): void => {
    const box = viewport.current;
    const el = scene.current;
    if (!box || !el) return;
    const size = el.offsetHeight / SCENE_HEIGHT;
    if (!(size > 0)) return; // not laid out (or a test with no real page): keep the first guess
    if (size !== unit.current) {
      unit.current = size;
      el.style.setProperty('--set-unit', `${size}px`);
    }
    const wide = box.clientWidth / size;
    if (!placed.current) {
      // Open on Sprout, so the next stepping stone and its plant are what the child sees first.
      placed.current = true;
      box.scrollLeft = firstView(layout, wide) * size;
      // On a very short screen the scene is taller than its window: start at the foot, where the path is.
      box.scrollTop = box.scrollHeight;
    }
    const left = box.scrollLeft;
    // The far layers slide more slowly than the garden. In Calm mode they move with it.
    el.style.setProperty('--set-far-shift', `${still ? 0 : left * (1 - FAR_SPEED)}px`);
    el.style.setProperty('--set-mid-shift', `${still ? 0 : left * (1 - MID_SPEED)}px`);
    const from = Math.floor(left / size / CHUNK) * CHUNK;
    const to = from + CHUNK + Math.ceil(wide);
    setView((old) => (old.from === from && old.to === to ? old : { from, to }));
  }, [layout, still]);

  useLayoutEffect(() => {
    const box = viewport.current;
    if (!box) return;
    look();
    // One look for each frame the child scrolls, never more.
    let frame = 0;
    const canFrame = typeof window.requestAnimationFrame === 'function';
    const onScroll = (): void => {
      if (!canFrame) return look();
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        look();
      });
    };
    box.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', look);
    const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(look) : null;
    watcher?.observe(box);
    return () => {
      box.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', look);
      watcher?.disconnect();
      if (frame && canFrame) window.cancelAnimationFrame(frame);
    };
  }, [look]);

  const beds = bedsNear(layout, view.from, view.to);
  const stones = stonesNear(layout, view.from, view.to);
  const next = nextPart(day.plan);
  // Sprout cheers when the path is done. In Calm mode it stands quietly.
  const cheering = layout.path === 'done' && !still;
  const pickedPlant = picked ? plantOf(layout, picked) : null;
  const pickedSkill = picked ? byId.get(picked) : undefined;
  const kindOf = (subject: Skill['subject'], kind: number) => home.areas[subject].kinds[kind % KINDS_PER_AREA] ?? home.areas[subject].kinds[0];

  const pick = (skillId: string): void => {
    setSignpost(false);
    setPicked(skillId);
    const skill = byId.get(skillId);
    if (skill) onSpeak(skill.speakName);
  };

  const stoneLabel = (stone: Stone): string => {
    const part = stone.part;
    const name = 'skillId' in part ? (byId.get(part.skillId)?.name ?? '') : '';
    const what = part.kind === 'review' ? home.stones.review : part.kind === 'keepGoing' ? `${home.stones.practice}: ${name}` : part.kind === 'new' ? `${home.stones.fresh}: ${name}` : part.locked ? home.stones.locked : home.stones.mixed;
    return part.done ? `${what}. ${home.stones.done}` : what;
  };

  const sceneNumbers = { '--set-wide': layout.width, '--set-slot': SLOT, '--set-tall': PLANT_TALL } as CSSProperties;
  const sproutPlace = { '--set-x': layout.sprout.x - SPROUT_WIDE / 2, '--set-y': layout.sprout.y - SPROUT_TALL + 1, '--set-w': SPROUT_WIDE, '--set-h': SPROUT_TALL } as CSSProperties;

  return (
    <section className={styles.garden} aria-label={home.title} data-garden="" data-light={light} data-still={still ? '' : undefined} data-path={layout.path}>
      <div className={styles.viewport} ref={viewport} data-garden-view="">
        <div className={styles.scene} ref={scene} style={sceneNumbers} data-garden-scene="">
          <GardenBackdrop width={layout.width} light={light} still={still} areas={layout.areas} />
          <GardenGround layout={layout} beds={beds} stones={stones} home={home} />
          {beds.flatMap((bed) =>
            bed.plants.map((plant) => {
              const skill = byId.get(plant.skillId);
              const label = `${skill?.name ?? plant.skillId}. ${home.stages[plant.stage]}${plant.droop ? `. ${home.thirsty}` : ''}`;
              return <PlantButton key={plant.skillId} plant={plant} kind={kindOf(plant.subject, plant.kind)} label={label} picked={picked === plant.skillId} onPick={pick} />;
            }),
          )}
          {stones.map((stone) => (
            <PathStone key={stone.index} stone={stone} label={stoneLabel(stone)} onOpen={(which) => onOpen(which.part)} />
          ))}
          <div className={styles.sprout} style={sproutPlace} data-sprout="" data-on-stone={layout.sprout.stone ?? undefined} data-mood={cheering ? 'cheering' : 'idle'}>
            <GardenSprout cheering={cheering} />
          </div>
          {(light === 'evening' || light === 'night') && (
            <svg className={styles.tint} viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true" data-tint={light}>
              <rect x="0" y="0" width="10" height="10" fill={PALETTE.garden.tint[light]} opacity={light === 'night' ? 0.34 : 0.14} />
            </svg>
          )}
        </div>
      </div>

      <div className={styles.sun}>
        <GardenSun share={sunShare(layout.progress)} done={layout.progress.done} goal={layout.progress.goal} label={home.sun} />
      </div>

      {(pickedPlant && pickedSkill) || signpost ? (
        <div className={styles.over}>
          {pickedPlant && pickedSkill ? (
            <PlantCard
              key={pickedSkill.id}
              name={pickedSkill.name}
              stage={pickedPlant.stage}
              droop={pickedPlant.droop}
              kind={kindOf(pickedPlant.subject, pickedPlant.kind)}
              home={home}
              onPractice={() => onSkill(pickedSkill.id, 'practice')}
              onLesson={() => onSkill(pickedSkill.id, 'learn')}
              onHear={() => onSpeak([...pickedSkill.speakName, ...home.stageSay[pickedPlant.stage], ...(pickedPlant.droop ? home.thirstySay : [])])}
              onClose={() => setPicked(null)}
            />
          ) : (
            <Signpost places={places} words={home.signpost} onPlace={onPlace} onClose={() => setSignpost(false)} />
          )}
        </div>
      ) : null}

      <div className={styles.bar}>
        <IconButton
          icon="compass"
          label={home.signpost.open}
          onClick={() => {
            setPicked(null);
            setSignpost((open) => !open);
          }}
        />
        {next ? (
          <BigButton size="kid" className={styles.follow} data-follow={layout.path} onClick={() => onOpen(next)}>
            <Icon name={layout.path === 'going' ? 'next' : 'play'} />
            {layout.path === 'going' ? home.path.going : home.path.start}
          </BigButton>
        ) : layout.path === 'done' ? (
          <p className={styles.done} data-follow="done">
            <Icon name="check" />
            {home.path.done}
          </p>
        ) : null}
      </div>
    </section>
  );
}
