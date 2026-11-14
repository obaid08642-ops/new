import type { SleepReading } from "@/lib/api/sleep";

export type SleepQuality = { key: "excellent" | "good" | "fair" | "poor"; tone: "success" | "info" | "warning" | "danger" };

/** The quality band of a sleep score, the app's rule: 80 and over excellent, 60 good, 40 fair, below poor. */
export function sleepQuality(score: string | number | undefined): SleepQuality | null {
  if (score === undefined || score === "") return null;
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  return value >= 80 ? { key: "excellent", tone: "success" } : value >= 60 ? { key: "good", tone: "info" } : value >= 40 ? { key: "fair", tone: "warning" } : { key: "poor", tone: "danger" };
}

export type SleepDay = { date: Date; hours: number };

/** The last seven days (as the app): the most recent reading of each calendar day that has hours, oldest first. */
export function sleepWeek(readings: SleepReading[], now: number = Date.now()): SleepDay[] {
  const seen = new Set<string>();
  const days: SleepDay[] = [];
  for (const reading of readings) {
    const date = reading.measuredAt ? new Date(reading.measuredAt) : null;
    const hours = reading.durationHours === undefined ? NaN : Number(reading.durationHours);
    if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(hours)) continue;
    const key = date.toDateString();
    if (seen.has(key) || (now - date.getTime()) / 86400000 > 7) continue;
    seen.add(key);
    days.push({ date, hours });
  }
  return days.reverse();
}
