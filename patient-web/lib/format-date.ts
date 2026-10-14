/** A date from the API through the locale's own formatter, or null when the value is missing or not a date (never "Invalid Date"). */
export function formatDate(locale: string, value: string | null | undefined, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, options).format(date);
}
