import { nowIso } from './clock';

export interface LoggedError {
  at: string;
  message: string;
  stack: string | null;
}

const MAX_ERRORS = 20;
const errors: LoggedError[] = [];
// Set once storage is open: saves the list in the device record. Never throws.
let persist: ((list: LoggedError[]) => void) | null = null;

export function logError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack ? error.stack : null;
  errors.push({ at: nowIso(), message, stack });
  if (errors.length > MAX_ERRORS) errors.splice(0, errors.length - MAX_ERRORS);
  persist?.(errors.slice());
}

// Puts back the errors saved by earlier launches, and says where to save new ones.
export function connectErrorLog(saved: LoggedError[], save: ((list: LoggedError[]) => void) | null): void {
  const fresh = errors.slice();
  errors.length = 0;
  errors.push(...[...saved, ...fresh].slice(-MAX_ERRORS));
  persist = save;
}

// Newest last. Read by the parent data screen.
export function recentErrors(): LoggedError[] {
  return errors.slice();
}

export function clearErrors(): void {
  errors.length = 0;
  persist = null;
}
