// The waits in the answer flow (plan section 10). Tests shorten them.
export const TIMING = {
  tapGuardMs: 400, // taps this soon after a question appears are ignored, which stops double-tap carry-over
  praiseMinMs: 1200, // the next question loads once the praise has finished: this early at the soonest
  praiseMaxMs: 2500, // and this late at the latest
  maxAnswerMs: 120_000, // one abandoned question never counts as more than two minutes
};

export function setTimingForTests(change: Partial<typeof TIMING>): void {
  Object.assign(TIMING, change);
}
