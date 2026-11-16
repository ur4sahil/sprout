// The waits in the answer flow (plan section 10). Tests shorten them.
export const TIMING = {
  tapGuardMs: 400, // taps this soon after a question appears are ignored, which stops double-tap carry-over
  praiseMinMs: 1200, // the next question loads once the praise has finished: this early at the soonest
  praiseMaxMs: 2500, // and this late at the latest
  holdToExitMs: 2000, // leaving practice needs a press and hold this long. A plain tap does nothing
  tryPauseMs: 2000, // "Try it together" waits this long before showing the answer
  beatGapMs: 700, // the pause between two beats of a lesson
  maxAnswerMs: 120_000, // one abandoned question never counts as more than two minutes
};

export function setTimingForTests(change: Partial<typeof TIMING>): void {
  Object.assign(TIMING, change);
}
