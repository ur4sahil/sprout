// Colours (plan section 9). Never put red and green, or blue and purple,
// as the only two options in a colour question at level 1.

export const COLORS = {
  red: '#E53935',
  blue: '#1E88E5',
  yellow: '#FDD835',
  green: '#43A047',
  orange: '#FB8C00',
  purple: '#8E24AA',
  pink: '#EC407A',
  brown: '#6D4C41',
  black: '#212121',
} as const;

export type ColorName = keyof typeof COLORS;
export const COLOR_NAMES = Object.keys(COLORS) as ColorName[];

// The hex value for a colour name. Anything else is passed through unchanged.
export function colorHex(name: string): string {
  return name in COLORS ? COLORS[name as ColorName] : name;
}
