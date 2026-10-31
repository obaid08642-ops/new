/** The compact line under the doctor's photo and the label of the sticky booking bar (owner review G3). Pure: formatting only, no data of its own. */

export type SummaryInput = {
  locale: string;
  specialty?: string;
  rating?: number;
  reviews?: number;
  /** The fee as the page formats it (currency in the active locale); none when the server sent no price. */
  feeText?: string;
  waitMinutes?: number;
  /** The "Wait ~{time}" message with the time already filled in by the caller: `(time) => text`. */
  waitText: (time: string) => string;
};

/** Specialty, rating with its review count, fee and waiting time; a piece the server did not send is left out (never a default). */
export function summaryItems(input: SummaryInput): string[] {
  const { locale } = input;
  const items: string[] = [];
  if (input.specialty) items.push(input.specialty);
  if (input.rating !== undefined && input.rating > 0) {
    const rating = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(input.rating);
    const count = input.reviews !== undefined && input.reviews > 0 ? ` (${new Intl.NumberFormat(locale).format(input.reviews)})` : "";
    items.push(`★ ${rating}${count}`);
  }
  if (input.feeText) items.push(input.feeText);
  if (input.waitMinutes !== undefined && input.waitMinutes > 0) {
    items.push(input.waitText(new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "short" }).format(input.waitMinutes)));
  }
  return items;
}

export type BookSelection = { type: "clinic" | "video" | "home"; start: string };

/** "Thu 30 Oct · 5:30 pm · 150 SAR": the chosen day, time and fee in the active locale; the fee is left out when none was sent. */
export function selectionLabel(locale: string, start: string, feeText?: string): string | null {
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return null;
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
  return [day, time, feeText].filter(Boolean).join(" · ");
}

export type BarState = { enabled: false } | { enabled: true; label: string; type: BookSelection["type"] };

/** The bar is disabled until a time is chosen; then it shows the choice and the fee of the chosen visit type. */
export function barState(locale: string, selection: BookSelection | null, feeTexts: Partial<Record<BookSelection["type"], string>>): BarState {
  if (!selection) return { enabled: false };
  const label = selectionLabel(locale, selection.start, feeTexts[selection.type]);
  return label ? { enabled: true, label, type: selection.type } : { enabled: false };
}
