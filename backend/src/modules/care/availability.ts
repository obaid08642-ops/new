/**
 * Q37 / Q36 / Q41 — the ONE availability rule for doctor appointments (owner
 * decision: one shared availability function). Booking (create/reschedule),
 * the slot list (SlotService) and the doctor-list "next available" preview
 * (CareService batch) all use these definitions, so a slot listed available
 * is a slot create() accepts.
 *
 * Rule:
 * - opening windows: admin-approved weekly schedule slots first, then the
 *   per-mode schedule from registration, then legacy working_hours;
 * - approved leave overlapping the day closes it;
 * - candidates on a SLOT_STEP_MINUTES grid from each window's opening, the
 *   opening rounded up to the SLOT_ALIGN_MINUTES boundary booking requires,
 *   at least SLOT_LEAD_MINUTES ahead, each APPOINTMENT_MINUTES long;
 * - a candidate conflicts with a blocking appointment when
 *   appt.slot_start < candidate end + SLOT_BUFFER_MINUTES and
 *   appt.slot_end > candidate start;
 * - a candidate conflicts with another patient's active hold (status 'held',
 *   unexpired) when the ranges overlap (no buffer).
 */
export const SLOT_BUFFER_MINUTES = 5;
export const SLOT_LEAD_MINUTES = 15;
/** Slot starts are on one 30-minute grid whatever the appointment's duration. */
export const SLOT_STEP_MINUTES = 30;
/** Booking accepts starts on a 15-minute boundary only, so the grid starts on one. */
export const SLOT_ALIGN_MINUTES = 15;
/** Every doctor appointment is this long; the patient does not choose it. */
export const APPOINTMENT_MINUTES = 30;

/** Appointment statuses that occupy their slot (RESCHEDULED frees the old slot). */
export const BLOCKING_APPOINTMENT_STATUSES: readonly string[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'];

export type ConsultationMode = 'clinic' | 'video' | 'home';
export interface Window { open: string; close: string }
export interface Range { s: number; e: number }
export interface ListedSlot { id: string; start: string; end: string; label: string; available: boolean }

const MIN = 60_000;
const DAY = 24 * 3600_000;
const HHMM = /^\d{2}:\d{2}$/;
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const FULL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** End of the candidate plus the buffer: what an existing booking must not start before. */
export function paddedEnd(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + (durationMinutes + SLOT_BUFFER_MINUTES) * MIN);
}

/**
 * Mongo filter for appointments that conflict with [start, start+duration)
 * under the buffer rule — the query form of bookingConflicts().
 */
export function conflictingAppointmentFilter(doctorId: string, start: Date, durationMinutes: number) {
  return {
    doctor_id: doctorId,
    status: { $in: [...BLOCKING_APPOINTMENT_STATUSES] },
    slot_start: { $lt: paddedEnd(start, durationMinutes) },
    slot_end: { $gt: start },
  };
}

/** True when a blocking appointment conflicts with the candidate (buffer included). */
export function bookingConflicts(startMs: number, durationMinutes: number, bookings: Range[]): boolean {
  const padded = startMs + (durationMinutes + SLOT_BUFFER_MINUTES) * MIN;
  return bookings.some((b) => b.s < padded && b.e > startMs);
}

/** True when another patient's active hold overlaps the candidate. */
export function holdConflicts(startMs: number, durationMinutes: number, holds: Range[]): boolean {
  const end = startMs + durationMinutes * MIN;
  return holds.some((h) => h.s < end && h.e > startMs);
}

/** Appointment rows (slot_start/slot_end, or duration) to ranges. */
export function appointmentRanges(rows: Array<{ slot_start?: unknown; slot_end?: unknown; duration_minutes?: unknown }>, fallbackMinutes: number): Range[] {
  return rows
    .map((r) => {
      const s = new Date(r.slot_start as string).getTime();
      const e = r.slot_end ? new Date(r.slot_end as string).getTime() : s + (Number(r.duration_minutes) || fallbackMinutes) * MIN;
      return { s, e };
    })
    .filter((r) => Number.isFinite(r.s) && Number.isFinite(r.e));
}

interface ScheduleEntry { day?: unknown; open?: string; close?: string; open_evening?: string; close_evening?: string; closed?: boolean }
export interface ApprovedSlot { day_of_week?: number; service_type?: string; start_time?: string; end_time?: string }
export interface DoctorScheduleSource {
  schedule_clinic?: ScheduleEntry[];
  schedule_video?: ScheduleEntry[];
  schedule_home?: ScheduleEntry[];
  working_hours?: ScheduleEntry[];
}

