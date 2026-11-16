import { useEffect, useState } from 'react';
import { awardSkills } from '../../app/awardsRun';
import type { ScoreRow, ScoreSort } from '../../app/parentData';
import { GRADE_NAME, STAGE_NAME, scoreRows, sortRows } from '../../app/parentData';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import Tabs from '../../components/Tabs';
import { videoFor, VIDEOS_ENABLED } from '../../content/videos';
import { localDayOf } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import { SUBJECTS } from '../kid/Home';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

const COLUMNS: { id: ScoreSort; label: string }[] = [
  { id: 'skill', label: 'Skill' },
  { id: 'score', label: 'Score' },
  { id: 'attempts', label: 'Answers' },
  { id: 'accuracy', label: 'Right' },
  { id: 'minutes', label: 'Minutes' },
  { id: 'last', label: 'Last practised' },
];

// Every skill with its score, stage, answers, accuracy, time spent and when it was last practised. Sortable.
export default function Scores() {
  const { children, child, pick } = useChildren();
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [sort, setSort] = useState<ScoreSort>('skill');
  // Videos a parent has taken away on this device.
  const [removed, setRemoved] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const device = await repo.getDeviceState();
      if (alive) setRemoved(device.removedVideos);
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, []);

  async function removeVideo(skillId: string): Promise<void> {
    const next = [...new Set([...removed, skillId])];
    setRemoved(next);
    const { repo } = await openRepo();
    await repo.updateDeviceState({ removedVideos: next });
  }

  useEffect(() => {
    if (!child) return;
    let alive = true;
    setRows(null);
    void (async () => {
      const { repo } = await openRepo();
      const [states, attempts] = await Promise.all([repo.getSkillStates(child.id), repo.listAttempts(child.id, {})]);
      if (alive) setRows(scoreRows(awardSkills(), states, attempts));
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [child]);

  const shown = rows ? sortRows(rows, sort) : [];
  const groupOf = (row: ScoreRow): string => `${SUBJECTS.find((subject) => subject.id === row.skill.subject)?.label ?? ''}, ${GRADE_NAME[row.skill.grade] ?? row.skill.grade}, ${row.skill.category}`;
  return (
    <ParentArea page="scores" title="Scores">
      {children !== null && children.length === 0 && <Notice role="status">No children yet. Add one from Settings.</Notice>}
      {children !== null && children.length > 1 && child && <Tabs label="Child" tabs={children.map((each) => ({ id: each.id, label: each.name }))} current={child.id} onPick={pick} />}
      {child && rows && (
        <div className={styles.panel}>
          <div className={styles.scroll}>
            <table className={styles.table} data-sort={sort}>
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column.id} scope="col" aria-sort={sort === column.id ? (column.id === 'skill' ? 'ascending' : 'descending') : 'none'}>
                      <LinkButton onClick={() => setSort(column.id)}>{column.label}</LinkButton>
                    </th>
                  ))}
                  <th scope="col">Stage</th>
                  {VIDEOS_ENABLED && <th scope="col">Video</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, index) => (
                  <ScoreLine key={row.skill.id} row={row} videos={VIDEOS_ENABLED} video={videoFor(row.skill.id, removed)?.title ?? null} onRemoveVideo={() => void removeVideo(row.skill.id).catch(logError)} group={sort === 'skill' && (index === 0 || groupOf(shown[index - 1] as ScoreRow) !== groupOf(row)) ? groupOf(row) : null} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ParentArea>
  );
}

function ScoreLine({ row, group, videos, video, onRemoveVideo }: { row: ScoreRow; group: string | null; videos: boolean; video: string | null; onRemoveVideo: () => void }) {
  return (
    <>
      {group && (
        <tr data-group={group}>
          <th colSpan={videos ? 8 : 7} scope="colgroup">
            {group}
          </th>
        </tr>
      )}
      <tr data-skill-row={row.skill.id}>
        <td>
          {row.skill.code} {row.skill.name}
        </td>
        <td data-cell="score">{row.score}</td>
        <td>{row.attempts}</td>
        <td>{row.accuracy === null ? '' : `${row.accuracy}%`}</td>
        <td>{row.minutes}</td>
        <td>{row.lastPracticedAt ? localDayOf(row.lastPracticedAt) : ''}</td>
        <td>
          <span className={styles.chip} data-stage={row.stage}>
            {STAGE_NAME[row.stage]}
          </span>
        </td>
        {videos && (
          <td data-cell="video">
            {video && (
              <LinkButton onClick={onRemoveVideo} aria-label={`Remove the video from ${row.skill.name}`} data-remove-video={row.skill.id} title={video}>
                Remove
              </LinkButton>
            )}
          </td>
        )}
      </tr>
    </>
  );
}
