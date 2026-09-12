import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../../schemas/appointment.schema';
import { LeaveRequest, LeaveRequestDocument } from '../../schemas/leave-request.schema';
import { ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { AppointmentRepository } from "./repositories/appointment.repository";

/**
 * Slot generation engine.
 * Doctor's `working_hours` is reused: [{ day, open, close, closed }]
 *  day ∈ sat..fri | 'all'
 *  open/close = 'HH:MM'
 * We chunk each day into 30-minute slots, exclude already-booked slots and slots in the past.
 */
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

    // 2. Get working hours for the requested day.
    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return { date: dateStr, service_type, slots: [], reason: 'invalid_date' };
    const dayKey = this.DAY_KEYS[date.getUTCDay()];
    const wh = (doctor.working_hours || []).find((w: any) => w.day === dayKey || w.day === 'all');
    if (!wh || wh.closed) {
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

    // 3. Generate raw slot starts every {duration} minutes between open & close.
    const [oh, om] = wh.open.split(':').map(Number);
    const [ch, cm] = wh.close.split(':').map(Number);
    const baseDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const openTs = new Date(baseDate.getTime() + oh * 3600_000 + om * 60_000);
    let closeTs = new Date(baseDate.getTime() + ch * 3600_000 + cm * 60_000);
    if (closeTs.getTime() <= openTs.getTime()) closeTs = new Date(closeTs.getTime() + 24 * 3600_000); // overnight
    const slots: { id: string; start: string; end: string; label: string; available: boolean }[] = [];
    const now = Date.now();
    for (let t = openTs.getTime(); t + duration_minutes * 60_000 <= closeTs.getTime(); t += duration_minutes * 60_000) {
      const start = new Date(t);
      const end = new Date(t + duration_minutes * 60_000);
      if (start.getTime() < now + 15 * 60_000) continue; // ≥15 min lead time
      const slotId = start.toISOString();
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
    if (slots.length === 0) return { date: dateStr, service_type, slots: [], reason: 'no_slots' };

    // 4. Mark booked slots as unavailable.
    const startOfDay = new Date(baseDate.getTime());
    const endOfDay = new Date(baseDate.getTime() + 24 * 3600_000);
    const booked = await this.apptModel.find({
      doctor_id: doctor.id,
      slot_start: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
    }).select({ slot_start: 1 }).lean();
    const bookedSet = new Set(booked.map((b: any) => new Date(b.slot_start).toISOString()));
    for (const s of slots) {
      if (bookedSet.has(s.start)) s.available = false;
    }
    return { date: dateStr, service_type, slots };
  }

  /**
   * "Available today" check — quick scan: does the doctor have at least one bookable slot today?
   */
  async hasSlotsToday(doctor: ProviderProfileDocument): Promise<boolean> {
    const today = new Date().toISOString().substring(0, 10);
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
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getTime() + i * 24 * 3600_000);
      const dateStr = d.toISOString().substring(0, 10);
      const r = await this.slotsForDate(doctor, dateStr, mode);
      const slot = r.slots.find((s) => s.available);
      if (slot) return slot.start;
    }
    return null;
  }
}
