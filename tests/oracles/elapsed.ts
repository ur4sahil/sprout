import type { Oracle } from './types';
import { num, text } from './types';

// Time on a 12-hour clock. ask: end (the time plus minutes later, "4:15"), minutes (from hour:minute to
// endHour:endMinute, going forward, less than 12 hours).
export const elapsed: Oracle = (facts) => {
  const hour = num(facts, 'hour');
  const minute = num(facts, 'minute');
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) throw new Error('oracle elapsed: not a clock time');
  const from = (hour % 12) * 60 + minute;
  const ask = text(facts, 'ask');
  if (ask === 'end') {
    const total = (from + num(facts, 'plus')) % 720;
    const h = Math.floor(total / 60);
    return { kind: 'value', value: `${h === 0 ? 12 : h}:${String(total % 60).padStart(2, '0')}` };
  }
  if (ask === 'minutes') {
    const to = (num(facts, 'endHour') % 12) * 60 + num(facts, 'endMinute');
    return { kind: 'value', value: (to - from + 720) % 720 };
  }
  throw new Error(`oracle elapsed: unknown ask ${ask}`);
};
