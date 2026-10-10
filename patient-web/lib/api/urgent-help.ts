/**
 * The urgent-help number (owner decision 14 + D-8): GET /mental-health/urgent-help is public and answers
 * `{ phone: string | null, updated_at }`. The admin sets the number (system_configs key `mental_health_urgent_help`);
 * no number is ever written in the web app. A value that is not a dialable number is read as "no number".
 */
export type UrgentHelp = {
  /** The number as the admin typed it (shown to the person). */
  phone: string;
  /** What `tel:` dials: digits with an optional leading plus. */
  dial: string;
};

const DIALABLE = /^\+?[0-9][0-9\s().-]{1,30}$/;

export function parseUrgentHelp(payload: unknown): UrgentHelp | null {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const data = root?.data;
  const inner = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : root;
  const raw = typeof inner?.phone === "string" ? inner.phone.trim() : "";
  if (!raw || !DIALABLE.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 3 ? { phone: raw, dial: `${raw.startsWith("+") ? "+" : ""}${digits}` } : null;
}
