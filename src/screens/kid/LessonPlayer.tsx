import Icon from "../../components/Icon";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TIMING } from "../../app/timing";
import { useWakeLock } from "../../app/useWakeLock";
import { speak, stop } from "../../audio/speech";
import { warmAll } from "../../audio/voice";
import { LINES } from "../../audio/lines";
import TeachLesson from "../../components/TeachLesson";
import { teachingFor, teachingPart2For } from "../../lessons";
import BigButton from "../../components/BigButton";
import CenterRow from "../../components/CenterRow";
import Column from "../../components/Column";
import IconButton from "../../components/IconButton";
import KidScreen from "../../components/KidScreen";
import StepDots from "../../components/StepDots";
import StepList from "../../components/StepList";
import Tabs from "../../components/Tabs";
import VideoPlayer from "../../components/VideoPlayer";
import type { Skill } from "../../content/catalogue";
import { exampleQuestion, generatorFor } from "../../content/registry";
import { videoFor } from "../../content/videos";
import { describeAnswer } from "../../engine/describe";
import { logError } from "../../lib/errorLog";
import { openRepo } from "../../storage/index";
import type { Child } from "../../storage/schema";
import VisualView from "../../visuals/VisualView";
import styles from "./LessonPlayer.module.css";

interface Props {
  child: Child;
  skill: Skill;
  startOnPart2?: boolean; // opened from the half-way milestone: straight to the second lesson
}

