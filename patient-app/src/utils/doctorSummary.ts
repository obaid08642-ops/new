/** The compact line under the doctor's photo and the label of the sticky Book bar (owner review G3). Formatting only: every value comes from the doctor row. */

export interface SummaryInput {
  specialty?: string;
  rating?: number;
  reviews?: number;
  /** The fee as the screen formats it; none when the server sent no price. */
  feeText?: string;
  waitMinutes?: number;
  /** Formats a number in the active language. */
  num: (n: number, options?: Intl.NumberFormatOptions) => string;
  /** The wait message with its figure: `(minutes text) => "Avg. wait N min"`. */
  waitText: (minutes: string) => string;
}

/** Specialty, stars with the review count, fee and waiting time; a piece the server did not send is left out. */
export function summaryItems(input: SummaryInput): string[] {
  const items: string[] = [];
  if (input.specialty) items.push(input.specialty);
  if (typeof input.rating === 'number' && input.rating > 0) {
    const count = typeof input.reviews === 'number' && input.reviews > 0 ? ` (${input.num(input.reviews)})` : '';
    items.push(`★ ${input.num(input.rating, { maximumFractionDigits: 1 })}${count}`);
  }
  if (input.feeText) items.push(input.feeText);
  if (typeof input.waitMinutes === 'number' && input.waitMinutes > 0) items.push(input.waitText(input.num(input.waitMinutes)));
  return items;
}

/** "Thu 30 Oct · 5:30 pm · 150 SAR" in the active locale; null when the slot start cannot be read. */
export function slotBarLabel(locale: string, start: string | null, feeText?: string): string | null {
  if (!start) return null;
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', numberingSystem: 'latn' });
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' });
  return [day, time, feeText].filter(Boolean).join(' · ');
}
