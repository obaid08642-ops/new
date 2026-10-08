import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LabVisitSlot, LabSlotHold } from '../../schemas/lab.schema';
import { normalizeCity, isValidSlotDate } from './visit-slots.dto';

export interface SlotActor {
  id: string;
  role: string;
}

interface CreateSlotArgs {
  provider_account_id?: string;
  city: string;
  window_start: string;
  window_end: string;
  capacity: number;
  idempotency_key?: string;
}

const HOLD_TTL_MINUTES = 30;

/**
 * P22.4 — bookable home-collection windows ("delivery slots").
 * Every mutating write carries an idempotency key; capacity is enforced by an
 * atomic updateOne filter (booked_count < capacity) so concurrent patients can
 * never overbook the same window.
 */
@Injectable()
export class VisitSlotsService {
  private readonly logger = new Logger(VisitSlotsService.name);

  constructor(
    @InjectModel(LabVisitSlot.name) private readonly slots: Model<LabVisitSlot>,
    @InjectModel(LabSlotHold.name) private readonly holds: Model<LabSlotHold>,
    private readonly events: EventEmitter2,
  ) {}

  private isStaff(actor: SlotActor): boolean {
    return ['admin', 'super_admin', 'lab', 'hospital', 'system'].includes(String(actor?.role));
  }

  async createSlot(actor: SlotActor, args: CreateSlotArgs): Promise<Record<string, unknown>> {
    if (!this.isStaff(actor)) throw new ForbiddenException('lab_or_admin_only');
    const city = normalizeCity(args.city);
    if (!city) throw new BadRequestException('city_required');
    const start = new Date(args.window_start);
    const end = new Date(args.window_end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('window_invalid');
    if (end.getTime() <= start.getTime()) throw new BadRequestException('window_end_must_follow_start');
    if (start.getTime() < Date.now() - 60_000) throw new BadRequestException('window_in_past');
    const capacity = Math.floor(Number(args.capacity));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) throw new BadRequestException('capacity_out_of_range');

    if (args.idempotency_key) {
      const replay = await this.slots.findOne({ idempotency_key: { $eq: String(args.idempotency_key) } }).lean();
      if (replay) return replay as Record<string, unknown>;
    }
    const providerId = typeof args.provider_account_id === 'string' && args.provider_account_id.trim()
      ? args.provider_account_id.trim()
      : undefined;
    const dupe = await this.slots.findOne({
      city: { $eq: city },
      window_start: { $eq: start },
      window_end: { $eq: end },
      ...(providerId ? { provider_account_id: { $eq: providerId } } : { provider_account_id: { $in: [null, undefined] } }),
      status: { $in: ['OPEN', 'FULL'] },
    }).lean();
    if (dupe) throw new ConflictException('slot_window_exists');
    const doc = await this.slots.create({
      id: randomUUID(),
      provider_account_id: providerId,
      city,
      window_start: start,
      window_end: end,
      capacity,
      booked_count: 0,
      status: 'OPEN',
      idempotency_key: args.idempotency_key,
    });
    const out = typeof (doc as unknown as { toObject?: () => Record<string, unknown> }).toObject === 'function'
      ? (doc as unknown as { toObject: () => Record<string, unknown> }).toObject()
      : (doc as unknown as Record<string, unknown>);
    this.events.emit('lab.slot_created', { slot_id: (out as { id?: string }).id, city });
    return out;
  }

