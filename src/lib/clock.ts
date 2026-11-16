// The only place the app reads the real time. Tests freeze it.
let frozen: Date | null = null;

export function now(): Date {
  return frozen ? new Date(frozen.getTime()) : new Date();
}

export function nowIso(): string {
  return now().toISOString();
}

// The device's local calendar date, YYYY-MM-DD. Never work a day out from a UTC string.
export function localDay(at: Date = now()): string {
  const year = String(at.getFullYear()).padStart(4, '0');
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function freezeClock(at: Date | string): void {
  frozen = new Date(at);
}

export function advanceClock(ms: number): void {
  if (!frozen) throw new Error('advanceClock needs a frozen clock');
  frozen = new Date(frozen.getTime() + ms);
}

export function unfreezeClock(): void {
  frozen = null;
}
