import Icon from "../../components/Icon";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TIMING } from "../../app/timing";
import { useWakeLock } from "../../app/useWakeLock";
import { speak, stop } from "../../audio/speech";
import { warmAll } from "../../audio/voice";
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
export default function LessonPlayer({ child, skill }: Props) {
  const navigate = useNavigate();
  const beats = useMemo(() => generatorFor(skill.id).lesson(), [skill]);
  const example = useMemo(() => exampleQuestion(skill.id), [skill]);
  // Everything the lesson and its example say is asked for as the lesson opens, so each line is ready in time.
  useEffect(() => {
    warmAll([...beats.flatMap((each) => (each.reveal ? [each.speak, each.reveal.speak] : [each.speak])), example.prompt.speak, example.explanation.speak], "lesson");
  }, [beats, example]);
  const [mode, setMode] = useState<"lesson" | "example">("lesson");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
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

  const beat = beats[index];

  // Plays one beat: says it, waits and reveals the answer for "Try it together", then moves on.
  useEffect(() => {
    if (mode !== "lesson" || !playing || !beat) return;
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
  }, [mode, playing, index, beat, beats.length, rate]);

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
      <Tabs
        label="Kind of help"
        tabs={[
          { id: "lesson", label: "Lesson", icon: "film" as const },
          { id: "example", label: "Example", icon: "pencil" as const },
          ...(video ? [{ id: "video", label: "Video", icon: "video" as const }] : []),
        ]}
        current={mode}
        onPick={(id) => {
          // The video opens over the lesson, which waits behind it.
          if (id === "video") {
            stop();
            setPlaying(false);
            setWatching(true);
            return;
          }
          setMode(id as "lesson" | "example");
          setPlaying(id === "lesson");
          setStepsShown(0);
        }}
      />

      {mode === "lesson" && beat && (
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
        <VideoPlayer video={video} onClose={() => setWatching(false)} />
      )}
    </KidScreen>
  );
}