  async listSlots(filter: { city?: string; date?: string; provider_account_id?: string }): Promise<Record<string, unknown>[]> {
    const q: Record<string, unknown> = { status: { $eq: 'OPEN' }, window_start: { $gt: new Date() } };
    if (filter.city !== undefined && filter.city !== null && String(filter.city).trim() !== '') {
      q['city'] = { $eq: normalizeCity(filter.city) };
    }
    if (filter.date !== undefined && filter.date !== null && String(filter.date).trim() !== '') {
      if (!isValidSlotDate(filter.date)) throw new BadRequestException('date_must_be_YYYY-MM-DD');
      const dayStart = new Date(String(filter.date) + 'T00:00:00Z');
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
      q['window_start'] = { $gte: dayStart, $lt: dayEnd };
    }
    if (filter.provider_account_id) q['provider_account_id'] = { $eq: String(filter.provider_account_id) };
    const rows = await this.slots.find(q, { _id: 0, __v: 0 }).sort({ window_start: 1 }).limit(200).lean();
    return (rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      remaining: Math.max(0, Number(r['capacity'] ?? 0) - Number(r['booked_count'] ?? 0)),
    }));
  }

  /**
   * Patient takes one seat in the window. The capacity guard is a single
   * atomic updateOne — two concurrent patients race on the DB filter, exactly
   * one wins; the loser gets slot_full. Replay by idempotency key is safe.
   */
  async bookSlot(patient: SlotActor, slotId: string, idempotencyKey: string): Promise<Record<string, unknown>> {
    const key = String(idempotencyKey ?? '').trim();
    if (!key) throw new BadRequestException('idempotency_key_required');
    const replay = await this.holds.findOne({ idempotency_key: { $eq: key } }).lean();
    if (replay) {
      const row = replay as unknown as Record<string, unknown>;
      if (String(row['slot_id']) !== String(slotId) || String(row['patient_id']) !== String(patient.id)) {
        throw new ConflictException('idempotency_key_reused_for_another_slot');
      }
      return row;
    }
    const slot = await this.slots.findOne({ id: { $eq: String(slotId) } }).lean();
    if (!slot) throw new NotFoundException('slot_not_found');
    const s = slot as unknown as Record<string, unknown>;
    if (s['status'] !== 'OPEN') throw new ConflictException('slot_not_open');
    if (new Date(String(s['window_start'])).getTime() < Date.now()) throw new BadRequestException('slot_expired');
    const res = await this.slots.updateOne(
      { id: { $eq: String(slotId) }, status: { $eq: 'OPEN' }, booked_count: { $lt: Number(s['capacity']) } },
      { $inc: { booked_count: 1 } },
    ) as unknown as { modifiedCount?: number; modified?: number };
    const modified = Number(res?.modifiedCount ?? res?.modified ?? 0);
    if (modified === 0) {
      await this.slots.updateOne(
        { id: { $eq: String(slotId) }, status: { $eq: 'OPEN' } },
        { $set: { status: 'FULL' } },
      ).catch(() => null);
      throw new ConflictException('slot_full');
    }
    const after = await this.slots.findOne({ id: { $eq: String(slotId) } }).lean() as unknown as Record<string, unknown> | null;
    if (after && Number(after['booked_count'] ?? 0) >= Number(after['capacity'] ?? 0)) {
      await this.slots.updateOne({ id: { $eq: String(slotId) } }, { $set: { status: 'FULL' } }).catch(() => null);
    }
    try {
      const hold = await this.holds.create({
        id: randomUUID(),
        slot_id: String(slotId),
        patient_id: String(patient.id),
        idempotency_key: key,
        status: 'HELD',
      });
      const out = typeof (hold as unknown as { toObject?: () => Record<string, unknown> }).toObject === 'function'
        ? (hold as unknown as { toObject: () => Record<string, unknown> }).toObject()
        : (hold as unknown as Record<string, unknown>);
      this.events.emit('lab.slot_booked', { slot_id: String(slotId), patient_id: String(patient.id), hold_id: (out as { id?: string }).id });
      return out;
    } catch (e: unknown) {
      // Lost the insert race after winning the seat (same key submitted twice):
      // roll the seat back and return the winner's hold.
      const err = e as { code?: number };
      if (err?.code === 11000) {
        await this.slots.updateOne({ id: { $eq: String(slotId) } }, { $inc: { booked_count: -1 } }).catch(() => null);
        const winner = await this.holds.findOne({ idempotency_key: { $eq: key } }).lean();
        if (!winner) throw new ConflictException('slot_hold_race_lost');
        return winner as unknown as Record<string, unknown>;
      }
      throw e;
    }
  }

  async releaseSlot(patient: SlotActor, holdId: string): Promise<Record<string, unknown>> {
    const hold = await this.holds.findOne({ id: { $eq: String(holdId) } });
    if (!hold) throw new NotFoundException('hold_not_found');
    const h = hold as unknown as Record<string, unknown> & { save: () => Promise<unknown> };
    if (String(h['patient_id']) !== String(patient.id) && !this.isStaff(patient)) throw new ForbiddenException('not_your_hold');
    if (h['status'] !== 'HELD') throw new BadRequestException('hold_not_active');
    h['status'] = 'RELEASED';
    await h.save();
    await this.slots.updateOne(
      { id: { $eq: String(h['slot_id']) }, booked_count: { $gt: 0 } },
      { $inc: { booked_count: -1 }, $set: { status: 'OPEN' } },
    ).catch(() => null);
    this.events.emit('lab.slot_released', { slot_id: String(h['slot_id']), hold_id: String(holdId) });
    return { id: String(holdId), status: 'RELEASED' };
  }

  /** Lab booking consumes the patient's HELD hold so the seat cannot be reused. */
  async consumeHoldForBooking(holdId: string, patientId: string, bookingId: string): Promise<Record<string, unknown>> {
    const updated = await this.holds.findOneAndUpdate(
      { id: { $eq: String(holdId) }, patient_id: { $eq: String(patientId) }, status: { $eq: 'HELD' } },
      { $set: { status: 'CONSUMED', consumed_by_booking_id: String(bookingId) } },
      { new: true },
    ).lean();
    if (!updated) throw new BadRequestException('slot_hold_invalid_or_used');
    return updated as unknown as Record<string, unknown>;
  }

  async findHeldSlotForPatient(slotId: string, patientId: string): Promise<Record<string, unknown> | null> {
    const hold = await this.holds.findOne({
      slot_id: { $eq: String(slotId) },
      patient_id: { $eq: String(patientId) },
      status: { $eq: 'HELD' },
    }).lean();
    return (hold as unknown as Record<string, unknown> | null) ?? null;
  }

  /**
   * Read-only validation for lab booking: the patient must hold a live HELD
   * hold for this window (by slot or by explicit hold id). Returns the window
   * so the caller can pin scheduled_at inside it.
   */
  async assertHoldForBooking(
    patientId: string,
    slotId?: string,
    holdId?: string,
  ): Promise<{ slot: Record<string, unknown>; hold: Record<string, unknown> }> {
    let hold: Record<string, unknown> | null = null;
    if (holdId) {
      hold = await this.holds.findOne({
        id: { $eq: String(holdId) },
        patient_id: { $eq: String(patientId) },
        status: { $eq: 'HELD' },
      }).lean() as unknown as Record<string, unknown> | null;
      if (!hold) throw new BadRequestException('slot_hold_invalid_or_used');
      if (slotId && String(hold['slot_id']) !== String(slotId)) throw new BadRequestException('slot_hold_mismatch');
    } else {
      if (!slotId) throw new BadRequestException('visit_slot_required');
      hold = await this.findHeldSlotForPatient(String(slotId), String(patientId));
      if (!hold) throw new BadRequestException('slot_hold_required');
    }
    const slot = await this.slots.findOne({ id: { $eq: String(hold['slot_id']) } }).lean() as unknown as Record<string, unknown> | null;
    if (!slot || slot['status'] === 'CLOSED') throw new BadRequestException('slot_closed');
    return { slot, hold };
  }

  /** Ops sweep: HELD holds older than the TTL free their seat (cron wiring is ops). */
  async sweepExpired(now: Date = new Date()): Promise<{ expired: number }> {
    const cutoff = new Date(now.getTime() - HOLD_TTL_MINUTES * 60_000);
    const stale = await this.holds.find(
      { status: { $eq: 'HELD' }, createdAt: { $lt: cutoff } },
      { id: 1, slot_id: 1 },
    ).limit(500).lean() as unknown as Array<{ id: string; slot_id: string }>;
    let expired = 0;
    for (const h of stale) {
      const res = await this.holds.updateOne(
        { id: { $eq: h.id }, status: { $eq: 'HELD' } },
        { $set: { status: 'EXPIRED' } },
      ) as unknown as { modifiedCount?: number };
      if (Number(res?.modifiedCount ?? 0) > 0) {
        expired += 1;
        await this.slots.updateOne(
          { id: { $eq: h.slot_id }, booked_count: { $gt: 0 } },
          { $inc: { booked_count: -1 }, $set: { status: 'OPEN' } },
        ).catch(() => null);
      }
    }
    if (expired > 0) this.logger.log(`swept ${expired} expired slot holds`);
    return { expired };
  }
}
