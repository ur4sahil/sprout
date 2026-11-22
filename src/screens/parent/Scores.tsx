import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { awardSkills } from '../../app/awardsRun';
import type { ScoreRow, ScoreSort } from '../../app/parentData';
import { categoryComplete, GRADE_NAME, STAGE_NAME, scoreRows, sortRows } from '../../app/parentData';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import Tabs from '../../components/Tabs';
import { videoFor, VIDEOS_ENABLED } from '../../content/videos';
import { offeredTo } from '../../engine/grades';
import { localDayOf, now } from '../../lib/clock';
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
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [sort, setSort] = useState<ScoreSort>('skill');
  // Videos a parent has taken away.
  const [removed, setRemoved] = useState<string[]>([]);
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

  async function removeVideo(skillId: string): Promise<void> {
    const next = [...new Set([...removed, skillId])];
    setRemoved(next);
    const { repo } = await openRepo();
    // Saved with the family, so the video is gone on every device.
    await repo.saveFamily({ ...(await repo.getFamily()), removedVideos: next, updatedAt: now().toISOString() });
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
  // Every skill is listed, but a group is finished, for its certificate, when the skills this child is offered are
  // mastered (offeredTo: a pre-K or kindergarten child is never offered the word puzzles).
  const offered = rows && child ? rows.filter((row) => offeredTo(row.skill, child.grade)) : null;
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
                  <ScoreLine key={row.skill.id} row={row} onCertificate={offered && categoryComplete(offered, row.skill) ? () => void navigate(`/parent/certificate/${child.id}/${row.skill.id}`, { replace: true }) : null} videos={VIDEOS_ENABLED} video={videoFor(row.skill.id, removed)?.title ?? null} onRemoveVideo={() => void removeVideo(row.skill.id).catch(logError)} group={sort === 'skill' && (index === 0 || groupOf(shown[index - 1] as ScoreRow) !== groupOf(row)) ? groupOf(row) : null} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ParentArea>
  );
}

function ScoreLine({ row, group, videos, video, onRemoveVideo, onCertificate }: { row: ScoreRow; group: string | null; videos: boolean; video: string | null; onRemoveVideo: () => void; onCertificate: (() => void) | null }) {
  return (
    <>
      {group && (
        <tr data-group={group}>
          <th colSpan={videos ? 8 : 7} scope="colgroup">
            {group}
            {onCertificate && (
              <>
                {' '}
                <LinkButton onClick={onCertificate} aria-label={`Certificate for ${group}`} data-certificate-link="">
                  Certificate
                </LinkButton>
              </>
            )}
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
