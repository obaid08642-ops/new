export interface FacilityHoursRow {
  day: string;
  open?: string | null;
  close?: string | null;
  open_evening?: string | null;
  close_evening?: string | null;
  closed?: boolean;
}

// Saturday first, as the Saudi week; the index is also a day of 2024-01-06 (a Saturday) so Intl names it in the patient's language.
const WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

const span = (open?: string | null, close?: string | null) => (open && close ? `${open}–${close}` : null);

/**
 * The opening hours of a facility as rows of (weekday name, hours), in the week's order. The day name is the locale's own
 * (Intl); a closed day says so with the given word; a day the record does not list is left out (nothing is invented).
 */
export function facilityHoursRows(locale: string, rows: FacilityHoursRow[], closedLabel: string): { label: string; value: string }[] {
  const names = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const byDay = new Map<string, FacilityHoursRow>();
  for (const row of rows) {
    const key = String(row?.day ?? '').trim().toLowerCase().slice(0, 3);
    if ((WEEK as readonly string[]).includes(key) && !byDay.has(key)) byDay.set(key, row);
  }
  return WEEK.flatMap((key, index) => {
    const row = byDay.get(key);
    if (!row) return [];
    const parts = [span(row.open, row.close), span(row.open_evening, row.close_evening)].filter((p): p is string => Boolean(p));
    const value = row.closed ? closedLabel : parts.join(' · ');
    return value ? [{ label: names.format(new Date(Date.UTC(2024, 0, 6 + index))), value }] : [];
  });
}

/** The map pin: both numbers must be real and on the globe. */
export function facilityPoint(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
