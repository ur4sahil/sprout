import { nowIso } from './clock';

export interface LoggedError {
  at: string;
  message: string;
  stack: string | null;
}

const MAX_ERRORS = 20;
const errors: LoggedError[] = [];

export function logError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack ? error.stack : null;
  errors.push({ at: nowIso(), message, stack });
  if (errors.length > MAX_ERRORS) errors.splice(0, errors.length - MAX_ERRORS);
}

// Newest last. Read by the parent data screen.
export function recentErrors(): LoggedError[] {
  return errors.slice();
}

export function clearErrors(): void {
  errors.length = 0;
}
