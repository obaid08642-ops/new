import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../../schemas/appointment.schema';
import { LeaveRequest, LeaveRequestDocument } from '../../schemas/leave-request.schema';
import { ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { AppointmentRepository } from "./repositories/appointment.repository";
import {
  ApprovedSlot, BLOCKING_APPOINTMENT_STATUSES, DoctorScheduleSource, Range, appointmentRanges, candidateSlots, candidateSpan,
  dayStartOf, markAvailability, onLeave, windowsFor,
  APPOINTMENT_MINUTES,
} from './availability';

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

  /**
   * Returns slots for a given doctor on a given date (ISO YYYY-MM-DD), under
   * the one availability rule in ./availability (shared with create(),
   * reschedule() and the doctor-list preview). `viewerIds` are the caller's
   * own ids, whose holds do not block them.
   */
  async slotsForDate(doctor: ProviderProfileDocument, dateStr: string, service_type: 'clinic' | 'video' | 'home', duration_minutes = APPOINTMENT_MINUTES, viewerIds: string[] = []) {
    if (!doctor.consultation_modes?.includes(service_type)) {
      return { date: dateStr, service_type, slots: [], reason: 'service_not_supported' };
    }
    const dayStart = dayStartOf(dateStr);
    if (!dayStart) return { date: dateStr, service_type, slots: [], reason: 'invalid_date' };
    const dow = dayStart.getUTCDay();
    const windows = windowsFor(doctor as unknown as DoctorScheduleSource, await this.approvedSlots(doctor, dow, service_type), dow, service_type);
    if (!windows.length) return { date: dateStr, service_type, slots: [], reason: 'closed' };

    // R12: approved leave blocks the whole day (account link, user fallback).
    const linkIds = [doctor.account_id, doctor.user_id].filter((v): v is string => !!v);
    if (linkIds.length) {
      const leaves = await this.leaves.find({
        provider_account_id: { $in: linkIds },
        status: 'approved',
        start_date: { $lt: new Date(dayStart.getTime() + 24 * 3600_000) },
        end_date: { $gte: dayStart },
      }).select({ _id: 0, provider_account_id: 1, start_date: 1, end_date: 1 }).lean().catch(() => []);
      if (onLeave(leaves as never[], linkIds, dayStart)) return { date: dateStr, service_type, slots: [], reason: 'on_leave' };
    }

    const candidates = candidateSlots(dayStart, windows, duration_minutes, Date.now());
    const span = candidateSpan(candidates);
    if (!span) return { date: dateStr, service_type, slots: [], reason: 'no_slots' };

    const booked = await this.apptModel.find({
      doctor_id: doctor.id,
      status: { $in: [...BLOCKING_APPOINTMENT_STATUSES] },
      slot_start: { $lt: span.to },
      slot_end: { $gt: span.from },
    }).select({ slot_start: 1, slot_end: 1, duration_minutes: 1 }).lean();
    const holds = await this.activeHolds(doctor.id, span, viewerIds);
    const slots = markAvailability(candidates, duration_minutes, appointmentRanges(booked as never[], duration_minutes), holds);
    return { date: dateStr, service_type, slots };
  }

  /** Admin-approved weekly schedule slots for the day (provider_schedule_slots). */
  private async approvedSlots(doctor: { account_id?: string }, dow: number, mode: string): Promise<ApprovedSlot[]> {
    const col = (this.leaves as unknown as { db?: { collection(n: string): any } }).db?.collection('provider_schedule_slots');
    if (!doctor.account_id || !col) return [];
    return col.find({ provider_account_id: doctor.account_id, day_of_week: dow, active: { $ne: false }, service_type: { $in: [mode, 'all'] } })
      .toArray().catch(() => []);
  }

  /** Other patients' active holds (Q36) overlapping the span, as ranges. */
  private async activeHolds(doctorId: string, span: { from: Date; to: Date }, viewerIds: string[]): Promise<Range[]> {
    const col = (this.leaves as unknown as { db?: { collection(n: string): any } }).db?.collection('slotlocks');
    if (!col) return [];
    const rows: Array<{ slot_start: Date; slot_end: Date }> = await col.find({
      provider_id: doctorId, status: 'held', expires_at: { $gt: new Date() },
      slot_start: { $lt: span.to }, slot_end: { $gt: span.from },
      ...(viewerIds.length ? { patient_id: { $nin: viewerIds } } : {}),
    }, { projection: { _id: 0, slot_start: 1, slot_end: 1 } }).toArray().catch(() => []);
    return rows.map((h) => ({ s: new Date(h.slot_start).getTime(), e: new Date(h.slot_end).getTime() }));
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
