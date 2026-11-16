import type { Oracle } from './types';
import { num } from './types';

// A clock time written as "3:00" or "3:05". Hours run 1 to 12.
export const time: Oracle = (facts) => {
  const hour = num(facts, 'hour');
  const minute = num(facts, 'minute');
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) throw new Error('oracle time: the hour must be 1 to 12');
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('oracle time: the minute must be 0 to 59');
  return { kind: 'value', value: `${hour}:${String(minute).padStart(2, '0')}` };
};
