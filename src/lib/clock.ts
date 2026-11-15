// The only place the app reads the real time. Tests freeze it.
let frozen: Date | null = null;

export function now(): Date {
  return frozen ? new Date(frozen.getTime()) : new Date();
}

export function nowIso(): string {
  return now().toISOString();
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
