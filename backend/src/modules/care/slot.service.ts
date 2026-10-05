import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../../schemas/appointment.schema';
import { LeaveRequest, LeaveRequestDocument } from '../../schemas/leave-request.schema';
import { ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { isRamadan, riyadhParts } from '../../common/riyadh-clock';

/**
 * Slot generation engine.
 * Doctor's `working_hours` is reused: [{ day, open, close, closed }]
 *  day ∈ sat..fri | 'all'
 *  open/close = 'HH:MM'
 * We chunk each day into 30-minute slots, exclude already-booked slots and slots in the past.
 */
const FULL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

@Injectable()
export class SlotService {
  constructor(
    @Inject('AppointmentRepository') private apptModel: AppointmentRepository,
    @InjectModel(LeaveRequest.name) private leaves: Model<LeaveRequestDocument>,
  ) {}

  // Day-of-week mapping used in seed data
  private readonly DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  /**
   * Returns slots for a given doctor on a given date (ISO YYYY-MM-DD).
   */
  async slotsForDate(doctor: ProviderProfileDocument, dateStr: string, service_type: 'clinic' | 'video' | 'home', duration_minutes = 30) {
    // 1. Service type must be enabled for this doctor.
    if (!doctor.consultation_modes?.includes(service_type)) {
      return { date: dateStr, service_type, slots: [], reason: 'service_not_supported' };
    }

    // 2. Opening windows for that day (see hoursFor). The date is parsed as
    // UTC midnight, whose weekday ALWAYS equals the Riyadh calendar day's
    // weekday (00:00Z is 03:00 in Riyadh — same day, no DST in Saudi Arabia),
    // so `dow` below is already the provider-local weekday per 15.9.
    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return { date: dateStr, service_type, slots: [], reason: 'invalid_date' };
    const windows = await this.hoursFor(doctor, date.getUTCDay(), service_type, dateStr);
    if (!windows.length) {
      return { date: dateStr, service_type, slots: [], reason: 'closed' };
    }

    // 2b. R12: approved leave blocks the whole day (account link, user fallback).
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);
    const ids = [doctor.account_id, doctor.user_id].filter(Boolean);
    if (ids.length > 0) {
      const leave = await this.leaves.findOne({
        provider_account_id: { $in: ids },
        status: 'approved',
        start_date: { $lt: dayEnd },
        end_date: { $gte: dayStart },
      }).select({ _id: 0, id: 1 }).lean().catch(() => null);
      if (leave) return { date: dateStr, service_type, slots: [], reason: 'on_leave' };
    }

    // 3. Generate raw slot starts every {duration} minutes inside each window.
    const baseDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const slots: { id: string; start: string; end: string; label: string; available: boolean }[] = [];
    const seen = new Set<string>();
    const now = Date.now();
    for (const w of windows) {
      const [oh, om] = w.open.split(':').map(Number);
      const [ch, cm] = w.close.split(':').map(Number);
      const openTs = new Date(baseDate.getTime() + oh * 3600_000 + om * 60_000);
      let closeTs = new Date(baseDate.getTime() + ch * 3600_000 + cm * 60_000);
      if (closeTs.getTime() <= openTs.getTime()) closeTs = new Date(closeTs.getTime() + 24 * 3600_000); // overnight
      for (let t = openTs.getTime(); t + duration_minutes * 60_000 <= closeTs.getTime(); t += duration_minutes * 60_000) {
        const start = new Date(t);
        const end = new Date(t + duration_minutes * 60_000);
        if (start.getTime() < now + 15 * 60_000) continue; // ≥15 min lead time
        const slotId = start.toISOString();
        if (seen.has(slotId)) continue;
        seen.add(slotId);
        slots.push({
          // The canonical server-generated start timestamp is the published slot id.
          // Keeping it equal to `start` prevents accepting an opaque client-made id.
          id: slotId,
          start: slotId,
          end: end.toISOString(),
          label: slotId.substring(11, 16),
          available: true,
        });
      }
    }
    slots.sort((x, y) => x.start.localeCompare(y.start));
    if (slots.length === 0) return { date: dateStr, service_type, slots: [], reason: 'no_slots' };

    // 4. Mark booked slots as unavailable.
    const startOfDay = new Date(baseDate.getTime());
    const endOfDay = new Date(baseDate.getTime() + 24 * 3600_000);
    const booked = await this.apptModel.find({
      doctor_id: doctor.id,
      slot_start: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] },
    }).select({ slot_start: 1, slot_end: 1, duration_minutes: 1 }).lean();
    const bookedSet = new Set(booked.map((b: any) => new Date(b.slot_start).toISOString()));
    // Q37 — apply create()'s 5-min buffer HERE, not just exact-start matches.
    // Canon: appointments.service.ts APPOINTMENT_SLOT_BUFFER_MINUTES +
    // "existing.slot_start < paddedEnd && existing.slot_end > slotStart".
    // Mirrored inline (not imported) because appointments.service.ts already
    // depends on this SlotService — importing back would be circular.
    const BUFFER_MS = 5 * 60_000;
    const ranges = (booked as any[]).map((b: any) => {
      const s = new Date(b.slot_start).getTime();
      const e = b.slot_end ? new Date(b.slot_end).getTime()
        : s + (Number(b.duration_minutes) || duration_minutes) * 60_000;
      return { s, e };
    });
    for (const s of slots) {
      if (bookedSet.has(s.start)) {
        s.available = false;
        continue;
      }
      const startMs = new Date(s.start).getTime();
      const paddedEnd = startMs + duration_minutes * 60_000 + BUFFER_MS;
      for (const r of ranges) {
        if (r.s < paddedEnd && r.e > startMs) {
          s.available = false;
          break;
        }
      }
    }
    return { date: dateStr, service_type, slots };
  }

  /**
   * Opening windows ('HH:MM' open/close) for a weekday (0=Sunday) and consultation mode, from the first source
   * the doctor has:
   *  0. per-date special hours (holidays, Eid closures — `special_hours`,
   *     exact YYYY-MM-DD match; a `closed` entry closes the day),
   *  1. weekly slots approved by admin (provider_schedule_slots, DoctorDashboard "schedule" screen),
   *  2. Ramadan weekly hours (`ramadan_hours`, same shape as working_hours)
   *     while the date falls in Ramadan (Umm al-Qura, Asia/Riyadh),
   *  3. the per-mode schedule entered at registration (schedule_clinic / schedule_video / schedule_home),
   *  4. legacy working_hours.
   * Day keys are accepted as 'sun', 'sunday', a 0-6 number or 'all'.
   */
  private async hoursFor(doctor: any, dow: number, mode: 'clinic' | 'video' | 'home', dateStr?: string): Promise<{ open: string; close: string }[]> {
    const HHMM = /^\d{2}:\d{2}$/;
    // 15.9 (0): a malformed special entry must never strand a provider —
    // fall through to the normal sources instead of closing/opening wrongly.
    const special = dateStr && Array.isArray(doctor.special_hours)
      ? doctor.special_hours.find((s: any) => s && s.date === dateStr)
      : undefined;
    if (special) {
      if (special.closed) return [];
      if (HHMM.test(special.open || '') && HHMM.test(special.close || '')) {
        return [{ open: special.open, close: special.close }];
      }
    }
    const slotsCol = (this.leaves as any).db?.collection('provider_schedule_slots');
    const approved = doctor.account_id && slotsCol ? await slotsCol.find({
      provider_account_id: doctor.account_id, day_of_week: dow, active: { $ne: false }, service_type: { $in: [mode, 'all'] },
    }).toArray().catch(() => []) : [];
    const fromApproved = (approved as any[]).filter((x) => HHMM.test(x.start_time) && HHMM.test(x.end_time)).map((x) => ({ open: x.start_time, close: x.end_time }));
    if (fromApproved.length) return fromApproved;
    // 15.9 (2): Ramadan reduced hours — weekly shape, same day-key matching.
    if (dateStr && isRamadan(new Date(dateStr + 'T12:00:00Z'))) {
      const ramadan = this.entriesFor(doctor.ramadan_hours, dow, HHMM);
      if (ramadan.length) return ramadan;
    }
    const perMode = this.entriesFor(doctor[`schedule_${mode}`], dow, HHMM);
    if (perMode.length) return perMode;
    return this.entriesFor(doctor.working_hours, dow, HHMM);
  }

  /**
   * Weekly-shape window extraction shared by the per-mode schedule, legacy
   * working_hours and Ramadan hours: skips `closed` days, matches 'sun' /
   * 'sunday' / 0-6 / 'all' keys, keeps morning + evening windows.
   */
  private entriesFor(
    rows: any[],
    dow: number,
    HHMM: RegExp,
  ): { open: string; close: string }[] {
    const matches = (d: any) => {
      const v = String(d ?? '').toLowerCase();
      return v === 'all' || v === String(dow) || v === this.DAY_KEYS[dow] || v === FULL_DAYS[dow];
    };
    return (rows || []).filter((w) => w && !w.closed && matches(w.day)).flatMap((w) => [
      ...(HHMM.test(w.open || '') && HHMM.test(w.close || '') ? [{ open: w.open, close: w.close }] : []),
      ...(HHMM.test(w.open_evening || '') && HHMM.test(w.close_evening || '') ? [{ open: w.open_evening, close: w.close_evening }] : []),
    ]);
  }

  /**
   * "Available today" check — quick scan: does the doctor have at least one bookable slot today?
   */
  async hasSlotsToday(doctor: ProviderProfileDocument): Promise<boolean> {
    // 15.9: "today" is the Riyadh calendar day — near Riyadh midnight the UTC
    // date is still yesterday, which would scan the wrong day's hours.
    const today = riyadhParts(new Date()).ymd;
    // try the first supported mode
    const mode = (doctor.consultation_modes && doctor.consultation_modes[0]) as any;
    if (!mode) return false;
    const r = await this.slotsForDate(doctor, today, mode);
    return r.slots.some((s) => s.available);
  }

  /** First available slot across next 14 days (for card preview). */
  async nextAvailable(doctor: ProviderProfileDocument): Promise<string | null> {
    const mode = (doctor.consultation_modes && doctor.consultation_modes[0]) as any;
    if (!mode) return null;
    // 15.9: anchor the 14-day scan on the Riyadh calendar day (see hasSlotsToday).
    const anchor = riyadhParts(new Date());
    const [ay, am, ad] = anchor.ymd.split('-').map(Number);
    const base = Date.UTC(ay, am - 1, ad);
    for (let i = 0; i < 14; i++) {
      const d = new Date(base + i * 24 * 3600_000);
      const dateStr = d.toISOString().substring(0, 10);
      const r = await this.slotsForDate(doctor, dateStr, mode);
      const slot = r.slots.find((s) => s.available);
      if (slot) return slot.start;
    }
    return null;
  }
}