function dayMatches(day: unknown, dow: number): boolean {
  const v = String(day ?? '').toLowerCase();
  return v === 'all' || v === String(dow) || v === DAY_KEYS[dow] || v === FULL_DAYS[dow];
}

function entriesFor(rows: ScheduleEntry[] | undefined, dow: number): Window[] {
  return (rows || []).filter((w) => w && !w.closed && dayMatches(w.day, dow)).flatMap((w) => [
    ...(HHMM.test(w.open || '') && HHMM.test(w.close || '') ? [{ open: w.open as string, close: w.close as string }] : []),
    ...(HHMM.test(w.open_evening || '') && HHMM.test(w.close_evening || '') ? [{ open: w.open_evening as string, close: w.close_evening as string }] : []),
  ]);
}

/** Opening windows for a weekday (0 = Sunday) and mode, from the first source the doctor has. */
export function windowsFor(doctor: DoctorScheduleSource, approved: ApprovedSlot[], dow: number, mode: ConsultationMode): Window[] {
  const fromApproved = approved
    .filter((x) => x.day_of_week === dow && (x.service_type === mode || x.service_type === 'all') && HHMM.test(x.start_time || '') && HHMM.test(x.end_time || ''))
    .map((x) => ({ open: x.start_time as string, close: x.end_time as string }));
  if (fromApproved.length) return fromApproved;
  const perMode = entriesFor(doctor[`schedule_${mode}` as keyof DoctorScheduleSource], dow);
  if (perMode.length) return perMode;
  return entriesFor(doctor.working_hours, dow);
}

/** True when an approved leave of any of the doctor's link ids overlaps the day. */
export function onLeave(leaves: Array<{ provider_account_id?: string; start_date?: unknown; end_date?: unknown }>, linkIds: string[], dayStart: Date): boolean {
  const dayEnd = dayStart.getTime() + DAY;
  return leaves.some((l) =>
    linkIds.includes(String(l.provider_account_id)) &&
    new Date(l.start_date as string).getTime() < dayEnd &&
    new Date(l.end_date as string).getTime() >= dayStart.getTime(),
  );
}

/** UTC midnight of a YYYY-MM-DD date, or null when invalid. */
export function dayStartOf(dateStr: string): Date | null {
  const d = new Date(dateStr + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

/** Candidate slots inside the windows on the 30-minute start grid, `duration` long, at least the lead time ahead. */
export function candidateSlots(dayStart: Date, windows: Window[], durationMinutes: number, nowMs: number): ListedSlot[] {
  const out: ListedSlot[] = [];
  const seen = new Set<string>();
  for (const w of windows) {
    const [oh, om] = w.open.split(':').map(Number);
    const [ch, cm] = w.close.split(':').map(Number);
    if (![oh, om, ch, cm].every((n) => Number.isFinite(n))) continue;
    const rawOpen = dayStart.getTime() + oh * 3600_000 + om * MIN;
    // An opening such as 09:10 starts the grid at 09:15, a start booking accepts.
    const openTs = Math.ceil(rawOpen / (SLOT_ALIGN_MINUTES * MIN)) * SLOT_ALIGN_MINUTES * MIN;
    let closeTs = dayStart.getTime() + ch * 3600_000 + cm * MIN;
    if (closeTs <= rawOpen) closeTs += DAY; // overnight
    for (let t = openTs; t + durationMinutes * MIN <= closeTs; t += SLOT_STEP_MINUTES * MIN) {
      if (t < nowMs + SLOT_LEAD_MINUTES * MIN) continue;
      const id = new Date(t).toISOString();
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, start: id, end: new Date(t + durationMinutes * MIN).toISOString(), label: id.substring(11, 16), available: true });
    }
  }
  return out.sort((x, y) => x.start.localeCompare(y.start));
}

/** The time span the candidates need bookings and holds for. */
export function candidateSpan(slots: ListedSlot[]): { from: Date; to: Date } | null {
  if (!slots.length) return null;
  return {
    from: new Date(slots[0].start),
    to: new Date(new Date(slots[slots.length - 1].end).getTime() + SLOT_BUFFER_MINUTES * MIN),
  };
}

/** Marks each candidate available or not under the rule. */
export function markAvailability(slots: ListedSlot[], durationMinutes: number, bookings: Range[], holds: Range[]): ListedSlot[] {
  return slots.map((s) => {
    const startMs = new Date(s.start).getTime();
    return { ...s, available: !bookingConflicts(startMs, durationMinutes, bookings) && !holdConflicts(startMs, durationMinutes, holds) };
  });
}
