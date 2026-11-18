import type { PlanPart } from '../app/todaysPlan';
import { KEEP_GOING_QUESTIONS, MIXED_QUESTIONS, NEW_QUESTIONS, nextPart, partSize } from '../app/todaysPlan';
import { CAST_NAMES, Character, castFor } from '../cast';
import { skillById } from '../content/catalogue';
import type { Say } from '../engine/types';
import type { IconName } from './Icon';
import Icon from './Icon';
import IconButton from './IconButton';
import styles from './TodayPlan.module.css';

interface Props {
  plan: readonly PlanPart[];
  onOpen: (part: PlanPart) => void;
  onSpeak: (say: Say) => void;
  look?: 'list' | 'strip' | 'cards'; // strip: one row that slides sideways from tablet width. cards: home's big picture cards. Left out: the list
}

// Today's plan (plan section 18): one row for each part, in order, ticked when done. Each row opens its part.
const SUBJECT_WORD = { math: 'Math', ela: 'Language Arts', reasoning: 'Reasoning' } as const;

function words(part: PlanPart): { icon: IconName; title: string; detail: string; say: Say } {
  const name = (skillId: string): string => skillById(skillId)?.name ?? '';
  switch (part.kind) {
    case 'review':
      return { icon: 'repeat', title: 'Review', detail: part.done ? 'Done' : `${part.skillIds.length} ${part.skillIds.length === 1 ? 'skill' : 'skills'} · ${Math.min(part.answered, partSize(part))} of ${partSize(part)}`, say: ['Review the skills you know.'] };
    case 'keepGoing':
      return { icon: 'pencil', title: `${SUBJECT_WORD[part.subject]} practice`, detail: `${name(part.skillId)} · ${Math.min(part.answered, KEEP_GOING_QUESTIONS)} of ${KEEP_GOING_QUESTIONS}`, say: [`${SUBJECT_WORD[part.subject]} practice:`, ...(skillById(part.skillId)?.speakName ?? [])] };
    case 'new':
      return { icon: 'bulb', title: 'New skill', detail: `${name(part.skillId)} · ${Math.min(part.answered, NEW_QUESTIONS)} of ${NEW_QUESTIONS}`, say: ['A new skill:', ...(skillById(part.skillId)?.speakName ?? [])] };
    case 'mixed':
      if (part.locked) return { icon: 'bag', title: 'Mixed bag', detail: 'Opens after you practice two topics', say: ['Mixed bag. It opens after you practice two topics.'] };
      return { icon: 'bag', title: 'Mixed bag', detail: `${Math.min(part.answered, MIXED_QUESTIONS)} of ${MIXED_QUESTIONS}`, say: ['Mixed bag: questions from lots of topics.'] };
  }
}

// The friend on a card: the subject's friend for a skill, none for Review and the Mixed bag (they show an icon).
function friendOf(part: PlanPart) {
  if (part.kind === 'keepGoing') return castFor(part.subject);
  if (part.kind === 'new') {
    const subject = skillById(part.skillId)?.subject;
    return subject ? castFor(subject) : null;
  }
  return null;
}

// What a card says when it is the next one: "Next up! Math practice: Add to ten."
export function partSay(part: PlanPart): Say {
  return words(part).say;
}

// A part's name on its card: "Math practice".
export function partTitle(part: PlanPart): string {
  return words(part).title;
}

export default function TodayPlan({ plan, onOpen, onSpeak, look = 'list' }: Props) {
  const next = nextPart(plan);
  const cards = look === 'cards';
  return (
    <ol className={styles.plan} aria-label="Today's plan" data-look={look}>
      {plan.map((part, i) => {
        const shown = words(part);
        const locked = part.kind === 'mixed' && part.locked;
        const friend = cards ? friendOf(part) : null;
        const size = partSize(part);
        const isNext = part === next;
        return (
          <li key={`${part.kind}|${'skillId' in part ? part.skillId : i}`} className={styles.row} data-plan-part={part.kind} data-skill={'skillId' in part ? part.skillId : undefined} data-subject={part.kind === 'keepGoing' ? part.subject : undefined} data-done={part.done ? '' : undefined} data-locked={locked ? '' : undefined} data-next={isNext ? '' : undefined}>
            <button type="button" className={styles.open} disabled={locked} onClick={() => onOpen(part)} aria-label={`${shown.title}. ${shown.detail}${part.done ? '. Done' : ''}`}>
              <span className={styles.icon}>
                {friend && !part.done ? <Character who={friend} mood={isNext ? 'greet' : 'idle'} size={cards ? (isNext ? 64 : 48) : 32} /> : <Icon name={part.done ? 'check' : shown.icon} />}
              </span>
              <span className={styles.words}>
                <span className={styles.title}>{shown.title}</span>
                <span className={styles.detail}>
                  {friend ? `with ${CAST_NAMES[friend]} · ` : ''}
                  {shown.detail}
                </span>
                {cards && !locked && !part.done && size > 0 && (
                  <span className={styles.dots} aria-hidden="true">
                    {Array.from({ length: size }, (_, n) => (
                      <i key={n} data-on={n < part.answered ? '' : undefined} />
                    ))}
                  </span>
                )}
              </span>
              {cards && !locked && (
                <span className={styles.go} aria-hidden="true" data-go={part.done ? 'done' : 'play'}>
                  <Icon name={part.done ? 'check' : 'play'} />
                </span>
              )}
            </button>
            <IconButton icon="speaker" label={`Hear: ${shown.title}`} onClick={() => onSpeak(shown.say)} />
          </li>
        );
      })}
    </ol>
  );
}