const BEAT_NAME = {
  see: "See it",
  watch: "Watch me",
  try: "Try it together",
  remember: "Remember",
};
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Two kinds of help: a narrated mini-lesson in four beats, and one example solved step by step.
// They use the same pictures as the questions and work with no network. Some skills add a third: a video.
export default function LessonPlayer({ child, skill, startOnPart2 = false }: Props) {
  const navigate = useNavigate();
  const beats = useMemo(() => generatorFor(skill.id).lesson(), [skill]);
  const example = useMemo(() => exampleQuestion(skill.id), [skill]);
  // A lesson that teaches (plan section 16), where the skill has one. Otherwise the old four beats.
  const teaching = useMemo(() => teachingFor(skill.id), [skill]);
  // Part 2: a second short lesson for the skill's harder levels, where one is written.
  const teaching2 = useMemo(() => teachingPart2For(skill.id), [skill]);
  // Everything the lesson and its example say is asked for as the lesson opens, so each line is ready in time.
  useEffect(() => {
    if (teaching) return;
    warmAll([...beats.flatMap((each) => (each.reveal ? [each.speak, each.reveal.speak] : [each.speak])), example.prompt.speak, example.explanation.speak], "lesson");
  }, [beats, example, teaching]);
  // The bulb opens on a choice (the owner's choice, Nov 18, 2026): nothing starts until a kind of help is tapped.
  const [mode, setMode] = useState<"choose" | "lesson" | "lesson2" | "example">(startOnPart2 && teaching2 ? "lesson2" : "choose");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stepsShown, setStepsShown] = useState(0);
  const rate = child.settings.speechRate;
  useWakeLock();

  // A video is offered only when the skill has one, the device is online, videos are on for this
  // child, and a parent has not removed it.
  const [removed, setRemoved] = useState<string[] | null>(null);
  const [watching, setWatching] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const family = await repo.getFamily();
      if (alive) setRemoved(family.removedVideos);
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, []);
  const video =
    removed !== null && child.settings.allowVideos && navigator.onLine
      ? videoFor(skill.id, removed)
      : null;
  const decided = removed !== null;
  const closeVideo = (): void => setWatching(false);
  // A choice from the opening screen, or from the tabs once a kind of help is open.
  const pick = (id: string): void => {
    stop();
    if (id === "video") {
      setPlaying(false);
      setWatching(true);
      return;
    }
    setMode(id as "lesson" | "lesson2" | "example");
    setIndex(0);
    setRevealed(false);
    setFinished(false);
    setPlaying(id === "lesson" && teaching === null);
    setStepsShown(0);
  };
  // The choice screen says what it offers, once, as it opens.
  useEffect(() => {
    if (mode !== "choose" || !decided) return;
    void speak(video ? LINES.chooseWithVideo : LINES.choose, rate);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the choice is first shown
  }, [decided]);

  const beat = beats[index];

  // Plays one beat: says it, waits and reveals the answer for "Try it together", then moves on.
  useEffect(() => {
    if (teaching || !decided || watching || mode !== "lesson" || !playing || !beat) return;
    let cancelled = false;
    void (async () => {
      await speak(beat.speak, rate, "lesson");
      if (cancelled) return;
      if (beat.reveal) {
        await wait(TIMING.tryPauseMs);
        if (cancelled) return;
        setRevealed(true);
        await speak(beat.reveal.speak, rate, "lesson");
        if (cancelled) return;
      }
      await wait(TIMING.beatGapMs);
      if (cancelled) return;
      if (index < beats.length - 1) {
        setRevealed(false);
        setIndex(index + 1);
      } else {
        setPlaying(false);
        setFinished(true);
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [teaching, decided, watching, mode, playing, index, beat, beats.length, rate]);

  // The example: its question is read first, then each step as it is shown.
  useEffect(() => {
    if (mode !== "example") return;
    void speak(
      stepsShown === 0 ? example.prompt.speak : example.explanation.speak,
      rate,
      "lesson",
    );
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when the example opens and once when its answer is shown
  }, [mode, stepsShown === 0]);

  function jump(to: number): void {
    setRevealed(false);
    setFinished(false);
    setIndex(to);
    setPlaying(true);
  }

  const practise = (): void => {
    void navigate(`/skill/${skill.id}`, { replace: true });
  };
  const steps = example.explanation.steps;

  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="back" label="Back to practice" onClick={practise} />
          <h1 className={styles.title}>
            <Icon name="bulb" />
            {skill.name}
          </h1>
        </>
      }
    >
      {mode === "choose" ? (
        <Column label="Choose how to learn">
          <div className={styles.choices} data-learn-choice="">
            {video && (
              <BigButton size="kid" onClick={() => pick("video")}>
                <Icon name="video" />
                Watch a video
              </BigButton>
            )}
            <BigButton size="kid" tone={video ? "quiet" : "main"} onClick={() => pick("lesson")}>
              <Icon name="film" />
              Lesson with Sprout
            </BigButton>
            {teaching2 && (
              <BigButton size="kid" tone="quiet" onClick={() => pick("lesson2")}>
                <Icon name="film" />
                Lesson, part 2
              </BigButton>
            )}
            <BigButton size="kid" tone="quiet" onClick={() => pick("example")}>
              <Icon name="pencil" />
              Example
            </BigButton>
          </div>
        </Column>
      ) : (
        <Tabs
          label="Kind of help"
          tabs={[
            ...(video ? [{ id: "video", label: "Video", icon: "video" as const }] : []),
            { id: "lesson", label: teaching2 ? "Lesson 1" : "Lesson", icon: "film" as const },
            ...(teaching2 ? [{ id: "lesson2", label: "Lesson 2", icon: "film" as const }] : []),
            { id: "example", label: "Example", icon: "pencil" as const },
          ]}
          current={mode}
          onPick={pick}
        />
      )}

      {mode === "lesson" && teaching && decided && !watching && (
        <TeachLesson key={skill.id} lesson={teaching} rate={rate} onPractise={practise} />
      )}

      {mode === "lesson2" && teaching2 && decided && !watching && (
        <TeachLesson key={`${skill.id}|2`} lesson={teaching2} rate={rate} onPractise={practise} />
      )}

      {mode === "lesson" && !teaching && beat && (
        <Column label="Lesson" data-beat={beat.beat} data-playing={playing}>
          <div className={styles.card}>
            <h2 className={styles.beatName}>{BEAT_NAME[beat.beat]}</h2>
            <div className={styles.picture}>
              <VisualView
                visual={
                  revealed && beat.reveal?.visual
                    ? beat.reveal.visual
                    : beat.visual
                }
              />
            </div>
            <p className={styles.text} data-beat-text="">
              {revealed && beat.reveal ? beat.reveal.text : beat.text}
            </p>
            <StepDots
              label="Steps of the lesson"
              names={beats.map((each) => BEAT_NAME[each.beat])}
              current={index}
              onPick={jump}
            />
            <CenterRow>
              <IconButton
                icon={playing ? "pause" : "play"}
                label={playing ? "Pause" : "Play"}
                onClick={() => (finished ? jump(0) : setPlaying(!playing))}
              />
              <IconButton
                icon="repeat"
                label="Start again"
                onClick={() => jump(0)}
              />
              {finished && (
                <BigButton size="kid" onClick={practise}>
                  <Icon name="pencil" />Practise
                </BigButton>
              )}
            </CenterRow>
          </div>
        </Column>
      )}

      {mode === "example" && (
        <Column label="Example" data-steps-shown={stepsShown}>
          <div className={styles.card}>
            <p className={styles.text}>{example.prompt.text}</p>
            {example.stimulus && (
              <div className={styles.picture}>
                <VisualView visual={example.stimulus} />
              </div>
            )}
            {stepsShown > 0 && <StepList steps={steps.slice(0, stepsShown)} />}
            {stepsShown >= steps.length && (
              <p className={styles.answer} data-example-answer="">
                <Icon name="check" />
                {describeAnswer(example)}
              </p>
            )}
            <CenterRow>
              {stepsShown < steps.length ? (
                <BigButton
                  size="kid"
                  onClick={() => setStepsShown(stepsShown + 1)}
                >
                  <Icon name="next" />
                  {stepsShown === 0 ? "Show me how" : "Next step"}
                </BigButton>
              ) : (
                <BigButton size="kid" onClick={practise}>
                  <Icon name="pencil" />Practise
                </BigButton>
              )}
            </CenterRow>
          </div>
        </Column>
      )}
      {watching && video && (
        <VideoPlayer video={video} onClose={closeVideo} />
      )}
    </KidScreen>
  );
}
