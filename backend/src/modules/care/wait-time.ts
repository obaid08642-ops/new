/**
 * Average waiting time of a doctor's clinic (owner decision 2026-10-24): the minutes between the patient's check-in and the
 * start of the consultation, over completed clinic appointments. Nothing is shown until there are at least MIN_WAIT_SAMPLES
 * of them (a count that small identifies patients and says little), and the count itself is not published.
 */
export const MIN_WAIT_SAMPLES = 5;
/** A wait longer than this is a data error (a forgotten check-in), not a wait. */
const MAX_WAIT_MS = 8 * 3600_000;

type Entry = { state?: string; at?: Date | string };

export function waitMinutesOf(stateHistory: unknown): number | null {
  const h: Entry[] = Array.isArray(stateHistory) ? (stateHistory as Entry[]) : [];
  const t = (state: string, last = false): number | null => {
    const hits = h.filter((e) => e?.state === state && e.at).map((e) => new Date(e.at as any).getTime()).filter(Number.isFinite);
    if (!hits.length) return null;
    return last ? Math.max(...hits) : Math.min(...hits);
  };
  const checkedIn = t('CHECKED_IN');
  const started = t('IN_PROGRESS');
  if (checkedIn === null || started === null) return null;
  const ms = started - checkedIn;
  return ms >= 0 && ms <= MAX_WAIT_MS ? ms / 60_000 : null;
}

/** Whole-minute average of the valid waits, or null when fewer than MIN_WAIT_SAMPLES appointments carry one. */
export function averageWaitMinutes(appointments: Array<{ state_history?: unknown }>): number | null {
  const waits = appointments.map((a) => waitMinutesOf(a?.state_history)).filter((v): v is number => v !== null);
  if (waits.length < MIN_WAIT_SAMPLES) return null;
  return Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
}
