import { Module, Injectable, Controller, Post, Body, Get, Param, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SlotLock, SlotLockSchema } from '../../schemas/slot-lock.schema';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

/** 5-minute slot-lock TTL with optimistic anti-collision. */
const LOCK_TTL_MS = 5 * 60 * 1000;

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
    if (conflict && conflict.patient_id !== user.id) throw new BadRequestException('slot_taken');
    if (conflict && conflict.patient_id === user.id) return conflict.toObject ? conflict.toObject() : conflict;
    const expires_at = new Date(Date.now() + LOCK_TTL_MS);
    const lock = await this.locks.create({ provider_id: body.provider_id, patient_id: user.id, booking_kind: body.booking_kind, slot_start: start, slot_end: end, status: 'held', expires_at });
    return { ...lock.toObject(), ttl_ms: LOCK_TTL_MS };
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
