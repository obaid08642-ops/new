import { Module, Injectable, Controller, Post, Body, Get, Param, BadRequestException, ConflictException, UseGuards } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SlotLock, SlotLockSchema } from '../../schemas/slot-lock.schema';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

/** Contract-pack 10-minute slot-lock TTL with optimistic anti-collision. */
const LOCK_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class SlotLocksService {
  constructor(@InjectModel('SlotLock') private locks: Model<any>) {}

  async reserve(user: any, body: { provider_id: string; booking_kind: string; slot_start: string; slot_end?: string }) {
    if (!body.provider_id || !body.slot_start) throw new BadRequestException('missing_fields');
    const start = new Date(body.slot_start);
    const end = body.slot_end ? new Date(body.slot_end) : new Date(start.getTime() + 30 * 60 * 1000);
    // Release expired automatically (TTL index handles this, but be safe)
    await this.locks.deleteMany({ status: 'held', expires_at: { $lt: new Date() } });
    // Collision check
    const conflict = await this.locks.findOne({
      provider_id: body.provider_id,
      status: { $in: ['held', 'confirmed'] },
      slot_start: { $lt: end },
      slot_end: { $gt: start },
    });
    if (conflict && conflict.patient_id !== user.id) throw new ConflictException('slot_taken');
    if (conflict && conflict.patient_id === user.id) return conflict.toObject ? conflict.toObject() : conflict;
    const expires_at = new Date(Date.now() + LOCK_TTL_MS);
    try {
      const lock = await this.locks.create({ provider_id: body.provider_id, patient_id: user.id, booking_kind: body.booking_kind, slot_start: start, slot_end: end, status: 'held', expires_at });
      return { ...lock.toObject(), ttl_ms: LOCK_TTL_MS };
    } catch (e: any) {
      // Storage-level exact-duplicate guard (unique partial index): concurrent
      // reserves racing past the check above land here instead of double-holding.
      if (e?.code === 11000) throw new ConflictException('slot_taken');
      throw e;
    }
  }

  async confirm(user: any, lockId: string, booking_id: string) {
    const l = await this.locks.findOne({ id: lockId, patient_id: user.id });
    if (!l) throw new BadRequestException('lock_not_found');
    if (l.status !== 'held') throw new BadRequestException('lock_not_holdable');
    l.status = 'confirmed';
    l.booking_id = booking_id;
    l.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // confirmed locks live until completion
    await l.save();
    return l.toObject();
  }

  async release(user: any, lockId: string) {
    const l = await this.locks.findOne({ id: lockId, patient_id: user.id });
    if (!l) return { ok: true };
    l.status = 'released';
    l.expires_at = new Date();
    await l.save();
    return { ok: true };
  }

  /**
   * Booking-time validation for an optional client-held lock.
   * Throws on: unknown lock, foreign lock, non-held, expired, or
   * provider/slot/kind mismatch. Pure check — never mutates.
   */
  async validateForBooking(user: any, lockId: string, opts: { provider_id: string; slot_start: Date; booking_kind: string }) {
    const l: any = await this.locks.findOne({ id: lockId, patient_id: user.id });
    if (!l) throw new BadRequestException('lock_not_found');
    if (l.status !== 'held') throw new BadRequestException('lock_not_holdable');
    if (l.expires_at && new Date(l.expires_at).getTime() <= Date.now()) throw new BadRequestException('lock_expired');
    if (String(l.provider_id) !== String(opts.provider_id)) throw new BadRequestException('lock_provider_mismatch');
    if (new Date(l.slot_start).getTime() !== new Date(opts.slot_start).getTime()) throw new BadRequestException('lock_slot_mismatch');
    if (opts.booking_kind && l.booking_kind !== opts.booking_kind) throw new BadRequestException('lock_kind_mismatch');
    return l;
  }

  /** Best-effort release used on booking failure paths. Only releases held locks; never throws. */
  async releaseQuietly(user: any, lockId: string) {
    try {
      const l: any = await this.locks.findOne({ id: lockId, patient_id: user.id });
      if (!l || l.status !== 'held') return { ok: true };
      l.status = 'released';
      l.expires_at = new Date();
      await l.save();
      return { ok: true };
    } catch {
      return { ok: true };
    }
  }

  async mine(user: any) { return this.locks.find({ patient_id: user.id, status: { $in: ['held', 'confirmed'] } }).lean(); }
}

@Controller('slot-locks')
@UseGuards(JwtAuthGuard)
export class SlotLocksController {
  constructor(private svc: SlotLocksService) {}
  @Post('reserve') reserve(@CurrentUser() u: any, @Body() b: any) { return this.svc.reserve(u, b); }
  @Post(':id/confirm') confirm(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { booking_id: string }) { return this.svc.confirm(u, id, b.booking_id); }
  @Post(':id/release') release(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.release(u, id); }
  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'SlotLock', schema: SlotLockSchema }])],
  controllers: [SlotLocksController],
  providers: [SlotLocksService],
  exports: [SlotLocksService],
})
export class SlotLocksModule {}
