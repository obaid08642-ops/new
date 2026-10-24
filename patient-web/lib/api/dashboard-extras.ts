import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { extractVitalSummary } from "@/lib/api/vitals";
import { parseMoodHistory } from "@/lib/api/mood";
import { parseMaternity } from "@/lib/maternity/view";
import { todayDoses } from "@/lib/health/doses";

/** The health reminder card of the signed-in home (the app's ReminderCard): the next dose, or that today's doses are done. */
export type ReminderCard =
  | { kind: "next"; name: string | null; detail: string }
  | { kind: "done"; taken: number; total: number };

/** From GET /health/reminders. Nothing (null) when there is no reminder, as in the app. */
export function parseReminderCard(payload: unknown): ReminderCard | null {
  const reminders = extractMedicationReminderSummaries(payload);
  if (reminders.length === 0) return null;
  const doses = todayDoses(reminders);
  const next = doses.find((dose) => dose.status === "pending");
  if (next) return { kind: "next", name: next.reminder.medicineName ?? null, detail: [next.reminder.dose, next.timeKey].filter(Boolean).join(" · ") };
  return { kind: "done", taken: doses.filter((dose) => dose.status === "taken").length, total: doses.length };
}

const rec = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const count = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0);

/** "Your records" rows: only what the API returned for the day (the app's DayRecords). */
export type RecordRow =
  | { key: "nutrition"; meals: number; waterMl: number }
  | { key: "vitals" }
  | { key: "mood"; loggedToday: boolean }
  | { key: "maternity"; pregnant: boolean };

const RIYADH_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Each argument is the parsed JSON of one read, or null when that read failed or the person may not see it (the row is then
 * left out, it never shows a made-up value). GET /nutrition/daily-summary, /health/vitals/summary, /mental-health/mood?days=1,
 * /maternity/profile.
 */
export function parseRecordRows(
  input: { nutrition: unknown; vitals: unknown; mood: unknown; maternity: unknown },
  now: Date = new Date(),
): RecordRow[] {
  const rows: RecordRow[] = [];
  const nutritionRoot = rec(input.nutrition);
  const nutrition = rec(nutritionRoot?.data) ?? nutritionRoot;
  const meals = count(nutrition?.meals_count);
  const waterMl = count(rec(nutrition?.water)?.consumed_ml);
  if (meals > 0 || waterMl > 0) rows.push({ key: "nutrition", meals, waterMl });
  if (input.vitals !== null && extractVitalSummary(input.vitals).length > 0) rows.push({ key: "vitals" });
  if (input.mood !== null) {
    const today = RIYADH_DAY.format(now);
    const loggedToday = parseMoodHistory(input.mood).some((entry) => {
      const at = entry.loggedAt ? new Date(entry.loggedAt) : null;
      return Boolean(at && !Number.isNaN(at.valueOf()) && RIYADH_DAY.format(at) === today);
    });
    rows.push({ key: "mood", loggedToday });
  }
  if (input.maternity !== null) {
    const maternity = parseMaternity(input.maternity);
    if (maternity.ready) rows.push({ key: "maternity", pregnant: maternity.pregnant });
  }
  return rows;
}
