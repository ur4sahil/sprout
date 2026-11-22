// One length in two units (the twoRulers picture, Nov 22, 2026). An inch is 2.54 centimeters, and the picture draws
// both rulers to that scale.
export const CM_PER_INCH = 2.54;

// The whole centimeters nearest to a length given in inches: what a child reads off the centimeter ruler. A length
// of 2, 4 or 6 inches ends within a quarter of a centimeter of 5, 10 or 15.
export function aboutCentimeters(inches: number): number {
  return Math.round(inches * CM_PER_INCH);
}
