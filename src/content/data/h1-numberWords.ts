// Number words for plan section 15, wave H1: one to one hundred twenty, written as they are read,
// with a hyphen between the tens and the ones ("forty-seven").

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 120) throw new Error(`numberWord: ${n} is not a whole number from 0 to 120`);
  if (n >= 100) return n === 100 ? 'one hundred' : `one hundred ${numberWord(n - 100)}`;
  if (n < 20) return ONES[n] as string;
  const tens = TENS[Math.floor(n / 10)] as string;
  return n % 10 === 0 ? tens : `${tens}-${ONES[n % 10] as string}`;
}
