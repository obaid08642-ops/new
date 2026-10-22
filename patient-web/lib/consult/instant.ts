/**
 * Ord11 (instant consultation, M8): the pure part. Parsers of the three patient answers of the instant-consultation broadcast
 * (POST /consultations/instant, GET /consultations/instant/:id, POST .../cancel) and the stable error codes. Every number
 * (seconds left, doctors notified, payment status) is the server's; nothing is estimated here.
 */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const text = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export type InstantMode = "video" | "audio";
export type InstantStatus = "broadcasting" | "accepted" | "expired" | "cancelled";
export type FallbackOption = "earliest_slot" | "refund";
export type Instant = {
  id: string; status: InstantStatus; specialty: string | null; mode: InstantMode | null; secondsLeft: number; expiresAt: string | null;
  doctorsNotified: number | null; paymentStatus: string; acceptedBy: string | null; appointmentId: string | null;
  fallback: { options: FallbackOption[]; earliestSlot: { doctorId: string | null; startsAt: string } | null } | null;
};

const STATUSES: InstantStatus[] = ["broadcasting", "accepted", "expired", "cancelled"];
const OPTIONS: FallbackOption[] = ["earliest_slot", "refund"];

export function parseEarliestSlot(v: unknown): { doctorId: string | null; startsAt: string } | null {
  const s = obj(v);
  const startsAt = s && text(s.starts_at);
  return s && startsAt ? { doctorId: text(s.doctor_id), startsAt } : null;
}

export function parseInstant(payload: unknown): Instant | null {
  const r = obj(payload);
  const id = r && text(r.id);
  const status = r && STATUSES.find((s) => s === r.status);
  if (!r || !id || !status) return null;
  const fb = obj(r.fallback);
  return {
    id, status, specialty: text(r.specialty), mode: r.mode === "video" || r.mode === "audio" ? r.mode : null,
    secondsLeft: Math.max(0, num(r.seconds_left) ?? 0), expiresAt: text(r.expires_at), doctorsNotified: num(r.doctors_notified),
    paymentStatus: text(r.payment_status) ?? "not_charged", acceptedBy: text(r.accepted_by), appointmentId: text(r.appointment_id),
    fallback: fb ? { options: (Array.isArray(fb.options) ? fb.options : []).filter((o): o is FallbackOption => OPTIONS.includes(o as FallbackOption)), earliestSlot: parseEarliestSlot(fb.earliest_slot) } : null,
  };
}

export const instantOpen = (i: Pick<Instant, "status">): boolean => i.status === "broadcasting";

/** Stable backend codes to message keys of the InstantConsult namespace; anything else is the generic error. */
const ERRORS: Record<string, string> = {
  instant_specialty_required: "errSpecialty",
  instant_mode_invalid: "errMode",
  instant_request_open: "errOpen",
  instant_no_online_doctors: "errNoDoctors",
  instant_already_accepted: "errAccepted",
  instant_request_not_found: "errNotFound",
  family_member_not_found: "errGeneric",
  results_not_ready: "errResults",
  network: "errNetwork",
  too_many_requests: "errBusy",
};
export const instantErrorKey = (code: string): string => ERRORS[code] ?? "errGeneric";

/** Seconds as m:ss, locale digits. */
export function clockText(locale: string, seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const nf = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  return `${new Intl.NumberFormat(locale, { useGrouping: false }).format(Math.floor(s / 60))}:${nf.format(s % 60)}`;
}
