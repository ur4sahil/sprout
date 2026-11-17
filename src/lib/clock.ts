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

// The local calendar date of a saved UTC time.
export function localDayOf(iso: string): string {
  return localDay(new Date(iso));
}

// The same time of day, a number of local calendar days later.
export function addDays(iso: string, days: number): string {
  const at = new Date(iso);
  at.setDate(at.getDate() + days);
  return at.toISOString();
}

// The local date of the Monday that starts this week, YYYY-MM-DD: the key of a weekly snapshot.
export function localWeek(at: Date = now()): string {
  const monday = new Date(at.getTime());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDay(monday);
}

// How many local calendar days lie between two saved times. Later minus earlier.
export function daysBetween(earlierIso: string, laterIso: string): number {
  const a = new Date(earlierIso);
  const b = new Date(laterIso);
  const startA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const startB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((startB - startA) / 86_400_000);
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
