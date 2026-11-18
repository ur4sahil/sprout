// Where a burst of particles should start: the middle of `target`, as a share (0 to 1) across and down `area`,
// the positioned box the particle layer covers. The middle of the area when either has no size yet (as in tests).
export function burstAt(area: Element | null, target: Element | null): { x: number; y: number } {
  const box = area?.getBoundingClientRect();
  const spot = target?.getBoundingClientRect();
  if (!box || !spot || box.width <= 0 || box.height <= 0) return { x: 0.5, y: 0.5 };
  const share = (value: number): number => Math.max(0, Math.min(1, value));
  return { x: share((spot.left + spot.width / 2 - box.left) / box.width), y: share((spot.top + spot.height / 2 - box.top) / box.height) };
}
